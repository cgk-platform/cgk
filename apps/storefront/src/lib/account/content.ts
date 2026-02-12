/**
 * Portal Content Management
 *
 * Provides content strings with tenant customization support.
 * All user-facing text goes through this system for white-label flexibility.
 */

import type { PortalContentStrings } from './types'

/**
 * Default content strings for the customer portal.
 * Tenants can override any of these in their portal configuration.
 */
export const defaultContent: PortalContentStrings = {
  // Dashboard
  'dashboard.title': 'My Account',
  'dashboard.welcome': 'Welcome back! Manage your orders, subscriptions, and account settings.',
  'dashboard.recent_orders': 'Recent Orders',
  'dashboard.view_all': 'View all',

  // Orders
  'orders.title': 'Order History',
  'orders.search_placeholder': 'Search orders...',
  'orders.filter_all': 'All Orders',
  'orders.filter_pending': 'Pending',
  'orders.filter_shipped': 'Shipped',
  'orders.filter_delivered': 'Delivered',
  'orders.empty': 'No orders yet',
  'orders.empty_description': 'When you place an order, it will appear here.',
  'orders.cancel.title': 'Cancel Order',
  'orders.cancel.description':
    'Are you sure you want to cancel this order? This action cannot be undone.',
  'orders.cancel.reason_label': 'Reason for cancellation',
  'orders.cancel.confirm': 'Cancel Order',
  'orders.return.title': 'Request a Return',
  'orders.return.description':
    'Select the items you wish to return and provide a reason.',
  'orders.return.select_items': 'Select items to return',
  'orders.return.reason_label': 'Reason for return',
  'orders.return.resolution_label': 'Preferred resolution',
  'orders.return.submit': 'Submit Return Request',
  'orders.tracking.title': 'Track Shipment',
  'orders.tracking.estimated_delivery': 'Estimated delivery',
  'orders.detail.title': 'Order Details',
  'orders.detail.order_date': 'Order placed',
  'orders.detail.items': 'Items',
  'orders.detail.shipping_address': 'Shipping Address',
  'orders.detail.billing_address': 'Billing Address',
  'orders.detail.order_summary': 'Order Summary',
  'orders.detail.subtotal': 'Subtotal',
  'orders.detail.shipping': 'Shipping',
  'orders.detail.tax': 'Tax',
  'orders.detail.discount': 'Discount',
  'orders.detail.total': 'Total',

  // Addresses
  'addresses.title': 'Address Book',
  'addresses.add_new': 'Add New Address',
  'addresses.edit': 'Edit',
  'addresses.delete': 'Delete',
  'addresses.set_default': 'Set as Default',
  'addresses.default_badge': 'Default',
  'addresses.empty': 'No addresses saved',
  'addresses.empty_description': 'Add a shipping address to make checkout faster.',
  'addresses.modal.add_title': 'Add New Address',
  'addresses.modal.edit_title': 'Edit Address',
  'addresses.form.first_name': 'First Name',
  'addresses.form.last_name': 'Last Name',
  'addresses.form.company': 'Company (optional)',
  'addresses.form.address1': 'Address',
  'addresses.form.address2': 'Apartment, suite, etc. (optional)',
  'addresses.form.city': 'City',
  'addresses.form.province': 'State / Province',
  'addresses.form.postal_code': 'Postal Code',
  'addresses.form.country': 'Country',
  'addresses.form.phone': 'Phone (optional)',
  'addresses.form.save': 'Save Address',
  'addresses.delete_confirm': 'Delete Address?',
  'addresses.delete_confirm_description': 'This address will be permanently removed from your account.',

  // Profile
  'profile.title': 'Profile Settings',
  'profile.description': 'Manage your account information and preferences.',
  'profile.first_name': 'First Name',
  'profile.last_name': 'Last Name',
  'profile.email': 'Email Address',
  'profile.email_note': 'Contact support to change your email address.',
  'profile.phone': 'Phone Number',
  'profile.marketing': 'Marketing Preferences',
  'profile.marketing_description': 'Receive emails about new products, offers, and updates.',
  'profile.password': 'Password',
  'profile.password_description': 'Change your password through our secure password reset flow.',
  'profile.change_password': 'Change Password',
  'profile.save': 'Save Changes',
  'profile.save_success': 'Your profile has been updated successfully.',

  // Wishlist
  'wishlist.title': 'My Wishlist',
  'wishlist.empty': 'Your wishlist is empty',
  'wishlist.empty_description': 'Save items you love for later by clicking the heart icon.',
  'wishlist.add_to_cart': 'Add to Cart',
  'wishlist.remove': 'Remove',
  'wishlist.share': 'Share Wishlist',
  'wishlist.share.copied': 'Link copied to clipboard!',
  'wishlist.items_count': '{{count}} items',
  'wishlist.move_all_to_cart': 'Add All to Cart',
  'wishlist.clear_all': 'Clear Wishlist',

  // Store Credit
  'store_credit.title': 'Store Credit',
  'store_credit.balance': 'Current Balance',
  'store_credit.available_balance': 'Available to spend',
  'store_credit.history': 'Transaction History',
  'store_credit.empty': 'No store credit yet',
  'store_credit.empty_description': 'Store credit from returns, promotions, or gift cards will appear here.',
  'store_credit.transaction.credit_added': 'Credit Added',
  'store_credit.transaction.used_at_checkout': 'Used at Checkout',
  'store_credit.transaction.expired': 'Credit Expired',
  'store_credit.transaction.refund': 'Refund Credit',
  'store_credit.transaction.adjustment': 'Adjustment',
  'store_credit.transaction.gift_card_redemption': 'Gift Card Redeemed',

  // Referrals
  'referrals.title': 'Refer a Friend',
  'referrals.description':
    'Share your unique code with friends and earn rewards when they make their first purchase.',
  'referrals.your_code': 'Your referral code',
  'referrals.copy_code': 'Copy Code',
  'referrals.share_via': 'Share via',
  'referrals.stats.invited': 'Friends Invited',
  'referrals.stats.converted': 'Successful Referrals',
  'referrals.stats.earned': 'Total Earned',
  'referrals.history.title': 'Referral History',
  'referrals.history.empty': 'No referrals yet. Start sharing to earn rewards!',

  // Loyalty
  'loyalty.title': 'Rewards',
  'loyalty.points_balance': 'Points Balance',
  'loyalty.tier_status': 'Your Status',
  'loyalty.next_tier': 'Next Tier',
  'loyalty.points_to_next': 'points to {{tier}}',
  'loyalty.history.title': 'Points History',
  'loyalty.rewards.title': 'Available Rewards',
  'loyalty.rewards.redeem': 'Redeem',
  'loyalty.rewards.not_enough_points': 'Not enough points',

  // Support
  'support.title': 'Help & Support',
  'support.new_ticket': 'New Support Request',
  'support.ticket.subject': 'Subject',
  'support.ticket.category': 'Category',
  'support.ticket.message': 'How can we help?',
  'support.ticket.submit': 'Submit Request',
  'support.faq.title': 'Frequently Asked Questions',
  'support.faq.search': 'Search for answers...',
  'support.chat.title': 'Live Chat',
  'support.chat.start': 'Start Chat',

  // Common
  'common.loading': 'Loading...',
  'common.error': 'Something went wrong',
  'common.retry': 'Try Again',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.back': 'Back',
  'common.continue': 'Continue',
  'common.start_shopping': 'Start Shopping',
}

