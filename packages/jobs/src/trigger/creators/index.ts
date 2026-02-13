/**
 * Creator Trigger.dev Tasks Index
 *
 * Re-exports all creator-related Trigger.dev tasks:
 * - Payout Processing (14 tasks + 6 scheduled)
 * - Communications (14 tasks + 7 scheduled)
 * - Applications (11 tasks)
 * - Analytics (3 tasks + 3 scheduled)
 *
 * @ai-pattern trigger-tasks
 */

export {
  // Payout notification tasks
  onPaymentAvailableTask,
  onPayoutInitiatedTask,
  onPayoutCompleteTask,
  onPayoutFailedTask,
  // Payout processing tasks
  processInternationalPayoutTask,
  processDomesticPayoutTask,
  // Payout check tasks
  checkPaymentsBecomeAvailableTask,
  checkPendingInternationalPayoutsTask,
  checkPendingDomesticPayoutsTask,
  // Expense & summary tasks
  onTopupSucceededTask,
  dailyExpenseSyncTask,
  monthlyPaymentSummaryTask,
  monthlyPLSnapshotTask,
  onCommissionMaturedTask,
  // Scheduled tasks
  checkPaymentsAvailableScheduledTask,
  checkPendingInternationalScheduledTask,
  checkPendingDomesticScheduledTask,
  dailyExpenseSyncScheduledTask,
  monthlyPaymentSummaryScheduledTask,
  monthlyPLSnapshotScheduledTask,
  // Task collection
  payoutProcessingTasks,
} from './payout-processing'

export {
  // Email queue tasks
  processCreatorEmailQueueTask,
  scheduleCreatorWelcomeSequenceTask,
  cancelCreatorPendingEmailsTask,
  retryFailedCreatorEmailsTask,
  queueCreatorEmailTask,
  queueProjectEmailTask,
  queuePaymentEmailTask,
  // Setup complete task
  onCreatorSetupCompleteTask,
  // Reminder tasks
  creatorProductDeliveryRemindersTask,
  creatorDeadlineRemindersTask,
  creatorNoResponseRemindersTask,
  creatorAbandonedApplicationRemindersTask,
  sendCreatorReminderTask,
  checkApprovalRemindersTask,
  // Scheduled tasks
  processEmailQueueScheduledTask,
  approvalRemindersScheduledTask,
  productDeliveryRemindersScheduledTask,
  deadlineRemindersScheduledTask,
  noResponseRemindersScheduledTask,
  abandonedApplicationRemindersScheduledTask,
  retryFailedEmailsScheduledTask,
  // Task collection
  communicationsTasks,
} from './communications'

export {
  // Application processing tasks
  processCreatorApplicationTask,
  notifyAdminNewApplicationTask,
  trackApplicationAnalyticsTask,
  createPipelineEntryTask,
  // Approval/rejection tasks
  processCreatorApprovalTask,
  processCreatorRejectionTask,
  sendApprovalEmailTask,
  sendRejectionEmailTask,
  // Event handler tasks
  onCreatorAppliedTask,
  onCreatorApprovedTask,
  onCreatorRejectedTask,
  // Task collection
  applicationTasks,
} from './applications'

export {
  // Analytics tasks
  aggregateCreatorDailyMetricsTask,
  generateWeeklyCreatorSummaryTask,
  generateMonthlyCreatorReportTask,
  // Scheduled tasks - renamed to avoid collision with analytics/metrics
  aggregateDailyMetricsScheduledTask as creatorAggregateDailyMetricsScheduledTask,
  generateWeeklySummaryScheduledTask as creatorGenerateWeeklySummaryScheduledTask,
  generateMonthlyReportScheduledTask as creatorGenerateMonthlyReportScheduledTask,
  // Task collection
  creatorAnalyticsTasks,
} from './analytics'

// ============================================================
// COMBINED EXPORTS
// ============================================================

import { payoutProcessingTasks } from './payout-processing'
import { communicationsTasks } from './communications'
import { applicationTasks } from './applications'
import { creatorAnalyticsTasks } from './analytics'

/**
 * All creator tasks combined
 */
export const allCreatorTasks = [
  ...payoutProcessingTasks,
  ...communicationsTasks,
  ...applicationTasks,
  ...creatorAnalyticsTasks,
]
