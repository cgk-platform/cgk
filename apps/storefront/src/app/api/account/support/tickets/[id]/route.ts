/**
 * Support Ticket Detail API
 *
 * Handles fetching individual support ticket with all messages.
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
 * GET /api/account/support/tickets/[id]
 * Returns a single support ticket with all messages
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id: ticketId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get ticket
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

  // Get all messages for this ticket
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
}

/**
 * POST /api/account/support/tickets/[id]
 * Close a support ticket
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

  const body = await request.json()
  const { action } = body

  if (action !== 'close') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const now = new Date().toISOString()

  // Close ticket
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE support_tickets
      SET
        status = 'closed',
        resolved_at = ${now},
        updated_at = ${now}
      WHERE id = ${ticketId}
        AND customer_id = ${session.customerId}
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
}
