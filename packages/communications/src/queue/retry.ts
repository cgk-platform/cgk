/**
 * Exponential backoff retry logic for email queue
 *
 * @ai-pattern exponential-backoff
 * @ai-note Retry delay doubles with each attempt: 1m, 2m, 4m, 8m, 16m...
 */

import { sql, withTenant } from '@cgk/db'

import type { QueueEntry, QueueType } from './types.js'

/**
 * Calculate the retry delay based on attempt number using exponential backoff
 *
 * @param attempts - Number of attempts so far
 * @param baseDelayMinutes - Base delay in minutes (default 1)
 * @param maxDelayMinutes - Maximum delay cap in minutes (default 60)
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(
  attempts: number,
  baseDelayMinutes: number = 1,
  maxDelayMinutes: number = 60
): number {
  const delayMinutes = Math.min(baseDelayMinutes * Math.pow(2, attempts), maxDelayMinutes)
  return delayMinutes * 60 * 1000
}

/**
 * Get entries ready for retry with exponential backoff.
 */
export async function getRetryableEntries<T extends QueueEntry>(
  tenantId: string,
  queueType: QueueType,
  limit: number = 20,
  baseDelayMinutes: number = 1
): Promise<T[]> {
  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`
          SELECT * FROM review_email_queue
          WHERE tenant_id = ${tenantId} AND status = 'failed' AND attempts < max_attempts
            AND last_attempt_at < NOW() - (INTERVAL '1 minute' * ${baseDelayMinutes} * POWER(2, attempts))
          ORDER BY last_attempt_at ASC LIMIT ${limit}
        `
      case 'creator':
        return sql`
          SELECT * FROM creator_email_queue
          WHERE tenant_id = ${tenantId} AND status = 'failed' AND attempts < max_attempts
            AND last_attempt_at < NOW() - (INTERVAL '1 minute' * ${baseDelayMinutes} * POWER(2, attempts))
          ORDER BY last_attempt_at ASC LIMIT ${limit}
        `
      case 'subscription':
        return sql`
          SELECT * FROM subscription_email_queue
          WHERE tenant_id = ${tenantId} AND status = 'failed' AND attempts < max_attempts
            AND last_attempt_at < NOW() - (INTERVAL '1 minute' * ${baseDelayMinutes} * POWER(2, attempts))
          ORDER BY last_attempt_at ASC LIMIT ${limit}
        `
      case 'esign':
        return sql`
          SELECT * FROM esign_email_queue
          WHERE tenant_id = ${tenantId} AND status = 'failed' AND attempts < max_attempts
            AND last_attempt_at < NOW() - (INTERVAL '1 minute' * ${baseDelayMinutes} * POWER(2, attempts))
          ORDER BY last_attempt_at ASC LIMIT ${limit}
        `
      case 'treasury':
        return sql`
          SELECT * FROM treasury_email_queue
          WHERE tenant_id = ${tenantId} AND status = 'failed' AND attempts < max_attempts
            AND last_attempt_at < NOW() - (INTERVAL '1 minute' * ${baseDelayMinutes} * POWER(2, attempts))
          ORDER BY last_attempt_at ASC LIMIT ${limit}
        `
      case 'team_invitation':
        return sql`
          SELECT * FROM team_invitation_queue
          WHERE tenant_id = ${tenantId} AND status = 'failed' AND attempts < max_attempts
            AND last_attempt_at < NOW() - (INTERVAL '1 minute' * ${baseDelayMinutes} * POWER(2, attempts))
          ORDER BY last_attempt_at ASC LIMIT ${limit}
        `
    }
  })

  return result.rows as T[]
}

/**
 * Schedule a failed entry for retry
 */
