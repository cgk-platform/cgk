/**
 * Bulk queue operations
 *
 * @ai-pattern bulk-operations
 * @ai-note Handle multiple entries at once for admin actions
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { BulkAction, BulkActionResult, QueueType } from './types.js'
import { markAsSkipped } from './claim.js'
import { scheduleRetry } from './retry.js'

/**
 * Perform a bulk action on multiple queue entries
 *
 * @ai-pattern bulk-action
 * @ai-note Returns count and errors for partial failures
 */
export async function performBulkAction(
  tenantId: string,
  queueType: QueueType,
  action: BulkAction,
  entryIds: string[],
  options: {
    skipReason?: string
    skippedBy?: string
    scheduledAt?: Date
  } = {}
): Promise<BulkActionResult> {
  if (entryIds.length === 0) {
    return { success: true, affectedCount: 0, errors: [] }
  }

  const errors: Array<{ id: string; error: string }> = []
  let affectedCount = 0

  try {
    switch (action) {
      case 'skip': {
        for (const entryId of entryIds) {
          try {
            await markAsSkipped(
              tenantId,
              queueType,
              entryId,
              options.skipReason || 'Bulk skipped',
              options.skippedBy
            )
            affectedCount++
          } catch (error) {
            errors.push({
              id: entryId,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
        break
      }

      case 'retry': {
        for (const entryId of entryIds) {
          try {
            const success = await scheduleRetry(
              tenantId,
              queueType,
              entryId,
              options.scheduledAt
            )
            if (success) affectedCount++
          } catch (error) {
            errors.push({
              id: entryId,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
        break
      }

      case 'reschedule': {
        const scheduledAtStr = options.scheduledAt?.toISOString() || new Date().toISOString()
        for (const entryId of entryIds) {
          try {
            await rescheduleEntry(tenantId, queueType, entryId, scheduledAtStr)
            affectedCount++
          } catch (error) {
            errors.push({
              id: entryId,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
        break
      }
    }

    return {
      success: errors.length === 0,
      affectedCount,
      errors,
    }
  } catch (error) {
    return {
      success: false,
      affectedCount: 0,
      errors: [
        {
          id: 'bulk',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    }
  }
}

/**
 * Helper to reschedule a single entry
 */
async function rescheduleEntry(
  tenantId: string,
  queueType: QueueType,
  entryId: string,
  scheduledAtStr: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`UPDATE review_email_queue SET scheduled_at = ${scheduledAtStr}::timestamptz, status = 'scheduled', updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'creator':
        return sql`UPDATE creator_email_queue SET scheduled_at = ${scheduledAtStr}::timestamptz, status = 'scheduled', updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'subscription':
        return sql`UPDATE subscription_email_queue SET scheduled_at = ${scheduledAtStr}::timestamptz, status = 'scheduled', updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'esign':
        return sql`UPDATE esign_email_queue SET scheduled_at = ${scheduledAtStr}::timestamptz, status = 'scheduled', updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'treasury':
        return sql`UPDATE treasury_email_queue SET scheduled_at = ${scheduledAtStr}::timestamptz, status = 'scheduled', updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'team_invitation':
        return sql`UPDATE team_invitation_queue SET scheduled_at = ${scheduledAtStr}::timestamptz, status = 'scheduled', updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
    }
  })
}

/**
 * Skip all entries matching filters (review queue only for now)
 */
export async function bulkSkipByFilter(
  tenantId: string,
  queueType: QueueType,
  filters: {
    email?: string
    templateType?: string
    beforeDate?: Date
  },
  reason: string,
  skippedBy?: string
): Promise<number> {
  const skippedByValue = skippedBy || null
  const beforeDateStr = filters.beforeDate?.toISOString() || null

  const result = await withTenant(tenantId, async () => {
    // Only support review queue for now
    if (queueType !== 'review') {
      return { rowCount: 0 }
    }

    if (filters.email) {
      return sql`
        UPDATE review_email_queue
        SET status = 'skipped', skip_reason = ${reason}, skipped_by = ${skippedByValue}, skipped_at = NOW(), updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND customer_email = ${filters.email}
          AND status IN ('pending', 'awaiting_delivery', 'scheduled')
      `
    } else if (filters.templateType) {
      return sql`
        UPDATE review_email_queue
        SET status = 'skipped', skip_reason = ${reason}, skipped_by = ${skippedByValue}, skipped_at = NOW(), updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND template_type = ${filters.templateType}
          AND status IN ('pending', 'awaiting_delivery', 'scheduled')
      `
    } else if (beforeDateStr) {
      return sql`
        UPDATE review_email_queue
        SET status = 'skipped', skip_reason = ${reason}, skipped_by = ${skippedByValue}, skipped_at = NOW(), updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND scheduled_at < ${beforeDateStr}::timestamptz
          AND status IN ('pending', 'awaiting_delivery', 'scheduled')
      `
    }

    return { rowCount: 0 }
  })

  return result.rowCount ?? 0
}

/**
 * Retry all failed entries matching filters (review queue only)
 */
export async function bulkRetryByFilter(
  tenantId: string,
  queueType: QueueType,
  filters: {
    email?: string
    templateType?: string
    errorContains?: string
  }
): Promise<number> {
  const result = await withTenant(tenantId, async () => {
    // Only support review queue for now
    if (queueType !== 'review') {
      return { rowCount: 0 }
    }

    if (filters.email) {
      return sql`
        UPDATE review_email_queue
        SET status = 'scheduled', scheduled_at = NOW(), error_message = NULL, updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND customer_email = ${filters.email}
          AND status = 'failed' AND attempts < max_attempts
      `
    } else if (filters.templateType) {
      return sql`
        UPDATE review_email_queue
        SET status = 'scheduled', scheduled_at = NOW(), error_message = NULL, updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND template_type = ${filters.templateType}
          AND status = 'failed' AND attempts < max_attempts
      `
    }

    return { rowCount: 0 }
  })

  return result.rowCount ?? 0
}

/**
 * Reschedule all entries in a date range (review queue only)
 */
export async function bulkRescheduleByDateRange(
  tenantId: string,
  queueType: QueueType,
  fromDate: Date,
  toDate: Date,
  newScheduledAt: Date
): Promise<number> {
  const fromDateStr = fromDate.toISOString()
  const toDateStr = toDate.toISOString()
  const newScheduledAtStr = newScheduledAt.toISOString()

  const result = await withTenant(tenantId, async () => {
    if (queueType !== 'review') {
      return { rowCount: 0 }
    }

    return sql`
      UPDATE review_email_queue
      SET scheduled_at = ${newScheduledAtStr}::timestamptz, updated_at = NOW()
      WHERE tenant_id = ${tenantId} AND status = 'scheduled'
        AND scheduled_at >= ${fromDateStr}::timestamptz
        AND scheduled_at <= ${toDateStr}::timestamptz
    `
  })

  return result.rowCount ?? 0
}

/**
 * Delete old entries (cleanup)
 */
export async function deleteOldEntries(
  tenantId: string,
  queueType: QueueType,
  olderThanDays: number = 90
): Promise<number> {
  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`DELETE FROM review_email_queue WHERE tenant_id = ${tenantId} AND status IN ('sent', 'skipped') AND created_at < NOW() - INTERVAL '1 day' * ${olderThanDays}`
      case 'creator':
        return sql`DELETE FROM creator_email_queue WHERE tenant_id = ${tenantId} AND status IN ('sent', 'skipped') AND created_at < NOW() - INTERVAL '1 day' * ${olderThanDays}`
      case 'subscription':
        return sql`DELETE FROM subscription_email_queue WHERE tenant_id = ${tenantId} AND status IN ('sent', 'skipped') AND created_at < NOW() - INTERVAL '1 day' * ${olderThanDays}`
      case 'esign':
        return sql`DELETE FROM esign_email_queue WHERE tenant_id = ${tenantId} AND status IN ('sent', 'skipped') AND created_at < NOW() - INTERVAL '1 day' * ${olderThanDays}`
      case 'treasury':
        return sql`DELETE FROM treasury_email_queue WHERE tenant_id = ${tenantId} AND status IN ('sent', 'skipped') AND created_at < NOW() - INTERVAL '1 day' * ${olderThanDays}`
      case 'team_invitation':
        return sql`DELETE FROM team_invitation_queue WHERE tenant_id = ${tenantId} AND status IN ('sent', 'skipped') AND created_at < NOW() - INTERVAL '1 day' * ${olderThanDays}`
    }
  })

  return result.rowCount ?? 0
}

/**
 * Archive old entries to a separate table (stub - not implemented)
 */
export async function archiveOldEntries(
  _tenantId: string,
  _queueType: QueueType,
  _olderThanDays: number = 90
): Promise<number> {
  // Archive tables not implemented yet
  return 0
}

/**
 * Get IDs of entries matching filters (review queue only)
 */
export async function getMatchingEntryIds(
  tenantId: string,
  queueType: QueueType,
  filters: {
    status?: string[]
    email?: string
    templateType?: string
    beforeDate?: Date
    afterDate?: Date
  },
  limit: number = 1000
): Promise<string[]> {
  if (queueType !== 'review') {
    return []
  }

  const result = await withTenant(tenantId, async () => {
    // Build query based on which filters are provided
    if (filters.email) {
      return sql`SELECT id FROM review_email_queue WHERE tenant_id = ${tenantId} AND customer_email = ${filters.email} LIMIT ${limit}`
    } else if (filters.templateType) {
      return sql`SELECT id FROM review_email_queue WHERE tenant_id = ${tenantId} AND template_type = ${filters.templateType} LIMIT ${limit}`
    } else {
      return sql`SELECT id FROM review_email_queue WHERE tenant_id = ${tenantId} LIMIT ${limit}`
    }
  })

  return result.rows.map((row) => String(row.id))
}
