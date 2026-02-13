export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk-platform/auth'
import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ handoffId: string }>
}

/**
 * POST /api/admin/ai-agents/handoffs/[handoffId]/accept
 * Accept a handoff
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
    auth.userId,
    auth.tenantId || '',
    'ai.agents.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { acceptHandoff, getHandoffById } = await import('@cgk-platform/ai-agents')

    // Validate required field
    if (!body.agentId) {
      return NextResponse.json({ error: 'Missing required field: agentId' }, { status: 400 })
    }

    const result = await withTenant(tenantId, async () => {
      // Verify handoff exists
      const handoff = await getHandoffById(handoffId)
      if (!handoff) {
        return { error: 'Handoff not found', status: 404 }
      }

      // Accept the handoff
      return acceptHandoff(handoffId, body.agentId)
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ handoff: result.handoff, context: result.context })
  } catch (error) {
    console.error('Error accepting handoff:', error)
    const message = error instanceof Error ? error.message : 'Failed to accept handoff'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
