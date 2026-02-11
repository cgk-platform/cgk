/**
 * Shipping A/B Test Types
 *
 * Defines types for shipping threshold experiments.
 */

/**
 * Shipping test configuration stored in the database
 */
export interface ShippingTestConfig {
  testId: string
  tenantId: string
  rates: ShippingRateVariant[]
  trackShippingRevenue: boolean
  maxOrderValueCents?: number
  zoneId?: string
  baseRateName: string
}

/**
 * Individual shipping rate variant
 */
export interface ShippingRateVariant {
  variantId: string
  suffix: string
  rateName: string
  priceCents: number
  displayName?: string
  displayDescription?: string
}

/**
 * Shipping attribution data for an order
 */
export interface ShippingAttribution {
  orderId: string
  testId: string
  assignedVariantId: string
  assignedSuffix: string
  actualShippingMethod: string
  actualShippingPriceCents: number
  productRevenueCents: number
  netRevenueCents: number
  isMismatch: boolean
  mismatchReason?: string
  attributedAt: Date
}

/**
 * Shipping metrics for a variant
 */
export interface ShippingVariantMetrics {
  variantId: string
  visitors: number
  orders: number
  productRevenueCents: number
  shippingRevenueCents: number
  netRevenueCents: number
  netRevenueVariance: number
  mismatches: number
}

/**
 * Shipping test results
 */
export interface ShippingTestResults {
  testId: string
  variants: ShippingVariantResults[]
  totalOrders: number
  totalMismatches: number
  mismatchRate: number
}

/**
 * Individual variant results in shipping test
 */
export interface ShippingVariantResults {
  variantId: string
  variantName: string
  suffix: string
  shippingPriceCents: number
  visitors: number
  orders: number
  conversionRate: number
  productRevenue: number
  shippingRevenue: number
  netRevenue: number
  avgShippingPerOrder: number
  revenuePerVisitor: number
  netRevenuePerVisitor: number
  improvement: number | null
  zScore: number | null
  pValue: number | null
  isSignificant: boolean
  isWinner: boolean
}

/**
 * Shopify order structure (simplified for A/B attribution)
 */
export interface ShopifyOrder {
  id: string
  subtotalPrice: string
  totalPrice: string
  shippingLines: Array<{
    title: string
    price: string
    code?: string
  }>
  noteAttributes: Array<{
    name: string
    value: string
  }>
  cartAttributes?: Array<{
    key: string
    value: string
  }>
  createdAt: string
}

/**
 * Input for creating a shipping test
 */
export interface CreateShippingTestInput {
  name: string
  description?: string
  baseRateName: string
  variants: Array<{
    name: string
    suffix: string
    priceCents: number
    trafficAllocation: number
    isControl?: boolean
    displayName?: string
    displayDescription?: string
  }>
  trackShippingRevenue?: boolean
  maxOrderValueCents?: number
  zoneId?: string
  confidenceLevel?: number
}

/**
 * Cart attribute update payload
 */
export interface CartAttributeUpdate {
  key: string
  value: string
}
