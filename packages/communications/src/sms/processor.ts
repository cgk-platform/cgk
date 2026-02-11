/**
 * SMS Queue Processor
 *
 * Background job for processing SMS queue entries.
 * Runs periodically to claim and send scheduled SMS.
 *
 * @ai-pattern background-job
 * @ai-critical Respect rate limits and quiet hours
 */

import { isOptedOut } from './opt-out.js'
import {
  sendSms,
} from './provider.js'
import {
  claimScheduledSmsEntries,
  getDailySmsCount,
  markSmsFailed,
  markSmsSent,
  markSmsSkipped,
  resetStaleSmSProcessingEntries,
} from './queue.js'
import { getSmsSettings, getSmsEnabledTenants } from './settings.js'
import { isQuietHours, performComplianceChecks } from './compliance.js'

// ============================================================================
// Processor Types
// ============================================================================

/**
 * Processor configuration
 */
export interface SmsProcessorConfig {
  tenantId: string
  batchSize?: number
  onSent?: (entryId: string, messageSid: string) => void
  onFailed?: (entryId: string, error: string) => void
  onSkipped?: (entryId: string, reason: string) => void
}

/**
 * Processor result
 */
export interface SmsProcessorResult {
  processed: number
  sent: number
  failed: number
  skipped: number
  errors: Array<{ entryId: string; error: string }>
}

// ============================================================================
// Processor Functions
// ============================================================================

/**
 * Process SMS queue for a single tenant
 */
export async function processTenantSmsQueue(
  config: SmsProcessorConfig
): Promise<SmsProcessorResult> {
  const { tenantId, batchSize = 50, onSent, onFailed, onSkipped } = config

  const result: SmsProcessorResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  }

  // Get tenant settings
  const settings = await getSmsSettings(tenantId)

  // Skip if SMS is disabled
  if (!settings.smsEnabled) {
    return result
  }

  // Skip if in quiet hours
  if (isQuietHours(settings)) {
    return result
  }

  // Check daily limit
  const dailyCount = await getDailySmsCount(tenantId)
  if (dailyCount >= settings.dailyLimit) {
    return result
  }

  // Reset any stale processing entries first
  await resetStaleSmSProcessingEntries(tenantId)

  // Claim entries for processing
  const runId = crypto.randomUUID()
  const entries = await claimScheduledSmsEntries(tenantId, runId, batchSize)

  // Calculate delay between sends based on rate limit
  const delayMs = Math.ceil(1000 / settings.messagesPerSecond)

  for (const entry of entries) {
    result.processed++

    // Check opt-out status
    const optedOut = await isOptedOut(tenantId, entry.phoneNumber)
    if (optedOut) {
      await markSmsSkipped(tenantId, entry.id, 'recipient_opted_out')
      result.skipped++
      onSkipped?.(entry.id, 'recipient_opted_out')
      continue
    }

    // Run compliance checks
    const compliance = performComplianceChecks(settings, entry.phoneNumber, optedOut)
    if (!compliance.canSend) {
      await markSmsSkipped(tenantId, entry.id, compliance.skipReason || 'compliance_check_failed')
      result.skipped++
      onSkipped?.(entry.id, compliance.skipReason || 'compliance_check_failed')
      continue
    }

    // Send the SMS
    try {
      const sendResult = await sendSms(tenantId, {
        to: entry.phoneNumber,
        content: entry.content,
      })

      if (sendResult.success && sendResult.messageSid) {
        await markSmsSent(tenantId, entry.id, sendResult.messageSid)
        result.sent++
        onSent?.(entry.id, sendResult.messageSid)
      } else {
        const error = sendResult.error || 'Unknown send error'
        await markSmsFailed(tenantId, entry.id, error)
        result.failed++
        result.errors.push({ entryId: entry.id, error })
        onFailed?.(entry.id, error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await markSmsFailed(tenantId, entry.id, errorMessage)
      result.failed++
      result.errors.push({ entryId: entry.id, error: errorMessage })
      onFailed?.(entry.id, errorMessage)
    }

    // Rate limit delay
    if (entries.indexOf(entry) < entries.length - 1) {
      await sleep(delayMs)
    }
  }

  return result
}

/**
 * Process SMS queue for all enabled tenants
 */
export async function processAllTenantsSmsQueue(
  batchSize: number = 50
): Promise<Map<string, SmsProcessorResult>> {
  const results = new Map<string, SmsProcessorResult>()

  // Get all tenants with SMS enabled
  const tenants = await getSmsEnabledTenants()

  for (const tenantId of tenants) {
    try {
      const result = await processTenantSmsQueue({ tenantId, batchSize })
      results.set(tenantId, result)
    } catch (error) {
      // Log error but continue with other tenants
      results.set(tenantId, {
        processed: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [{
          entryId: 'processor',
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
      })
    }
  }

  return results
}

// ============================================================================
// Job Definitions
// ============================================================================

/**
 * Create SMS processor job definition (for use with job scheduler)
 */
export function createSmsProcessorJob(batchSize: number = 50) {
  return {
    id: 'process-sms-queue',
    schedule: { cron: '* * * * *' }, // Every minute
    run: async () => {
      const results = await processAllTenantsSmsQueue(batchSize)
      return {
        tenantsProcessed: results.size,
        totalSent: Array.from(results.values()).reduce((sum, r) => sum + r.sent, 0),
        totalFailed: Array.from(results.values()).reduce((sum, r) => sum + r.failed, 0),
      }
    },
  }
}

/**
 * Create retry processor job definition
 */
export function createSmsRetryProcessorJob() {
  return {
    id: 'process-sms-retries',
    schedule: { cron: '*/5 * * * *' }, // Every 5 minutes
    run: async () => {
      const tenants = await getSmsEnabledTenants()
      let totalRetried = 0

      for (const tenantId of tenants) {
        const { scheduleRetry, getRetryableSmsEntries } = await import('./queue.js')
        const entries = await getRetryableSmsEntries(tenantId, 20)

        for (const entry of entries) {
          await scheduleRetry(tenantId, entry.id)
          totalRetried++
        }
      }

      return { retriesScheduled: totalRetried }
    },
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Format processor result for logging
 */
export function formatProcessorResult(result: SmsProcessorResult): string {
  return `Processed: ${result.processed}, Sent: ${result.sent}, Failed: ${result.failed}, Skipped: ${result.skipped}`
}

/**
 * Aggregate results from multiple tenants
 */
export function aggregateResults(
  results: Map<string, SmsProcessorResult>
): SmsProcessorResult {
  const aggregate: SmsProcessorResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  }

  for (const result of results.values()) {
    aggregate.processed += result.processed
    aggregate.sent += result.sent
    aggregate.failed += result.failed
    aggregate.skipped += result.skipped
    aggregate.errors.push(...result.errors)
  }

  return aggregate
}
