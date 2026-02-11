/**
 * @cgk/slack - Type definitions
 *
 * @ai-pattern slack-types
 * @ai-note All Slack-related type definitions
 */

// ============================================================================
// OAuth & Connection Types
// ============================================================================

export interface SlackWorkspace {
  id: string
  tenantId: string
  workspaceId: string
  workspaceName: string | null
  botTokenEncrypted: string
  userTokenEncrypted: string | null
  connectedByUserId: string | null
  connectedBySlackUserId: string | null
  botScopes: string[]
  userScopes: string[] | null
  isActive: boolean
  lastVerifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface SlackOAuthState {
  tenantId: string
  userId: string
  redirectUri: string
  nonce: string
  expiresAt: number
}

export interface SlackOAuthResponse {
  ok: boolean
  access_token?: string
  token_type?: string
  scope?: string
  bot_user_id?: string
  app_id?: string
  team?: {
    id: string
    name: string
  }
  authed_user?: {
    id: string
    scope?: string
    access_token?: string
    token_type?: string
  }
  error?: string
}

// ============================================================================
// Channel Types
// ============================================================================

export interface SlackChannel {
  id: string
  name: string
  isPrivate: boolean
  isMember: boolean
  numMembers?: number
}

export interface SlackChannelMapping {
  id: string
  tenantId: string
  notificationType: NotificationType
  channelId: string
  channelName: string | null
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Notification Types - 52 types across 8 categories
// ============================================================================

export type NotificationCategory =
  | 'creator'
  | 'commerce'
  | 'reviews'
  | 'treasury'
  | 'system'
  | 'analytics'
  | 'surveys'
  | 'dam'

// Creator notifications (13)
export type CreatorNotificationType =
  | 'creator.application.new'
  | 'creator.application.approved'
  | 'creator.application.rejected'
  | 'creator.project.update'
  | 'creator.project.submitted'
  | 'creator.project.accepted'
  | 'creator.project.declined'
  | 'creator.withdrawal.requested'
  | 'creator.withdrawal.approved'
  | 'creator.withdrawal.completed'
  | 'creator.payment.requested'
  | 'creator.payment.failed'
  | 'creator.payment.escalated'
  | 'creator.message.new'

// Commerce notifications (9)
export type CommerceNotificationType =
  | 'commerce.order.new'
  | 'commerce.order.high_value'
  | 'commerce.order.failed'
  | 'commerce.refund.issued'
  | 'commerce.fulfillment.issue'
  | 'commerce.subscription.new'
  | 'commerce.subscription.cancelled'
  | 'commerce.subscription.failed'
  | 'commerce.subscription.churn_alert'

// Review notifications (4)
export type ReviewNotificationType =
  | 'reviews.new'
  | 'reviews.negative'
  | 'reviews.response_needed'
  | 'reviews.verified'

// Treasury notifications (7)
export type TreasuryNotificationType =
  | 'treasury.topup.initiated'
  | 'treasury.topup.succeeded'
  | 'treasury.topup.failed'
  | 'treasury.payout.pending'
  | 'treasury.payout.completed'
  | 'treasury.payout.failed'
  | 'treasury.balance.low'

// System notifications (5)
export type SystemNotificationType =
  | 'system.alert'
  | 'system.error.critical'
  | 'system.security'
  | 'system.api.error'
  | 'system.deployment'

// Analytics notifications (3)
export type AnalyticsNotificationType =
  | 'analytics.ai_task'
  | 'analytics.daily_digest'
  | 'analytics.task_reminder'

// Survey notifications (7)
export type SurveyNotificationType =
  | 'surveys.report'
  | 'surveys.daily_summary'
  | 'surveys.weekly_report'
  | 'surveys.new_channel'
  | 'surveys.nps_alert'
  | 'surveys.utm_discrepancy'
  | 'surveys.sync_failure'

// DAM notifications (5)
export type DamNotificationType =
  | 'dam.mention'
  | 'dam.reply'
  | 'dam.review_requested'
  | 'dam.review_approved'
  | 'dam.review_rejected'

export type NotificationType =
  | CreatorNotificationType
  | CommerceNotificationType
  | ReviewNotificationType
  | TreasuryNotificationType
  | SystemNotificationType
  | AnalyticsNotificationType
  | SurveyNotificationType
  | DamNotificationType

// ============================================================================
// Notification Configuration
// ============================================================================

export interface NotificationTypeConfig {
  type: NotificationType
  category: NotificationCategory
  description: string
  defaultChannel: string
  supportsTest: boolean
}

export const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  // Creator notifications
  { type: 'creator.application.new', category: 'creator', description: 'New creator application submitted', defaultChannel: '#creators', supportsTest: true },
  { type: 'creator.application.approved', category: 'creator', description: 'Application approved', defaultChannel: '#creators', supportsTest: true },
  { type: 'creator.application.rejected', category: 'creator', description: 'Application rejected', defaultChannel: '#creators', supportsTest: true },
  { type: 'creator.project.update', category: 'creator', description: 'Project status changed', defaultChannel: '#creator-projects', supportsTest: true },
  { type: 'creator.project.submitted', category: 'creator', description: 'Content submitted for review', defaultChannel: '#creator-projects', supportsTest: true },
  { type: 'creator.project.accepted', category: 'creator', description: 'Content approved', defaultChannel: '#creator-projects', supportsTest: true },
  { type: 'creator.project.declined', category: 'creator', description: 'Content needs revision', defaultChannel: '#creator-projects', supportsTest: true },
  { type: 'creator.withdrawal.requested', category: 'creator', description: 'Payout requested', defaultChannel: '#creator-payments', supportsTest: true },
  { type: 'creator.withdrawal.approved', category: 'creator', description: 'Payout approved', defaultChannel: '#creator-payments', supportsTest: true },
  { type: 'creator.withdrawal.completed', category: 'creator', description: 'Payout sent', defaultChannel: '#creator-payments', supportsTest: true },
  { type: 'creator.payment.requested', category: 'creator', description: 'Payment pending', defaultChannel: '#creator-payments', supportsTest: true },
  { type: 'creator.payment.failed', category: 'creator', description: 'Payment failed', defaultChannel: '#creator-payments', supportsTest: true },
  { type: 'creator.payment.escalated', category: 'creator', description: 'Payment issue escalated', defaultChannel: '#creator-payments', supportsTest: true },
  { type: 'creator.message.new', category: 'creator', description: 'New message from creator', defaultChannel: '#creator-inbox', supportsTest: true },

