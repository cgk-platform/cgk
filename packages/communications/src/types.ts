/**
 * Communications Types
 *
 * @ai-pattern communications
 * @ai-note All sender addresses must be tenant-configured, never hardcoded
 */

// ============================================================================
// Notification Types
// ============================================================================

/**
 * All notification types in the system
 * These can be routed to different sender addresses per tenant
 */
export const NOTIFICATION_TYPES = {
  // Review System
  REVIEW_REQUEST: 'review_request',
  REVIEW_REMINDER: 'review_reminder',
  REVIEW_THANK_YOU: 'review_thank_you',
  REVIEW_VERIFICATION: 'review_verification',
  INCENTIVE_REQUEST: 'incentive_request',
  INCENTIVE_REMINDER: 'incentive_reminder',

  // Subscription Emails
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPCOMING_ORDER: 'subscription_upcoming_order',
  SUBSCRIPTION_ORDER_PROCESSED: 'subscription_order_processed',
  SUBSCRIPTION_PAYMENT_FAILED: 'subscription_payment_failed',
  SUBSCRIPTION_PAUSED: 'subscription_paused',
  SUBSCRIPTION_RESUMED: 'subscription_resumed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',

  // Creator Communications
  CREATOR_APPLICATION_APPROVED: 'creator_application_approved',
  CREATOR_REMINDER: 'creator_reminder',
  CREATOR_PROJECT_ASSIGNED: 'creator_project_assigned',
  CREATOR_PROJECT_COMPLETED: 'creator_project_completed',
  CREATOR_REVISION_REQUESTED: 'creator_revision_requested',
  CREATOR_PAYMENT_AVAILABLE: 'creator_payment_available',
  CREATOR_PAYOUT_INITIATED: 'creator_payout_initiated',
  CREATOR_MONTHLY_SUMMARY: 'creator_monthly_summary',

  // E-Sign
  ESIGN_SIGNING_REQUEST: 'esign_signing_request',
  ESIGN_SIGNING_COMPLETE: 'esign_signing_complete',
  ESIGN_REMINDER: 'esign_reminder',
  ESIGN_VOID_NOTIFICATION: 'esign_void_notification',

  // Treasury
  TREASURY_APPROVAL_REQUEST: 'treasury_approval_request',
  TREASURY_APPROVAL_REMINDER: 'treasury_approval_reminder',
  TREASURY_APPROVED_NOTIFICATION: 'treasury_approved_notification',
  TREASURY_REJECTED_NOTIFICATION: 'treasury_rejected_notification',

  // Contractor/Vendor
  CONTRACTOR_PORTAL_INVITE: 'contractor_portal_invite',
  CONTRACTOR_PAYMENT_AVAILABLE: 'contractor_payment_available',
  CONTRACTOR_TAX_DOCUMENT_REQUIRED: 'contractor_tax_document_required',

  // Team
  TEAM_INVITATION: 'team_invitation',

  // System
  SYSTEM_ALERT: 'system_alert',
} as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES]

/**
 * Sender purpose categories
 */
export type SenderPurpose = 'transactional' | 'creator' | 'support' | 'treasury' | 'system'

/**
 * Default routing for notification types to sender purposes
 */
export const DEFAULT_NOTIFICATION_ROUTING: Record<
  NotificationType,
  { purpose: SenderPurpose; channel: NotificationChannel }
