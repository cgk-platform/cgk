/**
 * Customer Portal Admin Features Types
 *
 * Defines types for order management, wishlist, referrals, loyalty, and support.
 */

// ============================================================================
// Order Management Types
// ============================================================================

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type CancellationReason =
  | 'changed_mind'
  | 'found_better_price'
  | 'ordered_by_mistake'
  | 'shipping_too_long'
  | 'other'

export type ReturnReason =
  | 'defective'
  | 'wrong_item'
  | 'not_as_described'
  | 'changed_mind'
  | 'size_issue'
  | 'quality_issue'
  | 'other'

export type ReturnStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'shipped'
  | 'received'
  | 'refunded'

export interface OrderLineItem {
  id: string
  productId: string
  variantId: string
  title: string
  variantTitle: string | null
  quantity: number
  priceCents: number
  imageUrl: string | null
  sku: string | null
}

export interface OrderTracking {
  carrier: string
  trackingNumber: string
  trackingUrl: string | null
  estimatedDelivery: string | null
  events: TrackingEvent[]
}

export interface TrackingEvent {
  status: string
  description: string
  location: string | null
  timestamp: string
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  createdAt: string
  updatedAt: string
  totalCents: number
  subtotalCents: number
  shippingCents: number
  taxCents: number
  discountCents: number
  currencyCode: string
  lineItems: OrderLineItem[]
  shippingAddress: Address
  billingAddress: Address | null
  tracking: OrderTracking | null
  canCancel: boolean
  canReturn: boolean
  cancellationDeadline: string | null
  returnDeadline: string | null
}

export interface CancelOrderRequest {
  orderId: string
  reason: CancellationReason
  reasonDetails: string | null
}

export interface ReturnRequest {
  orderId: string
  items: ReturnRequestItem[]
  reason: ReturnReason
  reasonDetails: string | null
  preferredResolution: 'refund' | 'exchange' | 'store_credit'
}

export interface ReturnRequestItem {
  lineItemId: string
  quantity: number
}

export interface ReturnRequestResponse {
  id: string
  status: ReturnStatus
  returnLabel: string | null
  instructions: string | null
  createdAt: string
}

// ============================================================================
// Wishlist Types
// ============================================================================

export interface WishlistItem {
  id: string
  productId: string
  variantId: string | null
  title: string
  variantTitle: string | null
  priceCents: number
  comparePriceCents: number | null
  imageUrl: string | null
  handle: string
  inStock: boolean
  addedAt: string
}

export interface Wishlist {
  id: string
  name: string
  isDefault: boolean
  isPublic: boolean
  shareUrl: string | null
  items: WishlistItem[]
  createdAt: string
  updatedAt: string
}

export interface AddToWishlistRequest {
  wishlistId: string | null
  productId: string
  variantId: string | null
}

export interface ShareWishlistResponse {
  shareUrl: string
  expiresAt: string | null
}

// ============================================================================
// Referral Program Types
// ============================================================================

export type ReferralStatus = 'pending' | 'converted' | 'expired' | 'cancelled'

export interface ReferralCode {
  code: string
  shareUrl: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  createdAt: string
  expiresAt: string | null
}

export interface Referral {
  id: string
  email: string
  status: ReferralStatus
  invitedAt: string
  convertedAt: string | null
  rewardEarned: number | null
  rewardCurrencyCode: string
}

export interface ReferralStats {
  totalInvited: number
  totalConverted: number
  totalEarned: number
  pendingRewards: number
  currencyCode: string
  conversionRate: number
}

export interface ReferralReward {
  id: string
  amount: number
  currencyCode: string
  type: 'store_credit' | 'discount' | 'points'
  status: 'pending' | 'credited' | 'expired'
  referralId: string
  earnedAt: string
  creditedAt: string | null
  expiresAt: string | null
}

// ============================================================================
// Loyalty Points Types
// ============================================================================

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export type PointsTransactionType =
  | 'earned_purchase'
  | 'earned_review'
  | 'earned_referral'
  | 'earned_birthday'
  | 'earned_signup'
  | 'redeemed'
  | 'expired'
  | 'adjusted'