export async function scheduleRetry(
  tenantId: string,
  queueType: QueueType,
  entryId: string,
  scheduledAt?: Date
): Promise<boolean> {
  const scheduleTime = scheduledAt?.toISOString() || null

  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`
          UPDATE review_email_queue
          SET status = 'scheduled', scheduled_at = COALESCE(${scheduleTime}::timestamptz, NOW()),
              error_message = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'failed' AND attempts < max_attempts
          RETURNING id
        `
      case 'creator':
        return sql`
          UPDATE creator_email_queue
          SET status = 'scheduled', scheduled_at = COALESCE(${scheduleTime}::timestamptz, NOW()),
              error_message = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'failed' AND attempts < max_attempts
          RETURNING id
        `
      case 'subscription':
        return sql`
          UPDATE subscription_email_queue
          SET status = 'scheduled', scheduled_at = COALESCE(${scheduleTime}::timestamptz, NOW()),
              error_message = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'failed' AND attempts < max_attempts
          RETURNING id
        `
      case 'esign':
        return sql`
          UPDATE esign_email_queue
          SET status = 'scheduled', scheduled_at = COALESCE(${scheduleTime}::timestamptz, NOW()),
              error_message = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'failed' AND attempts < max_attempts
          RETURNING id
        `
      case 'treasury':
        return sql`
          UPDATE treasury_email_queue
          SET status = 'scheduled', scheduled_at = COALESCE(${scheduleTime}::timestamptz, NOW()),
              error_message = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'failed' AND attempts < max_attempts
          RETURNING id
        `
      case 'team_invitation':
        return sql`
          UPDATE team_invitation_queue
          SET status = 'scheduled', scheduled_at = COALESCE(${scheduleTime}::timestamptz, NOW()),
              error_message = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'failed' AND attempts < max_attempts
          RETURNING id
        `
    }
  })

  return result.rows.length > 0
}

/**
 * Schedule multiple failed entries for retry
 */
export async function scheduleRetryBulk(
  tenantId: string,
  queueType: QueueType,
  entryIds: string[]
): Promise<number> {
  if (entryIds.length === 0) return 0

  // Process entries one at a time since Vercel Postgres doesn't support array parameters well
  let count = 0
  for (const entryId of entryIds) {
    const success = await scheduleRetry(tenantId, queueType, entryId)
    if (success) count++
  }
  return count
}

/**
 * Get permanently failed entries (max attempts reached)
 */
export async function getPermanentlyFailedEntries<T extends QueueEntry>(
  tenantId: string,
  queueType: QueueType,
  limit: number = 100,
  offset: number = 0
): Promise<T[]> {
  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`SELECT * FROM review_email_queue WHERE tenant_id = ${tenantId} AND status = 'failed' AND attempts >= max_attempts ORDER BY last_attempt_at DESC LIMIT ${limit} OFFSET ${offset}`
      case 'creator':
        return sql`SELECT * FROM creator_email_queue WHERE tenant_id = ${tenantId} AND status = 'failed' AND attempts >= max_attempts ORDER BY last_attempt_at DESC LIMIT ${limit} OFFSET ${offset}`
      case 'subscription':
        return sql`SELECT * FROM subscription_email_queue WHERE tenant_id = ${tenantId} AND status = 'failed' AND attempts >= max_attempts ORDER BY last_attempt_at DESC LIMIT ${limit} OFFSET ${offset}`
      case 'esign':
        return sql`SELECT * FROM esign_email_queue WHERE tenant_id = ${tenantId} AND status = 'failed' AND attempts >= max_attempts ORDER BY last_attempt_at DESC LIMIT ${limit} OFFSET ${offset}`
      case 'treasury':
        return sql`SELECT * FROM treasury_email_queue WHERE tenant_id = ${tenantId} AND status = 'failed' AND attempts >= max_attempts ORDER BY last_attempt_at DESC LIMIT ${limit} OFFSET ${offset}`
      case 'team_invitation':
        return sql`SELECT * FROM team_invitation_queue WHERE tenant_id = ${tenantId} AND status = 'failed' AND attempts >= max_attempts ORDER BY last_attempt_at DESC LIMIT ${limit} OFFSET ${offset}`
    }
  })

  return result.rows as T[]
}

/**
 * Reset max attempts and retry a permanently failed entry
 */
