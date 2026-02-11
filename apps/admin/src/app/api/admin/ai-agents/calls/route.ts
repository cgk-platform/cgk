export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/ai-agents/calls
 * List all voice calls across all agents with filters
 */
export async function GET(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const url = new URL(request.url)

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId || '',
    'ai.calls.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { listVoiceCalls, getVoiceCallStats } = await import('@cgk/ai-agents')

    // Parse filters from query params
    const agentId = url.searchParams.get('agentId') || undefined
    const direction = url.searchParams.get('direction') as 'inbound' | 'outbound' | undefined
    const status = url.searchParams.get('status') as string | undefined
    const creatorId = url.searchParams.get('creatorId') || undefined
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    const includeStats = url.searchParams.get('includeStats') === 'true'

    const result = await withTenant(tenantId, async () => {
      const calls = await listVoiceCalls({
        agentId,
        direction,
        status: status as NonNullable<Parameters<typeof listVoiceCalls>[0]>['status'],
        creatorId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit,
        offset,
      })

      let stats = null
      if (includeStats) {
        stats = await getVoiceCallStats({
          agentId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        })
      }

      return { calls, stats }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching voice calls:', error)
    return NextResponse.json({ error: 'Failed to fetch voice calls' }, { status: 500 })
  }
}