export interface LoyaltyTierInfo {
  tier: LoyaltyTier
  name: string
  minPoints: number
  maxPoints: number | null
  benefits: string[]
  multiplier: number
}

export interface LoyaltyAccount {
  id: string
  currentPoints: number
  lifetimePoints: number
  tier: LoyaltyTier
  tierProgress: number
  pointsToNextTier: number | null
  nextTier: LoyaltyTier | null
  tierExpiresAt: string | null
  memberSince: string
}

export interface PointsTransaction {
  id: string
  type: PointsTransactionType
  points: number
  description: string
  orderId: string | null
  createdAt: string
  expiresAt: string | null
}

export interface LoyaltyReward {
  id: string
  name: string
  description: string
  pointsCost: number
  type: 'discount' | 'free_product' | 'free_shipping' | 'exclusive_access'
  value: number | null
  imageUrl: string | null
  isAvailable: boolean
  expiresAt: string | null
}

export interface RedeemRewardRequest {
  rewardId: string
  quantity: number
}

export interface RedeemRewardResponse {
  success: boolean
  discountCode: string | null
  message: string
  remainingPoints: number
}

// ============================================================================
// Support Types
// ============================================================================

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
export type TicketCategory =
  | 'order_issue'
  | 'shipping'
  | 'return_refund'
  | 'product_inquiry'
  | 'account'
  | 'payment'
  | 'other'

export interface SupportTicket {
  id: string
  ticketNumber: string
  subject: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  orderId: string | null
  messages: TicketMessage[]
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export interface TicketMessage {
  id: string
  content: string
  isFromCustomer: boolean
  authorName: string
  attachments: TicketAttachment[]
  createdAt: string
}

export interface TicketAttachment {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  url: string
}

export interface CreateTicketRequest {
  subject: string
  category: TicketCategory
  message: string
  orderId: string | null
  attachments: File[]
}

export interface ReplyToTicketRequest {
  ticketId: string
  message: string
  attachments: File[]
}

export interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
  helpfulCount: number
  notHelpfulCount: number
}

export interface FaqCategory {
  id: string
  name: string
  slug: string
  description: string | null
  items: FaqItem[]
}

// ============================================================================
// Common Types
// ============================================================================

export interface Address {
  firstName: string
  lastName: string
  company: string | null
  address1: string
  address2: string | null
  city: string
  province: string
  provinceCode: string | null
  postalCode: string
  country: string
  countryCode: string
  phone: string | null
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ============================================================================
// Feature Flags
// ============================================================================

export interface PortalFeatureFlags {
  ordersEnabled: boolean
  orderCancellationEnabled: boolean
  orderReturnsEnabled: boolean
  wishlistEnabled: boolean
  wishlistSharingEnabled: boolean
  referralsEnabled: boolean
  loyaltyEnabled: boolean
  supportTicketsEnabled: boolean
  liveChatEnabled: boolean
  faqEnabled: boolean
}

// ============================================================================
// Customer Profile Types
// ============================================================================

export interface CustomerProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  acceptsMarketing: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateProfileRequest {
  firstName?: string
  lastName?: string
  phone?: string | null
  acceptsMarketing?: boolean
}

// ============================================================================
// Store Credit Types
// ============================================================================

export type StoreCreditTransactionType =
  | 'credit_added'
  | 'used_at_checkout'
  | 'expired'
  | 'refund'
  | 'adjustment'
  | 'gift_card_redemption'

export interface StoreCreditTransaction {
  id: string
  type: StoreCreditTransactionType
  amountCents: number
  balanceAfterCents: number
  description: string
  orderId: string | null
  createdAt: string
  expiresAt: string | null
}

export interface StoreCreditAccount {
  id: string
  balanceCents: number
  currencyCode: string
  transactions: StoreCreditTransaction[]
  lastUpdated: string
}

// ============================================================================
// Content Strings
// ============================================================================

export interface PortalContentStrings {
  // Dashboard
  'dashboard.title': string
  'dashboard.welcome': string
  'dashboard.recent_orders': string
  'dashboard.view_all': string

