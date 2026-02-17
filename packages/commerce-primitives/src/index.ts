/**
 * @cgk-platform/commerce-primitives
 *
 * Commerce primitive utilities, formatters, validators, and constants.
 * Provides shared commerce logic for storefronts and admin interfaces.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export type {
  PlatformCartAttributes,
} from './types/attributes'

export {
  PLATFORM_ATTRIBUTE_KEYS as PLATFORM_ATTRIBUTE_KEY_LIST,
  isPlatformAttributeKey,
} from './types/attributes'

export type {
  CartQueryOptions,
  CartState,
  CartLineWithProduct,
  AddToCartInput,
  CartTotals,
  CartValidationResult,
  CartValidationError,
  OptimisticUpdate,
} from './types/cart'

// =============================================================================
// Constants
// =============================================================================

export {
  CART_COOKIE_NAME,
  VISITOR_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  CART_EXPIRY_DAYS,
  VISITOR_EXPIRY_DAYS,
  SESSION_EXPIRY_HOURS,
  MAX_LINE_QUANTITY,
  MAX_CART_LINES,
  MIN_LINE_QUANTITY,
  COOKIE_SAME_SITE,
  COOKIE_PATH,
  ATTRIBUTE_PREFIXES,
  PLATFORM_ATTRIBUTE_KEYS,
} from './constants/cart'

export {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE,
  DEFAULT_CURSOR,
  MAX_CURSOR_LENGTH,
  DEFAULT_SORT_DIRECTION,
  SORT_DIRECTIONS,
  DEFAULT_PAGINATION_CONFIG,
  type SortDirection,
  type PaginationConfig,
} from './constants/pagination'

// =============================================================================
// Formatters
// =============================================================================

// Money formatters
export {
  formatMoney,
  formatMoneyCompact,
  parseMoney,
  createMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  isZeroMoney,
  isNegativeMoney,
  compareMoney,
  getMoneyAmount,
  zeroMoney,
  type FormatMoneyOptions,
} from './formatters/money'

// Product formatters
export {
  formatProduct,
  formatPriceRange,
  getPriceRange,
  calculateSalePercentage,
  formatVariantTitle,
  formatSelectedOptions,
  getUniqueOptionNames,
  getOptionValues,
  getCheapestVariant,
  isProductAvailable,
  type FormattedProduct,
} from './formatters/product'

// Cart formatters
export {
  formatCart,
  getCartTotals,
  formatCartLine,
  getCartItemCount,
  isCartEmpty,
  getAppliedDiscountCodes,
  hasDiscountCode,
  getUnavailableLines,
  getCartSavings,
  type FormattedCart,
  type FormattedCartTotals,
  type FormattedCartLine,
} from './formatters/cart'

// =============================================================================
// Utilities
// =============================================================================

// Cart attributes utilities
export {
  buildCartAttributes,
  parseCartAttributes,
  mergeCartAttributes,
  extractUtmParams,
  generateVisitorId,
  generateSessionId,
  getTenantFromAttributes,
  validatePlatformAttributes,
  getCustomerAttributes,
  getPlatformAttributes,
  type CartAttributeOptions,
} from './utilities/cart-attributes'

// Pagination utilities
export {
  buildCursor,
  parseCursor,
  buildPaginationParams,
  getOffsetParams,
  buildPageInfo,
  calculateTotalPages,
  generatePageNumbers,
  parseSortParam,
  buildSortParam,
  type CursorData,
} from './utilities/pagination'

// Variant selection utilities
export {
  buildVariantKey,
  parseVariantKey,
  compareVariants,
  findVariantByOptions,
  findVariantByPartialOptions,
  getAvailableOptionValues,
  buildSelectionMatrix,
  findNearestAvailableVariant,
  getDefaultVariant,
  isOptionValueAvailable,
  type SelectionMatrix,
} from './utilities/variant-selection'

// =============================================================================
// Validators
// =============================================================================

// Discount code validators
export {
  validateDiscountCodeFormat,
  validateDiscountCode,
  normalizeDiscountCode,
  areDiscountCodesEqual,
  formatDiscountValue,
  calculateDiscountAmount,
  checkMinimumRequirement,
  DISCOUNT_CODE_REQUIREMENTS,
  type DiscountValidationResult,
} from './validators/discount-code'

// Cart validators
export {
  validateQuantity,
  validateVariant,
  validateAddToCart,
  validateUpdateQuantity,
  validateCart,
  validateCartAttributes,
  isCartCheckoutReady,
  getCartIssueLines,
} from './validators/cart'
