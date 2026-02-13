/**
 * Atomic claim operations for queue processing
 *
 * @ai-pattern atomic-claim
 * @ai-critical Uses FOR UPDATE SKIP LOCKED to prevent race conditions
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { QueueEntry, QueueStatus, QueueType } from './types.js'

/**
 * Execute a query on the appropriate queue table
 * Since Vercel SQL doesn't support dynamic identifiers, we use switch statements
 */
async function queryQueueTable<T>(
  tenantId: string,
  _queueType: QueueType,
  queryFn: () => Promise<T>
): Promise<T> {
  return withTenant(tenantId, queryFn)
}

/**
 * Atomically claim scheduled entries for processing.
 * Uses FOR UPDATE SKIP LOCKED to prevent race conditions.
 *
 * @ai-pattern atomic-claim
 * @ai-critical This prevents concurrent workers from processing the same entry
 *
 * @param tenantId - Tenant to claim entries for
 * @param queueType - Which queue to claim from
 * @param runId - Unique ID for this processing run
 * @param limit - Maximum entries to claim (default 50)
 */
export async function claimScheduledEntries<T extends QueueEntry>(
  tenantId: string,
  queueType: QueueType,
  runId: string,
  limit: number = 50
): Promise<T[]> {
  const entries = await queryQueueTable(tenantId, queueType, async () => {
    // Use queue-type specific queries since we can't use dynamic table names
    switch (queueType) {
      case 'review':
        return sql`
          WITH to_claim AS (
            SELECT id FROM review_email_queue
            WHERE tenant_id = ${tenantId}
              AND status = 'scheduled'
              AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
          )
          UPDATE review_email_queue q
          SET
            status = 'processing',
            trigger_run_id = ${runId},
            updated_at = NOW()
          FROM to_claim
          WHERE q.id = to_claim.id
          RETURNING q.*
        `
      case 'creator':
        return sql`
          WITH to_claim AS (
            SELECT id FROM creator_email_queue
            WHERE tenant_id = ${tenantId}
              AND status = 'scheduled'
              AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
          )
          UPDATE creator_email_queue q
          SET
            status = 'processing',
            trigger_run_id = ${runId},
            updated_at = NOW()
          FROM to_claim
          WHERE q.id = to_claim.id
          RETURNING q.*
        `
      case 'subscription':
        return sql`
          WITH to_claim AS (
            SELECT id FROM subscription_email_queue
            WHERE tenant_id = ${tenantId}
              AND status = 'scheduled'
              AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
          )
          UPDATE subscription_email_queue q
          SET
            status = 'processing',
            trigger_run_id = ${runId},
            updated_at = NOW()
          FROM to_claim
          WHERE q.id = to_claim.id
          RETURNING q.*
        `
      case 'esign':
        return sql`
          WITH to_claim AS (
            SELECT id FROM esign_email_queue
            WHERE tenant_id = ${tenantId}
              AND status = 'scheduled'
              AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
          )
          UPDATE esign_email_queue q
          SET
            status = 'processing',
            trigger_run_id = ${runId},
            updated_at = NOW()
          FROM to_claim
          WHERE q.id = to_claim.id
          RETURNING q.*
        `
      case 'treasury':
        return sql`
          WITH to_claim AS (
            SELECT id FROM treasury_email_queue
            WHERE tenant_id = ${tenantId}
              AND status = 'scheduled'
              AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
          )
          UPDATE treasury_email_queue q
          SET
            status = 'processing',
            trigger_run_id = ${runId},
            updated_at = NOW()
          FROM to_claim
          WHERE q.id = to_claim.id
          RETURNING q.*
        `
      case 'team_invitation':
        return sql`
          WITH to_claim AS (
            SELECT id FROM team_invitation_queue
            WHERE tenant_id = ${tenantId}
              AND status = 'scheduled'
              AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
          )
          UPDATE team_invitation_queue q
          SET
            status = 'processing',
            trigger_run_id = ${runId},
            updated_at = NOW()
          FROM to_claim
          WHERE q.id = to_claim.id
          RETURNING q.*
        `
    }
  })

  return entries.rows as T[]
}

