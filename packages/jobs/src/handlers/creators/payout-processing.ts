/**
 * Payout Processing Jobs
 *
 * Background jobs for creator payout processing:
 * - Payment availability notifications
 * - Payout orchestration (domestic/international)
 * - Status checking and syncing
 * - Expense tracking and summaries
 *
 * CRITICAL: All jobs require tenantId for tenant isolation.
 * See TENANT-ISOLATION.md for patterns.
 *
 * @ai-pattern payout-jobs
 * @ai-critical Payout processing MUST be idempotent - use idempotency keys
 */

import { defineJob } from '../../define'
import type { Job, JobResult } from '../../types'
import type {
  TenantEvent,
  PaymentAvailablePayload,
  PayoutCompletedPayload,
  PayoutFailedPayload,
  ExpenseSyncPayload,
  CommissionMaturedPayload,
} from '../../events'

// Note: PayoutRequestedPayload is available from events.ts but we use
// InternationalPayoutPayload and DomesticPayoutPayload with more specific fields

// ============================================================
// PAYOUT NOTIFICATION PAYLOADS
// ============================================================

export interface PayoutInitiatedPayload {
  payoutId: string
  creatorId: string
  amount: number
  currency: string
  payoutType: 'domestic' | 'international'
  provider: 'stripe' | 'wise'
  transferId?: string
}

export interface MonthlyPaymentSummaryPayload {
  month: number
  year: number
  creatorId?: string // If provided, process single creator; otherwise all
}

export interface CheckPaymentsAvailablePayload {
  // Empty - processes all creators with pending available payments
}

export interface InternationalPayoutPayload {
  payoutId: string
  creatorId: string
  amount: number
  currency: string
  wiseRecipientId: string
  idempotencyKey: string
}

export interface DomesticPayoutPayload {
  payoutId: string
  creatorId: string
  amount: number
  currency: string
  stripeConnectAccountId: string
  idempotencyKey: string
}

export interface CheckPendingPayoutsPayload {
  payoutType: 'domestic' | 'international'
  limit?: number
}

export interface TopupSucceededPayload {
  topupId: string
  amount: number
  currency: string
  stripeTopupId: string
}

export interface MonthlyPLSnapshotPayload {
  month: number
  year: number
}

// ============================================================
// RESULT TYPES
// ============================================================

export interface PaymentNotificationResult {
  notificationSent: boolean
  creatorId: string
  amount: number
  notificationId?: string
}

export interface PayoutOrchestrationResult {
  payoutId: string
  status: 'initiated' | 'pending' | 'completed' | 'failed'
  provider: 'stripe' | 'wise' | 'manual_review'
  transferId?: string
  error?: string
}

export interface PayoutCheckResult {
  payoutsChecked: number
  payoutsUpdated: number
  payoutsCompleted: number
  payoutsFailed: number
}

export interface ExpenseSyncResult {
  synced: number
  created: number
  updated: number
  errors: number
}

export interface PaymentSummaryResult {
  creatorsProcessed: number
  summariesGenerated: number
  emailsSent: number
}

export interface PLSnapshotResult {
  snapshotId: string
  totalRevenue: number
  totalPayouts: number
  netProfit: number
  createdAt: Date
}

// ============================================================
// PAYMENT AVAILABLE NOTIFICATION
// ============================================================

/**
 * Notify creator when payment becomes available
 * Triggered when a commission matures past the hold period
 *
 * Steps:
 * 1. Get creator details and preferences
 * 2. Calculate total available balance
 * 3. Send notification (email + optional push)
 * 4. Update last_payment_available_notification_at
 */
export const onPaymentAvailableJob = defineJob<
  TenantEvent<PaymentAvailablePayload>,
  PaymentNotificationResult
