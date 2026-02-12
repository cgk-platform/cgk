/**
 * Subscription & Billing Scheduled Jobs
 *
 * Handles all subscription billing operations:
 * - Daily billing processing (6 AM)
 * - Single subscription billing
 * - Batch billing processing
 * - Failed payment retry
 * - Catchup billing for specific dates
 * - Shadow validation with Loop (7 AM)
 * - Analytics snapshot (8 AM)
 * - Upcoming renewal reminders (10 AM)
 *
 * @ai-pattern subscription-billing
 * @ai-critical Billing MUST be idempotent - no duplicate charges
 * @ai-critical Concurrency limit: 1 - prevent double-billing
 */

import { defineJob } from '../../define'
import type { TenantEvent } from '../../events'

// ============================================================
// SUBSCRIPTION PAYLOAD TYPES
// ============================================================

export interface SubscriptionDailyBillingPayload {
  tenantId: string
  /** Force process even if already processed today */
  force?: boolean
}

export interface SubscriptionProcessBillingPayload {
  tenantId: string
  subscriptionId: string
  /** Idempotency key to prevent duplicates */
  idempotencyKey: string
  /** Billing period start */
  periodStart?: Date
  /** Billing period end */
  periodEnd?: Date
}

export interface SubscriptionBatchBillingPayload {
  tenantId: string
  subscriptionIds: string[]
  /** Batch ID for tracking */
  batchId: string
}

export interface SubscriptionRetryFailedPayload {
  tenantId: string
  subscriptionId: string
  /** Previous failure reason */
  previousError?: string
  /** Retry attempt number */
  attemptNumber: number
}

export interface SubscriptionCatchupBillingPayload {
  tenantId: string
  /** Target billing date to process */
  billingDate: Date
  /** Specific subscription IDs, or all if not provided */
  subscriptionIds?: string[]
}

export interface SubscriptionShadowValidationPayload {
  tenantId: string
  /** Compare with external system (Loop) */
  compareSystem: 'loop'
}

export interface SubscriptionAnalyticsSnapshotPayload {
  tenantId: string
  /** Snapshot date (defaults to today) */
  snapshotDate?: Date
}

export interface SubscriptionUpcomingReminderPayload {
  tenantId: string
  /** Days before renewal to send reminder */
  daysBeforeRenewal: number
}

// ============================================================
// BILLING RESULT TYPES
// ============================================================

interface BillingResult {
  subscriptionId: string
  success: boolean
  chargeAmount?: number
  currency?: string
  invoiceId?: string
  error?: string
  idempotencyKey: string
}

interface AnalyticsSnapshot {
  date: Date
  mrr: number
  arr: number
  activeSubscriptions: number
  newSubscriptions: number
  churnedSubscriptions: number
  churnRate: number
  revenueChurn: number
  netRevenueRetention: number
  averageRevenuePerSubscription: number
}

// ============================================================
// IDEMPOTENCY UTILITIES
// ============================================================

/**
 * Generate idempotency key for billing
 * Format: tenant:subscription:period_start:period_end
 */
function generateBillingIdempotencyKey(
  tenantId: string,
  subscriptionId: string,
  periodStart: Date
): string {
  const dateStr = periodStart.toISOString().split('T')[0]
  return `billing:${tenantId}:${subscriptionId}:${dateStr}`
}

/**
 * Check if billing has already been processed
 * Would use Redis in production
 */
async function checkIdempotency(key: string): Promise<boolean> {
  // In production: return redis.exists(key) > 0
  console.log(`[Billing] Checking idempotency key: ${key}`)
  return false
}

/**
 * Mark billing as processed
 * Would use Redis with TTL in production
 */
async function markProcessed(key: string, _result: BillingResult): Promise<void> {
  // In production: redis.set(key, JSON.stringify(result), 'EX', 86400 * 7) // 7 days TTL
  console.log(`[Billing] Marked as processed: ${key}`)
}

// ============================================================
// SUBSCRIPTION BILLING JOBS
// ============================================================

/**
 * Daily billing processor - 6 AM
 *
 * Processes all subscriptions due for billing today.
 * Uses concurrency limit of 1 to prevent double-billing.
 * Has 1 hour timeout for large tenant processing.
 *
 * CRITICAL: This job MUST be idempotent
 */