/**
 * Mark a single entry as processing with claim check.
 * Returns null if already claimed by another worker.
 */
export async function markAsProcessing<T extends QueueEntry>(
  tenantId: string,
  queueType: QueueType,
  entryId: string,
  runId: string
): Promise<T | null> {
  const result = await queryQueueTable(tenantId, queueType, async () => {
    switch (queueType) {
      case 'review':
        return sql`
          UPDATE review_email_queue
          SET status = 'processing', trigger_run_id = ${runId}, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'scheduled'
          RETURNING *
        `
      case 'creator':
        return sql`
          UPDATE creator_email_queue
          SET status = 'processing', trigger_run_id = ${runId}, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'scheduled'
          RETURNING *
        `
      case 'subscription':
        return sql`
          UPDATE subscription_email_queue
          SET status = 'processing', trigger_run_id = ${runId}, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'scheduled'
          RETURNING *
        `
      case 'esign':
        return sql`
          UPDATE esign_email_queue
          SET status = 'processing', trigger_run_id = ${runId}, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'scheduled'
          RETURNING *
        `
      case 'treasury':
        return sql`
          UPDATE treasury_email_queue
          SET status = 'processing', trigger_run_id = ${runId}, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'scheduled'
          RETURNING *
        `
      case 'team_invitation':
        return sql`
          UPDATE team_invitation_queue
          SET status = 'processing', trigger_run_id = ${runId}, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'scheduled'
          RETURNING *
        `
    }
  })

  return (result.rows[0] as T) || null
}

/**
 * Mark entry as sent with message ID
 */
export async function markAsSent(
  tenantId: string,
  queueType: QueueType,
  entryId: string,
  messageId: string
): Promise<void> {
  await queryQueueTable(tenantId, queueType, async () => {
    switch (queueType) {
      case 'review':
        return sql`
          UPDATE review_email_queue
          SET status = 'sent', sent_at = NOW(), resend_message_id = ${messageId}, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'creator':
        return sql`
          UPDATE creator_email_queue
          SET status = 'sent', sent_at = NOW(), resend_message_id = ${messageId}, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'subscription':
        return sql`
          UPDATE subscription_email_queue
          SET status = 'sent', sent_at = NOW(), resend_message_id = ${messageId}, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'esign':
        return sql`
          UPDATE esign_email_queue
          SET status = 'sent', sent_at = NOW(), resend_message_id = ${messageId}, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'treasury':
        return sql`
          UPDATE treasury_email_queue
          SET status = 'sent', sent_at = NOW(), resend_message_id = ${messageId}, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'team_invitation':
        return sql`
          UPDATE team_invitation_queue
          SET status = 'sent', sent_at = NOW(), resend_message_id = ${messageId}, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
    }
  })
}

/**
 * Mark entry as failed and update retry tracking
 */
export async function markAsFailed(
  tenantId: string,
  queueType: QueueType,
  entryId: string,
  errorMessage: string
): Promise<void> {
  await queryQueueTable(tenantId, queueType, async () => {
    switch (queueType) {
      case 'review':
        return sql`
          UPDATE review_email_queue
          SET status = 'failed', attempts = attempts + 1, last_attempt_at = NOW(),
              error_message = ${errorMessage}, trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'creator':
        return sql`
          UPDATE creator_email_queue
          SET status = 'failed', attempts = attempts + 1, last_attempt_at = NOW(),
              error_message = ${errorMessage}, trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'subscription':
        return sql`
          UPDATE subscription_email_queue
          SET status = 'failed', attempts = attempts + 1, last_attempt_at = NOW(),
              error_message = ${errorMessage}, trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'esign':
        return sql`
          UPDATE esign_email_queue
          SET status = 'failed', attempts = attempts + 1, last_attempt_at = NOW(),
              error_message = ${errorMessage}, trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'treasury':
        return sql`
          UPDATE treasury_email_queue
          SET status = 'failed', attempts = attempts + 1, last_attempt_at = NOW(),
              error_message = ${errorMessage}, trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'team_invitation':
        return sql`
          UPDATE team_invitation_queue
          SET status = 'failed', attempts = attempts + 1, last_attempt_at = NOW(),
              error_message = ${errorMessage}, trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
    }
  })
}

