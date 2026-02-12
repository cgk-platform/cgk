/**
 * Customer Portal Types
 *
 * Type definitions for customer portal authentication, data, and configuration.
 */

// ============================================================================
// OAuth Types
// ============================================================================

export interface ShopifyOAuthConfig {
  tenantId: string
  shopId: string
  clientId: string
  clientSecretEncrypted: string
  redirectUri: string
  scopes: string[]
}

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  idToken?: string
}

export interface OAuthState {
  tenantId: string
  codeVerifier: string
  redirectAfterLogin: string
  createdAt: number
  nonce: string
}

export interface CustomerSession {
  customerId: string
  tenantId: string
  accessToken: string
  refreshToken: string
  expiresAt: number
  customer: CustomerInfo
}

export interface CustomerInfo {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  acceptsMarketing: boolean
  createdAt: string
}

// ============================================================================
// Order Types
// ============================================================================

export interface CustomerOrder {
  id: string
  name: string
  orderNumber: string
  processedAt: string
  fulfillmentStatus: OrderFulfillmentStatus
  financialStatus: OrderFinancialStatus
  currentTotalPrice: Money
  lineItems: OrderLineItem[]
  shippingAddress: CustomerAddress | null
  fulfillments: OrderFulfillment[]
}

export type OrderFulfillmentStatus =
  | 'UNFULFILLED'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'RESTOCKED'
  | 'PENDING_FULFILLMENT'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'SCHEDULED'

export type OrderFinancialStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'VOIDED'

export interface OrderLineItem {
  title: string
  quantity: number
  image: {
    url: string
    altText: string | null
  } | null
  variant: {
    title: string
    price: Money
  } | null
}

export interface OrderFulfillment {
  trackingCompany: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  status: string
  deliveredAt: string | null
  estimatedDeliveryAt: string | null
}

// ============================================================================
// Subscription Types
// ============================================================================

export interface CustomerSubscription {
  id: string
  status: SubscriptionStatus
  nextBillingDate: string | null
  lastBillingDate: string | null
  createdAt: string
  billingPolicy: BillingPolicy
  deliveryPolicy: DeliveryPolicy
  lines: SubscriptionLine[]
  deliveryAddress: CustomerAddress | null
  paymentMethod: PaymentMethodSummary | null
}

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED'

export interface BillingPolicy {
  intervalCount: number
  interval: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
}

export interface DeliveryPolicy {
  intervalCount: number
  interval: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
}

export interface SubscriptionLine {
  id: string
  title: string
  quantity: number
  currentPrice: Money
  variantTitle: string | null
  variantImage: {
    url: string
    altText: string | null
  } | null
  productId: string
  variantId: string
}

export interface PaymentMethodSummary {
  id: string
  brand: string
  lastDigits: string
  expiryMonth: number
  expiryYear: number
}

// ============================================================================
// Address Types
// ============================================================================

export interface CustomerAddress {
  id: string
  firstName: string | null
  lastName: string | null
  company: string | null
  address1: string
  address2: string | null
  city: string
  province: string | null
  provinceCode: string | null
  country: string
  countryCode: string
  zip: string
  phone: string | null
  isDefault: boolean
}

export interface AddressInput {
  firstName?: string
  lastName?: string
  company?: string
  address1: string
  address2?: string
  city: string
  province?: string
  country: string
  zip: string
  phone?: string
}

// ============================================================================
// Store Credit Types
// ============================================================================

export interface StoreCreditAccount {
  id: string
  balance: Money
}

export interface StoreCreditTransaction {
  id: string
  type: StoreCreditTransactionType
  amount: Money
  createdAt: string
  description: string | null
  orderId: string | null
}

export type StoreCreditTransactionType =
  | 'CREDIT'
  | 'DEBIT'
  | 'EXPIRATION'
  | 'REFUND'
  | 'ADJUSTMENT'

// ============================================================================
// Common Types
// ============================================================================

export interface Money {
  amount: string
  currencyCode: string
}

export interface PageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
}

export interface GraphQLRequest {
  query: string
  variables?: Record<string, unknown>
}

export interface GraphQLResponse<T> {
  data: T | null
  errors?: Array<{
    message: string
    locations?: Array<{ line: number; column: number }>
    path?: string[]
    extensions?: Record<string, unknown>
  }>
}

export interface UserError {
  field: string[] | null
  message: string
}

// ============================================================================
// Feature Flags
// ============================================================================

export interface PortalFeatureFlags {
  orders: boolean
  subscriptions: boolean
  addresses: boolean
  profile: boolean
  store_credit: boolean
  rewards: boolean
  referrals: boolean
  subscription_pause: boolean
  subscription_skip: boolean
  subscription_cancel_self_serve: boolean
  subscription_reschedule: boolean
  subscription_payment_update: boolean
  subscription_address_update: boolean
  subscription_frequency_update: boolean
  subscription_product_swap: boolean
}

// ============================================================================
// Content Types
// ============================================================================

export type ContentKey =
  | 'dashboard.title'
  | 'dashboard.welcome'
  | 'dashboard.signOut'
  | 'dashboard.orders.title'
  | 'dashboard.orders.description'
  | 'dashboard.subscriptions.title'
  | 'dashboard.subscriptions.description'
  | 'dashboard.addresses.title'
  | 'dashboard.addresses.description'
  | 'dashboard.profile.title'
  | 'dashboard.profile.description'
  | 'dashboard.storeCredit.title'
  | 'dashboard.storeCredit.description'
  | 'orders.title'
  | 'orders.empty'
  | 'orders.viewDetails'
  | 'orders.trackOrder'
  | 'orders.status.unfulfilled'
  | 'orders.status.partiallyFulfilled'
  | 'orders.status.fulfilled'
  | 'orders.status.delivered'
  | 'orders.status.cancelled'
  | 'subscriptions.title'
  | 'subscriptions.empty'
  | 'subscriptions.nextDelivery'
  | 'subscriptions.status.active'
  | 'subscriptions.status.paused'
  | 'subscriptions.status.cancelled'
  | 'subscriptions.pause'
  | 'subscriptions.resume'
  | 'subscriptions.skip'
  | 'subscriptions.cancel'
  | 'subscriptions.reschedule'
  | 'subscriptions.updatePayment'
  | 'subscriptions.updateAddress'
  | 'addresses.title'
  | 'addresses.empty'
  | 'addresses.addNew'
  | 'addresses.edit'
  | 'addresses.delete'
  | 'addresses.setDefault'
  | 'addresses.default'
  | 'profile.title'
  | 'profile.firstName'
  | 'profile.lastName'
  | 'profile.email'
  | 'profile.phone'
  | 'profile.save'
  | 'profile.changePassword'
  | 'storeCredit.title'
  | 'storeCredit.balance'
  | 'storeCredit.transactions'
  | 'storeCredit.empty'
  | 'storeCredit.type.credit'
  | 'storeCredit.type.debit'
  | 'storeCredit.type.expiration'
  | 'storeCredit.type.refund'
  | 'login.title'
  | 'login.subtitle'
  | 'login.button'
  | 'login.error'
  | 'common.loading'
  | 'common.error'
  | 'common.retry'
  | 'common.back'
  | 'common.save'
  | 'common.cancel'
  | 'common.confirm'
  | 'common.delete'

export type ContentStrings = Record<ContentKey, string>
