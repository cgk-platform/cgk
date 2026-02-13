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
import { createJobFromPayload } from '../utils'

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
      throw new Error('tenantId is required')
    }

    logger.info('Payment available notification', { tenantId })

    const { onPaymentAvailableJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await onPaymentAvailableJob.handler(
      createJobFromPayload('payment', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Payment available notification failed')
    }

    return result.data
  },
})

export const onPayoutInitiatedTask = task({
  id: 'payout-on-payout-initiated',
  retry: NOTIFICATION_RETRY,
  run: async (payload: TenantEvent<PayoutInitiatedPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Payout initiated notification', { tenantId })

    const { onPayoutInitiatedJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await onPayoutInitiatedJob.handler(
      createJobFromPayload('payout', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Payout initiated notification failed')
    }

    return result.data
  },
})

export const onPayoutCompleteTask = task({
  id: 'payout-on-payout-complete',
  retry: NOTIFICATION_RETRY,
  run: async (payload: TenantEvent<PayoutCompletedPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Payout complete notification', { tenantId })

    const { onPayoutCompleteJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await onPayoutCompleteJob.handler(
      createJobFromPayload('payout', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Payout complete notification failed')
    }

    return result.data
  },
})

export const onPayoutFailedTask = task({
  id: 'payout-on-payout-failed',
  retry: NOTIFICATION_RETRY,
  run: async (payload: TenantEvent<PayoutFailedPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Payout failed notification', { tenantId })

    const { onPayoutFailedJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await onPayoutFailedJob.handler(
      createJobFromPayload('payout', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Payout failed notification failed')
    }

    return result.data
  },
})

// ============================================================
// PAYOUT PROCESSING TASKS
// ============================================================

export const processInternationalPayoutTask = task({
  id: 'payout-process-international',
  retry: PAYOUT_RETRY,
  run: async (payload: TenantEvent<InternationalPayoutPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing international payout', { tenantId })

    const { processInternationalPayoutJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await processInternationalPayoutJob.handler(
      createJobFromPayload('international', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'International payout processing failed')
    }

    return result.data
  },
})

export const processDomesticPayoutTask = task({
  id: 'payout-process-domestic',
  retry: PAYOUT_RETRY,
  run: async (payload: TenantEvent<DomesticPayoutPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing domestic payout', { tenantId })

    const { processDomesticPayoutJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await processDomesticPayoutJob.handler(
      createJobFromPayload('domestic', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Domestic payout processing failed')
    }

    return result.data
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
      throw new Error('tenantId is required')
    }

    logger.info('Checking payments become available', { tenantId })

    const { checkPaymentsBecomeAvailableJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await checkPaymentsBecomeAvailableJob.handler(
      createJobFromPayload('check', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Check payments available failed')
    }

    return result.data
  },
})

export const checkPendingInternationalPayoutsTask = task({
  id: 'payout-check-pending-international',
  retry: CHECK_RETRY,
  run: async (payload: TenantEvent<CheckPendingPayoutsPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Checking pending international payouts', { tenantId })

    const { checkPendingInternationalPayoutsJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await checkPendingInternationalPayoutsJob.handler(
      createJobFromPayload('check', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Check pending international payouts failed')
    }

    return result.data
  },
})

export const checkPendingDomesticPayoutsTask = task({
  id: 'payout-check-pending-domestic',
  retry: CHECK_RETRY,
  run: async (payload: TenantEvent<CheckPendingPayoutsPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Checking pending domestic payouts', { tenantId })

    const { checkPendingDomesticPayoutsJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await checkPendingDomesticPayoutsJob.handler(
      createJobFromPayload('check', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Check pending domestic payouts failed')
    }

    return result.data
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
      throw new Error('tenantId is required')
    }

    logger.info('Processing topup succeeded', { tenantId })

    const { onTopupSucceededJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await onTopupSucceededJob.handler(
      createJobFromPayload('topup', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Topup succeeded processing failed')
    }

    return result.data
  },
})

export const dailyExpenseSyncTask = task({
  id: 'payout-daily-expense-sync',
  retry: CHECK_RETRY,
  run: async (payload: TenantEvent<ExpenseSyncPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Running daily expense sync', { tenantId })

    const { dailyExpenseSyncJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await dailyExpenseSyncJob.handler(
      createJobFromPayload('daily', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Daily expense sync failed')
    }

    return result.data
  },
})

export const monthlyPaymentSummaryTask = task({
  id: 'payout-monthly-payment-summary',
  retry: CHECK_RETRY,
  run: async (payload: TenantEvent<MonthlyPaymentSummaryPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Generating monthly payment summary', { tenantId })

    const { monthlyPaymentSummaryJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await monthlyPaymentSummaryJob.handler(
      createJobFromPayload('monthly', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Monthly payment summary failed')
    }

    return result.data
  },
})

export const monthlyPLSnapshotTask = task({
  id: 'payout-monthly-pl-snapshot',
  retry: CHECK_RETRY,
  run: async (payload: TenantEvent<MonthlyPLSnapshotPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Generating monthly P&L snapshot', { tenantId })

    const { monthlyPLSnapshotJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await monthlyPLSnapshotJob.handler(
      createJobFromPayload('monthly', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Monthly P&L snapshot failed')
    }

    return result.data
  },
})

export const onCommissionMaturedTask = task({
  id: 'payout-on-commission-matured',
  retry: NOTIFICATION_RETRY,
  run: async (payload: TenantEvent<CommissionMaturedPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing commission matured', { tenantId })

    const { onCommissionMaturedJob } = await import('../../handlers/creators/payout-processing.js')

    const result = await onCommissionMaturedJob.handler(
      createJobFromPayload('commission', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Commission matured processing failed')
    }

    return result.data
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
    const tenants = ['system']
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
    const tenants = ['system']
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
    const tenants = ['system']
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
    const tenants = ['system']
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
    const tenants = ['system']
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
    const tenants = ['system']
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
