export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk/auth'
import { getAgentByUserId, updateAgentStatus } from '@cgk/support'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/admin/support/agents/[id]/status
 * Update agent online status
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

  // Agents can only update their own status
  const currentAgent = await getAgentByUserId(tenantId, auth.userId)
  if (!currentAgent || (currentAgent.id !== id && !['owner', 'admin', 'super_admin'].includes(auth.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const input = body as { isOnline?: boolean }

  if (typeof input.isOnline !== 'boolean') {
    return NextResponse.json(
      { error: 'isOnline (boolean) is required' },
      { status: 400 }
    )
  }

  try {
    await updateAgentStatus(tenantId, id, input.isOnline)
    return NextResponse.json({ success: true, isOnline: input.isOnline })
  } catch (error) {
    console.error('Error updating agent status:', error)
    return NextResponse.json(
      { error: 'Failed to update agent status' },
      { status: 500 }
    )
  }
}
