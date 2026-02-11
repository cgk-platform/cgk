/**
 * Shopify OAuth scopes for the CGK platform
 *
 * The platform requests all scopes upfront to support current
 * and future functionality without requiring re-authentication.
 */

/**
 * Core commerce scopes
 */
const COMMERCE_SCOPES = [
  'read_orders',
  'write_orders',
  'read_draft_orders',
  'write_draft_orders',
  'read_checkouts',
  'write_checkouts',
  'read_customers',
  'write_customers',
  'read_customer_payment_methods',
] as const

/**
 * Product and inventory scopes
 */
const PRODUCT_SCOPES = [
  'read_products',
  'write_products',
  'read_inventory',
  'write_inventory',
  'read_product_listings',
  'read_publications',
  'read_product_feeds',
  'write_product_feeds',
] as const

/**
 * Fulfillment scopes
 */
const FULFILLMENT_SCOPES = [
  'read_fulfillments',
  'write_fulfillments',
  'read_shipping',
  'write_shipping',
  'read_locations',
  'read_merchant_managed_fulfillment_orders',
  'write_merchant_managed_fulfillment_orders',
  'read_third_party_fulfillment_orders',
  'write_third_party_fulfillment_orders',
  'read_assigned_fulfillment_orders',
  'write_assigned_fulfillment_orders',
] as const

/**
 * Marketing and discount scopes
 */
const MARKETING_SCOPES = [
  'read_discounts',
  'write_discounts',
  'read_price_rules',
  'write_price_rules',
  'read_marketing_events',
  'write_marketing_events',
] as const

/**
 * Gift card scopes
 */
const GIFT_CARD_SCOPES = [
  'read_gift_cards',
  'write_gift_cards',
] as const

/**
 * Content and metafields scopes
 */
const CONTENT_SCOPES = [
  'read_content',
  'write_content',
  'read_themes',
  'write_themes',
  'read_locales',
] as const

/**
 * Pixel and analytics scopes
 */
const ANALYTICS_SCOPES = [
  'write_pixels',
  'read_customer_events',
  'read_analytics',
  'read_reports',
] as const

/**
 * Markets and international scopes
 */
const MARKETS_SCOPES = [
  'read_markets',
  'write_markets',
] as const

/**
 * Subscription scopes
 */
const SUBSCRIPTION_SCOPES = [
  'read_own_subscription_contracts',
  'write_own_subscription_contracts',
  'read_customer_merge',
] as const

/**
 * File and storage scopes
 */
const FILE_SCOPES = [
  'read_files',
  'write_files',
] as const

/**
 * Store settings scopes
 */
const STORE_SCOPES = [
  'read_shop',
  'read_legal_policies',
] as const

/**
 * All platform scopes combined
 */
export const PLATFORM_SCOPES = [
  ...COMMERCE_SCOPES,
  ...PRODUCT_SCOPES,
  ...FULFILLMENT_SCOPES,
  ...MARKETING_SCOPES,
  ...GIFT_CARD_SCOPES,
  ...CONTENT_SCOPES,
  ...ANALYTICS_SCOPES,
  ...MARKETS_SCOPES,
  ...SUBSCRIPTION_SCOPES,
  ...FILE_SCOPES,
  ...STORE_SCOPES,
] as const

export type PlatformScope = (typeof PLATFORM_SCOPES)[number]

/**
 * Get scopes as a comma-separated string for OAuth URL
 */
export function getScopesString(): string {
  return PLATFORM_SCOPES.join(',')
}

/**
 * Validate that granted scopes include required scopes
 */
export function validateScopes(grantedScopes: string[]): {
  valid: boolean
  missing: string[]
} {
  const grantedSet = new Set(grantedScopes)
  const missing: string[] = []

  // Check for critical scopes
  const criticalScopes = [
    'read_orders',
    'read_products',
    'read_customers',
    'read_shop',
  ]

  for (const scope of criticalScopes) {
    if (!grantedSet.has(scope)) {
      missing.push(scope)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}
