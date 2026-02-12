/**
 * Skip Email Queue Entry API
 *
 * POST /api/admin/email-queues/[queueType]/[id]/skip
 *   - Skip a queue entry with reason
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import {
  getEntryById,
  markAsSkipped,
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ queueType: string; id: string }> }
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
    const entryId = resolvedParams.id

    if (!VALID_QUEUE_TYPES.includes(queueType)) {
      return NextResponse.json(
        { error: 'Invalid queue type' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json(
        { error: 'Skip reason is required' },
        { status: 400 }
      )
    }

    // Verify entry exists
    const entry = await getEntryById(tenantId, queueType, entryId)
    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }

    // Check if entry can be skipped
    if (!['pending', 'awaiting_delivery', 'scheduled'].includes(entry.status)) {
      return NextResponse.json(
        { error: `Cannot skip entry with status '${entry.status}'` },
        { status: 400 }
      )
    }

    // Skip the entry
    await markAsSkipped(tenantId, queueType, entryId, reason, userId || undefined)

    // Fetch updated entry
    const updatedEntry = await getEntryById(tenantId, queueType, entryId)

    return NextResponse.json({
      success: true,
      entry: updatedEntry,
    })
  } catch (error) {
    console.error('[email-queues] skip error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to skip entry' },
      { status: 500 }
    )
  }
}
