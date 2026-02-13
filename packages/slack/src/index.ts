/**
 * @cgk-platform/slack - Slack integration package
 *
 * @ai-pattern slack-integration
 * @ai-note Handles Slack notifications, scheduled reports, and ops alerting
 *
 * @example
 * ```typescript
 * import { sendNotification, sendAlert, SlackClient } from '@cgk-platform/slack'
 *
 * // Send tenant notification
 * await sendNotification('rawdog', 'commerce.order.new', {
 *   orderNumber: '1001',
 *   orderAmount: '$149.99',
 * })
 *
 * // Send platform alert
 * await sendCriticalAlert('api', 'High Error Rate', 'Error rate exceeded 5%')
 * ```
 */

// Types
export type {
  // Workspace & Connection
  SlackWorkspace,
  SlackOAuthState,
  SlackOAuthResponse,

  // Channels
  SlackChannel,
  SlackChannelMapping,

  // Notifications
  NotificationCategory,
  NotificationType,
  CreatorNotificationType,
  CommerceNotificationType,
  ReviewNotificationType,
  TreasuryNotificationType,
  SystemNotificationType,
  AnalyticsNotificationType,
  SurveyNotificationType,
  DamNotificationType,
  NotificationTypeConfig,
  NotificationStatus,
  SlackNotificationLog,

  // Reports
  ReportFrequency,
  DateRangeType,
  SlackReport,
  ReportMetricConfig,
  ReportMetricCategory,
  ReportMetric,

  // Templates
  SlackBlock,
  SlackAccessory,
  SlackElement,
  SlackContextElement,
  SlackTemplate,

  // User
  SlackUserAssociation,
  AssociationMethod,
  UserNotificationPreferences,

  // Platform
  AlertSeverity,
  PlatformSlackWorkspace,
  PlatformSlackAlert,

  // API
  ConnectSlackRequest,
  ConnectSlackResponse,
  DisconnectSlackResponse,
  TestConnectionRequest,
  TestConnectionResponse,
  UpdateMappingsRequest,
  TestNotificationRequest,
  TestNotificationResponse,
  SendReportRequest,
  SendReportResponse,
} from './types'

export { NOTIFICATION_TYPES, REPORT_METRICS } from './types'

// Encryption
export {
  encryptToken,
  decryptToken,
  isEncryptionConfigured,
  validateEncryptionConfig,
} from './encryption'

// OAuth
export {
  BOT_SCOPES,
  USER_SCOPES,
  getOAuthConfig,
  generateOAuthState,
  serializeOAuthState,
  deserializeOAuthState,
  validateOAuthState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  processOAuthResponse,
  revokeToken,
} from './oauth'

// Client
export {
  SlackClient,
  type SlackClientConfig,
  type MessageResponse,
  type ScheduledMessageResponse,
  type SlackUser,
  type SlackMessage,
} from './client'

// Templates
export {
  getTemplate,
  buildMessage,
  getSampleData,
  divider,
  type TemplateVariables,
  type TemplateBuilder,
} from './templates'

// Notifications
export {
  getTenantWorkspace,
  getChannelMapping,
  getCustomTemplate,
  resolveSlackUser,
  sendNotification,
  sendTestNotification,
  getNotificationLogs,
  invalidateSlackCache,
  type SendNotificationOptions,
  type SendNotificationResult,
} from './notifications'

// Reports
export {
  getReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
  sendReport,
  getDueReports,
  shouldRunReport,
  getReportDateRange,
} from './reports'

// Platform Alerts
export {
  getPlatformWorkspace,
  savePlatformWorkspace,
  updatePlatformChannels,
  disconnectPlatformWorkspace,
  sendAlert,
  sendCriticalAlert,
  sendErrorAlert,
  sendWarningAlert,
  sendInfoAlert,
  sendDeploymentAlert,
  getAlertHistory,
  testPlatformConnection,
  type SendAlertResult,
} from './alerts'
