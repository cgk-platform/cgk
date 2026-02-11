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
      // Update metadata using switch pattern (sql.identifier not supported)
      await updateEntryMetadata(tenantId, queueType, entryId, metadata)
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

/**
 * Update metadata for a queue entry
 * Uses switch statement pattern since @vercel/postgres sql doesn't support identifier()
 */
async function updateEntryMetadata(
  tenantId: string,
  queueType: QueueType,
  entryId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const metadataJson = JSON.stringify(metadata)

  await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`UPDATE review_email_queue SET metadata = metadata || ${metadataJson}::jsonb, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'creator':
        return sql`UPDATE creator_email_queue SET metadata = metadata || ${metadataJson}::jsonb, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'subscription':
        return sql`UPDATE subscription_email_queue SET metadata = metadata || ${metadataJson}::jsonb, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'esign':
        return sql`UPDATE esign_email_queue SET metadata = metadata || ${metadataJson}::jsonb, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'treasury':
        return sql`UPDATE treasury_email_queue SET metadata = metadata || ${metadataJson}::jsonb, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'team_invitation':
        return sql`UPDATE team_invitation_queue SET metadata = metadata || ${metadataJson}::jsonb, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
    }
  })
}
