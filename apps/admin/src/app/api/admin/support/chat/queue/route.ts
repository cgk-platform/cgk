/**
 * Chat Queue API
 *
 * GET /api/admin/support/chat/queue - Get queued (waiting) sessions
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk-platform/auth'
import { getChatQueueStats, getQueuedSessions } from '@cgk-platform/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const [sessions, stats] = await Promise.all([
      getQueuedSessions(tenantId),
      getChatQueueStats(tenantId),
    ])

    return NextResponse.json({
      sessions,
      stats,
    })
  } catch (error) {
    console.error('[chat/queue] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch queue' },
      { status: 500 }
    )
  }
}