/**
 * Mark entry as skipped
 */
export async function markAsSkipped(
  tenantId: string,
  queueType: QueueType,
  entryId: string,
  reason: string,
  skippedBy?: string
): Promise<void> {
  const skippedByValue = skippedBy || null
  await queryQueueTable(tenantId, queueType, async () => {
    switch (queueType) {
      case 'review':
        return sql`
          UPDATE review_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_by = ${skippedByValue},
              skipped_at = NOW(), trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'creator':
        return sql`
          UPDATE creator_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_by = ${skippedByValue},
              skipped_at = NOW(), trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'subscription':
        return sql`
          UPDATE subscription_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_by = ${skippedByValue},
              skipped_at = NOW(), trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'esign':
        return sql`
          UPDATE esign_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_by = ${skippedByValue},
              skipped_at = NOW(), trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'treasury':
        return sql`
          UPDATE treasury_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_by = ${skippedByValue},
              skipped_at = NOW(), trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
      case 'team_invitation':
        return sql`
          UPDATE team_invitation_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_by = ${skippedByValue},
              skipped_at = NOW(), trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId}
        `
    }
  })
}

/**
 * Reset a processing entry back to scheduled (for stale claims)
 */
export async function resetToScheduled(
  tenantId: string,
  queueType: QueueType,
  entryId: string
): Promise<void> {
  await queryQueueTable(tenantId, queueType, async () => {
    switch (queueType) {
      case 'review':
        return sql`
          UPDATE review_email_queue
          SET status = 'scheduled', trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'processing'
        `
      case 'creator':
        return sql`
          UPDATE creator_email_queue
          SET status = 'scheduled', trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'processing'
        `
      case 'subscription':
        return sql`
          UPDATE subscription_email_queue
          SET status = 'scheduled', trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'processing'
        `
      case 'esign':
        return sql`
          UPDATE esign_email_queue
          SET status = 'scheduled', trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'processing'
        `
      case 'treasury':
        return sql`
          UPDATE treasury_email_queue
          SET status = 'scheduled', trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'processing'
        `
      case 'team_invitation':
        return sql`
          UPDATE team_invitation_queue
          SET status = 'scheduled', trigger_run_id = NULL, updated_at = NOW()
          WHERE id = ${entryId} AND tenant_id = ${tenantId} AND status = 'processing'
        `
    }
  })
}

/**
 * Find and reset stale processing entries (processing for too long)
 */
export async function resetStaleProcessingEntries(
  tenantId: string,
  queueType: QueueType,
  staleMinutes: number = 10
): Promise<number> {
  const result = await queryQueueTable(tenantId, queueType, async () => {
    switch (queueType) {
      case 'review':
        return sql`
          UPDATE review_email_queue
          SET status = 'scheduled', trigger_run_id = NULL, updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND status = 'processing'
            AND updated_at < NOW() - INTERVAL '1 minute' * ${staleMinutes}
        `
      case 'creator':
        return sql`
          UPDATE creator_email_queue
          SET status = 'scheduled', trigger_run_id = NULL, updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND status = 'processing'
            AND updated_at < NOW() - INTERVAL '1 minute' * ${staleMinutes}
        `
      case 'subscription':
        return sql`
          UPDATE subscription_email_queue
          SET status = 'scheduled', trigger_run_id = NULL, updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND status = 'processing'
            AND updated_at < NOW() - INTERVAL '1 minute' * ${staleMinutes}
        `
      case 'esign':
        return sql`
          UPDATE esign_email_queue
          SET status = 'scheduled', trigger_run_id = NULL, updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND status = 'processing'
            AND updated_at < NOW() - INTERVAL '1 minute' * ${staleMinutes}
        `
      case 'treasury':
        return sql`
          UPDATE treasury_email_queue
          SET status = 'scheduled', trigger_run_id = NULL, updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND status = 'processing'
            AND updated_at < NOW() - INTERVAL '1 minute' * ${staleMinutes}
        `
      case 'team_invitation':
        return sql`
          UPDATE team_invitation_queue
          SET status = 'scheduled', trigger_run_id = NULL, updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND status = 'processing'
            AND updated_at < NOW() - INTERVAL '1 minute' * ${staleMinutes}
        `
    }
  })

  return result.rowCount ?? 0
}

/**
 * Get entries currently being processed by a specific run
 */
export async function getEntriesByRunId<T extends QueueEntry>(
  tenantId: string,
  queueType: QueueType,
  runId: string
): Promise<T[]> {
  const result = await queryQueueTable(tenantId, queueType, async () => {
    switch (queueType) {
      case 'review':
        return sql`SELECT * FROM review_email_queue WHERE tenant_id = ${tenantId} AND trigger_run_id = ${runId}`
      case 'creator':
        return sql`SELECT * FROM creator_email_queue WHERE tenant_id = ${tenantId} AND trigger_run_id = ${runId}`
      case 'subscription':
        return sql`SELECT * FROM subscription_email_queue WHERE tenant_id = ${tenantId} AND trigger_run_id = ${runId}`
      case 'esign':
        return sql`SELECT * FROM esign_email_queue WHERE tenant_id = ${tenantId} AND trigger_run_id = ${runId}`
      case 'treasury':
        return sql`SELECT * FROM treasury_email_queue WHERE tenant_id = ${tenantId} AND trigger_run_id = ${runId}`
      case 'team_invitation':
        return sql`SELECT * FROM team_invitation_queue WHERE tenant_id = ${tenantId} AND trigger_run_id = ${runId}`
    }
  })

  return result.rows as T[]
}

/**
 * Get entry by ID
 */
export async function getEntryById<T extends QueueEntry>(
  tenantId: string,
  queueType: QueueType,
  entryId: string
): Promise<T | null> {
  const result = await queryQueueTable(tenantId, queueType, async () => {
    switch (queueType) {
      case 'review':
        return sql`SELECT * FROM review_email_queue WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'creator':
        return sql`SELECT * FROM creator_email_queue WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'subscription':
        return sql`SELECT * FROM subscription_email_queue WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'esign':
        return sql`SELECT * FROM esign_email_queue WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'treasury':
        return sql`SELECT * FROM treasury_email_queue WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'team_invitation':
        return sql`SELECT * FROM team_invitation_queue WHERE id = ${entryId} AND tenant_id = ${tenantId}`
    }
  })

  return (result.rows[0] as T) || null
}

/**
 * Update entry status
 */
export async function updateEntryStatus(
  tenantId: string,
  queueType: QueueType,
  entryId: string,
  status: QueueStatus
): Promise<void> {
  await queryQueueTable(tenantId, queueType, async () => {
    switch (queueType) {
      case 'review':
        return sql`UPDATE review_email_queue SET status = ${status}, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'creator':
        return sql`UPDATE creator_email_queue SET status = ${status}, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'subscription':
        return sql`UPDATE subscription_email_queue SET status = ${status}, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'esign':
        return sql`UPDATE esign_email_queue SET status = ${status}, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'treasury':
        return sql`UPDATE treasury_email_queue SET status = ${status}, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
      case 'team_invitation':
        return sql`UPDATE team_invitation_queue SET status = ${status}, updated_at = NOW() WHERE id = ${entryId} AND tenant_id = ${tenantId}`
    }
  })
}
