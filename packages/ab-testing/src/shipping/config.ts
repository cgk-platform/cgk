/**
 * Shipping Test Configuration
 *
 * Creates and manages shipping rate configurations for A/B tests.
 */

import type {
  ShippingTestConfig,
  ShippingRateVariant,
  CreateShippingTestInput,
} from './types.js'

/**
 * Maximum variants per shipping test (Shopify rate limitations)
 */
export const MAX_SHIPPING_VARIANTS = 4

/**
 * Allowed variant suffixes
 */
export const ALLOWED_SUFFIXES = ['A', 'B', 'C', 'D'] as const

/**
 * Target mismatch rate threshold (above 5% indicates implementation issues)
 */
export const MISMATCH_RATE_THRESHOLD = 0.05

/**
 * Cart attribute keys
 */
export const CART_ATTRIBUTE_KEYS = {
  SHIPPING_SUFFIX: '_ab_shipping_suffix',
  TEST_TYPE: '_ab_test_type',
  TEST_ID: '_ab_test_id',
  VISITOR_ID: '_ab_visitor_id',
} as const

/**
 * Validate shipping test input
 */
export function validateShippingTestInput(
  input: CreateShippingTestInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (input.variants.length < 2) {
    errors.push('Shipping test requires at least 2 variants')
  }

  if (input.variants.length > MAX_SHIPPING_VARIANTS) {
    errors.push(`Maximum ${MAX_SHIPPING_VARIANTS} variants allowed per shipping test`)
  }

  const suffixes = input.variants.map((v) => v.suffix.toUpperCase())
  const uniqueSuffixes = new Set(suffixes)
  if (uniqueSuffixes.size !== suffixes.length) {
    errors.push('Duplicate variant suffixes are not allowed')
  }

  for (const suffix of suffixes) {
    if (!ALLOWED_SUFFIXES.includes(suffix as typeof ALLOWED_SUFFIXES[number])) {
      errors.push(`Invalid suffix "${suffix}". Allowed: ${ALLOWED_SUFFIXES.join(', ')}`)
    }
  }

  const hasControl = input.variants.some((v) => v.isControl)
  if (!hasControl) {
    errors.push('At least one variant must be marked as control')
  }

  const totalAllocation = input.variants.reduce((sum, v) => sum + v.trafficAllocation, 0)
  if (Math.abs(totalAllocation - 100) > 0.01) {
    errors.push(`Traffic allocation must sum to 100%, got ${totalAllocation}%`)
  }

  for (const variant of input.variants) {
    if (variant.priceCents < 0) {
      errors.push(`Shipping price cannot be negative for variant ${variant.suffix}`)
    }
    if (variant.trafficAllocation < 0 || variant.trafficAllocation > 100) {
      errors.push(`Traffic allocation must be between 0-100% for variant ${variant.suffix}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Build shipping rate configuration from test input
 */
export function buildShippingConfig(
  testId: string,
  tenantId: string,
  input: CreateShippingTestInput
): ShippingTestConfig {
  const rates: ShippingRateVariant[] = input.variants.map((v) => ({
    variantId: '', // Will be populated after variant creation
    suffix: v.suffix.toUpperCase(),
    rateName: `${input.baseRateName} (${v.suffix.toUpperCase()})`,
    priceCents: v.priceCents,
    displayName: v.displayName,
    displayDescription: v.displayDescription,
  }))

  return {
    testId,
    tenantId,
    rates,
    trackShippingRevenue: input.trackShippingRevenue ?? true,
    maxOrderValueCents: input.maxOrderValueCents,
    zoneId: input.zoneId,
    baseRateName: input.baseRateName,
  }
}

/**
 * Extract suffix from shipping rate name
 *
 * @example
 * extractSuffix("Standard Shipping (A)") // "A"
 * extractSuffix("Free Shipping") // ""
 */
export function extractSuffix(rateName: string): string {
  const match = rateName.match(/\(([A-D])\)\s*$/)
  return match ? match[1]! : ''
}

/**
 * Generate shipping rate name with suffix
 */
export function buildRateName(baseRateName: string, suffix: string): string {
  return `${baseRateName} (${suffix.toUpperCase()})`
}

/**
 * Format shipping price in cents to display string
 */
export function formatShippingPrice(cents: number): string {
  if (cents === 0) return 'Free'
  const dollars = cents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars)
}

/**
 * Parse Shopify shipping price string to cents
 */
export function parseShippingPrice(price: string): number {
  const parsed = parseFloat(price)
  if (isNaN(parsed)) return 0
  return Math.round(parsed * 100)
}