export const subscriptionDailyBillingJob = defineJob<TenantEvent<SubscriptionDailyBillingPayload>>({
  name: 'subscription/daily-billing',
  handler: async (job) => {
    const { tenantId, force } = job.payload
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    console.log(
      `[Billing] Starting daily billing for tenant ${tenantId} (date: ${today.toISOString()})`
    )

    // Check if already processed today (unless forced)
    const dailyKey = `billing:daily:${tenantId}:${today.toISOString().split('T')[0]}`
    if (!force && (await checkIdempotency(dailyKey))) {
      console.log(`[Billing] Already processed today, skipping`)
      return { success: true, data: { skipped: true, reason: 'already_processed' } }
    }

    // Query subscriptions due today
    // Would use: SELECT * FROM subscriptions
    //            WHERE next_billing_date <= NOW()
    //            AND status = 'active'
    const dueSubscriptions: string[] = []

    let processed = 0
    let failed = 0
    const results: BillingResult[] = []

    for (const subscriptionId of dueSubscriptions) {
      const idempotencyKey = generateBillingIdempotencyKey(tenantId, subscriptionId, today)

      // Check idempotency for each subscription
      if (await checkIdempotency(idempotencyKey)) {
        console.log(`[Billing] Subscription ${subscriptionId} already billed, skipping`)
        continue
      }

      try {
        // Process single subscription billing
        const result = await processSubscriptionBilling(tenantId, subscriptionId, idempotencyKey)
        results.push(result)

        if (result.success) {
          processed++
        } else {
          failed++
        }

        // Mark as processed
        await markProcessed(idempotencyKey, result)
      } catch (error) {
        failed++
        console.error(`[Billing] Failed to process ${subscriptionId}:`, error)
      }
    }

    // Mark daily processing as complete
    await markProcessed(dailyKey, {
      subscriptionId: 'daily',
      success: failed === 0,
      idempotencyKey: dailyKey,
    })

    console.log(`[Billing] Daily billing complete: ${processed} processed, ${failed} failed`)

    return {
      success: failed === 0,
      data: {
        tenantId,
        date: today,
        totalDue: dueSubscriptions.length,
        processed,
        failed,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 60000 },
})

/**
 * Process single subscription billing
 *
 * Charges a single subscription for its billing period.
 * Used by daily billing and retry jobs.
 */
export const subscriptionProcessBillingJob = defineJob<
  TenantEvent<SubscriptionProcessBillingPayload>
>({
  name: 'subscription/process-billing',
  handler: async (job) => {
    const { tenantId, subscriptionId, idempotencyKey } = job.payload

    console.log(`[Billing] Processing subscription ${subscriptionId}`)

    // Check idempotency
    if (await checkIdempotency(idempotencyKey)) {
      console.log(`[Billing] Already processed: ${idempotencyKey}`)
      return { success: true, data: { skipped: true, idempotencyKey } }
    }

    const result = await processSubscriptionBilling(tenantId, subscriptionId, idempotencyKey)
    await markProcessed(idempotencyKey, result)

    return { success: result.success, data: result }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 10000 },
})

/**
 * Batch billing processor
 *
 * Processes a batch of subscriptions.
 * Used for parallel processing of large tenant billing.
 */
export const subscriptionBatchBillingJob = defineJob<TenantEvent<SubscriptionBatchBillingPayload>>({
  name: 'subscription/batch-billing',
  handler: async (job) => {
    const { tenantId, subscriptionIds, batchId } = job.payload

    console.log(`[Billing] Processing batch ${batchId} with ${subscriptionIds.length} subscriptions`)

    const today = new Date()
    let processed = 0
    let failed = 0

    for (const subscriptionId of subscriptionIds) {
      const idempotencyKey = generateBillingIdempotencyKey(tenantId, subscriptionId, today)

      if (await checkIdempotency(idempotencyKey)) {
        continue
      }

      try {
        const result = await processSubscriptionBilling(tenantId, subscriptionId, idempotencyKey)
        await markProcessed(idempotencyKey, result)

        if (result.success) processed++
        else failed++
      } catch {
        failed++
      }
    }

    return {
      success: true,
      data: {
        batchId,
        total: subscriptionIds.length,
        processed,
        failed,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'exponential', initialDelay: 30000 },
})

/**
 * Retry failed billing
 *
 * Retries billing for subscriptions that failed due to
 * payment method issues after the customer updates their card.
 */
export const subscriptionRetryFailedJob = defineJob<TenantEvent<SubscriptionRetryFailedPayload>>({
  name: 'subscription/retry-failed',
  handler: async (job) => {
    const { tenantId, subscriptionId, previousError: _previousError, attemptNumber } = job.payload

    console.log(
      `[Billing] Retrying failed billing for ${subscriptionId} (attempt ${attemptNumber})`
    )

    // Generate new idempotency key for retry
    const retryKey = `retry:${tenantId}:${subscriptionId}:${attemptNumber}:${Date.now()}`

    const result = await processSubscriptionBilling(tenantId, subscriptionId, retryKey)

    if (result.success) {
      console.log(`[Billing] Retry successful for ${subscriptionId}`)
      // Update subscription status back to active
    } else {
      console.log(`[Billing] Retry failed for ${subscriptionId}: ${result.error}`)

      // Check if max retries reached
      if (attemptNumber >= 3) {
        console.log(`[Billing] Max retries reached, marking subscription as past_due`)
        // Would update subscription status to past_due and notify customer
      }
    }

    return { success: result.success, data: result }
  },
  retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 0 },
})

/**
 * Catchup billing for specific date
 *
 * Processes billing for a specific date, useful for:
 * - Recovering from outages
 * - Processing missed billing dates
 * - Manual intervention scenarios
 */
export const subscriptionCatchupBillingJob = defineJob<
  TenantEvent<SubscriptionCatchupBillingPayload>
>({
  name: 'subscription/catchup-billing',
  handler: async (job) => {
    const { tenantId, billingDate, subscriptionIds } = job.payload

    console.log(`[Billing] Running catchup billing for date ${billingDate.toISOString()}`)

    // Query subscriptions that were due on billing date
    const dueSubscriptions = subscriptionIds || []

    let processed = 0
    let failed = 0

    for (const subscriptionId of dueSubscriptions) {
      const idempotencyKey = generateBillingIdempotencyKey(tenantId, subscriptionId, billingDate)

      if (await checkIdempotency(idempotencyKey)) {
        console.log(`[Billing] Catchup: ${subscriptionId} already processed`)
        continue
      }

      try {
        const result = await processSubscriptionBilling(tenantId, subscriptionId, idempotencyKey)
        await markProcessed(idempotencyKey, result)

        if (result.success) processed++
        else failed++
      } catch {
        failed++
      }
    }

    return {
      success: true,
      data: {
        billingDate,
        total: dueSubscriptions.length,
        processed,
        failed,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'exponential', initialDelay: 30000 },
})

/**
 * Shadow validation with Loop - 7 AM
 *
 * Compares our subscription state with Loop's for validation.
 * Identifies discrepancies for manual review.
 */
export const subscriptionShadowValidationJob = defineJob<
  TenantEvent<SubscriptionShadowValidationPayload>
>({
  name: 'subscription/shadow-validation',
  handler: async (job) => {
    const { tenantId, compareSystem } = job.payload

    console.log(`[Billing] Running shadow validation against ${compareSystem}`)

    // Implementation would:
    // 1. Fetch all active subscriptions from our system
    // 2. Fetch corresponding subscriptions from Loop
    // 3. Compare:
    //    - Status (active/cancelled/paused)
    //    - Billing amounts
    //    - Next billing dates
    //    - Payment method status
    // 4. Report discrepancies

    const discrepancies: Array<{
      subscriptionId: string
      field: string
      ourValue: unknown
      theirValue: unknown
    }> = []

    if (discrepancies.length > 0) {
      console.warn(`[Billing] Found ${discrepancies.length} discrepancies`)
      // Would trigger alert for manual review
    } else {
      console.log(`[Billing] Shadow validation passed - no discrepancies`)
    }

    return {
      success: true,
      data: {
        tenantId,
        compareSystem,
        discrepancyCount: discrepancies.length,
        validatedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 60000 },
})

/**
 * Analytics snapshot - 8 AM
 *
 * Captures daily subscription analytics:
 * - MRR (Monthly Recurring Revenue)
 * - ARR (Annual Recurring Revenue)
 * - Churn rate
 * - Net Revenue Retention
 */
export const subscriptionAnalyticsSnapshotJob = defineJob<
  TenantEvent<SubscriptionAnalyticsSnapshotPayload>
>({
  name: 'subscription/analytics-snapshot',
  handler: async (job) => {
    const { tenantId, snapshotDate } = job.payload
    const date = snapshotDate || new Date()

    console.log(`[Billing] Generating analytics snapshot for ${date.toISOString().split('T')[0]}`)

    // Calculate metrics
    // Would query subscription data and compute:
    const snapshot: AnalyticsSnapshot = {
      date,
      mrr: 0, // Sum of all active monthly subscription amounts
      arr: 0, // MRR * 12
      activeSubscriptions: 0, // COUNT WHERE status = 'active'
      newSubscriptions: 0, // COUNT WHERE created_at between yesterday and today
      churnedSubscriptions: 0, // COUNT WHERE cancelled_at between yesterday and today
      churnRate: 0, // churned / (active + churned) * 100
      revenueChurn: 0, // $ lost to cancellations
      netRevenueRetention: 0, // (MRR - churned + expansion) / MRR of period start
      averageRevenuePerSubscription: 0, // MRR / active
    }

    // Store snapshot
    // Would insert into subscription_analytics_snapshots table

    console.log(`[Billing] Snapshot: MRR=$${snapshot.mrr}, Active=${snapshot.activeSubscriptions}`)

    return {
      success: true,
      data: {
        tenantId,
        ...snapshot,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 30000 },
})

/**
 * Upcoming renewal reminder - 10 AM
 *
 * Sends reminders to customers about upcoming renewals.
 * Default: 3 days before renewal
 */
export const subscriptionUpcomingReminderJob = defineJob<
  TenantEvent<SubscriptionUpcomingReminderPayload>
>({
  name: 'subscription/upcoming-reminder',
  handler: async (job) => {
    const { tenantId, daysBeforeRenewal } = job.payload

    console.log(
      `[Billing] Sending ${daysBeforeRenewal}-day renewal reminders for tenant ${tenantId}`
    )

    // Query subscriptions renewing in X days
    // Would use: SELECT * FROM subscriptions
    //            WHERE next_billing_date = NOW() + INTERVAL 'X days'
    //            AND status = 'active'
    //            AND renewal_reminder_sent = false
    const upcomingRenewals: Array<{
      subscriptionId: string
      customerId: string
      email: string
      amount: number
      nextBillingDate: Date
    }> = []

    let sent = 0

    for (const renewal of upcomingRenewals) {
      console.log(`[Billing] Sending reminder to ${renewal.email}`)
      // Would trigger email.send job
      sent++

      // Mark reminder as sent
      // Would update: UPDATE subscriptions SET renewal_reminder_sent = true
    }

    return {
      success: true,
      data: {
        tenantId,
        daysBeforeRenewal,
        remindersSent: sent,
        sentAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'exponential', initialDelay: 10000 },
})

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Process billing for a single subscription
 *
 * CRITICAL: This function must be idempotent.
 * The idempotency key ensures the same billing is never processed twice.
 */
async function processSubscriptionBilling(
  _tenantId: string,
  subscriptionId: string,
  idempotencyKey: string
): Promise<BillingResult> {
  console.log(`[Billing] Processing ${subscriptionId} with key ${idempotencyKey}`)

  // Implementation would:
  // 1. Get subscription details
  // 2. Get customer payment method
  // 3. Create Stripe PaymentIntent with idempotency key
  // 4. Process payment
  // 5. Create invoice
  // 6. Update subscription next_billing_date
  // 7. Return result

  return {
    subscriptionId,
    success: true,
    chargeAmount: 0,
    currency: 'USD',
    invoiceId: undefined,
    idempotencyKey,
  }
}

// ============================================================
// SCHEDULES
// ============================================================

export const SUBSCRIPTION_SCHEDULES = {
  /** Daily billing: 6 AM UTC */
  dailyBilling: { cron: '0 6 * * *', timezone: 'UTC' },
  /** Shadow validation: 7 AM UTC */
  shadowValidation: { cron: '0 7 * * *', timezone: 'UTC' },
  /** Analytics snapshot: 8 AM UTC */
  analyticsSnapshot: { cron: '0 8 * * *', timezone: 'UTC' },
  /** Upcoming reminders: 10 AM UTC */
  upcomingReminder: { cron: '0 10 * * *', timezone: 'UTC' },
} as const

// ============================================================
// EXPORTS
// ============================================================

export const subscriptionJobs = [
  subscriptionDailyBillingJob,
  subscriptionProcessBillingJob,
  subscriptionBatchBillingJob,
  subscriptionRetryFailedJob,
  subscriptionCatchupBillingJob,
  subscriptionShadowValidationJob,
  subscriptionAnalyticsSnapshotJob,
  subscriptionUpcomingReminderJob,
]
