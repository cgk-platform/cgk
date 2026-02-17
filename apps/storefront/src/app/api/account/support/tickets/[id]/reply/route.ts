/**
 * Support Ticket Reply API
 *
 * Handles adding replies to support tickets.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'
import type {
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

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/account/support/tickets/[id]/reply
 * Add a reply to a support ticket
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id: ticketId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify ticket exists and belongs to customer
  const ticketCheck = await withTenant(tenantSlug, async () => {
    return sql<{ id: string; status: string }>`
      SELECT id, status
      FROM support_tickets
      WHERE id = ${ticketId}
        AND customer_id = ${session.customerId}
      LIMIT 1
    `
  })

  const existingTicket = ticketCheck.rows[0]
  if (!existingTicket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  if (existingTicket.status === 'closed' || existingTicket.status === 'resolved') {
    return NextResponse.json(
      { error: 'Cannot reply to a closed ticket' },
      { status: 400 }
    )
  }

  try {
    // Handle form data for file uploads
    const contentType = request.headers.get('content-type') ?? ''
    let message: string

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      message = formData.get('message') as string
      // Note: File handling would be implemented with a file storage service
    } else {
      const body = await request.json()
      message = body.message
    }

    // Validate required fields
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const messageId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Create message and update ticket status
    await withTenant(tenantSlug, async () => {
      // Add message
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

      // Update ticket status to waiting for support response
      await sql`
        UPDATE support_tickets
        SET
          status = CASE
            WHEN status = 'waiting_customer' THEN 'in_progress'
            ELSE status
          END,
          updated_at = ${now}
        WHERE id = ${ticketId}
      `
    })

    // Return updated ticket
    const ticketResult = await withTenant(tenantSlug, async () => {
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
        WHERE id = ${ticketId}
          AND customer_id = ${session.customerId}
        LIMIT 1
      `
    })

    const ticketRow = ticketResult.rows[0]
    if (!ticketRow) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

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
        WHERE ticket_id = ${ticketId}
        ORDER BY created_at ASC
      `
    })

    const messages = messagesResult.rows.map(mapMessageRow)

    const ticket: SupportTicket = {
      id: ticketRow.id,
      ticketNumber: ticketRow.ticket_number,
      subject: ticketRow.subject,
      category: ticketRow.category,
      priority: ticketRow.priority,
      status: ticketRow.status,
      orderId: ticketRow.order_id,
      messages,
      createdAt: ticketRow.created_at,
      updatedAt: ticketRow.updated_at,
      resolvedAt: ticketRow.resolved_at,
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Failed to add reply:', error)
    return NextResponse.json({ error: 'Failed to add reply' }, { status: 500 })
  }
}
