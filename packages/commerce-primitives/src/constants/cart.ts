/**
 * Cart Constants
 *
 * Defines constants for cart cookie management and configuration.
 */

/** Cookie name for cart ID */
export const CART_COOKIE_NAME = 'cgk_cart_id'

/** Cookie name for visitor ID */
export const VISITOR_COOKIE_NAME = 'cgk_visitor_id'

/** Cookie name for session ID */
export const SESSION_COOKIE_NAME = 'cgk_session_id'

/** Cart cookie expiration in days */
export const CART_EXPIRY_DAYS = 7

/** Visitor cookie expiration in days */
export const VISITOR_EXPIRY_DAYS = 365

/** Session expiration in hours */
export const SESSION_EXPIRY_HOURS = 24

/** Maximum items per line */
export const MAX_LINE_QUANTITY = 99

/** Maximum lines in cart */
export const MAX_CART_LINES = 50

/** Minimum quantity for a line */
export const MIN_LINE_QUANTITY = 1

/** Cookie SameSite setting */
export const COOKIE_SAME_SITE = 'Lax' as const

/** Cookie path */
export const COOKIE_PATH = '/'

/**
 * Cart attribute key prefixes
 */
export const ATTRIBUTE_PREFIXES = {
  /** Platform attributes (internal use) */
  PLATFORM: '_',
  /** Customer-provided attributes */
  CUSTOMER: 'customer_',
  /** Line item attributes */
  LINE: 'line_',
  /** Gift wrapping attributes */
  GIFT: 'gift_',
} as const

/**
 * Standard platform attribute keys
 */
export const PLATFORM_ATTRIBUTE_KEYS = {
  TENANT: '_tenant',
  VISITOR_ID: '_visitor_id',
  SESSION_ID: '_session_id',
  AB_TEST_ID: '_ab_test_id',
  AB_VARIANT_ID: '_ab_variant_id',
  ATTRIBUTION_SOURCE: '_attribution_source',
  ATTRIBUTION_CAMPAIGN: '_attribution_campaign',
  ATTRIBUTION_MEDIUM: '_attribution_medium',
  FREE_GIFTS: '_free_gifts',
  CREATOR_CODE: '_creator_code',
} as const
