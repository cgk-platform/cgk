/**
 * Support Tickets API
 *
 * Handles listing and creating support tickets for customers.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'
import type {
  PaginatedResult,
  SupportTicket,
  TicketCategory,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from '@/lib/account/types'

interface TicketRow {
  id: string
  ticket_number: string
  subject: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  order_id: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

interface MessageRow {
  id: string
  ticket_id: string
  content: string
  is_from_customer: boolean
  author_name: string
  attachments: unknown[] | null
  created_at: string
}

function mapTicketRowToTicket(row: TicketRow, messages: TicketMessage[]): SupportTicket {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    subject: row.subject,
    category: row.category,
    priority: row.priority,
    status: row.status,
    orderId: row.order_id,
    messages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  }
}

function mapMessageRow(row: MessageRow): TicketMessage {
  const attachments = (row.attachments ?? []) as Array<{
    id: string
    fileName: string
    fileSize: number
    fileType: string
    url: string
  }>

  return {
    id: row.id,
    content: row.content,
    isFromCustomer: row.is_from_customer,
    authorName: row.author_name,
    attachments: attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileSize: a.fileSize,
      fileType: a.fileType,
      url: a.url,
    })),
    createdAt: row.created_at,
  }
}

/**
 * GET /api/account/support/tickets
 * Returns paginated list of customer support tickets
 */
export async function GET(request: Request) {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10)))
  const status = searchParams.get('status')
  const offset = (page - 1) * pageSize

  // Get total count
  const countResult = await withTenant(tenantSlug, async () => {
    if (status) {
      return sql<{ count: string }>`
        SELECT COUNT(*) as count
        FROM support_tickets
        WHERE customer_id = ${session.customerId}
          AND status = ${status}
      `
    }
    return sql<{ count: string }>`
      SELECT COUNT(*) as count
      FROM support_tickets
      WHERE customer_id = ${session.customerId}
    `
  })

  const total = parseInt(countResult.rows[0]?.count ?? '0', 10)

  // Get tickets with pagination
  const ticketResult = await withTenant(tenantSlug, async () => {
    if (status) {
      return sql<TicketRow>`
        SELECT
          id,
          ticket_number,
          subject,
          category,
          priority,
          status,
          order_id,
          created_at,
          updated_at,
          resolved_at
        FROM support_tickets
        WHERE customer_id = ${session.customerId}
          AND status = ${status}
        ORDER BY
          CASE WHEN status IN ('open', 'in_progress', 'waiting_customer') THEN 0 ELSE 1 END,
          updated_at DESC
        OFFSET ${offset}
        LIMIT ${pageSize}
      `
    }

    return sql<TicketRow>`
      SELECT
        id,
        ticket_number,
        subject,
        category,
        priority,
        status,
        order_id,
        created_at,
        updated_at,
        resolved_at
      FROM support_tickets
      WHERE customer_id = ${session.customerId}
      ORDER BY
        CASE WHEN status IN ('open', 'in_progress', 'waiting_customer') THEN 0 ELSE 1 END,
        updated_at DESC
      OFFSET ${offset}
      LIMIT ${pageSize}
    `
  })

  // Get latest message for each ticket
  const tickets: SupportTicket[] = []

  for (const ticketRow of ticketResult.rows) {
    // Get messages for this ticket (most recent first, limited to preview)
    const messagesResult = await withTenant(tenantSlug, async () => {
      return sql<MessageRow>`
        SELECT
          id,
          ticket_id,
          content,
          is_from_customer,
          author_name,
          attachments,
          created_at
        FROM support_ticket_messages
        WHERE ticket_id = ${ticketRow.id}
        ORDER BY created_at DESC
        LIMIT 1
      `
    })

    const messages = messagesResult.rows.map(mapMessageRow)
    tickets.push(mapTicketRowToTicket(ticketRow, messages))
  }

  const response: PaginatedResult<SupportTicket> = {
    items: tickets,
    total,
    page,
    pageSize,
    hasMore: offset + tickets.length < total,
  }

  return NextResponse.json(response)
}

/**
 * POST /api/account/support/tickets
 * Creates a new support ticket
 */
export async function POST(request: Request) {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Handle form data for file uploads
    const contentType = request.headers.get('content-type') ?? ''
    let subject: string
    let category: TicketCategory
    let message: string
    let orderId: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      subject = formData.get('subject') as string
      category = formData.get('category') as TicketCategory
      message = formData.get('message') as string
      orderId = formData.get('orderId') as string | null
      // Note: File handling would be implemented with a file storage service
    } else {
      const body = await request.json()
      subject = body.subject
      category = body.category
      message = body.message
      orderId = body.orderId ?? null
    }

    // Validate required fields
    if (!subject || !category || !message) {
      return NextResponse.json(
        { error: 'Subject, category, and message are required' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories: TicketCategory[] = [
      'order_issue',
      'shipping',
      'return_refund',
      'product_inquiry',
      'account',
      'payment',
      'other',
    ]
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    // Generate ticket number
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`
    const ticketId = crypto.randomUUID()
    const messageId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Create ticket
    await withTenant(tenantSlug, async () => {
      await sql`
        INSERT INTO support_tickets (
          id,
          ticket_number,
          customer_id,
          subject,
          category,
          priority,
          status,
          order_id,
          created_at,
          updated_at
        ) VALUES (
          ${ticketId},
          ${ticketNumber},
          ${session.customerId},
          ${subject},
          ${category},
          'medium',
          'open',
          ${orderId},
          ${now},
          ${now}
        )
      `

      // Create initial message
      await sql`
        INSERT INTO support_ticket_messages (
          id,
          ticket_id,
          content,
          is_from_customer,
          author_name,
          attachments,
          created_at
        ) VALUES (
          ${messageId},
          ${ticketId},
          ${message},
          true,
          ${session.firstName ?? session.email},
          '[]'::jsonb,
          ${now}
        )
      `
    })

    // Return created ticket
    const ticket: SupportTicket = {
      id: ticketId,
      ticketNumber,
      subject,
      category,
      priority: 'medium',
      status: 'open',
      orderId,
      messages: [
        {
          id: messageId,
          content: message,
          isFromCustomer: true,
          authorName: session.firstName ?? session.email,
          attachments: [],
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    }

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('Failed to create support ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    )
  }
}
