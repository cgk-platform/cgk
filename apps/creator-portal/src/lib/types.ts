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

/**
 * Brand-specific notification overrides
 * Allows creators to override their global notification settings per brand
 */
export interface BrandNotificationOverrides {
  muteAll: boolean
  projectAssigned: { email: boolean; sms: boolean } | null
  projectUpdated: { email: boolean; sms: boolean } | null
  messageReceived: { email: boolean; sms: boolean } | null
  paymentReceived: { email: boolean; sms: boolean } | null
  deadlineReminder: { email: boolean; sms: boolean } | null
  revisionRequested: { email: boolean; sms: boolean } | null
}

/**
 * Brand-specific sample shipping address
 * Allows creators to use different addresses for samples from different brands
 */
export interface BrandSampleAddress {
  useDefault: boolean
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  countryCode: string
}

/**
 * Brand-specific preferences
 * Stored in creator_brand_preferences table
 */
export interface BrandPreferences {
  id: string
  creatorId: string
  brandId: string
  notificationOverrides: BrandNotificationOverrides
  sampleAddress: BrandSampleAddress | null
  preferredContactMethod: 'email' | 'sms' | 'both' | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Extended brand membership with full details
 * Used in brand detail view
 */
export interface BrandDetail extends BrandMembership {
  coordinatorName: string | null
  coordinatorEmail: string | null
  paymentTerms: string
  sampleProductEntitlement: boolean
  shareLink: string | null
  discountCodeUsageCount: number
  discountCodeRevenueAttributedCents: number
  ytdEarningsCents: number
  recentProjects: BrandProject[]
}

/**
 * Project summary for brand detail view
 */
export interface BrandProject {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'revision_requested' | 'completed'
  earningsCents: number
  dueDate: Date | null
  completedAt: Date | null
}

/**
 * Input for updating brand preferences
 */
export interface UpdateBrandPreferencesInput {
  notificationOverrides?: Partial<BrandNotificationOverrides>
  sampleAddress?: Partial<BrandSampleAddress> | null
  preferredContactMethod?: 'email' | 'sms' | 'both' | null
  notes?: string | null
}

// ============================================================================
// Creator Brand Preferences (General Preferences - What KIND of brands they want)
// ============================================================================

/**
 * Brand categories that creators can prefer
 */
export type BrandCategory =
  | 'fashion'
  | 'beauty'
  | 'food'
  | 'tech'
  | 'lifestyle'
  | 'fitness'
  | 'gaming'
  | 'travel'
  | 'home'
  | 'finance'
  | 'automotive'
  | 'pets'
  | 'parenting'
  | 'education'
  | 'entertainment'
  | 'health'
  | 'sports'
  | 'art'

/**
 * Content types that creators can produce
 */
export type ContentType =
  | 'product_reviews'
  | 'tutorials'
  | 'lifestyle'
  | 'unboxing'
  | 'hauls'
  | 'get_ready_with_me'
  | 'day_in_life'
  | 'comparison'
  | 'storytelling'
  | 'educational'
  | 'comedy'
  | 'challenges'

/**
 * Pricing ranges for brands
 */
export type PricingRange = 'budget' | 'midrange' | 'premium' | 'luxury'

/**
 * Partnership types
 */
export type PartnershipType = 'affiliate' | 'sponsored' | 'ambassador' | 'ugc' | 'gifted'

/**
 * Content formats with proficiency levels
 */
export type ContentFormat = 'video' | 'photo' | 'written' | 'audio' | 'live_stream'

/**
 * Proficiency level for content formats
 */
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'expert'

/**
 * Social media platforms
 */
export type Platform =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'twitter'
  | 'facebook'
  | 'pinterest'
  | 'linkedin'
  | 'twitch'
  | 'snapchat'
  | 'threads'

/**
 * Content format with proficiency
 */
export interface ContentFormatPreference {
  format: ContentFormat
  proficiency: ProficiencyLevel
}

/**
 * Platform preference with follower count
 */
export interface PlatformPreference {
  platform: Platform
  followerCount: number
  handle?: string
}

/**
 * Rate card entry for a specific platform/content type combination
 */
export interface RateCardEntry {
  platformOrType: string
  minimumCents: number
  preferredCents: number
  description?: string
}

/**
 * Brand exclusion entry
 */
export interface BrandExclusion {
  id: string
  brandName: string
  organizationId: string | null
  reason: string | null
  createdAt: Date
}

/**
 * Creator's general brand preferences
 * What KIND of brands/work they prefer (not per-brand relationship settings)
 */
export interface CreatorBrandPreferences {
  id: string
  creatorId: string
  preferredCategories: BrandCategory[]
  contentTypes: ContentType[]
  pricingRanges: Record<PricingRange, boolean>
  partnershipTypes: PartnershipType[]
  contentFormats: ContentFormatPreference[]
  platformPreferences: PlatformPreference[]
  rateCard: RateCardEntry[]
  minimumRateCents: number | null
  isAvailableForWork: boolean
  availabilityNotes: string | null
  profileCompletenessPercent: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Input for updating creator brand preferences
 */
export interface UpdateCreatorBrandPreferencesInput {
  preferredCategories?: BrandCategory[]
  contentTypes?: ContentType[]
  pricingRanges?: Record<PricingRange, boolean>
  partnershipTypes?: PartnershipType[]
  contentFormats?: ContentFormatPreference[]
  platformPreferences?: PlatformPreference[]
  rateCard?: RateCardEntry[]
  minimumRateCents?: number | null
  isAvailableForWork?: boolean
  availabilityNotes?: string | null
}

/**
 * Input for adding a brand exclusion
 */
export interface AddBrandExclusionInput {
  brandName: string
  organizationId?: string | null
  reason?: string | null
}

/**
 * Metadata for brand categories
 */
export interface BrandCategoryInfo {
  id: BrandCategory
  label: string
  icon: string
}

/**
 * Metadata for content types
 */
export interface ContentTypeInfo {
  id: ContentType
  label: string
  description: string
}

/**
 * Metadata for partnership types
 */
export interface PartnershipTypeInfo {
  id: PartnershipType
  label: string
  description: string
}

/**
 * Metadata for content formats
 */
export interface ContentFormatInfo {
  id: ContentFormat
  label: string
  icon: string
}

/**
 * Metadata for platforms
 */
export interface PlatformInfo {
  id: Platform
  label: string
  icon: string
  color: string
}