  // Commerce notifications
  { type: 'commerce.order.new', category: 'commerce', description: 'New order placed', defaultChannel: '#orders', supportsTest: true },
  { type: 'commerce.order.high_value', category: 'commerce', description: 'Order over threshold', defaultChannel: '#orders', supportsTest: true },
  { type: 'commerce.order.failed', category: 'commerce', description: 'Order processing failed', defaultChannel: '#orders', supportsTest: true },
  { type: 'commerce.refund.issued', category: 'commerce', description: 'Refund processed', defaultChannel: '#orders', supportsTest: true },
  { type: 'commerce.fulfillment.issue', category: 'commerce', description: 'Fulfillment problem', defaultChannel: '#orders', supportsTest: true },
  { type: 'commerce.subscription.new', category: 'commerce', description: 'New subscription', defaultChannel: '#subscriptions', supportsTest: true },
  { type: 'commerce.subscription.cancelled', category: 'commerce', description: 'Subscription cancelled', defaultChannel: '#subscriptions', supportsTest: true },
  { type: 'commerce.subscription.failed', category: 'commerce', description: 'Subscription payment failed', defaultChannel: '#subscriptions', supportsTest: true },
  { type: 'commerce.subscription.churn_alert', category: 'commerce', description: 'High churn risk detected', defaultChannel: '#subscriptions', supportsTest: true },

  // Review notifications
  { type: 'reviews.new', category: 'reviews', description: 'New review submitted', defaultChannel: '#reviews', supportsTest: true },
  { type: 'reviews.negative', category: 'reviews', description: 'Review <= 3 stars', defaultChannel: '#reviews', supportsTest: true },
  { type: 'reviews.response_needed', category: 'reviews', description: 'Review needs response', defaultChannel: '#reviews', supportsTest: true },
  { type: 'reviews.verified', category: 'reviews', description: 'Verified purchase review', defaultChannel: '#reviews', supportsTest: true },

