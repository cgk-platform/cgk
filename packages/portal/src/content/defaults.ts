/**
 * Default Content Strings
 *
 * Default text content for the customer portal.
 * Tenants can override these via the content customization system.
 */

import type { ContentStrings } from '../types'

export const DEFAULT_CONTENT: ContentStrings = {
  // Dashboard
  'dashboard.title': 'My Account',
  'dashboard.welcome': 'Welcome back, {{firstName}}',
  'dashboard.signOut': 'Sign Out',
  'dashboard.orders.title': 'Orders',
  'dashboard.orders.description': 'View your order history and track shipments',
  'dashboard.subscriptions.title': 'Subscriptions',
  'dashboard.subscriptions.description': 'Manage your active subscriptions',
  'dashboard.addresses.title': 'Addresses',
  'dashboard.addresses.description': 'Manage your shipping addresses',
  'dashboard.profile.title': 'Profile',
  'dashboard.profile.description': 'Update your personal information',
  'dashboard.storeCredit.title': 'Store Credit',
  'dashboard.storeCredit.description': 'View your balance and history',

  // Orders
  'orders.title': 'Order History',
  'orders.empty': 'You have no orders yet.',
  'orders.viewDetails': 'View Details',
  'orders.trackOrder': 'Track Order',
  'orders.status.unfulfilled': 'Processing',
  'orders.status.partiallyFulfilled': 'Partially Shipped',
  'orders.status.fulfilled': 'Shipped',
  'orders.status.delivered': 'Delivered',
  'orders.status.cancelled': 'Cancelled',

  // Subscriptions
  'subscriptions.title': 'My Subscriptions',
  'subscriptions.empty': 'You have no active subscriptions.',
  'subscriptions.nextDelivery': 'Next delivery',
  'subscriptions.status.active': 'Active',
  'subscriptions.status.paused': 'Paused',
  'subscriptions.status.cancelled': 'Cancelled',
  'subscriptions.pause': 'Pause Subscription',
  'subscriptions.resume': 'Resume Subscription',
  'subscriptions.skip': 'Skip Next Delivery',
  'subscriptions.cancel': 'Cancel Subscription',
  'subscriptions.reschedule': 'Reschedule Delivery',
  'subscriptions.updatePayment': 'Update Payment',
  'subscriptions.updateAddress': 'Update Address',

  // Addresses
  'addresses.title': 'Shipping Addresses',
  'addresses.empty': 'You have no saved addresses.',
  'addresses.addNew': 'Add New Address',
  'addresses.edit': 'Edit',
  'addresses.delete': 'Delete',
  'addresses.setDefault': 'Set as Default',
  'addresses.default': 'Default',

  // Profile
  'profile.title': 'Personal Information',
  'profile.firstName': 'First Name',
  'profile.lastName': 'Last Name',
  'profile.email': 'Email Address',
  'profile.phone': 'Phone Number',
  'profile.save': 'Save Changes',
  'profile.changePassword': 'Change Password',

  // Store Credit
  'storeCredit.title': 'Store Credit',
  'storeCredit.balance': 'Current Balance',
  'storeCredit.transactions': 'Transaction History',
  'storeCredit.empty': 'No transactions yet.',
  'storeCredit.type.credit': 'Credit Added',
  'storeCredit.type.debit': 'Used at Checkout',
  'storeCredit.type.expiration': 'Expired',
  'storeCredit.type.refund': 'Refund',

  // Login
  'login.title': 'Sign In',
  'login.subtitle': 'Access your account to manage orders and subscriptions',
  'login.button': 'Continue with Shopify',
  'login.error': 'Unable to sign in. Please try again.',

  // Common
  'common.loading': 'Loading...',
  'common.error': 'Something went wrong',
  'common.retry': 'Try Again',
  'common.back': 'Back',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.delete': 'Delete',
}
