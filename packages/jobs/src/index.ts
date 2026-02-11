/**
 * @cgk/jobs - Background job abstraction
 *
 * @ai-pattern background-jobs
 * @ai-note Queue-based job processing with retries
 */

// Job definition
export { defineJob, type JobDefinition, type JobHandler } from './define'

// Job queue
export { createJobQueue, type JobQueue, type JobQueueConfig } from './queue'

// Job execution
export { processJobs, type JobProcessor, type ProcessorConfig } from './processor'

// Job types
export type {
  Job,
  JobStatus,
  JobResult,
  JobError,
  JobOptions,
  RetryConfig,
} from './types'

// Utilities
export { createJobId, parseJobId } from './utils'

// Google Feed Jobs
export {
  googleFeedSyncJob,
  googleFeedProductUpdateJob,
  googleFeedImageOptimizeJob,
  googleFeedScheduledSyncJob,
  type GoogleFeedSyncPayload,
  type GoogleFeedProductUpdatePayload,
  type GoogleFeedImageOptimizePayload,
} from './handlers/google-feed-sync'

// Webhook Jobs
export {
  retryFailedWebhooksJob,
  webhookHealthCheckJob,
  cleanupOldWebhookEventsJob,
  RETRY_SCHEDULE,
  HEALTH_CHECK_SCHEDULE,
  CLEANUP_SCHEDULE,
} from './webhooks'

// Treasury Jobs
export {
  treasurySendApprovalEmailJob,
  treasuryAutoSendApprovedJob,
  treasurySyncTopupStatusesJob,
  treasuryLowBalanceAlertJob,
  TREASURY_SCHEDULES,
  type TreasurySendApprovalEmailPayload,
  type TreasuryAutoSendApprovedPayload,
  type TreasurySyncTopupStatusesPayload,
  type TreasuryLowBalanceAlertPayload,
} from './handlers/treasury'

// Survey Slack Jobs
export {
  surveySlackNotificationJob,
  surveyLowNpsAlertJob,
  surveySlackDigestJob,
  SURVEY_SCHEDULES,
  type SurveySlackNotificationPayload,
  type SurveySlackDigestPayload,
  type SurveyLowNpsAlertPayload,
} from './handlers/survey-slack'

// Survey Processing Jobs
export {
  processSurveyResponseJob,
  syncAttributionJob,
  type ProcessSurveyResponsePayload,
  type SyncAttributionPayload,
} from './handlers/survey-process'

// Workflow Jobs
export {
  processScheduledActionsJob,
  checkTimeElapsedTriggersJob,
  cleanupExecutionLogsJob,
  processSnoozedThreadsJob,
  workflowJobs,
  type ProcessScheduledActionsPayload,
  type CheckTimeElapsedTriggersPayload,
  type CleanupExecutionLogsPayload,
  type ProcessSnoozedThreadsPayload,
} from './handlers/workflow'
