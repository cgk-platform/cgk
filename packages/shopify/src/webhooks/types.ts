/**
 * Shopify Webhook Types
 */

/**
 * All supported webhook topics
 */
export type WebhookTopic =
  // Order webhooks
  | 'orders/create'
  | 'orders/updated'
  | 'orders/paid'
  | 'orders/cancelled'
  | 'orders/fulfilled'
  // Refund webhooks
  | 'refunds/create'
  // Fulfillment webhooks
  | 'fulfillments/create'
  | 'fulfillments/update'
  // Customer webhooks
  | 'customers/create'
  | 'customers/update'
  // App webhooks
  | 'app/uninstalled'
  // Optional webhooks (feature-gated)
  | 'products/create'
  | 'products/update'
  | 'products/delete'
  | 'inventory_levels/update'
  | 'checkouts/create'
  | 'checkouts/update'
  | 'draft_orders/create'
  | 'subscription_contracts/create'
  | 'subscription_contracts/update'

/**
 * Webhook event status
 */
export type WebhookEventStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * Webhook registration status
 */
export type WebhookRegistrationStatus = 'active' | 'failed' | 'deleted'

/**
 * Stored webhook event
 */
export interface WebhookEvent {
  id: string
  shop: string
  topic: WebhookTopic
  shopifyWebhookId: string | null
  payload: unknown
  hmacVerified: boolean
  status: WebhookEventStatus
  processedAt: Date | null
  errorMessage: string | null
  retryCount: number
  idempotencyKey: string | null
  receivedAt: Date
  headers: Record<string, string> | null
}

/**
 * Webhook registration record
 */
export interface WebhookRegistration {
  id: string
  shop: string
  topic: WebhookTopic
  shopifyWebhookId: string | null
  address: string
  format: string
  status: WebhookRegistrationStatus
  lastSuccessAt: Date | null
  lastFailureAt: Date | null
  failureCount: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Shopify connection record
 */
export interface ShopifyConnection {
  id: string
  shop: string
  accessToken: string
  webhookSecret: string | null
  scope: string[]
  status: 'active' | 'uninstalled' | 'suspended'
  installedAt: Date
  uninstalledAt: Date | null
  storeName: string | null
  storeEmail: string | null
  storeDomain: string | null
  storeCurrency: string
  storeTimezone: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Shopify credentials for API calls
 */
export interface ShopifyCredentials {
  shop: string
  accessToken: string
  webhookSecret: string | null
}

/**
 * Webhook handler function type
 */
export type WebhookHandler = (
  tenantId: string,
  payload: unknown,
  eventId: string
) => Promise<void>

/**
 * Webhook sync result
 */
export interface WebhookSyncResult {
  added: string[]
  removed: string[]
  unchanged: string[]
  errors: Array<{ topic: string; error: string }>
}

/**
 * Webhook health status
 */
export interface WebhookHealthStatus {
  shop: string
  registrations: Array<{
    topic: WebhookTopic
    status: WebhookRegistrationStatus
    lastSuccessAt: Date | null
    failureCount: number
  }>
  recentEvents: {
    total: number
    completed: number
    failed: number
    pending: number
  }
}

/**
 * Order webhook payload from Shopify
 */
export interface ShopifyOrderPayload {
  id: number
  admin_graphql_api_id: string
  name: string
  email: string | null
  created_at: string
  updated_at: string
  cancelled_at: string | null
  closed_at: string | null
  currency: string
  total_price: string
  subtotal_price: string
  total_tax: string
  total_discounts: string
  total_shipping_price_set?: {
    shop_money: { amount: string; currency_code: string }
  }
  financial_status: string
  fulfillment_status: string | null
  customer?: {
    id: number
    email: string | null
    phone: string | null
    first_name: string | null
    last_name: string | null
  }
  line_items: Array<{
    id: number
    product_id: number | null
    variant_id: number | null
    title: string
    quantity: number
    price: string
    sku: string | null
    variant_title: string | null
  }>
  discount_codes?: Array<{
    code: string
    amount: string
    type: string
  }>
  note_attributes?: Array<{
    name: string
    value: string
  }>
  shipping_address?: ShopifyAddressPayload
  billing_address?: ShopifyAddressPayload
  shipping_lines?: Array<{
    id: number
    title: string
    price: string
    code: string | null
  }>
  tags: string
}

/**
 * Address payload from Shopify
 */
export interface ShopifyAddressPayload {
  first_name: string | null
  last_name: string | null
  address1: string | null
  address2: string | null
  city: string | null
  province: string | null
  province_code: string | null
  country: string | null
  country_code: string | null
  zip: string | null
  phone: string | null
}

/**
 * Customer webhook payload from Shopify
 */
export interface ShopifyCustomerPayload {
  id: number
  admin_graphql_api_id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
  orders_count: number
  total_spent: string
  tags: string
  default_address?: ShopifyAddressPayload
  addresses?: ShopifyAddressPayload[]
}

/**
 * Fulfillment webhook payload from Shopify
 */
export interface ShopifyFulfillmentPayload {
  id: number
  admin_graphql_api_id: string
  order_id: number
  status: string
  created_at: string
  updated_at: string
  tracking_company: string | null
  tracking_number: string | null
  tracking_numbers: string[]
  tracking_url: string | null
  tracking_urls: string[]
  line_items: Array<{
    id: number
    product_id: number | null
    variant_id: number | null
    title: string
    quantity: number
  }>
}

/**
 * Refund webhook payload from Shopify
 */
export interface ShopifyRefundPayload {
  id: number
  admin_graphql_api_id: string
  order_id: number
  created_at: string
  processed_at: string | null
  note: string | null
  restock: boolean
  refund_line_items: Array<{
    id: number
    line_item_id: number
    quantity: number
    subtotal: string
    total_tax: string
  }>
  transactions: Array<{
    id: number
    amount: string
    kind: string
    status: string
  }>
}
