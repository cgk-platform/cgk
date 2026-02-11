export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk/auth'
import { getTicket, updateTicket, type UpdateTicketInput } from '@cgk/support'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/support/tickets/[id]
 * Get ticket details
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const ticket = await getTicket(tenantId, id)

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error fetching ticket:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/support/tickets/[id]
 * Update ticket
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params
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

  const input = body as UpdateTicketInput

  try {
    const ticket = await updateTicket(tenantId, id, input, auth.userId, auth.email)

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Handle status transition errors
    if (message.includes('Invalid status transition')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    console.error('Error updating ticket:', error)
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
}
