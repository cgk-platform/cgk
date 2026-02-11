export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk/auth'
import { updateTicket } from '@cgk/support'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/support/tickets/[id]/close
 * Close a ticket (must be resolved first)
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id: ticketId } = await params
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

  let body: { resolutionNotes?: string } = {}
  try {
    body = await request.json()
  } catch {
    // Empty body is OK
  }

  try {
    const ticket = await updateTicket(
      tenantId,
      ticketId,
      {
        status: 'closed',
        resolutionNotes: body.resolutionNotes,
      },
      auth.userId,
      auth.email
    )

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('Invalid status transition')) {
      return NextResponse.json(
        { error: 'Ticket must be resolved before closing' },
        { status: 400 }
      )
    }

    console.error('Error closing ticket:', error)
    return NextResponse.json(
      { error: 'Failed to close ticket' },
      { status: 500 }
    )
  }
}