> = {
  // Review System - transactional
  [NOTIFICATION_TYPES.REVIEW_REQUEST]: { purpose: 'transactional', channel: 'email' },
  [NOTIFICATION_TYPES.REVIEW_REMINDER]: { purpose: 'transactional', channel: 'email' },
  [NOTIFICATION_TYPES.REVIEW_THANK_YOU]: { purpose: 'transactional', channel: 'email' },
  [NOTIFICATION_TYPES.REVIEW_VERIFICATION]: { purpose: 'transactional', channel: 'email' },
  [NOTIFICATION_TYPES.INCENTIVE_REQUEST]: { purpose: 'transactional', channel: 'email' },
  [NOTIFICATION_TYPES.INCENTIVE_REMINDER]: { purpose: 'transactional', channel: 'email' },

  // Subscription - transactional
  [NOTIFICATION_TYPES.SUBSCRIPTION_CREATED]: { purpose: 'transactional', channel: 'email' },
  [NOTIFICATION_TYPES.SUBSCRIPTION_UPCOMING_ORDER]: { purpose: 'transactional', channel: 'email' },
  [NOTIFICATION_TYPES.SUBSCRIPTION_ORDER_PROCESSED]: {
    purpose: 'transactional',
    channel: 'email',
  },
  [NOTIFICATION_TYPES.SUBSCRIPTION_PAYMENT_FAILED]: { purpose: 'transactional', channel: 'email' },
  [NOTIFICATION_TYPES.SUBSCRIPTION_PAUSED]: { purpose: 'transactional', channel: 'email' },
  [NOTIFICATION_TYPES.SUBSCRIPTION_RESUMED]: { purpose: 'transactional', channel: 'email' },
  [NOTIFICATION_TYPES.SUBSCRIPTION_CANCELLED]: { purpose: 'transactional', channel: 'email' },

  // Creator - creator
  [NOTIFICATION_TYPES.CREATOR_APPLICATION_APPROVED]: { purpose: 'creator', channel: 'email' },
  [NOTIFICATION_TYPES.CREATOR_REMINDER]: { purpose: 'creator', channel: 'email' },
  [NOTIFICATION_TYPES.CREATOR_PROJECT_ASSIGNED]: { purpose: 'creator', channel: 'email' },
  [NOTIFICATION_TYPES.CREATOR_PROJECT_COMPLETED]: { purpose: 'creator', channel: 'email' },
  [NOTIFICATION_TYPES.CREATOR_REVISION_REQUESTED]: { purpose: 'creator', channel: 'email' },
  [NOTIFICATION_TYPES.CREATOR_PAYMENT_AVAILABLE]: { purpose: 'creator', channel: 'email' },
  [NOTIFICATION_TYPES.CREATOR_PAYOUT_INITIATED]: { purpose: 'creator', channel: 'email' },
  [NOTIFICATION_TYPES.CREATOR_MONTHLY_SUMMARY]: { purpose: 'creator', channel: 'email' },

  // E-Sign - transactional
  [NOTIFICATION_TYPES.ESIGN_SIGNING_REQUEST]: { purpose: 'transactional', channel: 'email' },
  [NOTIFICATION_TYPES.ESIGN_SIGNING_COMPLETE]: { purpose: 'transactional', channel: 'email' },
  [NOTIFICATION_TYPES.ESIGN_REMINDER]: { purpose: 'transactional', channel: 'email' },
  [NOTIFICATION_TYPES.ESIGN_VOID_NOTIFICATION]: { purpose: 'transactional', channel: 'email' },

  // Treasury - treasury
  [NOTIFICATION_TYPES.TREASURY_APPROVAL_REQUEST]: { purpose: 'treasury', channel: 'email' },
  [NOTIFICATION_TYPES.TREASURY_APPROVAL_REMINDER]: { purpose: 'treasury', channel: 'email' },
  [NOTIFICATION_TYPES.TREASURY_APPROVED_NOTIFICATION]: { purpose: 'treasury', channel: 'email' },
  [NOTIFICATION_TYPES.TREASURY_REJECTED_NOTIFICATION]: { purpose: 'treasury', channel: 'email' },

  // Contractor - creator (shares creator pipeline)
  [NOTIFICATION_TYPES.CONTRACTOR_PORTAL_INVITE]: { purpose: 'creator', channel: 'email' },
  [NOTIFICATION_TYPES.CONTRACTOR_PAYMENT_AVAILABLE]: { purpose: 'creator', channel: 'email' },
  [NOTIFICATION_TYPES.CONTRACTOR_TAX_DOCUMENT_REQUIRED]: { purpose: 'creator', channel: 'email' },

  // Team - system
  [NOTIFICATION_TYPES.TEAM_INVITATION]: { purpose: 'system', channel: 'email' },

  // System - system
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: { purpose: 'system', channel: 'email' },
}