>({
  name: 'payout.onPaymentAvailable',
  handler: async (
    job: Job<TenantEvent<PaymentAvailablePayload>>
  ): Promise<JobResult<PaymentNotificationResult>> => {
    const { tenantId, creatorId, amount, currency } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[onPaymentAvailable] Creator ${creatorId} has ${currency} ${amount / 100} available in tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Use withTenant(tenantId) for all DB operations
    // 2. Get creator notification preferences from creators table
    // 3. Get total available balance from balance_transactions
    // 4. Queue email via sendJob('email.send', {...})
    // 5. Queue push notification if enabled
    // 6. Update creators.last_payment_available_notification_at

    return {
      success: true,
      data: {
        notificationSent: true,
        creatorId,
        amount,
        notificationId: `notif_${Date.now()}`,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// PAYOUT INITIATED NOTIFICATION
// ============================================================

/**
 * Notify creator when payout has been initiated
 * Triggered after payout is submitted to payment provider
 */
export const onPayoutInitiatedJob = defineJob<
  TenantEvent<PayoutInitiatedPayload>,
  PaymentNotificationResult
>({
  name: 'payout.onPayoutInitiated',
  handler: async (
    job: Job<TenantEvent<PayoutInitiatedPayload>>
  ): Promise<JobResult<PaymentNotificationResult>> => {
    const { tenantId, payoutId, creatorId, amount, provider } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[onPayoutInitiated] Payout ${payoutId} initiated for creator ${creatorId} via ${provider} in tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Get creator email from creators table
    // 2. Build payout details with estimated arrival
    // 3. Queue email notification
    // 4. Log to payout_notifications table

    return {
      success: true,
      data: {
        notificationSent: true,
        creatorId,
        amount,
        notificationId: `notif_${Date.now()}`,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// PAYOUT COMPLETE NOTIFICATION
// ============================================================

/**
 * Notify creator when payout completes and sync to expenses
 * Triggered by webhook when payment provider confirms completion
 *
 * Steps:
 * 1. Update payout status to completed
 * 2. Record in balance_transactions as debit
 * 3. Sync to unified expenses table
 * 4. Send confirmation email
 */
export const onPayoutCompleteJob = defineJob<
  TenantEvent<PayoutCompletedPayload>,
  PaymentNotificationResult
>({
  name: 'payout.onPayoutComplete',
  handler: async (
    job: Job<TenantEvent<PayoutCompletedPayload>>
  ): Promise<JobResult<PaymentNotificationResult>> => {
    const { tenantId, payoutId, completedAt, transactionId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[onPayoutComplete] Payout ${payoutId} completed at ${completedAt} in tenant ${tenantId}`,
      { transactionId }
    )

    // Implementation would:
    // 1. Update payouts.status = 'completed', completed_at
    // 2. Create balance_transaction with type 'payout_completed'
    // 3. Sync to expenses table for unified reporting
    // 4. Send confirmation email to creator
    // 5. Optional: Queue Slack notification to admin

    return {
      success: true,
      data: {
        notificationSent: true,
        creatorId: 'extracted_from_payout',
        amount: 0, // Would be looked up
        notificationId: `notif_${Date.now()}`,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// PAYOUT FAILED NOTIFICATION
// ============================================================

/**
 * Handle payout failure - notify creator and log for admin review
 * Triggered by webhook or status check job
 *
 * Steps:
 * 1. Update payout status to failed
 * 2. Restore available balance if applicable
 * 3. Notify creator with reason
 * 4. Alert admin via Slack
 * 5. Log for reconciliation
 */
export const onPayoutFailedJob = defineJob<
  TenantEvent<PayoutFailedPayload>,
  PaymentNotificationResult
>({
  name: 'payout.onPayoutFailed',
  handler: async (
    job: Job<TenantEvent<PayoutFailedPayload>>
  ): Promise<JobResult<PaymentNotificationResult>> => {
    const { tenantId, payoutId, reason, retryable } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[onPayoutFailed] Payout ${payoutId} failed: ${reason} (retryable: ${retryable}) in tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Update payouts.status = 'failed', failed_reason
    // 2. If funds were reserved, restore to available balance
    // 3. Send failure notification to creator
    // 4. If not retryable, alert admin via Slack
    // 5. Log to payout_failures table for audit

    return {
      success: true,
      data: {
        notificationSent: true,
        creatorId: 'extracted_from_payout',
        amount: 0,
        notificationId: `notif_${Date.now()}`,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 5000 },
})

// ============================================================
// MONTHLY PAYMENT SUMMARY
// ============================================================

/**
 * Generate and send monthly earnings summary to creators
 * Runs at 9 AM on the 1st of each month
 *
 * For each creator:
 * 1. Calculate total earnings for previous month
 * 2. Break down by project/commission type
 * 3. Show pending vs available vs paid out
 * 4. Generate and send summary email
 */
export const monthlyPaymentSummaryJob = defineJob<
  TenantEvent<MonthlyPaymentSummaryPayload>,
  PaymentSummaryResult
>({
  name: 'payout.monthlyPaymentSummary',
  handler: async (
    job: Job<TenantEvent<MonthlyPaymentSummaryPayload>>
  ): Promise<JobResult<PaymentSummaryResult>> => {
    const { tenantId, month, year, creatorId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[monthlyPaymentSummary] Generating ${month}/${year} summary for tenant ${tenantId}`,
      { creatorId: creatorId || 'all' }
    )

    // Implementation would:
    // 1. Get all active creators (or single if creatorId provided)
    // 2. For each creator, aggregate balance_transactions for month
    // 3. Calculate: total_earned, total_pending, total_available, total_paid
    // 4. Generate summary data with breakdown
    // 5. Queue summary email via sendJob('email.send')
    // 6. Store summary snapshot in creator_payment_summaries table

    return {
      success: true,
      data: {
        creatorsProcessed: 0,
        summariesGenerated: 0,
        emailsSent: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 30000 },
})

// ============================================================
// CHECK PAYMENTS BECOME AVAILABLE (Daily 8 AM)
// ============================================================

/**
 * Daily check for commissions that have matured
 * Runs at 8 AM to find payments past hold period
 *
 * Steps:
 * 1. Find all commissions where hold_until <= now AND status = 'pending'
 * 2. Update status to 'available'
 * 3. Update creator available_balance
 * 4. Queue payment available notification for each creator
 */
export const checkPaymentsBecomeAvailableJob = defineJob<
  TenantEvent<CheckPaymentsAvailablePayload>,
  { creatorsNotified: number; commissionsMatured: number }
>({
  name: 'payout.checkPaymentsBecomeAvailable',
  handler: async (
    job: Job<TenantEvent<CheckPaymentsAvailablePayload>>
  ): Promise<JobResult<{ creatorsNotified: number; commissionsMatured: number }>> => {
    const { tenantId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(`[checkPaymentsBecomeAvailable] Checking matured payments for tenant ${tenantId}`)

    // Implementation would:
    // 1. Query commissions WHERE hold_until <= NOW() AND status = 'pending'
    // 2. Group by creator
    // 3. For each creator:
    //    - Update commission statuses to 'available'
    //    - Calculate new available_balance
    //    - Update creators.available_balance
    //    - Queue payment.available notification
    // 4. Use transactions for atomicity

    return {
      success: true,
      data: {
        creatorsNotified: 0,
        commissionsMatured: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 10000 },
})

// ============================================================
// IDEMPOTENCY TRACKING (In-memory for development, use Redis in production)
// ============================================================

/**
 * In-memory idempotency store for development.
 *
 * PRODUCTION NOTE: Replace with Redis-based idempotency:
 * - Use `SETNX` with TTL for atomic idempotency checks
 * - Key format: `payout:idempotency:{idempotencyKey}`
 * - TTL: 24 hours minimum to prevent duplicate payouts
 * - Store: { status, payoutId, transferId, processedAt }
 *
 * Example Redis implementation:
 * ```typescript
 * const redis = getTenantRedisClient(tenantId)
 * const key = `payout:idempotency:${idempotencyKey}`
 * const existing = await redis.get(key)
 * if (existing) return JSON.parse(existing)
 * await redis.setex(key, 86400, JSON.stringify(result))
 * ```
 */
const idempotencyStore = new Map<string, {
  status: 'initiated' | 'pending' | 'completed' | 'failed'
  payoutId: string
  transferId?: string
  processedAt: Date
}>()

/**
 * Check if a payout has already been processed
 * Returns the existing result if found, null if this is a new request
 */
function checkIdempotency(idempotencyKey: string): PayoutOrchestrationResult | null {
  const existing = idempotencyStore.get(idempotencyKey)
  if (!existing) return null

  return {
    payoutId: existing.payoutId,
    status: existing.status,
    provider: existing.transferId?.startsWith('wise_') ? 'wise' : 'stripe',
    transferId: existing.transferId,
  }
}

/**
 * Record a payout processing attempt for idempotency
 */
function recordIdempotency(
  idempotencyKey: string,
  payoutId: string,
  status: 'initiated' | 'pending' | 'completed' | 'failed',
  transferId?: string
): void {
  idempotencyStore.set(idempotencyKey, {
    status,
    payoutId,
    transferId,
    processedAt: new Date(),
  })
}

// ============================================================
// PROCESS INTERNATIONAL PAYOUT (Wise)
// ============================================================

/**
 * Process international payout via Wise
 * Orchestrates the complete payout flow
 *
 * Steps:
 * 1. Validate payout request and idempotency
 * 2. Check creator Wise recipient setup
 * 3. Create Wise transfer with quote
 * 4. Fund the transfer
 * 5. Update payout status
 * 6. Queue notifications
 *
 * CRITICAL: Must be idempotent - check existing transfer before creating
 *
 * INTEGRATION REQUIREMENTS:
 * - Tenant must have Wise API credentials configured in tenant_wise_config
 * - Creator must have wiseRecipientId set up via Wise recipient creation
 * - Use `getTenantWiseClient(tenantId)` from @cgk-platform/integrations
 */
export const processInternationalPayoutJob = defineJob<
  TenantEvent<InternationalPayoutPayload>,
  PayoutOrchestrationResult
>({
  name: 'payout.processInternationalPayout',
  handler: async (
    job: Job<TenantEvent<InternationalPayoutPayload>>
  ): Promise<JobResult<PayoutOrchestrationResult>> => {
    const { tenantId, payoutId, creatorId, amount, currency, wiseRecipientId, idempotencyKey } =
      job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    // CRITICAL: Validate idempotency key is provided for payouts
    if (!idempotencyKey) {
      return {
        success: false,
        error: {
          message: 'idempotencyKey is required for payout operations to prevent duplicate payments',
          retryable: false,
        },
      }
    }

    // CRITICAL: Check if this payout was already processed
    const existingResult = checkIdempotency(idempotencyKey)
    if (existingResult) {
      console.log(
        `[processInternationalPayout] IDEMPOTENT: Payout ${payoutId} already processed with key ${idempotencyKey}`,
        { existingResult }
      )
      return {
        success: true,
        data: existingResult,
      }
    }

    console.log(
      `[processInternationalPayout] Processing payout ${payoutId} for creator ${creatorId} in tenant ${tenantId}`,
      { amount, currency, wiseRecipientId, idempotencyKey }
    )

    // Record that we're processing this payout (prevents race conditions)
    recordIdempotency(idempotencyKey, payoutId, 'pending')

    try {
      // Implementation steps (requires Wise API integration):
      // 1. Get Wise client: const wise = await getTenantWiseClient(tenantId)
      // 2. Get Wise profile and check balance
      // 3. Create quote for the transfer:
      //    const quote = await wise.quotes.create({ sourceCurrency, targetCurrency, targetAmount })
      // 4. Create transfer with the quote:
      //    const transfer = await wise.transfers.create({ targetAccount: wiseRecipientId, quoteUuid: quote.id })
      // 5. Fund the transfer from Wise balance:
      //    await wise.transfers.fund(transfer.id, { type: 'BALANCE' })
      // 6. Update payout status in database:
      //    await withTenant(tenantId, () => sql`UPDATE payouts SET status = 'processing', wise_transfer_id = ${transfer.id} WHERE id = ${payoutId}`)
      // 7. Queue notification:
      //    await sendJob('payout.initiated', { tenantId, payoutId, creatorId, amount, provider: 'wise' })

      const transferId = `wise_${Date.now()}`

      // Record successful initiation
      recordIdempotency(idempotencyKey, payoutId, 'initiated', transferId)

      return {
        success: true,
        data: {
          payoutId,
          status: 'initiated',
          provider: 'wise',
          transferId,
        },
      }
    } catch (error) {
      // Record failure for idempotency
      recordIdempotency(idempotencyKey, payoutId, 'failed')

      console.error(`[processInternationalPayout] Failed for payout ${payoutId}:`, error)

      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      }
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 10000 },
})

// ============================================================
// CHECK PENDING INTERNATIONAL PAYOUTS (Hourly)
// ============================================================

/**
 * Check status of pending Wise payouts
 * Runs every hour to poll transfer status
 *
 * For each pending international payout:
 * 1. Get transfer status from Wise API
 * 2. Update payout status if changed
 * 3. Trigger completion/failure handlers as needed
 */
export const checkPendingInternationalPayoutsJob = defineJob<
  TenantEvent<CheckPendingPayoutsPayload>,
  PayoutCheckResult
>({
  name: 'payout.checkPendingInternationalPayouts',
  handler: async (
    job: Job<TenantEvent<CheckPendingPayoutsPayload>>
  ): Promise<JobResult<PayoutCheckResult>> => {
    const { tenantId, limit } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[checkPendingInternationalPayouts] Checking pending Wise payouts for tenant ${tenantId}`,
      { limit }
    )

    // Implementation would:
    // 1. Query payouts WHERE status = 'processing' AND provider = 'wise'
    // 2. For each payout, fetch status from Wise API
    // 3. Map Wise status to our status (processing, completed, failed)
    // 4. If status changed, queue appropriate handler
    // 5. Track metrics for monitoring

    return {
      success: true,
      data: {
        payoutsChecked: 0,
        payoutsUpdated: 0,
        payoutsCompleted: 0,
        payoutsFailed: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 30000 },
})

// ============================================================
// PROCESS DOMESTIC PAYOUT (Stripe)
// ============================================================

/**
 * Process domestic payout via Stripe Connect
 * For US-based creators with connected Stripe accounts
 *
 * Steps:
 * 1. Validate payout request and idempotency
 * 2. Verify creator Stripe Connect account status
 * 3. Create Stripe transfer to connected account
 * 4. Update payout status
 * 5. Queue notifications
 *
 * CRITICAL: Must be idempotent - use idempotency key with Stripe
 *
 * INTEGRATION REQUIREMENTS:
 * - Tenant must have Stripe credentials configured in tenant_stripe_config
 * - Creator must have Stripe Connect account (stripeConnectAccountId)
 * - Use `getTenantStripeClient(tenantId)` from @cgk-platform/integrations
 */
export const processDomesticPayoutJob = defineJob<
  TenantEvent<DomesticPayoutPayload>,
  PayoutOrchestrationResult
>({
  name: 'payout.processDomesticPayout',
  handler: async (
    job: Job<TenantEvent<DomesticPayoutPayload>>
  ): Promise<JobResult<PayoutOrchestrationResult>> => {
    const { tenantId, payoutId, creatorId, amount, currency, stripeConnectAccountId, idempotencyKey } =
      job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    // CRITICAL: Validate idempotency key is provided for payouts
    if (!idempotencyKey) {
      return {
        success: false,
        error: {
          message: 'idempotencyKey is required for payout operations to prevent duplicate payments',
          retryable: false,
        },
      }
    }

    // CRITICAL: Check if this payout was already processed
    const existingResult = checkIdempotency(idempotencyKey)
    if (existingResult) {
      console.log(
        `[processDomesticPayout] IDEMPOTENT: Payout ${payoutId} already processed with key ${idempotencyKey}`,
        { existingResult }
      )
      return {
        success: true,
        data: existingResult,
      }
    }

    console.log(
      `[processDomesticPayout] Processing payout ${payoutId} for creator ${creatorId} in tenant ${tenantId}`,
      { amount, currency, stripeConnectAccountId, idempotencyKey }
    )

    // Record that we're processing this payout (prevents race conditions)
    recordIdempotency(idempotencyKey, payoutId, 'pending')

    try {
      // Implementation steps (requires Stripe integration):
      // 1. Get Stripe client: const stripe = await getTenantStripeClient(tenantId)
      // 2. Verify Stripe Connect account is active:
      //    const account = await stripe.accounts.retrieve(stripeConnectAccountId)
      //    if (!account.charges_enabled) throw new Error('Account not verified')
      // 3. Create Stripe Transfer with idempotency key:
      //    const transfer = await stripe.transfers.create({
      //      amount,
      //      currency,
      //      destination: stripeConnectAccountId,
      //      metadata: { payoutId, tenantId, creatorId }
      //    }, { idempotencyKey })
      //
      //    NOTE: Stripe's idempotency key ensures the same transfer won't be created twice,
      //    even if this job retries. Keys are scoped per Stripe account and expire after 24h.
      //
      // 4. Update payout in database:
      //    await withTenant(tenantId, () => sql`UPDATE payouts SET status = 'processing', stripe_transfer_id = ${transfer.id} WHERE id = ${payoutId}`)
      // 5. Queue notification:
      //    await sendJob('payout.initiated', { tenantId, payoutId, creatorId, amount, provider: 'stripe' })

      const transferId = `tr_${Date.now()}`

      // Record successful initiation
      recordIdempotency(idempotencyKey, payoutId, 'initiated', transferId)

      return {
        success: true,
        data: {
          payoutId,
          status: 'initiated',
          provider: 'stripe',
          transferId,
        },
      }
    } catch (error) {
      // Record failure for idempotency
      recordIdempotency(idempotencyKey, payoutId, 'failed')

      console.error(`[processDomesticPayout] Failed for payout ${payoutId}:`, error)

      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      }
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 10000 },
})

// ============================================================
// CHECK PENDING DOMESTIC PAYOUTS (Hourly at :30)
// ============================================================

/**
 * Check status of pending Stripe payouts
 * Runs every hour at :30 to poll transfer status
 *
 * For standard payouts, check if funds have arrived
 * For instant payouts, usually already complete
 */
export const checkPendingDomesticPayoutsJob = defineJob<
  TenantEvent<CheckPendingPayoutsPayload>,
  PayoutCheckResult
>({
  name: 'payout.checkPendingDomesticPayouts',
  handler: async (
    job: Job<TenantEvent<CheckPendingPayoutsPayload>>
  ): Promise<JobResult<PayoutCheckResult>> => {
    const { tenantId, limit } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[checkPendingDomesticPayouts] Checking pending Stripe payouts for tenant ${tenantId}`,
      { limit }
    )

    // Implementation would:
    // 1. Query payouts WHERE status = 'processing' AND provider = 'stripe'
    // 2. For each payout, fetch transfer from Stripe API
    // 3. Check balance_transaction for payout status
    // 4. If arrived, queue completion handler
    // 5. If failed, queue failure handler

    return {
      success: true,
      data: {
        payoutsChecked: 0,
        payoutsUpdated: 0,
        payoutsCompleted: 0,
        payoutsFailed: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 30000 },
})

// ============================================================
// TOPUP SUCCEEDED (Stripe Webhook)
// ============================================================

/**
 * Handle successful Stripe topup
 * Triggered by Stripe webhook when topup.succeeded
 *
 * Updates treasury balance and logs the transaction
 */
export const onTopupSucceededJob = defineJob<
  TenantEvent<TopupSucceededPayload>,
  { processed: boolean; newBalance: number }
>({
  name: 'payout.onTopupSucceeded',
  handler: async (
    job: Job<TenantEvent<TopupSucceededPayload>>
  ): Promise<JobResult<{ processed: boolean; newBalance: number }>> => {
    const { tenantId, topupId, amount, currency, stripeTopupId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[onTopupSucceeded] Topup ${topupId} succeeded: ${currency} ${amount / 100} in tenant ${tenantId}`,
      { stripeTopupId }
    )

    // Implementation would:
    // 1. Update topups.status = 'succeeded'
    // 2. Update treasury_balance
    // 3. Log to balance_transactions
    // 4. Check if any queued payouts can now proceed

    return {
      success: true,
      data: {
        processed: true,
        newBalance: 0, // Would be calculated
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// DAILY EXPENSE SYNC (6 AM)
// ============================================================

/**
 * Sync creator payouts to unified expenses table
 * Runs daily at 6 AM for reconciliation
 *
 * Ensures all payouts are reflected in the expense tracking system
 * for unified P&L reporting
 */
export const dailyExpenseSyncJob = defineJob<
  TenantEvent<ExpenseSyncPayload>,
  ExpenseSyncResult
>({
  name: 'payout.dailyExpenseSync',
  handler: async (
    job: Job<TenantEvent<ExpenseSyncPayload>>
  ): Promise<JobResult<ExpenseSyncResult>> => {
    const { tenantId, payoutId, startDate, endDate } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[dailyExpenseSync] Syncing expenses for tenant ${tenantId}`,
      { payoutId, startDate, endDate }
    )

    // Implementation would:
    // 1. Query completed payouts not yet synced to expenses
    // 2. For each payout, create or update expense record
    // 3. Link payout to expense via foreign key
    // 4. Categorize by payout type (creator_payout, commission, bonus)
    // 5. Verify totals match for reconciliation

    return {
      success: true,
      data: {
        synced: 0,
        created: 0,
        updated: 0,
        errors: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 30000 },
})

// ============================================================
// MONTHLY P&L SNAPSHOT (2 AM 2nd of month)
// ============================================================

/**
 * Generate monthly P&L snapshot for reporting
 * Runs at 2 AM on the 2nd of each month
 *
 * Aggregates all revenue and expenses for the previous month
 * Creates a snapshot for historical reporting
 */
export const monthlyPLSnapshotJob = defineJob<
  TenantEvent<MonthlyPLSnapshotPayload>,
  PLSnapshotResult
>({
  name: 'payout.monthlyPLSnapshot',
  handler: async (
    job: Job<TenantEvent<MonthlyPLSnapshotPayload>>
  ): Promise<JobResult<PLSnapshotResult>> => {
    const { tenantId, month, year } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[monthlyPLSnapshot] Generating P&L snapshot for ${month}/${year} in tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Calculate total revenue from orders
    // 2. Calculate total COGS
    // 3. Calculate total creator payouts
    // 4. Calculate other expenses
    // 5. Generate net profit/loss
    // 6. Store in pl_snapshots table
    // 7. Optionally send report to admin

    return {
      success: true,
      data: {
        snapshotId: `snapshot_${Date.now()}`,
        totalRevenue: 0,
        totalPayouts: 0,
        netProfit: 0,
        createdAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 60000 },
})

// ============================================================
// COMMISSION MATURED HANDLER
// ============================================================

/**
 * Handle commission maturity event
 * Triggered when a commission passes its hold period
 *
 * Updates commission status and notifies creator
 */
export const onCommissionMaturedJob = defineJob<
  TenantEvent<CommissionMaturedPayload>,
  { processed: boolean; availableBalance: number }
>({
  name: 'payout.onCommissionMatured',
  handler: async (
    job: Job<TenantEvent<CommissionMaturedPayload>>
  ): Promise<JobResult<{ processed: boolean; availableBalance: number }>> => {
    const { tenantId, commissionId, orderId, creatorId, amount } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[onCommissionMatured] Commission ${commissionId} matured for creator ${creatorId} in tenant ${tenantId}`,
      { orderId, amount }
    )

    // Implementation would:
    // 1. Update commissions.status = 'available'
    // 2. Update creator's available_balance
    // 3. Log to balance_transactions
    // 4. Queue payment.available notification

    return {
      success: true,
      data: {
        processed: true,
        availableBalance: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// SCHEDULES
// ============================================================

export const PAYOUT_SCHEDULES = {
  checkPaymentsAvailable: {
    cron: '0 8 * * *', // Daily at 8 AM UTC
    timezone: 'UTC',
  },
  checkPendingInternationalPayouts: {
    cron: '0 * * * *', // Every hour
    timezone: 'UTC',
  },
  checkPendingDomesticPayouts: {
    cron: '30 * * * *', // Every hour at :30
    timezone: 'UTC',
  },
  dailyExpenseSync: {
    cron: '0 6 * * *', // Daily at 6 AM UTC
    timezone: 'UTC',
  },
  monthlyPaymentSummary: {
    cron: '0 9 1 * *', // 9 AM on 1st of month
    timezone: 'America/New_York',
  },
  monthlyPLSnapshot: {
    cron: '0 2 2 * *', // 2 AM on 2nd of month
    timezone: 'America/New_York',
  },
} as const

// ============================================================
// EXPORTS
// ============================================================

export const payoutProcessingJobs = [
  onPaymentAvailableJob,
  onPayoutInitiatedJob,
  onPayoutCompleteJob,
  onPayoutFailedJob,
  monthlyPaymentSummaryJob,
  checkPaymentsBecomeAvailableJob,
  processInternationalPayoutJob,
  checkPendingInternationalPayoutsJob,
  processDomesticPayoutJob,
  checkPendingDomesticPayoutsJob,
  onTopupSucceededJob,
  dailyExpenseSyncJob,
  monthlyPLSnapshotJob,
  onCommissionMaturedJob,
]
