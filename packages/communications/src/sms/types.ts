/**
 * SMS Types
 *
 * Type definitions for SMS notifications.
 * SMS is an optional channel for transactional notifications only.
 *
 * @ai-pattern sms-types
 * @ai-critical SMS is OFF by default, must be explicitly enabled
 */

// ============================================================================
// SMS Settings Types
// ============================================================================

/**
 * SMS provider type - currently only Twilio is supported
 */
export type SmsProvider = 'twilio' | 'none'

/**
 * Health status of SMS configuration
 */
export type SmsHealthStatus = 'unconfigured' | 'healthy' | 'degraded' | 'failed'

/**
 * Tenant SMS settings
 */
export interface TenantSmsSettings {
  id: string
  tenantId: string

  // Master switch (OFF by default)
  smsEnabled: boolean

  // Provider configuration
  provider: SmsProvider
  twilioAccountSid: string | null
  twilioAuthToken: string | null
  twilioPhoneNumber: string | null
  twilioMessagingServiceSid: string | null

  // Compliance
  a2p10dlcRegistered: boolean
  tollFreeVerified: boolean

  // Quiet hours (TCPA compliance)
  quietHoursEnabled: boolean
  quietHoursStart: string // HH:MM format
  quietHoursEnd: string // HH:MM format
  quietHoursTimezone: string

  // Rate limits
  messagesPerSecond: number
  dailyLimit: number

  // Verification
  setupCompletedAt: Date | null
  lastHealthCheckAt: Date | null
  healthStatus: SmsHealthStatus

  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating/updating SMS settings
 */
export interface UpdateSmsSettingsInput {
  smsEnabled?: boolean
  provider?: SmsProvider
  twilioAccountSid?: string
  twilioAuthToken?: string
  twilioPhoneNumber?: string
  twilioMessagingServiceSid?: string
  a2p10dlcRegistered?: boolean
  tollFreeVerified?: boolean
  quietHoursEnabled?: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  quietHoursTimezone?: string
  messagesPerSecond?: number
  dailyLimit?: number
}

// ============================================================================
// SMS Template Types
// ============================================================================

/**
 * SMS template
 */
export interface SmsTemplate {
  id: string
  tenantId: string
  notificationType: string

  // Template content (plain text, 160 char limit recommended)
  content: string
  characterCount: number
  segmentCount: number

  // Variables available in this template
  availableVariables: string[]

  // Link handling
  shortenLinks: boolean

  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating/updating SMS templates
 */
export interface CreateSmsTemplateInput {
  tenantId: string
  notificationType: string
  content: string
  availableVariables?: string[]
  shortenLinks?: boolean
  isDefault?: boolean
}

export interface UpdateSmsTemplateInput {
  content?: string
  availableVariables?: string[]
  shortenLinks?: boolean
  isDefault?: boolean
}

// ============================================================================
// SMS Queue Types
// ============================================================================

/**
 * SMS queue entry status
 */
export type SmsQueueStatus =
  | 'pending'
  | 'scheduled'
  | 'processing'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'skipped'

/**
 * Recipient type for SMS
 */
export type SmsRecipientType = 'customer' | 'creator' | 'contractor' | 'vendor'

/**
 * SMS queue entry
 */
export interface SmsQueueEntry {
  id: string
  tenantId: string

  // Recipient
  phoneNumber: string // E.164 format
  recipientType: SmsRecipientType
  recipientId: string | null
  recipientName: string | null

  // Message content
  notificationType: string
  content: string
  characterCount: number
  segmentCount: number

  // Status
  status: SmsQueueStatus

  // Scheduling
  scheduledAt: Date | null

  // Processing
  triggerRunId: string | null
  attempts: number
  maxAttempts: number
  lastAttemptAt: Date | null

  // Result
  sentAt: Date | null
  deliveredAt: Date | null
  twilioMessageSid: string | null

