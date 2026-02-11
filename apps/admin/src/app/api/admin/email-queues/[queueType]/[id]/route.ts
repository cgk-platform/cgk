/**
 * Email Queue Entry Detail API
 *
 * GET /api/admin/email-queues/[queueType]/[id]
 *   - Returns single queue entry details
 *
 * PATCH /api/admin/email-queues/[queueType]/[id]
 *   - Update entry (reschedule, update metadata)
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import {
  getEntryById,
  rescheduleEntry,
  type QueueType,
} from '@cgk/communications'
import { sql, withTenant } from '@cgk/db'

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

    const entry = await getEntryById(tenantId, queueType, entryId)

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('[email-queues] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch entry' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const { scheduledAt, metadata } = body

    // Get existing entry
    const entry = await getEntryById(tenantId, queueType, entryId)
    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }

    // Update entry
    if (scheduledAt) {
      const success = await rescheduleEntry(
        tenantId,
        entryId,
        new Date(scheduledAt)
      )
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to reschedule entry' },
          { status: 400 }
        )
      }
    }

    if (metadata) {
      // Update metadata
      const tableName = getTableName(queueType)
      await withTenant(tenantId, async () => {
        await sql`
          UPDATE ${sql.identifier([tableName])}
          SET
            metadata = metadata || ${JSON.stringify(metadata)}::jsonb,
            updated_at = NOW()
          WHERE id = ${entryId}
            AND tenant_id = ${tenantId}
        `
      })
    }

    // Fetch updated entry
    const updatedEntry = await getEntryById(tenantId, queueType, entryId)

    return NextResponse.json({ entry: updatedEntry })
  } catch (error) {
    console.error('[email-queues] PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update entry' },
      { status: 500 }
    )
  }
}

function getTableName(queueType: QueueType): string {
  const tables: Record<QueueType, string> = {
    review: 'review_email_queue',
    creator: 'creator_email_queue',
    subscription: 'subscription_email_queue',
    esign: 'esign_email_queue',
    treasury: 'treasury_email_queue',
    team_invitation: 'team_invitation_queue',
  }
  return tables[queueType]
}
