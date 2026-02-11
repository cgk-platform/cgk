export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk/auth'
import { assignTicket, autoAssignTicket, unassignTicket } from '@cgk/support'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/support/tickets/[id]/assign
 * Assign ticket to an agent (or auto-assign)
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const input = body as { agentId?: string; auto?: boolean }

  try {
    if (input.auto) {
      // Auto-assign to least busy agent
      const agentId = await autoAssignTicket(tenantId, ticketId)

      if (!agentId) {
        return NextResponse.json(
          { error: 'No available agents for auto-assignment' },
          { status: 400 }
        )
      }

      return NextResponse.json({ success: true, agentId })
    }

    if (!input.agentId) {
      return NextResponse.json(
        { error: 'Either agentId or auto=true is required' },
        { status: 400 }
      )
    }

    await assignTicket(tenantId, ticketId, input.agentId, auth.userId, auth.email)
    return NextResponse.json({ success: true, agentId: input.agentId })
  } catch (error) {
    console.error('Error assigning ticket:', error)
    return NextResponse.json(
      { error: 'Failed to assign ticket' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/support/tickets/[id]/assign
 * Unassign ticket
 */
export async function DELETE(request: Request, { params }: RouteParams) {
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

  try {
    await unassignTicket(tenantId, ticketId, auth.userId, auth.email)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unassigning ticket:', error)
    return NextResponse.json(
      { error: 'Failed to unassign ticket' },
      { status: 500 }
    )
  }
}
