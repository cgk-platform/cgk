export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk/auth'
import { createTicket, getTickets, type TicketFilters } from '@cgk/support'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/support/tickets
 * List tickets with filters and pagination
 */
export async function GET(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse query parameters
  const url = new URL(request.url)
  const filters: TicketFilters = {
    status: url.searchParams.get('status') as TicketFilters['status'] || undefined,
    priority: url.searchParams.get('priority') as TicketFilters['priority'] || undefined,
    channel: url.searchParams.get('channel') as TicketFilters['channel'] || undefined,
    assignedTo: url.searchParams.get('assignedTo') || undefined,
    unassigned: url.searchParams.get('unassigned') === 'true',
    slaBreached: url.searchParams.get('slaBreached') === 'true' ? true : undefined,
    search: url.searchParams.get('search') || undefined,
    customerEmail: url.searchParams.get('customerEmail') || undefined,
    page: parseInt(url.searchParams.get('page') || '1', 10),
    limit: parseInt(url.searchParams.get('limit') || '20', 10),
    sort: url.searchParams.get('sort') || 'created_at',
    dir: (url.searchParams.get('dir') as 'asc' | 'desc') || 'desc',
  }

  // Parse tags if provided
  const tagsParam = url.searchParams.get('tags')
  if (tagsParam) {
    filters.tags = tagsParam.split(',')
  }

  // Parse dates
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  if (dateFrom) filters.dateFrom = new Date(dateFrom)
  if (dateTo) filters.dateTo = new Date(dateTo)

  try {
    const result = await getTickets(tenantId, filters)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/support/tickets
 * Create a new ticket
 */
export async function POST(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const input = body as {
    subject?: string
    description?: string
    priority?: string
    channel?: string
    customerEmail?: string
    customerName?: string
    customerId?: string
    tags?: string[]
  }

  // Validate required fields
  if (!input.subject || !input.description || !input.customerEmail) {
    return NextResponse.json(
      { error: 'Missing required fields: subject, description, customerEmail' },
      { status: 400 }
    )
  }

  try {
    const ticket = await createTicket(
      tenantId,
      {
        subject: input.subject,
        description: input.description,
        priority: (input.priority as 'low' | 'normal' | 'high' | 'urgent') || 'normal',
        channel: (input.channel as 'email' | 'chat' | 'phone' | 'form' | 'sms') || 'form',
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        customerId: input.customerId,
        tags: input.tags || [],
      },
      auth.userId,
      auth.email
    )

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}
