/**
 * Email Queue Statistics API
 *
 * GET /api/admin/email-queues/[queueType]/stats
 *   - Returns queue statistics and analytics
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk-platform/auth'
import {
  getAverageSendTimes,
  getDailySendStats,
  getFailedEntriesByErrorType,
  getQueueStats,
  getTemplateStats,
  getUpcomingScheduledCount,
  type QueueType,
} from '@cgk-platform/communications'

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ queueType: string }> }
) {
  try {
    const { tenantId } = await getTenantContext(req)

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
    const days = parseInt(searchParams.get('days') || '30', 10)
    const includeDaily = searchParams.get('includeDaily') !== 'false'
    const includeTemplates = searchParams.get('includeTemplates') !== 'false'
    const includeErrors = searchParams.get('includeErrors') !== 'false'
    const includeUpcoming = searchParams.get('includeUpcoming') !== 'false'
    const includeAvgTimes = searchParams.get('includeAvgTimes') !== 'false'

    // Get base stats
    const stats = await getQueueStats(tenantId, queueType)

    // Build response with optional data
    const response: Record<string, unknown> = {
      stats,
    }

    // Fetch additional statistics in parallel
    const promises: Promise<void>[] = []

    if (includeDaily) {
      promises.push(
        getDailySendStats(tenantId, queueType, days).then((daily) => {
          response.dailyStats = daily
        })
      )
    }

    if (includeTemplates) {
      promises.push(
        getTemplateStats(tenantId, queueType, days).then((templates) => {
          response.templateStats = templates
        })
      )
    }

    if (includeErrors) {
      promises.push(
        getFailedEntriesByErrorType(tenantId, queueType).then((errors) => {
          response.errorBreakdown = errors
        })
      )
    }

    if (includeUpcoming) {
      promises.push(
        getUpcomingScheduledCount(tenantId, queueType, 24).then((upcoming) => {
          response.upcomingByHour = upcoming
        })
      )
    }

    if (includeAvgTimes) {
      promises.push(
        getAverageSendTimes(tenantId, queueType, days).then((avgTimes) => {
          response.averages = avgTimes
        })
      )
    }

    await Promise.all(promises)

    return NextResponse.json(response)
  } catch (error) {
    console.error('[email-queues] stats error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