// ============================================================================
// Domain Types
// ============================================================================

/**
 * Domain verification status
 */
export type VerificationStatus = 'pending' | 'verified' | 'failed'

/**
 * DNS record type
 */
export interface DNSRecord {
  type: 'MX' | 'TXT' | 'CNAME'
  host: string
  value: string
  priority?: number
  ttl?: number
}

/**
 * DNS records for domain verification
 */
export interface DNSRecords {
  mx?: DNSRecord
  txt_spf?: DNSRecord
  cname_dkim?: DNSRecord
  txt_dmarc?: DNSRecord
}

/**
 * Email domain with verification status
 */
export interface EmailDomain {
  id: string
  domain: string
  subdomain: string | null
  verificationStatus: VerificationStatus
  verificationToken: string | null
  resendDomainId: string | null
  dnsRecords: DNSRecords | null
  verifiedAt: Date | null
  lastCheckAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Create domain input
 */
export interface CreateDomainInput {
  domain: string
  subdomain?: string | null
}

// ============================================================================
// Sender Address Types
// ============================================================================

/**
 * Notification delivery channel
 */
export type NotificationChannel = 'email' | 'sms' | 'both'

/**
 * Sender address for a domain
 */
export interface SenderAddress {
  id: string
  domainId: string
  emailAddress: string
  displayName: string
  purpose: SenderPurpose
  isDefault: boolean
  isInboundEnabled: boolean
  replyToAddress: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Sender address with domain info
 */
export interface SenderAddressWithDomain extends SenderAddress {
  domain: string
  subdomain: string | null
  verificationStatus: VerificationStatus
}

/**
 * Create sender address input
 */
export interface CreateSenderAddressInput {
  domainId: string
  localPart: string // 'orders' part of 'orders@mail.domain.com'
  displayName: string
  purpose: SenderPurpose
  isDefault?: boolean
  isInboundEnabled?: boolean
  replyToAddress?: string | null
}

/**
 * Update sender address input
 */
export interface UpdateSenderAddressInput {
  displayName?: string
  purpose?: SenderPurpose
  isDefault?: boolean
  isInboundEnabled?: boolean
  replyToAddress?: string | null
}

// ============================================================================
// Notification Routing Types
// ============================================================================

/**
 * Notification routing configuration
 */
export interface NotificationRouting {
  id: string
  notificationType: NotificationType
  senderAddressId: string | null
  isEnabled: boolean
  channel: NotificationChannel
  delayDays: number
  maxRetries: number
  retryDelayMinutes: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Notification routing with sender info
 */
export interface NotificationRoutingWithSender extends NotificationRouting {
  senderAddress: SenderAddressWithDomain | null
}

/**
 * Update notification routing input
 */
export interface UpdateNotificationRoutingInput {
  senderAddressId?: string | null
  isEnabled?: boolean
  channel?: NotificationChannel
  delayDays?: number
  maxRetries?: number
  retryDelayMinutes?: number
}

// ============================================================================
// Resolved Sender Types
// ============================================================================

/**
 * Resolved sender for sending an email
 * This is the final sender configuration after routing resolution
 */
export interface ResolvedSender {
  from: string // "Display Name <email@domain.com>"
  replyTo?: string
  isVerified: boolean
}

/**
 * Sender resolution result
 */
export interface SenderResolutionResult {
  success: boolean
  sender?: ResolvedSender
  error?: string
  fallbackUsed?: boolean
}

// ============================================================================
// Test Email Types
// ============================================================================

/**
 * Test email input
 */
export interface SendTestEmailInput {
  senderAddressId: string
  recipientEmail: string
  subject?: string
  body?: string
}

/**
 * Test email result
 */
export interface SendTestEmailResult {
  success: boolean
  messageId?: string
  error?: string
}
