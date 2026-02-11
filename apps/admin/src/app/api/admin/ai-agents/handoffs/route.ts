export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/ai-agents/handoffs
 * List all handoffs (optionally filtered)
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

  // Check permission
  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId || '',
    'ai.agents.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const url = new URL(request.url)
    const fromAgentId = url.searchParams.get('fromAgentId') || undefined
    const toAgentId = url.searchParams.get('toAgentId') || undefined
    const status = url.searchParams.get('status') || undefined
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    const { listHandoffs, getHandoffStats } = await import('@cgk/ai-agents')

    const [handoffs, stats] = await withTenant(tenantId, async () => {
      const h = await listHandoffs({
        fromAgentId,
        toAgentId,
        status: status as 'pending' | 'accepted' | 'declined' | 'completed' | undefined,
        limit,
      })
      const s = await getHandoffStats()
      return [h, s]
    })

    return NextResponse.json({ handoffs, stats })
  } catch (error) {
    console.error('Error fetching handoffs:', error)
    return NextResponse.json({ error: 'Failed to fetch handoffs' }, { status: 500 })
  }
}
