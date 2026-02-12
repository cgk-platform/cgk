/**
 * Creator Job Handlers Index
 *
 * Exports all creator-related background jobs:
 * - Payout Processing (12+ tasks)
 * - Communications (15 tasks)
 * - Application Processing
 * - Analytics Aggregation (3 tasks)
 *
 * Total: 30+ creator job handlers
 *
 * @ai-pattern creator-jobs
 */

// ============================================================
// PAYOUT PROCESSING
// ============================================================

export {
  // Jobs
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
  // Job collection
  payoutProcessingJobs,
  // Schedules
  PAYOUT_SCHEDULES,
  // Payload types
  type PayoutInitiatedPayload,
  type MonthlyPaymentSummaryPayload,
  type CheckPaymentsAvailablePayload,
  type InternationalPayoutPayload,
  type DomesticPayoutPayload,
  type CheckPendingPayoutsPayload,
  type TopupSucceededPayload,
  type MonthlyPLSnapshotPayload,
} from './payout-processing'

// ============================================================
// COMMUNICATIONS
// ============================================================

export {
  // Jobs
  processCreatorEmailQueueJob,
  scheduleCreatorWelcomeSequenceJob,
  cancelCreatorPendingEmailsJob,
  retryFailedCreatorEmailsJob,
  queueCreatorEmailJob,
  queueProjectEmailJob,
  queuePaymentEmailJob,
  onCreatorSetupCompleteJob,
  creatorProductDeliveryRemindersJob,
  creatorDeadlineRemindersJob,
  creatorNoResponseRemindersJob,
  creatorAbandonedApplicationRemindersJob,
  sendCreatorReminderJob,
  checkApprovalRemindersJob,
  // Job collection
  creatorCommunicationJobs,
  // Schedules
  COMMUNICATION_SCHEDULES,
  // Payload types
  type ProcessCreatorEmailQueuePayload,
  type ScheduleWelcomeSequencePayload,
  type CancelPendingEmailsPayload,
  type RetryFailedEmailsPayload,
  type QueueCreatorEmailPayload,
  type QueueProjectEmailPayload,
  type QueuePaymentEmailPayload,
  type ProductDeliveryRemindersPayload,
  type DeadlineRemindersPayload,
  type NoResponseRemindersPayload,
  type AbandonedApplicationRemindersPayload,
  type SendCreatorReminderPayload,
  type ApprovalRemindersPayload,
} from './communications'

// ============================================================
// APPLICATION PROCESSING
// ============================================================

export {
  // Jobs
  processCreatorApplicationJob,
  notifyAdminNewApplicationJob,
  trackApplicationAnalyticsJob,
  createPipelineEntryJob,
  processCreatorApprovalJob,
  processCreatorRejectionJob,
  sendApprovalEmailJob,
  sendRejectionEmailJob,
  onCreatorAppliedJob,
  onCreatorApprovedJob,
  onCreatorRejectedJob,
  // Job collection
  applicationProcessingJobs,
  // Payload types
  type ProcessApplicationPayload,
  type NotifyAdminNewApplicationPayload,
  type TrackApplicationAnalyticsPayload,
  type CreatePipelineEntryPayload,
  type ProcessApprovalPayload,
  type ProcessRejectionPayload,
  type SendApprovalEmailPayload,
  type SendRejectionEmailPayload,
} from './application-processing'

// ============================================================
// ANALYTICS AGGREGATION
// ============================================================

export {
  // Jobs
  aggregateCreatorDailyMetricsJob,
  generateWeeklyCreatorSummaryJob,
  generateMonthlyCreatorReportJob,
  // Job collection
  analyticsAggregationJobs,
  // Schedules
  ANALYTICS_AGGREGATION_SCHEDULES,
  // Payload types
  type AggregateCreatorDailyMetricsPayload,
  type GenerateWeeklyCreatorSummaryPayload,
  type GenerateMonthlyCreatorReportPayload,
} from './analytics-aggregation'

// ============================================================
// COMBINED EXPORTS
// ============================================================

import { payoutProcessingJobs } from './payout-processing'
import { creatorCommunicationJobs } from './communications'
import { applicationProcessingJobs } from './application-processing'
import { analyticsAggregationJobs } from './analytics-aggregation'

/**
 * All creator job handlers
 * Total: 30+ jobs
 */
export const allCreatorJobs = [
  ...payoutProcessingJobs,
  ...creatorCommunicationJobs,
  ...applicationProcessingJobs,
  ...analyticsAggregationJobs,
]

/**
 * All creator job schedules combined
 */
export const ALL_CREATOR_SCHEDULES = {
  // Payout schedules
  'payout.checkPaymentsAvailable': { cron: '0 8 * * *', timezone: 'UTC' },
  'payout.checkPendingInternationalPayouts': { cron: '0 * * * *', timezone: 'UTC' },
  'payout.checkPendingDomesticPayouts': { cron: '30 * * * *', timezone: 'UTC' },
  'payout.dailyExpenseSync': { cron: '0 6 * * *', timezone: 'UTC' },
  'payout.monthlyPaymentSummary': { cron: '0 9 1 * *', timezone: 'America/New_York' },
  'payout.monthlyPLSnapshot': { cron: '0 2 2 * *', timezone: 'America/New_York' },

  // Communication schedules
  'creator.processEmailQueue': { cron: '*/5 * * * *', timezone: 'UTC' },
  'creator.checkApprovalReminders': { cron: '0 9 * * *', timezone: 'UTC' },
  'creator.productDeliveryReminders': { cron: '0 10 * * *', timezone: 'UTC' },
  'creator.deadlineReminders': { cron: '0 9 * * *', timezone: 'UTC' },
  'creator.noResponseReminders': { cron: '0 14 * * *', timezone: 'UTC' },
  'creator.abandonedApplicationReminders': { cron: '15 * * * *', timezone: 'UTC' },
  'creator.retryFailedEmails': { cron: '30 * * * *', timezone: 'UTC' },

  // Analytics schedules
  'creator.aggregateDailyMetrics': { cron: '0 3 * * *', timezone: 'UTC' },
  'creator.generateWeeklySummary': { cron: '0 6 * * 0', timezone: 'UTC' },
  'creator.generateMonthlyReport': { cron: '0 4 1 * *', timezone: 'UTC' },
} as const

/**
 * Job count summary
 */
export const CREATOR_JOB_COUNTS = {
  payoutProcessing: payoutProcessingJobs.length,
  communications: creatorCommunicationJobs.length,
  applicationProcessing: applicationProcessingJobs.length,
  analyticsAggregation: analyticsAggregationJobs.length,
  total: allCreatorJobs.length,
} as const
