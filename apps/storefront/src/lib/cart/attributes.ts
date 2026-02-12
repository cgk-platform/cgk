/**
 * Cart Attributes Builder
 *
 * Builds platform cart attributes for tenant tracking and analytics.
 * These attributes flow through to Shopify order note_attributes.
 */

import type { CartAttribute } from '@cgk/commerce'
import type { PlatformCartAttributes } from './types'

/**
 * Build cart attributes from platform data
 *
 * @param tenantSlug - Tenant slug (REQUIRED)
 * @param visitorId - Visitor identifier
 * @param options - Additional attribution data
 * @returns CartAttribute array for Shopify
 */
export function buildCartAttributes(
  tenantSlug: string,
  visitorId: string,
  options?: {
    abTestId?: string
    abVariantId?: string
    utmSource?: string
    utmCampaign?: string
    utmMedium?: string
    freeGiftRuleIds?: string[]
    sessionId?: string
  }
): CartAttribute[] {
  const attributes: CartAttribute[] = [
    // Required attributes
    { key: '_tenant', value: tenantSlug },
    { key: '_visitor_id', value: visitorId },
  ]

  // Optional A/B test tracking
  if (options?.abTestId) {
    attributes.push({ key: '_ab_test_id', value: options.abTestId })
  }
  if (options?.abVariantId) {
    attributes.push({ key: '_ab_variant_id', value: options.abVariantId })
  }

  // UTM attribution
  if (options?.utmSource) {
    attributes.push({ key: '_attribution_source', value: options.utmSource })
  }
  if (options?.utmCampaign) {
    attributes.push({ key: '_attribution_campaign', value: options.utmCampaign })
  }
  if (options?.utmMedium) {
    attributes.push({ key: '_attribution_medium', value: options.utmMedium })
  }

  // Free gifts
  if (options?.freeGiftRuleIds && options.freeGiftRuleIds.length > 0) {
    attributes.push({
      key: '_free_gifts',
      value: options.freeGiftRuleIds.join(','),
    })
  }

  // Session tracking
  if (options?.sessionId) {
    attributes.push({ key: '_session_id', value: options.sessionId })
  }

  return attributes
}

/**
 * Parse cart attributes back to platform format
 */
export function parseCartAttributes(
  attributes: CartAttribute[]
): Partial<PlatformCartAttributes> {
  const result: Partial<PlatformCartAttributes> = {}

  for (const attr of attributes) {
    switch (attr.key) {
      case '_tenant':
        result._tenant = attr.value
        break
      case '_visitor_id':
        result._visitor_id = attr.value
        break
      case '_ab_test_id':
        result._ab_test_id = attr.value
        break
      case '_ab_variant_id':
        result._ab_variant_id = attr.value
        break
      case '_attribution_source':
        result._attribution_source = attr.value
        break
      case '_attribution_campaign':
        result._attribution_campaign = attr.value
        break
      case '_attribution_medium':
        result._attribution_medium = attr.value
        break
      case '_free_gifts':
        result._free_gifts = attr.value
        break
      case '_session_id':
        result._session_id = attr.value
        break
    }
  }

  return result
}

/**
 * Merge existing attributes with new ones
 * New values override existing ones for the same key
 */
export function mergeCartAttributes(
  existing: CartAttribute[],
  updates: CartAttribute[]
): CartAttribute[] {
  const merged = new Map<string, string>()

  // Add existing attributes
  for (const attr of existing) {
    merged.set(attr.key, attr.value)
  }

  // Override with updates
  for (const attr of updates) {
    merged.set(attr.key, attr.value)
  }

  return Array.from(merged.entries()).map(([key, value]) => ({ key, value }))
}

/**
 * Extract UTM parameters from URL search params
 */
export function extractUtmParams(searchParams: URLSearchParams): {
  utmSource?: string
  utmCampaign?: string
  utmMedium?: string
} {
  return {
    utmSource: searchParams.get('utm_source') ?? undefined,
    utmCampaign: searchParams.get('utm_campaign') ?? undefined,
    utmMedium: searchParams.get('utm_medium') ?? undefined,
  }
}

/**
 * Generate a visitor ID if not present
 * Uses crypto.randomUUID in browser, falls back to timestamp-based ID
 */
export function generateVisitorId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `vis_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  }
  return `vis_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `ses_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  }
  return `ses_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}
