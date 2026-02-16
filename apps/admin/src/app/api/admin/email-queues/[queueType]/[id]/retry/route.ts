/**
 * Retry Email Queue Entry API
 *
 * POST /api/admin/email-queues/[queueType]/[id]/retry
 *   - Retry a failed queue entry
 *   - Optionally specify scheduled time
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk-platform/auth'
import {
  canRetry,
  getEntryById,
  resetAndRetry,
  scheduleRetry,
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ queueType: string; id: string }> }
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
    const entryId = resolvedParams.id

    if (!VALID_QUEUE_TYPES.includes(queueType)) {
      return NextResponse.json(
        { error: 'Invalid queue type' },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => {
      // Empty body is valid for retry requests
      return {}
    })
    const { scheduledAt, forceRetry, additionalAttempts } = body

    // Verify entry exists
    const entry = await getEntryById(tenantId, queueType, entryId)
    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }

    // Check if entry can be retried
    if (entry.status !== 'failed') {
      return NextResponse.json(
        { error: `Cannot retry entry with status '${entry.status}'` },
        { status: 400 }
      )
    }

    let success = false

    if (canRetry(entry)) {
      // Normal retry - within max attempts
      success = await scheduleRetry(
        tenantId,
        queueType,
        entryId,
        scheduledAt ? new Date(scheduledAt) : undefined
      )
    } else if (forceRetry) {
      // Force retry - add more attempts
      success = await resetAndRetry(
        tenantId,
        queueType,
        entryId,
        additionalAttempts || 3
      )
    } else {
      return NextResponse.json(
        {
          error: 'Entry has exhausted max attempts. Use forceRetry to add more attempts.',
          attemptsUsed: entry.attempts,
          maxAttempts: entry.maxAttempts,
        },
        { status: 400 }
      )
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to schedule retry' },
        { status: 500 }
      )
    }

    // Fetch updated entry
    const updatedEntry = await getEntryById(tenantId, queueType, entryId)

    return NextResponse.json({
      success: true,
      entry: updatedEntry,
    })
  } catch (error) {
    console.error('[email-queues] retry error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retry entry' },
      { status: 500 }
    )
  }
}
