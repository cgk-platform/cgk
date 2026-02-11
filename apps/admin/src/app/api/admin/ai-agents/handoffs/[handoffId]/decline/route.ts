export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ handoffId: string }>
}

/**
 * POST /api/admin/ai-agents/handoffs/[handoffId]/decline
 * Decline a handoff
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { handoffId } = await params
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

  // Check permission
  const permissionDenied = await checkPermissionOrRespond(
    request,
    auth.tenantId || '',
    auth.userId,
    'ai.agents.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { declineHandoff, getHandoffById } = await import('@cgk/ai-agents')

    // Validate required field
    if (!body.agentId) {
      return NextResponse.json({ error: 'Missing required field: agentId' }, { status: 400 })
    }

    const handoff = await withTenant(tenantId, async () => {
      // Verify handoff exists
      const existing = await getHandoffById(handoffId)
      if (!existing) {
        return null
      }

      // Decline the handoff
      return declineHandoff(handoffId, body.agentId, body.reason)
    })

    if (!handoff) {
      return NextResponse.json({ error: 'Handoff not found' }, { status: 404 })
    }

    return NextResponse.json({ handoff })
  } catch (error) {
    console.error('Error declining handoff:', error)
    const message = error instanceof Error ? error.message : 'Failed to decline handoff'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
