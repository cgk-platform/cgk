/**
 * Cart Attributes Builder
 *
 * Builds platform cart attributes for tenant tracking and analytics.
 * These attributes flow through to Shopify order note_attributes.
 */

import type { CartAttribute } from '@cgk-platform/commerce'
import type { PlatformCartAttributes } from '../types/attributes'

/**
 * Options for building cart attributes
 */
export interface CartAttributeOptions {
  /** A/B test ID */
  abTestId?: string
  /** A/B test variant ID */
  abVariantId?: string
  /** UTM source */
  utmSource?: string
  /** UTM campaign */
  utmCampaign?: string
  /** UTM medium */
  utmMedium?: string
  /** UTM content */
  utmContent?: string
  /** UTM term */
  utmTerm?: string
  /** Free gift rule IDs */
  freeGiftRuleIds?: string[]
  /** Session ID */
  sessionId?: string
  /** Referrer URL */
  referrer?: string
  /** Landing page URL */
  landingPage?: string
  /** Creator/affiliate code */
  creatorCode?: string
}

/**
 * Build cart attributes from platform data
 *
 * @param tenantSlug - Tenant slug (REQUIRED)
 * @param visitorId - Visitor identifier (REQUIRED)
 * @param options - Additional attribution data
 * @returns CartAttribute array for Shopify
 */
export function buildCartAttributes(
  tenantSlug: string,
  visitorId: string,
  options?: CartAttributeOptions
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
  if (options?.utmContent) {
    attributes.push({ key: '_attribution_content', value: options.utmContent })
  }
  if (options?.utmTerm) {
    attributes.push({ key: '_attribution_term', value: options.utmTerm })
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

  // Referrer tracking
  if (options?.referrer) {
    attributes.push({ key: '_referrer', value: options.referrer })
  }

  // Landing page tracking
  if (options?.landingPage) {
    attributes.push({ key: '_landing_page', value: options.landingPage })
  }

  // Creator/affiliate tracking
  if (options?.creatorCode) {
    attributes.push({ key: '_creator_code', value: options.creatorCode })
  }

  return attributes
}

/**
 * Parse cart attributes back to platform format
 *
 * @param attributes - CartAttribute array from Shopify
 * @returns Parsed platform attributes
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
      case '_attribution_content':
        result._attribution_content = attr.value
        break
      case '_attribution_term':
        result._attribution_term = attr.value
        break
      case '_free_gifts':
        result._free_gifts = attr.value
        break
      case '_session_id':
        result._session_id = attr.value
        break
      case '_referrer':
        result._referrer = attr.value
        break
      case '_landing_page':
        result._landing_page = attr.value
        break
      case '_creator_code':
        result._creator_code = attr.value
        break
    }
  }

  return result
}

/**
 * Merge existing attributes with new ones
 * New values override existing ones for the same key
 *
 * @param existing - Existing attributes
 * @param updates - New attributes to merge
 * @returns Merged attributes
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
 *
 * @param searchParams - URLSearchParams to extract from
 * @returns Extracted UTM parameters
 */
export function extractUtmParams(searchParams: URLSearchParams): {
  utmSource?: string
  utmCampaign?: string
  utmMedium?: string
  utmContent?: string
  utmTerm?: string
} {
  return {
    utmSource: searchParams.get('utm_source') ?? undefined,
    utmCampaign: searchParams.get('utm_campaign') ?? undefined,
    utmMedium: searchParams.get('utm_medium') ?? undefined,
    utmContent: searchParams.get('utm_content') ?? undefined,
    utmTerm: searchParams.get('utm_term') ?? undefined,
  }
}

/**
 * Generate a visitor ID if not present
 * Uses crypto.randomUUID in browser, falls back to timestamp-based ID
 *
 * @returns Generated visitor ID
 */
export function generateVisitorId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `vis_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  }
  return `vis_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Generate a session ID
 *
 * @returns Generated session ID
 */
export function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `ses_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  }
  return `ses_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Get tenant from cart attributes
 *
 * @param attributes - Cart attributes
 * @returns Tenant slug or undefined
 */
export function getTenantFromAttributes(attributes: CartAttribute[]): string | undefined {
  return attributes.find((a) => a.key === '_tenant')?.value
}

/**
 * Validate required platform attributes are present
 *
 * @param attributes - Attributes to validate
 * @returns Validation result
 */
export function validatePlatformAttributes(attributes: CartAttribute[]): {
  valid: boolean
  missing: string[]
} {
  const required = ['_tenant', '_visitor_id']
  const present = new Set(attributes.map((a) => a.key))
  const missing = required.filter((key) => !present.has(key))

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Filter out platform attributes (those starting with _)
 *
 * @param attributes - All attributes
 * @returns Non-platform attributes only
 */
export function getCustomerAttributes(attributes: CartAttribute[]): CartAttribute[] {
  return attributes.filter((a) => !a.key.startsWith('_'))
}

/**
 * Filter to only platform attributes (those starting with _)
 *
 * @param attributes - All attributes
 * @returns Platform attributes only
 */
export function getPlatformAttributes(attributes: CartAttribute[]): CartAttribute[] {
  return attributes.filter((a) => a.key.startsWith('_'))
}