export async function resetAndRetry(
  tenantId: string,
  queueType: QueueType,
  entryId: string,
  additionalAttempts: number = 3
): Promise<boolean> {
  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`UPDATE review_email_queue SET status = 'scheduled', scheduled_at = NOW(), max_attempts = max_attempts + ${additionalAttempts}, error_message = NULL, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'failed' RETURNING id`
      case 'creator':
        return sql`UPDATE creator_email_queue SET status = 'scheduled', scheduled_at = NOW(), max_attempts = max_attempts + ${additionalAttempts}, error_message = NULL, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'failed' RETURNING id`
      case 'subscription':
        return sql`UPDATE subscription_email_queue SET status = 'scheduled', scheduled_at = NOW(), max_attempts = max_attempts + ${additionalAttempts}, error_message = NULL, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'failed' RETURNING id`
      case 'esign':
        return sql`UPDATE esign_email_queue SET status = 'scheduled', scheduled_at = NOW(), max_attempts = max_attempts + ${additionalAttempts}, error_message = NULL, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'failed' RETURNING id`
      case 'treasury':
        return sql`UPDATE treasury_email_queue SET status = 'scheduled', scheduled_at = NOW(), max_attempts = max_attempts + ${additionalAttempts}, error_message = NULL, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'failed' RETURNING id`
      case 'team_invitation':
        return sql`UPDATE team_invitation_queue SET status = 'scheduled', scheduled_at = NOW(), max_attempts = max_attempts + ${additionalAttempts}, error_message = NULL, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'failed' RETURNING id`
    }
  })

  return result.rows.length > 0
}

/**
 * Get count of failed entries by error type
 */
export async function getFailedEntriesByErrorType(
  tenantId: string,
  queueType: QueueType
): Promise<Array<{ errorMessage: string; count: number }>> {
  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`SELECT COALESCE(error_message, 'Unknown') as error_message, COUNT(*) as count FROM review_email_queue WHERE tenant_id = ${tenantId} AND status = 'failed' GROUP BY error_message ORDER BY count DESC LIMIT 20`
      case 'creator':
        return sql`SELECT COALESCE(error_message, 'Unknown') as error_message, COUNT(*) as count FROM creator_email_queue WHERE tenant_id = ${tenantId} AND status = 'failed' GROUP BY error_message ORDER BY count DESC LIMIT 20`
      case 'subscription':
        return sql`SELECT COALESCE(error_message, 'Unknown') as error_message, COUNT(*) as count FROM subscription_email_queue WHERE tenant_id = ${tenantId} AND status = 'failed' GROUP BY error_message ORDER BY count DESC LIMIT 20`
      case 'esign':
        return sql`SELECT COALESCE(error_message, 'Unknown') as error_message, COUNT(*) as count FROM esign_email_queue WHERE tenant_id = ${tenantId} AND status = 'failed' GROUP BY error_message ORDER BY count DESC LIMIT 20`
      case 'treasury':
        return sql`SELECT COALESCE(error_message, 'Unknown') as error_message, COUNT(*) as count FROM treasury_email_queue WHERE tenant_id = ${tenantId} AND status = 'failed' GROUP BY error_message ORDER BY count DESC LIMIT 20`
      case 'team_invitation':
        return sql`SELECT COALESCE(error_message, 'Unknown') as error_message, COUNT(*) as count FROM team_invitation_queue WHERE tenant_id = ${tenantId} AND status = 'failed' GROUP BY error_message ORDER BY count DESC LIMIT 20`
    }
  })

  return result.rows.map((row) => ({
    errorMessage: String(row.error_message),
    count: Number(row.count),
  }))
}

/**
 * Check if an entry can be retried
 */
export function canRetry(entry: QueueEntry): boolean {
  return entry.status === 'failed' && entry.attempts < entry.maxAttempts
}

/**
 * Check if an entry is permanently failed
 */
export function isPermanentlyFailed(entry: QueueEntry): boolean {
  return entry.status === 'failed' && entry.attempts >= entry.maxAttempts
}

/**
 * Get time until next retry is available
 */
export function getTimeUntilRetry(entry: QueueEntry, baseDelayMinutes: number = 1): number {
  if (!canRetry(entry)) return -1

  const delay = calculateRetryDelay(entry.attempts, baseDelayMinutes)
  const lastAttempt = entry.lastAttemptAt ? new Date(entry.lastAttemptAt).getTime() : 0
  const nextRetryTime = lastAttempt + delay
  const remaining = nextRetryTime - Date.now()

  return Math.max(0, remaining)
}
