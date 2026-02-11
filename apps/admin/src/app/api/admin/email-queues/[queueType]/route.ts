/**
 * Email Queue List and Stats API
 *
 * GET /api/admin/email-queues/[queueType]
 *   - Returns queue entries with filters
 *   - Supports pagination, status filter, date range, email search
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import {
  getQueueEntries,
  getQueueStats,
  type QueueFilters,
  type QueueStatus,
  type QueueType,
} from '@cgk/communications'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const VALID_QUEUE_TYPES: QueueType[] = [
  'review',
  'creator',
  'subscription',
  'esign',
  'treasury',
  'team_invitation',
]

const VALID_STATUSES: QueueStatus[] = [
  'pending',
  'awaiting_delivery',
  'scheduled',
  'processing',
  'sent',
  'skipped',
  'failed',
]

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ queueType: string }> }
) {
  try {
    const { tenantId, userId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const resolvedParams = await params
    const queueType = resolvedParams.queueType as QueueType

    if (!VALID_QUEUE_TYPES.includes(queueType)) {
      return NextResponse.json(
        { error: 'Invalid queue type' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams
    const statusParam = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const email = searchParams.get('email')
    const orderNumber = searchParams.get('orderNumber')
    const templateType = searchParams.get('templateType')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const includeStats = searchParams.get('includeStats') === 'true'

    // Build filters
    const filters: QueueFilters = {
      limit: Math.min(limit, 100),
      offset,
    }

    if (statusParam) {
      const statuses = statusParam.split(',') as QueueStatus[]
      const validStatuses = statuses.filter((s) => VALID_STATUSES.includes(s))
      if (validStatuses.length > 0) {
        filters.status = validStatuses.length === 1 ? validStatuses[0] : validStatuses
      }
    }

    if (startDate) {
      filters.startDate = new Date(startDate)
    }

    if (endDate) {
      filters.endDate = new Date(endDate)
    }

    if (email) {
      filters.email = email
    }

    if (orderNumber) {
      filters.orderNumber = orderNumber
    }

    if (templateType) {
      filters.templateType = templateType
    }

    // Fetch entries
    const { entries, total } = await getQueueEntries(tenantId, queueType, filters)

    // Optionally include stats
    let stats = null
    if (includeStats) {
      stats = await getQueueStats(tenantId, queueType)
    }

    return NextResponse.json({
      entries,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: (filters.offset || 0) + entries.length < total,
      },
      stats,
    })
  } catch (error) {
    console.error('[email-queues] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch queue entries' },
      { status: 500 }
    )
  }
}
