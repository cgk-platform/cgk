/**
 * Bulk Email Queue Actions API
 *
 * POST /api/admin/email-queues/[queueType]/bulk
 *   - Perform bulk actions (skip, retry, reschedule) on multiple entries
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import {
  performBulkAction,
  type BulkAction,
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

const VALID_ACTIONS: BulkAction[] = ['skip', 'retry', 'reschedule']

export async function POST(
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

    const body = await req.json()
    const { action, entryIds, skipReason, scheduledAt } = body

    // Validate action
    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate entry IDs
    if (!Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json(
        { error: 'entryIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // Limit bulk operations
    if (entryIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 entries per bulk operation' },
        { status: 400 }
      )
    }

    // Validate action-specific requirements
    if (action === 'skip' && !skipReason) {
      return NextResponse.json(
        { error: 'skipReason is required for skip action' },
        { status: 400 }
      )
    }

    // Perform bulk action
    const result = await performBulkAction(
      tenantId,
      queueType,
      action,
      entryIds,
      {
        skipReason,
        skippedBy: userId || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      }
    )

    return NextResponse.json({
      success: result.success,
      action,
      affectedCount: result.affectedCount,
      requestedCount: entryIds.length,
      errors: result.errors,
    })
  } catch (error) {
    console.error('[email-queues] bulk error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk action failed' },
      { status: 500 }
    )
  }
}