  // Treasury notifications
  { type: 'treasury.topup.initiated', category: 'treasury', description: 'Balance top-up started', defaultChannel: '#treasury', supportsTest: true },
  { type: 'treasury.topup.succeeded', category: 'treasury', description: 'Top-up completed', defaultChannel: '#treasury', supportsTest: true },
  { type: 'treasury.topup.failed', category: 'treasury', description: 'Top-up failed', defaultChannel: '#treasury', supportsTest: true },
  { type: 'treasury.payout.pending', category: 'treasury', description: 'Payout awaiting approval', defaultChannel: '#treasury', supportsTest: true },
  { type: 'treasury.payout.completed', category: 'treasury', description: 'Payout sent', defaultChannel: '#treasury', supportsTest: true },
  { type: 'treasury.payout.failed', category: 'treasury', description: 'Payout failed', defaultChannel: '#treasury', supportsTest: true },
  { type: 'treasury.balance.low', category: 'treasury', description: 'Balance below threshold', defaultChannel: '#treasury', supportsTest: true },

  // System notifications
  { type: 'system.alert', category: 'system', description: 'General system alert', defaultChannel: '#alerts', supportsTest: true },
  { type: 'system.error.critical', category: 'system', description: 'Critical error', defaultChannel: '#alerts', supportsTest: true },
  { type: 'system.security', category: 'system', description: 'Security event', defaultChannel: '#security', supportsTest: true },
  { type: 'system.api.error', category: 'system', description: 'API error', defaultChannel: '#alerts', supportsTest: true },
  { type: 'system.deployment', category: 'system', description: 'Deployment notification', defaultChannel: '#deployments', supportsTest: true },

  // Analytics notifications
  { type: 'analytics.ai_task', category: 'analytics', description: 'AI detected action needed', defaultChannel: '#analytics', supportsTest: true },
  { type: 'analytics.daily_digest', category: 'analytics', description: 'Daily performance report', defaultChannel: '#analytics', supportsTest: true },
  { type: 'analytics.task_reminder', category: 'analytics', description: 'Task reminder', defaultChannel: '#analytics', supportsTest: true },

  // Survey notifications
  { type: 'surveys.report', category: 'surveys', description: 'Scheduled survey report', defaultChannel: '#surveys', supportsTest: true },
  { type: 'surveys.daily_summary', category: 'surveys', description: 'Daily survey summary', defaultChannel: '#surveys', supportsTest: true },
  { type: 'surveys.weekly_report', category: 'surveys', description: 'Weekly survey report', defaultChannel: '#surveys', supportsTest: true },
  { type: 'surveys.new_channel', category: 'surveys', description: 'New attribution channel detected', defaultChannel: '#surveys', supportsTest: true },
  { type: 'surveys.nps_alert', category: 'surveys', description: 'NPS threshold triggered', defaultChannel: '#surveys', supportsTest: true },
  { type: 'surveys.utm_discrepancy', category: 'surveys', description: 'UTM mismatch detected', defaultChannel: '#surveys', supportsTest: true },
  { type: 'surveys.sync_failure', category: 'surveys', description: 'Survey sync failed (critical)', defaultChannel: '#alerts', supportsTest: true },

