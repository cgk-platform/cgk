/**
 * Payout Processing Trigger.dev Tasks
 *
 * Trigger.dev task definitions for payout processing:
 * - Payment notifications
 * - Payout orchestration (domestic/international)
 * - Status checking and syncing
 * - Expense tracking and summaries
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 * @ai-critical Financial operations MUST use proper error handling
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type { TenantEvent } from '../../events'
import type {
  PayoutInitiatedPayload,
  MonthlyPaymentSummaryPayload,
  CheckPaymentsAvailablePayload,
  InternationalPayoutPayload,
  DomesticPayoutPayload,
  CheckPendingPayoutsPayload,
  TopupSucceededPayload,
  MonthlyPLSnapshotPayload,
} from '../../handlers/creators/payout-processing'
import type {
  PaymentAvailablePayload,
  PayoutCompletedPayload,
  PayoutFailedPayload,
  ExpenseSyncPayload,
  CommissionMaturedPayload,
} from '../../events'
import { createJobFromPayload, getActiveTenants } from '../utils'
import {
  createPermanentError,
  handleJobResult,
  generateIdempotencyKey,
} from '../errors'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const NOTIFICATION_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 5000,
  maxTimeoutInMs: 60000,
}

const PAYOUT_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 10000,
  maxTimeoutInMs: 120000,
}

const CHECK_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 30000,
  maxTimeoutInMs: 180000,
}

// ============================================================
// PAYMENT NOTIFICATION TASKS
// ============================================================

export const onPaymentAvailableTask = task({
  id: 'payout-on-payment-available',
  retry: NOTIFICATION_RETRY,
  run: async (payload: TenantEvent<PaymentAvailablePayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Payment available notification', { tenantId })

    const { onPaymentAvailableJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await onPaymentAvailableJob.handler(
      createJobFromPayload('payment', payload)
    )

    return handleJobResult(result, 'Payment available notification')
  },
})

export const onPayoutInitiatedTask = task({
  id: 'payout-on-payout-initiated',
  retry: NOTIFICATION_RETRY,
  run: async (payload: TenantEvent<PayoutInitiatedPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Payout initiated notification', { tenantId })

    const { onPayoutInitiatedJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await onPayoutInitiatedJob.handler(
      createJobFromPayload('payout', payload)
    )

    return handleJobResult(result, 'Payout initiated notification')
  },
})

export const onPayoutCompleteTask = task({
  id: 'payout-on-payout-complete',
  retry: NOTIFICATION_RETRY,
  run: async (payload: TenantEvent<PayoutCompletedPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Payout complete notification', { tenantId })

    const { onPayoutCompleteJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await onPayoutCompleteJob.handler(
      createJobFromPayload('payout', payload)
    )

    return handleJobResult(result, 'Payout complete notification')
  },
})

export const onPayoutFailedTask = task({
  id: 'payout-on-payout-failed',
  retry: NOTIFICATION_RETRY,
  run: async (payload: TenantEvent<PayoutFailedPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Payout failed notification', { tenantId })

    const { onPayoutFailedJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await onPayoutFailedJob.handler(
      createJobFromPayload('payout', payload)
    )

    return handleJobResult(result, 'Payout failed notification')
  },
})

// ============================================================
// PAYOUT PROCESSING TASKS
// ============================================================

export const processInternationalPayoutTask = task({
  id: 'payout-process-international',
  retry: PAYOUT_RETRY,
  run: async (payload: TenantEvent<InternationalPayoutPayload>) => {
    const { tenantId, payoutId, idempotencyKey } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    if (!payoutId) {
      throw createPermanentError('payoutId is required', 'MISSING_REQUIRED_FIELD')
    }

    // Generate idempotency key if not provided
    const effectiveIdempotencyKey = idempotencyKey || generateIdempotencyKey(
      tenantId,
      'international_payout',
      payoutId
    )

    logger.info('Processing international payout', {
      tenantId,
      payoutId,
      idempotencyKey: effectiveIdempotencyKey,
    })

    const { processInternationalPayoutJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await processInternationalPayoutJob.handler(
      createJobFromPayload('international', {
        ...payload,
        idempotencyKey: effectiveIdempotencyKey,
      })
    )

    return handleJobResult(result, 'International payout processing')
  },
})

export const processDomesticPayoutTask = task({
  id: 'payout-process-domestic',
  retry: PAYOUT_RETRY,
  run: async (payload: TenantEvent<DomesticPayoutPayload>) => {
    const { tenantId, payoutId, idempotencyKey } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    if (!payoutId) {
      throw createPermanentError('payoutId is required', 'MISSING_REQUIRED_FIELD')
    }

    // Generate idempotency key if not provided
    const effectiveIdempotencyKey = idempotencyKey || generateIdempotencyKey(
      tenantId,
      'domestic_payout',
      payoutId
    )

    logger.info('Processing domestic payout', {
      tenantId,
      payoutId,
      idempotencyKey: effectiveIdempotencyKey,
    })

    const { processDomesticPayoutJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await processDomesticPayoutJob.handler(
      createJobFromPayload('domestic', {
        ...payload,
        idempotencyKey: effectiveIdempotencyKey,
      })
    )

    return handleJobResult(result, 'Domestic payout processing')
  },
})

// ============================================================
// CHECK TASKS
// ============================================================

export const checkPaymentsBecomeAvailableTask = task({
  id: 'payout-check-payments-available',
  retry: CHECK_RETRY,
  run: async (payload: TenantEvent<CheckPaymentsAvailablePayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Checking payments become available', { tenantId })

    const { checkPaymentsBecomeAvailableJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await checkPaymentsBecomeAvailableJob.handler(
      createJobFromPayload('check', payload)
    )

    return handleJobResult(result, 'Check payments available')
  },
})

export const checkPendingInternationalPayoutsTask = task({
  id: 'payout-check-pending-international',
  retry: CHECK_RETRY,
  run: async (payload: TenantEvent<CheckPendingPayoutsPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Checking pending international payouts', { tenantId })

    const { checkPendingInternationalPayoutsJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await checkPendingInternationalPayoutsJob.handler(
      createJobFromPayload('check', payload)
    )

    return handleJobResult(result, 'Check pending international payouts')
  },
})

export const checkPendingDomesticPayoutsTask = task({
  id: 'payout-check-pending-domestic',
  retry: CHECK_RETRY,
  run: async (payload: TenantEvent<CheckPendingPayoutsPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Checking pending domestic payouts', { tenantId })

    const { checkPendingDomesticPayoutsJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await checkPendingDomesticPayoutsJob.handler(
      createJobFromPayload('check', payload)
    )

    return handleJobResult(result, 'Check pending domestic payouts')
  },
})

// ============================================================
// EXPENSE & SUMMARY TASKS
// ============================================================

export const onTopupSucceededTask = task({
  id: 'payout-on-topup-succeeded',
  retry: NOTIFICATION_RETRY,
  run: async (payload: TenantEvent<TopupSucceededPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Processing topup succeeded', { tenantId })

    const { onTopupSucceededJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await onTopupSucceededJob.handler(
      createJobFromPayload('topup', payload)
    )

    return handleJobResult(result, 'Topup succeeded processing')
  },
})

export const dailyExpenseSyncTask = task({
  id: 'payout-daily-expense-sync',
  retry: CHECK_RETRY,
  run: async (payload: TenantEvent<ExpenseSyncPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Running daily expense sync', { tenantId })

    const { dailyExpenseSyncJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await dailyExpenseSyncJob.handler(
      createJobFromPayload('daily', payload)
    )

    return handleJobResult(result, 'Daily expense sync')
  },
})

export const monthlyPaymentSummaryTask = task({
  id: 'payout-monthly-payment-summary',
  retry: CHECK_RETRY,
  run: async (payload: TenantEvent<MonthlyPaymentSummaryPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Generating monthly payment summary', { tenantId })

    const { monthlyPaymentSummaryJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await monthlyPaymentSummaryJob.handler(
      createJobFromPayload('monthly', payload)
    )

    return handleJobResult(result, 'Monthly payment summary')
  },
})

export const monthlyPLSnapshotTask = task({
  id: 'payout-monthly-pl-snapshot',
  retry: CHECK_RETRY,
  run: async (payload: TenantEvent<MonthlyPLSnapshotPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Generating monthly P&L snapshot', { tenantId })

    const { monthlyPLSnapshotJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await monthlyPLSnapshotJob.handler(
      createJobFromPayload('monthly', payload)
    )

    return handleJobResult(result, 'Monthly P&L snapshot')
  },
})

export const onCommissionMaturedTask = task({
  id: 'payout-on-commission-matured',
  retry: NOTIFICATION_RETRY,
  run: async (payload: TenantEvent<CommissionMaturedPayload>) => {
    const { tenantId, commissionId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    // Generate idempotency key for commission maturation
    // This ensures we don't double-credit balances if the task is retried
    const idempotencyKey = commissionId
      ? generateIdempotencyKey(tenantId, 'commission_matured', commissionId)
      : undefined

    logger.info('Processing commission matured', { tenantId, commissionId, idempotencyKey })

    const { onCommissionMaturedJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await onCommissionMaturedJob.handler(
      createJobFromPayload('commission', payload)
    )

    return handleJobResult(result, 'Commission matured processing')
  },
})

// ============================================================
// SCHEDULED TASKS
// ============================================================

export const checkPaymentsAvailableScheduledTask = schedules.task({
  id: 'payout-check-payments-available-scheduled',
  cron: '0 8 * * *', // Daily at 8 AM UTC
  run: async () => {
    logger.info('Running scheduled check payments available')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await checkPaymentsBecomeAvailableTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const checkPendingInternationalScheduledTask = schedules.task({
  id: 'payout-check-pending-international-scheduled',
  cron: '0 * * * *', // Every hour
  run: async () => {
    logger.info('Running scheduled check pending international payouts')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await checkPendingInternationalPayoutsTask.trigger({ tenantId, payoutType: 'international' })
    }
    return { triggered: tenants.length }
  },
})

export const checkPendingDomesticScheduledTask = schedules.task({
  id: 'payout-check-pending-domestic-scheduled',
  cron: '30 * * * *', // Every hour at :30
  run: async () => {
    logger.info('Running scheduled check pending domestic payouts')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await checkPendingDomesticPayoutsTask.trigger({ tenantId, payoutType: 'domestic' })
    }
    return { triggered: tenants.length }
  },
})

export const dailyExpenseSyncScheduledTask = schedules.task({
  id: 'payout-daily-expense-sync-scheduled',
  cron: '0 6 * * *', // Daily at 6 AM UTC
  run: async () => {
    logger.info('Running scheduled daily expense sync')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await dailyExpenseSyncTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const monthlyPaymentSummaryScheduledTask = schedules.task({
  id: 'payout-monthly-payment-summary-scheduled',
  cron: '0 9 1 * *', // 9 AM on 1st of month
  run: async () => {
    logger.info('Running scheduled monthly payment summary')
    const tenants = await getActiveTenants()
    const now = new Date()
    const month = now.getMonth() || 12 // Previous month (0 = Jan -> use 12 for Dec of last year)
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    for (const tenantId of tenants) {
      await monthlyPaymentSummaryTask.trigger({ tenantId, month, year })
    }
    return { triggered: tenants.length }
  },
})

export const monthlyPLSnapshotScheduledTask = schedules.task({
  id: 'payout-monthly-pl-snapshot-scheduled',
  cron: '0 2 2 * *', // 2 AM on 2nd of month
  run: async () => {
    logger.info('Running scheduled monthly P&L snapshot')
    const tenants = await getActiveTenants()
    const now = new Date()
    const month = now.getMonth() || 12
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    for (const tenantId of tenants) {
      await monthlyPLSnapshotTask.trigger({ tenantId, month, year })
    }
    return { triggered: tenants.length }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const payoutProcessingTasks = [
  onPaymentAvailableTask,
  onPayoutInitiatedTask,
  onPayoutCompleteTask,
  onPayoutFailedTask,
  processInternationalPayoutTask,
  processDomesticPayoutTask,
  checkPaymentsBecomeAvailableTask,
  checkPendingInternationalPayoutsTask,
  checkPendingDomesticPayoutsTask,
  onTopupSucceededTask,
  dailyExpenseSyncTask,
  monthlyPaymentSummaryTask,
  monthlyPLSnapshotTask,
  onCommissionMaturedTask,
  checkPaymentsAvailableScheduledTask,
  checkPendingInternationalScheduledTask,
  checkPendingDomesticScheduledTask,
  dailyExpenseSyncScheduledTask,
  monthlyPaymentSummaryScheduledTask,
  monthlyPLSnapshotScheduledTask,
]
