/**
 * Chat Sessions API
 *
 * GET /api/admin/support/chat - List active chat sessions
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import {
  getActiveSessions,
  getChatQueueStats,
  getChatSessions,
  type ChatSessionFilters,
  type ChatSessionStatus,
} from '@cgk/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const VALID_STATUSES: ChatSessionStatus[] = ['waiting', 'active', 'ended', 'transferred']

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams
    const statusParam = searchParams.get('status')
    const agentId = searchParams.get('agentId')
    const unassigned = searchParams.get('unassigned') === 'true'
    const visitorEmail = searchParams.get('visitorEmail')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const includeStats = searchParams.get('includeStats') === 'true'
    const activeOnly = searchParams.get('activeOnly') === 'true'

    // If activeOnly, return just active sessions with stats
    if (activeOnly) {
      const sessions = await getActiveSessions(tenantId)
      const stats = await getChatQueueStats(tenantId)

      return NextResponse.json({
        sessions,
        stats,
      })
    }

    // Build filters
    const filters: ChatSessionFilters = {
      limit: Math.min(limit, 100),
      page,
    }

    if (statusParam && VALID_STATUSES.includes(statusParam as ChatSessionStatus)) {
      filters.status = statusParam as ChatSessionStatus
    }

    if (agentId) {
      filters.assignedAgentId = agentId
    }

    if (unassigned) {
      filters.unassigned = true
    }

    if (visitorEmail) {
      filters.visitorEmail = visitorEmail
    }

    if (startDate) {
      filters.dateFrom = new Date(startDate)
    }

    if (endDate) {
      filters.dateTo = new Date(endDate)
    }

    const { sessions, total } = await getChatSessions(tenantId, filters)

    // Optionally include queue stats
    let stats = null
    if (includeStats) {
      stats = await getChatQueueStats(tenantId)
    }

    return NextResponse.json({
      sessions,
      pagination: {
        total,
        page: filters.page ?? 1,
        limit: filters.limit ?? 50,
        totalPages: Math.ceil(total / (filters.limit ?? 50)),
      },
      stats,
    })
  } catch (error) {
    console.error('[chat] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chat sessions' },
      { status: 500 }
    )
  }
}