  // DAM notifications
  { type: 'dam.mention', category: 'dam', description: 'User mentioned in comment', defaultChannel: 'dm', supportsTest: true },
  { type: 'dam.reply', category: 'dam', description: 'Reply to comment', defaultChannel: 'dm', supportsTest: true },
  { type: 'dam.review_requested', category: 'dam', description: 'Asset review requested', defaultChannel: '#content-review', supportsTest: true },
  { type: 'dam.review_approved', category: 'dam', description: 'Asset review approved', defaultChannel: '#content-review', supportsTest: true },
  { type: 'dam.review_rejected', category: 'dam', description: 'Asset review rejected', defaultChannel: '#content-review', supportsTest: true },
]

// ============================================================================
// Scheduled Reports
// ============================================================================

export type ReportFrequency = 'daily' | 'weekly' | 'monthly'

export type DateRangeType = 'yesterday' | 'last_n_days' | 'last_week' | 'last_month'

export interface SlackReport {
  id: string
  tenantId: string
  name: string
  channelId: string
  channelName: string | null
  frequency: ReportFrequency
  sendHour: number
  timezone: string
  metrics: ReportMetricConfig[]
  dateRangeType: DateRangeType
  dateRangeDays: number | null
  customHeader: string | null
  isEnabled: boolean
  lastRunAt: Date | null
  lastRunStatus: 'success' | 'failed' | null
  createdAt: Date
  updatedAt: Date
}

export interface ReportMetricConfig {
  id: string
  enabled: boolean
  order: number
}

export type ReportMetricCategory = 'revenue' | 'subscription' | 'attribution' | 'marketing' | 'creator'

export interface ReportMetric {
  id: string
  category: ReportMetricCategory
  name: string
  description: string
}

export const REPORT_METRICS: ReportMetric[] = [
  // Revenue metrics
  { id: 'gross_revenue', category: 'revenue', name: 'Gross Revenue', description: 'Total revenue before refunds' },
  { id: 'net_revenue', category: 'revenue', name: 'Net Revenue', description: 'Revenue after refunds' },
  { id: 'aov', category: 'revenue', name: 'Average Order Value', description: 'Average order amount' },
  { id: 'orders_count', category: 'revenue', name: 'Orders Count', description: 'Number of orders' },
  { id: 'refunds', category: 'revenue', name: 'Refunds', description: 'Total refund amount' },
  { id: 'refund_rate', category: 'revenue', name: 'Refund Rate', description: 'Percentage of orders refunded' },
  { id: 'revenue_vs_yesterday', category: 'revenue', name: 'Revenue vs Yesterday', description: 'Comparison with previous day' },
  { id: 'revenue_vs_last_week', category: 'revenue', name: 'Revenue vs Last Week', description: 'Comparison with last week' },

  // Subscription metrics
  { id: 'active_subscriptions', category: 'subscription', name: 'Active Subscriptions', description: 'Number of active subscriptions' },
  { id: 'new_subscriptions', category: 'subscription', name: 'New Subscriptions', description: 'New subscriptions in period' },
  { id: 'churned', category: 'subscription', name: 'Churned', description: 'Cancelled subscriptions' },
  { id: 'churn_rate', category: 'subscription', name: 'Churn Rate', description: 'Percentage of churned subscriptions' },
  { id: 'mrr', category: 'subscription', name: 'MRR', description: 'Monthly recurring revenue' },
  { id: 'subscription_revenue_pct', category: 'subscription', name: 'Subscription Revenue %', description: 'Subscription as percentage of total' },

  // Attribution metrics
  { id: 'attributed_revenue', category: 'attribution', name: 'Attributed Revenue', description: 'Revenue with attribution' },
  { id: 'attribution_rate', category: 'attribution', name: 'Attribution Rate', description: 'Percentage of attributed revenue' },
  { id: 'top_channels', category: 'attribution', name: 'Top Channels', description: 'Best performing channels' },
  { id: 'top_campaigns', category: 'attribution', name: 'Top Campaigns', description: 'Best performing campaigns' },
  { id: 'roas_by_channel', category: 'attribution', name: 'ROAS by Channel', description: 'Return on ad spend per channel' },

  // Marketing metrics
  { id: 'total_ad_spend', category: 'marketing', name: 'Total Ad Spend', description: 'Total advertising spend' },
  { id: 'meta_spend', category: 'marketing', name: 'Meta Spend', description: 'Facebook/Instagram ad spend' },
  { id: 'google_spend', category: 'marketing', name: 'Google Spend', description: 'Google Ads spend' },
  { id: 'tiktok_spend', category: 'marketing', name: 'TikTok Spend', description: 'TikTok ad spend' },
  { id: 'blended_roas', category: 'marketing', name: 'Blended ROAS', description: 'Overall return on ad spend' },
  { id: 'cac', category: 'marketing', name: 'CAC', description: 'Customer acquisition cost' },
  { id: 'new_vs_returning', category: 'marketing', name: 'New vs Returning Revenue', description: 'Revenue split by customer type' },

  // Creator metrics
  { id: 'active_creators', category: 'creator', name: 'Active Creators', description: 'Number of active creators' },
  { id: 'new_applications', category: 'creator', name: 'New Applications', description: 'New creator applications' },
  { id: 'pending_payouts', category: 'creator', name: 'Pending Payouts', description: 'Awaiting payout approval' },
  { id: 'total_creator_spend', category: 'creator', name: 'Total Creator Spend', description: 'Total paid to creators' },
  { id: 'top_creators', category: 'creator', name: 'Top Performing Creators', description: 'Best performing creators' },
]

// ============================================================================
// Message Templates
// ============================================================================

export interface SlackContextElement {
  type: 'mrkdwn' | 'plain_text' | 'image'
  text?: string
  image_url?: string
  alt_text?: string
}

export interface SlackBlock {
  type: 'header' | 'section' | 'divider' | 'context' | 'actions' | 'image'
  text?: string | { type: string; text: string; emoji?: boolean }
  fields?: Array<{ type: string; text: string }>
  accessory?: SlackAccessory
  elements?: SlackElement[] | SlackContextElement[]
  block_id?: string
  image_url?: string
  alt_text?: string
}

export interface SlackAccessory {
  type: 'button' | 'image' | 'overflow' | 'datepicker' | 'static_select'
  text?: { type: string; text: string; emoji?: boolean }
  url?: string
  value?: string
  action_id?: string
  image_url?: string
  alt_text?: string
}

export interface SlackElement {
  type: 'button' | 'image' | 'overflow' | 'static_select' | 'mrkdwn'
  text?: string | { type: string; text: string; emoji?: boolean }
  url?: string
  value?: string
  action_id?: string
}

export interface SlackTemplate {
  id: string
  tenantId: string
  notificationType: NotificationType
  blocks: SlackBlock[]
  fallbackText: string
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Notification Log
// ============================================================================

export type NotificationStatus = 'sent' | 'failed' | 'rate_limited'

export interface SlackNotificationLog {
  id: string
  tenantId: string
  notificationType: NotificationType
  channelId: string
  messageTs: string | null
  threadTs: string | null
  status: NotificationStatus
  errorMessage: string | null
  payload: Record<string, unknown> | null
  createdAt: Date
}

// ============================================================================
// User Associations
// ============================================================================

export type AssociationMethod = 'auto' | 'manual'

export interface SlackUserAssociation {
  id: string
  tenantId: string
  platformUserId: string
  slackUserId: string
  slackEmail: string | null
  associationMethod: AssociationMethod
  lastVerifiedAt: Date | null
  lookupFailures: number
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// User Notification Preferences
// ============================================================================

export interface UserNotificationPreferences {
  id: string
  userId: string
  tenantId: string
  emailEnabled: boolean
  slackEnabled: boolean
  slackDmEnabled: boolean
  notifyOnMention: boolean
  notifyOnReply: boolean
  notifyOnAssetUpdate: boolean
  quietHoursStart: number | null
  quietHoursEnd: number | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Platform (Super Admin) Slack
// ============================================================================

export type AlertSeverity = 'critical' | 'error' | 'warning' | 'info'

export interface PlatformSlackWorkspace {
  id: string
  workspaceId: string
  workspaceName: string | null
  botTokenEncrypted: string
  userTokenEncrypted: string | null
  channelCritical: string | null
  channelErrors: string | null
  channelWarnings: string | null
  channelInfo: string | null
  channelDeployments: string | null
  mentionCritical: string | null
  mentionErrors: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PlatformSlackAlert {
  id: string
  severity: AlertSeverity
  service: string
  tenantId: string | null
  title: string
  message: string | null
  channelId: string | null
  messageTs: string | null
  status: NotificationStatus
  createdAt: Date
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ConnectSlackRequest {
  redirectUri: string
}

export interface ConnectSlackResponse {
  authUrl: string
  state: string
}

export interface DisconnectSlackResponse {
  success: boolean
}

export interface TestConnectionRequest {
  channelId?: string
}

export interface TestConnectionResponse {
  success: boolean
  workspaceName?: string
  botValid: boolean
  userValid: boolean
  canPostToChannel: boolean
  canListChannels: boolean
  error?: string
}

export interface UpdateMappingsRequest {
  mappings: Array<{
    notificationType: NotificationType
    channelId: string
    channelName?: string
    isEnabled: boolean
  }>
}

export interface TestNotificationRequest {
  notificationType: NotificationType
  channelId?: string
  useSampleData: boolean
}

export interface TestNotificationResponse {
  success: boolean
  messageTs?: string
  channelId?: string
  error?: string
}

export interface SendReportRequest {
  reportId: string
}

export interface SendReportResponse {
  success: boolean
  messageTs?: string
  error?: string
}
