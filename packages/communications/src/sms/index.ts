/**
 * SMS Notifications Module
 *
 * SMS is an OPTIONAL notification channel, OFF by default.
 * This module provides Twilio integration for transactional SMS only.
 *
 * @ai-pattern sms-notifications
 * @ai-critical SMS is OFF by default, must be explicitly enabled
 * @ai-critical All operations must be tenant-isolated
 */

// Types
export {
  SMS_COMMON_VARIABLES,
  SMS_NOTIFICATION_TYPES,
  type CreateSmsOptOutInput,
  type CreateSmsQueueEntryInput,
  type CreateSmsTemplateInput,
  type NotificationChannelSettings,
  type SmsHealthStatus,
  type SmsNotificationType,
  type SmsOptOut,
  type SmsOptOutMethod,
  type SmsProvider,
  type SmsQueueEntry,
  type SmsQueueFilters,
  type SmsQueueStats,
  type SmsQueueStatus,
  type SmsRecipientType,
  type SmsSendRequest,
  type SmsSendResult,
  type SmsSetupStatus,
  type SmsSetupStep,
  type SmsTemplate,
  type SmsVariable,
  type TenantSmsSettings,
  type TestSmsRequest,
  type TestSmsResult,
  type TwilioIncomingMessage,
  type TwilioMessageStatus,
  type TwilioVerificationResult,
  type UpdateNotificationChannelSettingsInput,
  type UpdateSmsSettingsInput,
  type UpdateSmsTemplateInput,
} from './types.js'

// Settings management
export {
  getSmsEnabledTenants,
  getSmsSettings,
  getTwilioCredentials,
  hasValidTwilioConfig,
  isSmsEnabled,
  markSmsSetupCompleted,
  updateSmsHealthStatus,
  updateSmsSettings,
} from './settings.js'

// Twilio provider
export {
  generateEmptyTwimlResponse,
  getTwilioPhoneNumber,
  isDeliveredStatus,
  isFailedStatus,
  parseTwilioIncomingMessage,
  parseTwilioStatusWebhook,
  sendSms,
  sendTestSms,
  verifyTwilioCredentials,
} from './provider.js'

// Compliance (TCPA)
export {
  OPT_IN_KEYWORDS,
  OPT_OUT_KEYWORDS,
  calculateSegmentCount,
  exceedsSingleSegment,
  getNextAllowedSendTime,
  getQuietHoursRemainingMinutes,
  getRecommendedMaxLength,
  isOptInMessage,
  isOptOutMessage,
  isQuietHours,
  isValidE164PhoneNumber,
  maskPhoneNumber,
  normalizeToE164,
  performComplianceChecks,
  type ComplianceCheckResult,
  type ComplianceSkipReason,
} from './compliance.js'

// Opt-out management
export {
  addOptOut,
  checkBulkOptOutStatus,
  findTenantByTwilioNumber,
  getOptOut,
  getOptOutStats,
  handleStartKeyword,
  handleStopKeyword,
  isOptedOut,
  listOptOuts,
  removeOptOut,
} from './opt-out.js'

// Queue operations
export {
  claimScheduledSmsEntries,
  createSmsQueueEntry,
  getDailySmsCount,
  getRetryableSmsEntries,
  getSmsQueueEntry,
  getSmsQueueEntryByMessageSid,
  getSmsQueueStats,
  isDailyLimitExceeded,
  listSmsQueueEntries,
  markSmsDelivered,
  markSmsFailed,
  markSmsSent,
  markSmsSkipped,
  resetStaleSmSProcessingEntries,
  scheduleEntry,
  scheduleRetry,
} from './queue.js'

// Template management
export {
  createSmsTemplate,
  DEFAULT_SMS_TEMPLATES,
  deleteSmsTemplate,
  extractVariables,
  getOrCreateDefaultTemplate,
  getSmsTemplateById,
  getSmsTemplateByType,
  listSmsTemplates,
  previewTemplate,
  renderSmsTemplate,
  SAMPLE_DATA,
  seedDefaultSmsTemplates,
  substituteVariables,
  updateSmsTemplate,
  validateVariables,
} from './templates.js'

// Queue processor
export {
  aggregateResults,
  createSmsProcessorJob,
  createSmsRetryProcessorJob,
  formatProcessorResult,
  processAllTenantsSmsQueue,
  processTenantSmsQueue,
  type SmsProcessorConfig,
  type SmsProcessorResult,
} from './processor.js'

// Webhook handlers
export {
  createJsonResponse,
  createTwimlResponse,
  handleIncomingSmsWebhook,
  handleStatusWebhook,
  parseFormData,
  verifyTwilioSignature,
  type WebhookResult,
} from './webhook.js'