  // Orders
  'orders.title': string
  'orders.search_placeholder': string
  'orders.filter_all': string
  'orders.filter_pending': string
  'orders.filter_shipped': string
  'orders.filter_delivered': string
  'orders.empty': string
  'orders.empty_description': string
  'orders.cancel.title': string
  'orders.cancel.description': string
  'orders.cancel.reason_label': string
  'orders.cancel.confirm': string
  'orders.return.title': string
  'orders.return.description': string
  'orders.return.select_items': string
  'orders.return.reason_label': string
  'orders.return.resolution_label': string
  'orders.return.submit': string
  'orders.tracking.title': string
  'orders.tracking.estimated_delivery': string
  'orders.detail.title': string
  'orders.detail.order_date': string
  'orders.detail.items': string
  'orders.detail.shipping_address': string
  'orders.detail.billing_address': string
  'orders.detail.order_summary': string
  'orders.detail.subtotal': string
  'orders.detail.shipping': string
  'orders.detail.tax': string
  'orders.detail.discount': string
  'orders.detail.total': string

  // Addresses
  'addresses.title': string
  'addresses.add_new': string
  'addresses.edit': string
  'addresses.delete': string
  'addresses.set_default': string
  'addresses.default_badge': string
  'addresses.empty': string
  'addresses.empty_description': string
  'addresses.modal.add_title': string
  'addresses.modal.edit_title': string
  'addresses.form.first_name': string
  'addresses.form.last_name': string
  'addresses.form.company': string
  'addresses.form.address1': string
  'addresses.form.address2': string
  'addresses.form.city': string
  'addresses.form.province': string
  'addresses.form.postal_code': string
  'addresses.form.country': string
  'addresses.form.phone': string
  'addresses.form.save': string
  'addresses.delete_confirm': string
  'addresses.delete_confirm_description': string

  // Profile
  'profile.title': string
  'profile.description': string
  'profile.first_name': string
  'profile.last_name': string
  'profile.email': string
  'profile.email_note': string
  'profile.phone': string
  'profile.marketing': string
  'profile.marketing_description': string
  'profile.password': string
  'profile.password_description': string
  'profile.change_password': string
  'profile.save': string
  'profile.save_success': string

  // Wishlist
  'wishlist.title': string
  'wishlist.empty': string
  'wishlist.empty_description': string
  'wishlist.add_to_cart': string
  'wishlist.remove': string
  'wishlist.share': string
  'wishlist.share.copied': string
  'wishlist.items_count': string
  'wishlist.move_all_to_cart': string
  'wishlist.clear_all': string

  // Store Credit
  'store_credit.title': string
  'store_credit.balance': string
  'store_credit.available_balance': string
  'store_credit.history': string
  'store_credit.empty': string
  'store_credit.empty_description': string
  'store_credit.transaction.credit_added': string
  'store_credit.transaction.used_at_checkout': string
  'store_credit.transaction.expired': string
  'store_credit.transaction.refund': string
  'store_credit.transaction.adjustment': string
  'store_credit.transaction.gift_card_redemption': string

  // Referrals
  'referrals.title': string
  'referrals.description': string
  'referrals.your_code': string
  'referrals.copy_code': string
  'referrals.share_via': string
  'referrals.stats.invited': string
  'referrals.stats.converted': string
  'referrals.stats.earned': string
  'referrals.history.title': string
  'referrals.history.empty': string

  // Loyalty
  'loyalty.title': string
  'loyalty.points_balance': string
  'loyalty.tier_status': string
  'loyalty.next_tier': string
  'loyalty.points_to_next': string
  'loyalty.history.title': string
  'loyalty.rewards.title': string
  'loyalty.rewards.redeem': string
  'loyalty.rewards.not_enough_points': string

  // Support
  'support.title': string
  'support.new_ticket': string
  'support.ticket.subject': string
  'support.ticket.category': string
  'support.ticket.message': string
  'support.ticket.submit': string
  'support.faq.title': string
  'support.faq.search': string
  'support.chat.title': string
  'support.chat.start': string

  // Common
  'common.loading': string
  'common.error': string
  'common.retry': string
  'common.cancel': string
  'common.save': string
  'common.delete': string
  'common.edit': string
  'common.back': string
  'common.continue': string
  'common.start_shopping': string
}
