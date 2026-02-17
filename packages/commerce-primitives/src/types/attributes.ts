/**
 * Platform Cart Attributes Types
 *
 * Defines platform-specific cart attributes for tracking and routing.
 * These are always prefixed with underscore to distinguish from user attributes.
 */

/**
 * Platform-specific cart attributes for tracking and routing
 * These are always prefixed with underscore to distinguish from user attributes
 */
export interface PlatformCartAttributes {
  /** Tenant slug for order routing - REQUIRED on every cart */
  _tenant: string
  /** Visitor identifier for analytics */
  _visitor_id: string
  /** Active A/B test ID (if any) */
  _ab_test_id?: string
  /** Assigned A/B test variant (if any) */
  _ab_variant_id?: string
  /** UTM source for attribution */
  _attribution_source?: string
  /** UTM campaign for attribution */
  _attribution_campaign?: string
  /** UTM medium for attribution */
  _attribution_medium?: string
  /** UTM content for attribution */
  _attribution_content?: string
  /** UTM term for attribution */
  _attribution_term?: string
  /** Applied free gift rule IDs */
  _free_gifts?: string
  /** Session ID for analytics */
  _session_id?: string
  /** Referrer URL */
  _referrer?: string
  /** Landing page URL */
  _landing_page?: string
  /** Creator/affiliate code */
  _creator_code?: string
}

/**
 * Keys for platform attributes (for validation)
 */
export const PLATFORM_ATTRIBUTE_KEYS: (keyof PlatformCartAttributes)[] = [
  '_tenant',
  '_visitor_id',
  '_ab_test_id',
  '_ab_variant_id',
  '_attribution_source',
  '_attribution_campaign',
  '_attribution_medium',
  '_attribution_content',
  '_attribution_term',
  '_free_gifts',
  '_session_id',
  '_referrer',
  '_landing_page',
  '_creator_code',
]

/**
 * Check if a key is a platform attribute (prefixed with underscore)
 */
export function isPlatformAttributeKey(key: string): boolean {
  return key.startsWith('_')
}
