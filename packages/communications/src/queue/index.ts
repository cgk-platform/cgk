/**
 * Email Queue Module
 *
 * @ai-pattern email-queue
 * @ai-required Always use tenant-scoped operations
 *
 * @example
 * ```ts
 * import { claimScheduledEntries, markAsSent } from '@cgk/communications/queue'
 *
 * // Claim entries for processing
 * const entries = await claimScheduledEntries(tenantId, 'review', runId, 50)
 *
 * // Process each entry
 * for (const entry of entries) {
 *   const result = await sendEmail(entry)
 *   if (result.success) {
 *     await markAsSent(tenantId, 'review', entry.id, result.messageId)
 *   } else {
 *     await markAsFailed(tenantId, 'review', entry.id, result.error)
 *   }
 * }
 * ```
 */

// Types
export type {
  BaseQueueEntry,
  BulkAction,
  BulkActionResult,
  CreateQueueEntryInput,
  CreatorQueueEntry,
  EsignQueueEntry,
  QueueEntry,
  QueueFilters,
  QueueStats,
  QueueStatus,
  QueueType,
  ReviewQueueEntry,
  SendResult,
  SubscriptionQueueEntry,
  TeamInvitationQueueEntry,
  TreasuryQueueEntry,
  TriggerEvent,
} from './types.js'

// Claim operations
export {
  claimScheduledEntries,
  getEntriesByRunId,
  getEntryById,
  markAsFailed,
  markAsProcessing,
  markAsSent,
  markAsSkipped,
  resetStaleProcessingEntries,
  resetToScheduled,
  updateEntryStatus,
} from './claim.js'

// Sequence operations
export {
  createFollowUpEntry,
  createReviewFollowUp,
  generateSequenceId,
  getEntriesForOrder,
  getLatestEntryForOrder,
  getSequenceEntries,
  getSentCountForOrder,
  hasAnyEntrySent,
  skipPendingEntriesForEmail,
  skipPendingEntriesForOrder,
} from './sequence.js'

// Retry operations
export {
  calculateRetryDelay,
  canRetry,
  getFailedEntriesByErrorType,
  getPermanentlyFailedEntries,
  getRetryableEntries,
  getTimeUntilRetry,
  isPermanentlyFailed,
  resetAndRetry,
  scheduleRetry,
  scheduleRetryBulk,
} from './retry.js'

// Statistics
export {
  getAllQueueStats,
  getAverageSendTimes,
  getDailySendStats,
  getQueueEntries,
  getQueueStats,
  getQueueStatsForRange,
  getTemplateStats,
  getUpcomingScheduledCount,
} from './stats.js'

// Review queue operations
export {
  createReviewQueueEntry,
  getEntriesAwaitingDelivery,
  getEntriesForCustomer,
  getPendingEntriesReadyToSchedule,
  getReviewStatsbyTemplate,
  hasReviewBeenSubmitted,
  onOrderDelivered,
  onOrderFulfilled,
  rescheduleEntry,
  updateIncentiveInfo,
} from './review-queue.js'

// Bulk operations
export {
  archiveOldEntries,
  bulkRescheduleByDateRange,
  bulkRetryByFilter,
  bulkSkipByFilter,
  deleteOldEntries,
  getMatchingEntryIds,
  performBulkAction,
} from './bulk-actions.js'
