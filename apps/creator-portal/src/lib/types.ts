/**
 * Creator Portal Type Definitions
 *
 * These types define the data structures for creators who can work
 * with multiple brands simultaneously. Unlike admin users (single-brand),
 * creators have an array of brand memberships.
 */

// Creator status
export type CreatorStatus = 'active' | 'inactive' | 'suspended' | 'pending'

// Membership status within a brand
export type MembershipStatus = 'active' | 'paused' | 'terminated' | 'pending'

// Tax form status
export type TaxFormStatus = 'pending' | 'submitted' | 'approved'

/**
 * Brand membership - represents a creator's relationship with a single brand
 */
export interface BrandMembership {
  id: string
  brandId: string
  brandName: string
  brandSlug: string
  brandLogo?: string | null
  status: MembershipStatus
  commissionPercent: number
  discountCode: string | null
  balanceCents: number
  pendingCents: number
  lifetimeEarningsCents: number
  contractSigned: boolean
  contractSignedAt: Date | null
  activeProjectsCount: number
  completedProjectsCount: number
  lastProjectAt: Date | null
  lastPayoutAt: Date | null
  joinedAt: Date
}

/**
 * Shipping address for product samples
 */
export interface ShippingAddress {
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  countryCode: string
}

/**
 * Creator profile data
 */
export interface Creator {
  id: string
  email: string
  name: string
  bio: string | null
  phone: string | null
  avatarUrl: string | null
  shippingAddress: ShippingAddress
  taxFormStatus: TaxFormStatus
  taxFormSubmittedAt: Date | null
  status: CreatorStatus
  emailVerified: boolean
  onboardingCompleted: boolean
  guidedTourCompleted: boolean
  brandMemberships: BrandMembership[]
  lastLoginAt: Date | null
  createdAt: Date
}

/**
 * Creator JWT payload - includes brand membership claims
 */
export interface CreatorJWTPayload {
  sub: string              // creator_id
  sid: string              // session_id
  email: string
  name: string
  memberships: {           // Active brand memberships
    brandId: string
    brandSlug: string
    status: MembershipStatus
  }[]
  iat: number
  exp: number
}

/**
 * Creator session record
 */
export interface CreatorSession {
  id: string
  creatorId: string
  tokenHash: string
  deviceInfo: string | null
  deviceType: string | null
  ipAddress: string | null
  userAgent: string | null
  expiresAt: Date
  lastActiveAt: Date
  revokedAt: Date | null
  createdAt: Date
  isCurrent?: boolean      // Added at runtime to indicate current session
}

/**
 * Notification settings for a creator
 */
export interface NotificationSettings {
  // Email notifications
  emailProjectAssigned: boolean
  emailProjectUpdated: boolean
  emailMessageReceived: boolean
  emailPaymentReceived: boolean
  emailDeadlineReminder: boolean
  emailRevisionRequested: boolean
  // SMS notifications
  smsProjectAssigned: boolean
  smsProjectUpdated: boolean
  smsMessageReceived: boolean
  smsPaymentReceived: boolean
  smsDeadlineReminder: boolean
  smsRevisionRequested: boolean
}

/**
 * Notification type enum for settings UI
 */
export type NotificationType =
  | 'project_assigned'
  | 'project_updated'
  | 'message_received'
  | 'payment_received'
  | 'deadline_reminder'
  | 'revision_requested'

/**
 * Notification type metadata for display
 */
export interface NotificationTypeInfo {
  type: NotificationType
  label: string
  description: string
}

/**
 * Message sender type
 */
export type MessageSenderType = 'creator' | 'admin'

/**
 * Message status
 */
export type MessageStatus = 'sent' | 'delivered' | 'read'

/**
 * Conversation status
 */
export type ConversationStatus = 'open' | 'closed' | 'archived'

/**
 * Message attachment
 */
export interface MessageAttachment {
  url: string
  name: string
  type: string
  size: number
}

/**
 * Individual message in a conversation
 */
export interface Message {
  id: string
  conversationId: string
  content: string
  senderType: MessageSenderType
  senderId: string | null
  senderName: string | null
  status: MessageStatus
  readAt: Date | null
  aiGenerated: boolean
  replyToId: string | null
  attachments: MessageAttachment[]
  createdAt: Date
}

/**
 * Conversation thread
 */
export interface Conversation {
  id: string
  creatorId: string
  projectId: string | null
  brandId: string | null
  brandName?: string | null
  coordinatorName: string | null
  coordinatorId: string | null
  subject: string | null
  status: ConversationStatus
  lastMessageAt: Date | null
  lastMessagePreview: string | null
  lastMessageSender: string | null
  unreadCreator: number
  unreadAdmin: number
  createdAt: Date
}

/**
 * Dashboard statistics aggregated across all brands
 */
export interface DashboardStats {
  totalBalanceCents: number
  totalPendingCents: number
  totalLifetimeEarningsCents: number
  activeProjectsCount: number
  completedProjectsCount: number
  unreadMessagesCount: number
}

/**
 * Recent activity item for dashboard
 */
export type ActivityType =
  | 'payment_received'
  | 'project_submitted'
  | 'project_approved'
  | 'project_assigned'
  | 'revision_requested'
  | 'message_received'

export interface ActivityItem {
  id: string
  type: ActivityType
  description: string
  brandName: string | null
  brandId: string | null
  amountCents: number | null
  projectId: string | null
  createdAt: Date
}

/**
 * Password reset token record
 */
export interface PasswordResetToken {
  id: string
  creatorId: string
  email: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
  ipAddress: string | null
  createdAt: Date
}

/**
 * FAQ category
 */
export type FAQCategory =
  | 'getting_started'
  | 'payments_withdrawals'
  | 'projects_deliverables'
  | 'account_security'
  | 'tax_information'

/**
 * FAQ item
 */
export interface FAQItem {
  id: string
  category: FAQCategory
  question: string
  answer: string
  order: number
}

/**
 * Creator profile update input
 */
export interface UpdateProfileInput {
  name?: string
  bio?: string
  phone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  countryCode?: string
}

/**
 * Password change input
 */
export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

/**
 * API error response
 */
export interface APIError {
  error: string
  code?: string
  details?: Record<string, string>
}

/**
 * API success response
 */
export interface APISuccess<T = void> {
  success: true
  data?: T
  message?: string
}

/**
 * Polling response for messages
 */
export interface MessagePollResponse {
  messages: Message[]
  hasNew: boolean
  isTyping: boolean
  lastCheckedAt: string
}