/**
 * Interpolate variables in content strings.
 * Variables are in the format {{variableName}}
 */
export function interpolateContent(
  template: string,
  variables: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key]
    return value !== undefined ? String(value) : match
  })
}

/**
 * Content provider that merges tenant customizations with defaults.
 */
export function createContentProvider(
  tenantOverrides: Partial<PortalContentStrings> = {}
): PortalContentStrings {
  return {
    ...defaultContent,
    ...tenantOverrides,
  }
}

/**
 * Get a content string with optional variable interpolation.
 */
export function getContent(
  content: PortalContentStrings,
  key: keyof PortalContentStrings,
  variables?: Record<string, string | number>
): string {
  const template = content[key]
  if (variables) {
    return interpolateContent(template, variables)
  }
  return template
}

/**
 * Cancellation reason labels
 */
export const cancellationReasonLabels: Record<string, string> = {
  changed_mind: 'Changed my mind',
  found_better_price: 'Found a better price',
  ordered_by_mistake: 'Ordered by mistake',
  shipping_too_long: 'Shipping takes too long',
  other: 'Other reason',
}

/**
 * Return reason labels
 */
export const returnReasonLabels: Record<string, string> = {
  defective: 'Item is defective',
  wrong_item: 'Received wrong item',
  not_as_described: 'Not as described',
  changed_mind: 'Changed my mind',
  size_issue: 'Size/fit issue',
  quality_issue: 'Quality not as expected',
  other: 'Other reason',
}

/**
 * Resolution preference labels
 */
export const resolutionLabels: Record<string, string> = {
  refund: 'Full refund to original payment',
  exchange: 'Exchange for different item',
  store_credit: 'Store credit',
}

/**
 * Ticket category labels
 */
export const ticketCategoryLabels: Record<string, string> = {
  order_issue: 'Order Issue',
  shipping: 'Shipping & Delivery',
  return_refund: 'Returns & Refunds',
  product_inquiry: 'Product Question',
  account: 'Account & Login',
  payment: 'Payment & Billing',
  other: 'Other',
}

/**
 * Order status labels
 */
export const orderStatusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

/**
 * Return status labels
 */
export const returnStatusLabels: Record<string, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  shipped: 'Return Shipped',
  received: 'Received',
  refunded: 'Refunded',
}

/**
 * Loyalty tier labels
 */
export const loyaltyTierLabels: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

/**
 * Points transaction type labels
 */
export const pointsTransactionLabels: Record<string, string> = {
  earned_purchase: 'Earned from purchase',
  earned_review: 'Earned from review',
  earned_referral: 'Earned from referral',
  earned_birthday: 'Birthday bonus',
  earned_signup: 'Welcome bonus',
  redeemed: 'Redeemed for reward',
  expired: 'Points expired',
  adjusted: 'Points adjustment',
}

/**
 * Store credit transaction type labels
 */
export const storeCreditTransactionLabels: Record<string, string> = {
  credit_added: 'Credit Added',
  used_at_checkout: 'Used at Checkout',
  expired: 'Credit Expired',
  refund: 'Refund Credit',
  adjustment: 'Adjustment',
  gift_card_redemption: 'Gift Card Redeemed',
}
