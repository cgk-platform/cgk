/**
 * @cgk/portal - Customer Portal Package
 *
 * Provides authentication, API access, content management, and feature flags
 * for the customer-facing account portal.
 */

// Theme (existing)
export * from './theme/index.js'

// Authentication
export {
  initiateShopifyLogin,
  handleShopifyCallback,
  refreshCustomerToken,
  createCustomerSession,
  getCustomerSession,
  logout,
  hasActiveSession,
  requireCustomerAuth,
  getOptionalCustomerAuth,
  requireNoAuth,
  handleSignOut,
  cleanupExpiredStates,
  cleanupExpiredSessions,
} from './auth'

export type {
  CustomerOAuthConfig,
  CustomerTokens,
  CustomerSessionData,
  CustomerFromToken,
} from './auth'

// API
export {
  customerQuery,
  customerMutation,
  getShopifyConfig,
  getCustomer,
  updateCustomer,
  getOrders,
  getOrder,
  getSubscriptions,
  getSubscription,
  pauseSubscription,
  resumeSubscription,
  skipNextDelivery,
  cancelSubscription,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getStoreCreditAccounts,
  getTotalStoreCreditBalance,
  getStoreCreditTransactions,
} from './api'

// Content
export { getContent, getContentString, clearContentCache, interpolate } from './content/getContent'
export { DEFAULT_CONTENT } from './content/defaults'

// Features
export { getPortalFeatures, isFeatureEnabled, clearFeatureCache } from './features/isEnabled'

// Types
export type {
  // OAuth & Session
  ShopifyOAuthConfig,
  OAuthTokens,
  OAuthState,
  CustomerSession,
  CustomerInfo,
  // Orders
  CustomerOrder,
  OrderFulfillmentStatus,
  OrderFinancialStatus,
  OrderLineItem,
  OrderFulfillment,
  // Subscriptions
  CustomerSubscription,
  SubscriptionStatus,
  BillingPolicy,
  DeliveryPolicy,
  SubscriptionLine,
  PaymentMethodSummary,
  // Addresses
  CustomerAddress,
  AddressInput,
  // Store Credit
  StoreCreditAccount,
  StoreCreditTransaction,
  StoreCreditTransactionType,
  // Common
  Money,
  PageInfo,
  GraphQLRequest,
  GraphQLResponse,
  UserError,
  // Feature Flags
  PortalFeatureFlags,
  // Content
  ContentKey,
  ContentStrings,
} from './types'
