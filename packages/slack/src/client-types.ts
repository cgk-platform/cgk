/**
 * @cgk-platform/slack/types - Client-safe exports
 *
 * This module exports only types and constants that are safe for use
 * in client-side code. It does NOT import @slack/web-api or any
 * server-only dependencies.
 *
 * @example
 * ```typescript
 * // In a 'use client' component
 * import { NOTIFICATION_TYPES, REPORT_METRICS } from '@cgk-platform/slack/types'
 * ```
 */

// Re-export all types (these are stripped at compile time)
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

// Re-export constants (client-safe runtime values)
export { NOTIFICATION_TYPES, REPORT_METRICS } from './types'