  // Skip/failure tracking
  skipReason: string | null
  errorMessage: string | null

  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating SMS queue entry
 */
export interface CreateSmsQueueEntryInput {
  tenantId: string
  phoneNumber: string
  recipientType: SmsRecipientType
  recipientId?: string
  recipientName?: string
  notificationType: string
  content: string
  scheduledAt?: Date
  maxAttempts?: number
}

/**
 * SMS queue filters
 */
export interface SmsQueueFilters {
  status?: SmsQueueStatus | SmsQueueStatus[]
  recipientType?: SmsRecipientType
  notificationType?: string
  startDate?: Date
  endDate?: Date
  phoneNumber?: string
  limit?: number
  offset?: number
}

/**
 * SMS queue statistics
 */
export interface SmsQueueStats {
  pending: number
  scheduled: number
  processing: number
  sent: number
  delivered: number
  failed: number
  skipped: number
  total: number
  sentToday: number
  failedToday: number
}

// ============================================================================
// SMS Opt-Out Types
// ============================================================================

/**
 * Opt-out method
 */
export type SmsOptOutMethod = 'stop_keyword' | 'admin' | 'user_settings'

/**
 * SMS opt-out record
 */
export interface SmsOptOut {
  id: string
  tenantId: string
  phoneNumber: string // E.164 format
  optOutMethod: SmsOptOutMethod
  originalMessage: string | null
  optedOutAt: Date
}

/**
 * Input for adding opt-out
 */
export interface CreateSmsOptOutInput {
  tenantId: string
  phoneNumber: string
  optOutMethod: SmsOptOutMethod
  originalMessage?: string
}

// ============================================================================
// Notification Channel Settings
// ============================================================================

/**
 * Per-notification channel configuration
 */
export interface NotificationChannelSettings {
  id: string
  tenantId: string
  notificationType: string

  // Channel toggles
  emailEnabled: boolean
  smsEnabled: boolean

  // Template references
  emailTemplateId: string | null
  smsTemplateId: string | null

  createdAt: Date
  updatedAt: Date
}

/**
 * Input for updating notification channel settings
 */
export interface UpdateNotificationChannelSettingsInput {
  emailEnabled?: boolean
  smsEnabled?: boolean
  emailTemplateId?: string | null
  smsTemplateId?: string | null
}

// ============================================================================
// SMS Send Types
// ============================================================================

/**
 * SMS send request
 */
export interface SmsSendRequest {
  to: string // E.164 format
  content: string
  messagingServiceSid?: string
}

/**
 * SMS send result
 */
export interface SmsSendResult {
  success: boolean
  messageSid?: string
  error?: string
  errorCode?: string
}

/**
 * Twilio webhook status
 */
export type TwilioMessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed'
  | 'canceled'

/**
 * Twilio incoming message for opt-out handling
 */
export interface TwilioIncomingMessage {
  from: string
  to: string
  body: string
  messageSid: string
}

// ============================================================================
// SMS Notification Types
// ============================================================================

/**
 * Notification types that support SMS
 */
export const SMS_NOTIFICATION_TYPES = [
  // Customer notifications
  { type: 'order_shipped', name: 'Order Shipped', smsRecommended: true },
  { type: 'delivery_notification', name: 'Delivery Notification', smsRecommended: true },

  // Creator/Contractor notifications
  { type: 'payment_available', name: 'Payment Available', smsRecommended: true },
  { type: 'payout_sent', name: 'Payout Sent', smsRecommended: false },
  { type: 'action_required', name: 'Action Required', smsRecommended: true },

  // System notifications
  { type: 'verification_code', name: 'Verification Code', smsRecommended: true },
  { type: 'security_alert', name: 'Security Alert', smsRecommended: true },
] as const

export type SmsNotificationType = (typeof SMS_NOTIFICATION_TYPES)[number]['type']

// ============================================================================
// SMS Variable Types
// ============================================================================

/**
 * SMS template variable
 */
export interface SmsVariable {
  key: string
  label: string
  example: string
}

/**
 * Common SMS variables
 */
export const SMS_COMMON_VARIABLES: SmsVariable[] = [
  { key: '{{customerName}}', label: 'Customer Name', example: 'John' },
  { key: '{{orderNumber}}', label: 'Order Number', example: '#12345' },
  { key: '{{trackingUrl}}', label: 'Tracking URL', example: 'https://...' },
  { key: '{{amount}}', label: 'Amount', example: '$50.00' },
  { key: '{{brandName}}', label: 'Brand Name', example: 'RAWDOG' },
]

// ============================================================================
// Setup Wizard Types
// ============================================================================

/**
 * SMS setup step
 */
export interface SmsSetupStep {
  id: string
  title: string
  description: string
  completed: boolean
  skipped?: boolean
}

/**
 * SMS setup status
 */
export interface SmsSetupStatus {
  smsEnabled: boolean
  credentialsConfigured: boolean
  credentialsVerified: boolean
  complianceAcknowledged: boolean
  setupCompleted: boolean
  steps: SmsSetupStep[]
}

/**
 * Twilio credentials verification result
 */
export interface TwilioVerificationResult {
  success: boolean
  accountSid?: string
  phoneNumber?: string
  error?: string
}

/**
 * Test SMS request
 */
export interface TestSmsRequest {
  tenantId: string
  recipientPhone: string
}

/**
 * Test SMS result
 */
export interface TestSmsResult {
  success: boolean
  messageSid?: string
  error?: string
}
