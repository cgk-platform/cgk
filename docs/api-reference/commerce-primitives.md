# @cgk-platform/commerce-primitives

Commerce primitive utilities, formatters, validators, and constants for the CGK platform.

## Installation

```bash
pnpm add @cgk-platform/commerce-primitives
```

## Overview

This package provides shared commerce logic for storefronts and admin interfaces. It contains:

- **Formatters**: Money, product, and cart formatting
- **Utilities**: Cart attributes, pagination, variant selection
- **Validators**: Discount codes, cart validation
- **Constants**: Cookie names, limits, pagination defaults

This package is purely functional with NO database operations or API calls.

## Quick Start

```typescript
// Formatters
import { formatMoney, formatProduct, formatCart } from '@cgk-platform/commerce-primitives'

// Utilities
import { buildCartAttributes, buildCursor, findVariantByOptions } from '@cgk-platform/commerce-primitives'

// Validators
import { validateQuantity, validateDiscountCode } from '@cgk-platform/commerce-primitives'

// Constants
import { CART_COOKIE_NAME, DEFAULT_PAGE_SIZE } from '@cgk-platform/commerce-primitives'

// Types
import type { PlatformCartAttributes, CartTotals } from '@cgk-platform/commerce-primitives'
```

## Money Formatters

### formatMoney

Format a Money object for display.

```typescript
import { formatMoney } from '@cgk-platform/commerce-primitives'

const price = { amount: '29.99', currencyCode: 'USD' }

formatMoney(price)
// => "$29.99"

formatMoney(price, { locale: 'de-DE' })
// => "29,99 $"

formatMoney(price, { showCents: false })
// => "$30"

formatMoney(price, { showCurrency: false })
// => "29.99"
```

**Options (`FormatMoneyOptions`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `locale` | `string` | `'en-US'` | Locale for formatting |
| `showCurrency` | `boolean` | `true` | Show currency symbol |
| `decimals` | `number` | `2` | Decimal places |
| `showCents` | `boolean` | `true` | Show minor units |
| `useNarrowSymbol` | `boolean` | `true` | Use narrow symbol ($) vs wide (US$) |

### formatMoneyCompact

Format money as compact string for dashboards.

```typescript
import { formatMoneyCompact } from '@cgk-platform/commerce-primitives'

formatMoneyCompact({ amount: '1500.00', currencyCode: 'USD' })
// => "$1.5K"

formatMoneyCompact({ amount: '1500000.00', currencyCode: 'USD' })
// => "$1.5M"
```

### parseMoney

Parse a money string into a Money object.

```typescript
import { parseMoney } from '@cgk-platform/commerce-primitives'

parseMoney('29.99', 'USD')
// => { amount: '29.99', currencyCode: 'USD' }

parseMoney('$1,299.99')
// => { amount: '1299.99', currencyCode: 'USD' }
```

### createMoney

Create a Money object from a numeric value.

```typescript
import { createMoney } from '@cgk-platform/commerce-primitives'

createMoney(29.99, 'USD')
// => { amount: '29.99', currencyCode: 'USD' }
```

### Money Arithmetic

```typescript
import { addMoney, subtractMoney, multiplyMoney, compareMoney } from '@cgk-platform/commerce-primitives'

const price1 = { amount: '29.99', currencyCode: 'USD' }
const price2 = { amount: '10.00', currencyCode: 'USD' }

addMoney(price1, price2)
// => { amount: '39.99', currencyCode: 'USD' }

subtractMoney(price1, price2)
// => { amount: '19.99', currencyCode: 'USD' }

multiplyMoney(price1, 2)
// => { amount: '59.98', currencyCode: 'USD' }

compareMoney(price1, price2)
// => 1  (-1 if a < b, 0 if equal, 1 if a > b)
```

**Note**: Arithmetic functions throw if currencies don't match.

### Money Checks

```typescript
import { isZeroMoney, isNegativeMoney, getMoneyAmount, zeroMoney } from '@cgk-platform/commerce-primitives'

isZeroMoney({ amount: '0.00', currencyCode: 'USD' })
// => true

isNegativeMoney({ amount: '-5.00', currencyCode: 'USD' })
// => true

getMoneyAmount({ amount: '29.99', currencyCode: 'USD' })
// => 29.99 (number)

zeroMoney('EUR')
// => { amount: '0.00', currencyCode: 'EUR' }
```

## Product Formatters

### formatProduct

Format a product for display.

```typescript
import { formatProduct } from '@cgk-platform/commerce-primitives'

const formatted = formatProduct(product)
// => { title, handle, priceRange, ... }
```

### getPriceRange / formatPriceRange

Get and format product price range.

```typescript
import { getPriceRange, formatPriceRange } from '@cgk-platform/commerce-primitives'

const range = getPriceRange(product)
// => { minPrice: Money, maxPrice: Money }

formatPriceRange(range)
// => "$29.99 - $49.99" or "$29.99" if min === max
```

### calculateSalePercentage

Calculate discount percentage.

```typescript
import { calculateSalePercentage } from '@cgk-platform/commerce-primitives'

calculateSalePercentage(
  { amount: '100.00', currencyCode: 'USD' },
  { amount: '80.00', currencyCode: 'USD' }
)
// => 20
```

### Variant Helpers

```typescript
import {
  formatVariantTitle,
  formatSelectedOptions,
  getUniqueOptionNames,
  getOptionValues,
  getCheapestVariant,
  isProductAvailable,
} from '@cgk-platform/commerce-primitives'

formatVariantTitle(variant)
// => "M / Blue"

formatSelectedOptions(variant.selectedOptions)
// => "Size: M, Color: Blue"

getUniqueOptionNames(product.variants)
// => ['Size', 'Color']

getOptionValues(product.variants, 'Size')
// => ['S', 'M', 'L', 'XL']

getCheapestVariant(product.variants)
// => ProductVariant with lowest price

isProductAvailable(product)
// => true if any variant is available
```

## Cart Formatters

### formatCart / getCartTotals

```typescript
import { formatCart, getCartTotals } from '@cgk-platform/commerce-primitives'

const formatted = formatCart(cart)
const totals = getCartTotals(cart)
// => { subtotal, discount, tax, total }
```

### Cart Helpers

```typescript
import {
  formatCartLine,
  getCartItemCount,
  isCartEmpty,
  getAppliedDiscountCodes,
  hasDiscountCode,
  getUnavailableLines,
  getCartSavings,
} from '@cgk-platform/commerce-primitives'

getCartItemCount(cart)
// => 5

isCartEmpty(cart)
// => false

getAppliedDiscountCodes(cart)
// => ['SAVE10', 'FREESHIP']

hasDiscountCode(cart, 'SAVE10')
// => true

getUnavailableLines(cart)
// => CartLine[] of items no longer available

getCartSavings(cart)
// => Money object with total savings
```

## Cart Attributes Utilities

Cart attributes are critical for multi-tenant order routing.

### buildCartAttributes

Build platform attributes for cart creation.

```typescript
import { buildCartAttributes, generateVisitorId, extractUtmParams } from '@cgk-platform/commerce-primitives'

const visitorId = generateVisitorId()
// => "vis_a1b2c3d4e5f6g7h8"

const utmParams = extractUtmParams(new URLSearchParams(window.location.search))
// => { _attribution_source: 'google', _attribution_campaign: 'spring-sale', ... }

const attributes = buildCartAttributes('rawdog', visitorId, {
  ...utmParams,
  sessionId: 'ses_xyz',
  creatorCode: 'CREATOR10',
})
// => [{ key: '_tenant', value: 'rawdog' }, { key: '_visitor_id', value: '...' }, ...]
```

### parseCartAttributes

Parse attributes from existing cart.

```typescript
import { parseCartAttributes, getTenantFromAttributes } from '@cgk-platform/commerce-primitives'

const parsed = parseCartAttributes(cart.attributes)
console.log(parsed._tenant) // "rawdog"

const tenantSlug = getTenantFromAttributes(cart.attributes)
// => "rawdog"
```

### mergeCartAttributes

Merge new attributes into existing ones.

```typescript
import { mergeCartAttributes } from '@cgk-platform/commerce-primitives'

const merged = mergeCartAttributes(existingAttrs, newAttrs)
```

### validatePlatformAttributes

Validate that required platform attributes exist.

```typescript
import { validatePlatformAttributes } from '@cgk-platform/commerce-primitives'

const result = validatePlatformAttributes(cart.attributes)
if (!result.valid) {
  console.error(result.errors)
}
```

### Customer/Platform Attribute Separation

```typescript
import { getCustomerAttributes, getPlatformAttributes } from '@cgk-platform/commerce-primitives'

// Platform attributes (prefixed with _)
const platformAttrs = getPlatformAttributes(cart.attributes)
// => { _tenant: 'rawdog', _visitor_id: '...' }

// Customer attributes (user-provided)
const customerAttrs = getCustomerAttributes(cart.attributes)
// => { gift_message: 'Happy Birthday!', ... }
```

## Pagination Utilities

### Cursor-Based Pagination

```typescript
import { buildCursor, parseCursor, buildPaginationParams } from '@cgk-platform/commerce-primitives'

// Build cursor for next page
const cursor = buildCursor({
  offset: 20,
  sortKey: 'created_at',
  sortDirection: 'desc',
})

// Parse cursor from URL
const cursorData = parseCursor(searchParams.get('cursor'))

// Build params for commerce provider
const params = buildPaginationParams({
  cursor: cursorData?.offset ? buildCursor(cursorData) : null,
  pageSize: 20,
  sortKey: 'PRICE',
  sortDirection: 'asc',
})
```

### Offset-Based Pagination

```typescript
import { getOffsetParams, calculateTotalPages } from '@cgk-platform/commerce-primitives'

const { offset, limit } = getOffsetParams(page, pageSize)

const totalPages = calculateTotalPages(totalItems, pageSize)
// => 5
```

### Page Number Generation

```typescript
import { generatePageNumbers } from '@cgk-platform/commerce-primitives'

generatePageNumbers(5, 20) // Current page 5, total 20 pages
// => [1, 'ellipsis', 4, 5, 6, 'ellipsis', 20]
```

### Sort Parameter Helpers

```typescript
import { parseSortParam, buildSortParam } from '@cgk-platform/commerce-primitives'

parseSortParam('price_desc')
// => { sortKey: 'price', sortDirection: 'desc' }

buildSortParam('price', 'asc')
// => 'price_asc'
```

### buildPageInfo

Build pagination info for responses.

```typescript
import { buildPageInfo } from '@cgk-platform/commerce-primitives'

const pageInfo = buildPageInfo({
  items: products,
  totalCount: 100,
  page: 1,
  pageSize: 20,
})
// => { hasNextPage: true, hasPreviousPage: false, totalPages: 5, ... }
```

## Variant Selection Utilities

### buildVariantKey / parseVariantKey

Create unique keys for variants.

```typescript
import { buildVariantKey, parseVariantKey } from '@cgk-platform/commerce-primitives'

buildVariantKey([{ name: 'Size', value: 'M' }, { name: 'Color', value: 'Blue' }])
// => 'Color:Blue|Size:M' (sorted alphabetically)

parseVariantKey('Color:Blue|Size:M')
// => [{ name: 'Color', value: 'Blue' }, { name: 'Size', value: 'M' }]
```

### findVariantByOptions

Find a variant by exact option match.

```typescript
import { findVariantByOptions } from '@cgk-platform/commerce-primitives'

const variant = findVariantByOptions(product.variants, [
  { name: 'Size', value: 'M' },
  { name: 'Color', value: 'Blue' },
])
```

### findVariantByPartialOptions

Find first variant matching partial options.

```typescript
import { findVariantByPartialOptions } from '@cgk-platform/commerce-primitives'

const variant = findVariantByPartialOptions(product.variants, [
  { name: 'Size', value: 'M' },
])
// => First variant with Size: M
```

### getAvailableOptionValues

Get available options given current selections.

```typescript
import { getAvailableOptionValues } from '@cgk-platform/commerce-primitives'

const colors = getAvailableOptionValues(
  product.variants,
  'Color',
  [{ name: 'Size', value: 'M' }]
)
// => [
//   { value: 'Blue', available: true, inStock: true },
//   { value: 'Red', available: true, inStock: false },
// ]
```

### buildSelectionMatrix

Build complete selection matrix for product page.

```typescript
import { buildSelectionMatrix } from '@cgk-platform/commerce-primitives'

const matrix = buildSelectionMatrix(product.variants)
// => {
//   options: [
//     { name: 'Size', values: [{ value: 'S', available: true, inStock: true }, ...] },
//     { name: 'Color', values: [...] },
//   ],
//   variantMap: Map<string, ProductVariant>
// }
```

### findNearestAvailableVariant

Find closest available variant when selected is unavailable.

```typescript
import { findNearestAvailableVariant } from '@cgk-platform/commerce-primitives'

const nearestVariant = findNearestAvailableVariant(
  product.variants,
  [{ name: 'Size', value: 'M' }, { name: 'Color', value: 'Blue' }]
)
// => Closest variant that IS available for sale
```

### getDefaultVariant

Get default variant (first available, or first overall).

```typescript
import { getDefaultVariant } from '@cgk-platform/commerce-primitives'

const defaultVariant = getDefaultVariant(product.variants)
```

### isOptionValueAvailable

Check if option value is available.

```typescript
import { isOptionValueAvailable } from '@cgk-platform/commerce-primitives'

const available = isOptionValueAvailable(
  product.variants,
  'Color',
  'Blue',
  [{ name: 'Size', value: 'M' }]
)
// => true if M/Blue combination exists
```

## Validators

### Cart Validators

```typescript
import {
  validateQuantity,
  validateVariant,
  validateAddToCart,
  validateUpdateQuantity,
  validateCart,
  validateCartAttributes,
  isCartCheckoutReady,
  getCartIssueLines,
} from '@cgk-platform/commerce-primitives'

// Validate quantity input
const qtyResult = validateQuantity(5)
if (!qtyResult.valid) {
  showError(qtyResult.error) // "Quantity must be between 1 and 99"
}

// Validate add to cart
const addResult = validateAddToCart(variant, quantity, currentCart)
if (!addResult.valid) {
  showError(addResult.error)
}

// Check checkout readiness
const checkoutResult = isCartCheckoutReady(cart)
if (!checkoutResult.ready) {
  showErrors(checkoutResult.issues)
  // issues: ["Item X is out of stock", "Minimum order $25 not met"]
}

// Get problem lines
const issueLines = getCartIssueLines(cart)
// => Lines that are out of stock, unavailable, etc.
```

### Discount Code Validators

```typescript
import {
  validateDiscountCodeFormat,
  validateDiscountCode,
  normalizeDiscountCode,
  areDiscountCodesEqual,
  formatDiscountValue,
  calculateDiscountAmount,
  checkMinimumRequirement,
} from '@cgk-platform/commerce-primitives'

// Format validation (length, characters)
const formatResult = validateDiscountCodeFormat('SAVE10')
if (!formatResult.valid) {
  showError(formatResult.error)
}

// Full validation (expiry, limits, etc.)
const result = validateDiscountCode(discount)
if (!result.isActive) {
  showError(result.error) // "This discount code has expired"
}

// Normalize for comparison
normalizeDiscountCode('save10')
// => 'SAVE10'

// Compare codes
areDiscountCodesEqual('SAVE10', 'save10')
// => true

// Format discount value
formatDiscountValue(discount)
// => "20% off" or "$10 off"

// Calculate discount amount
calculateDiscountAmount(discount, subtotal)
// => Money object

// Check minimum purchase
const meetsMin = checkMinimumRequirement(discount, cart)
if (!meetsMin.meets) {
  showError(`Minimum purchase of ${meetsMin.required} required`)
}
```

## Constants

### Cart Constants

```typescript
import {
  CART_COOKIE_NAME,        // 'cgk_cart'
  VISITOR_COOKIE_NAME,     // 'cgk_visitor'
  SESSION_COOKIE_NAME,     // 'cgk_session'
  CART_EXPIRY_DAYS,        // 7
  VISITOR_EXPIRY_DAYS,     // 365
  SESSION_EXPIRY_HOURS,    // 24
  MAX_LINE_QUANTITY,       // 99
  MAX_CART_LINES,          // 100
  MIN_LINE_QUANTITY,       // 1
  COOKIE_SAME_SITE,        // 'lax'
  COOKIE_PATH,             // '/'
  ATTRIBUTE_PREFIXES,      // { platform: '_' }
  PLATFORM_ATTRIBUTE_KEYS, // ['_tenant', '_visitor_id', ...]
} from '@cgk-platform/commerce-primitives'
```

### Pagination Constants

```typescript
import {
  DEFAULT_PAGE_SIZE,           // 20
  MAX_PAGE_SIZE,               // 100
  DEFAULT_PAGE,                // 1
  DEFAULT_CURSOR,              // null
  MAX_CURSOR_LENGTH,           // 255
  DEFAULT_SORT_DIRECTION,      // 'asc'
  SORT_DIRECTIONS,             // ['asc', 'desc']
  DEFAULT_PAGINATION_CONFIG,   // { pageSize: 20, page: 1, ... }
} from '@cgk-platform/commerce-primitives'
```

### Discount Code Requirements

```typescript
import { DISCOUNT_CODE_REQUIREMENTS } from '@cgk-platform/commerce-primitives'

// { minLength: 3, maxLength: 50, validChars: /^[A-Z0-9_-]+$/ }
```

## Type Definitions

### PlatformCartAttributes

```typescript
interface PlatformCartAttributes {
  _tenant: string              // Required: tenant slug
  _visitor_id: string          // Visitor identifier
  _ab_test_id?: string         // A/B test ID
  _ab_variant_id?: string      // A/B test variant
  _attribution_source?: string // UTM source
  _attribution_campaign?: string
  _attribution_medium?: string
  _free_gifts?: string
  _session_id?: string
}
```

### CartTotals

```typescript
interface CartTotals {
  subtotal: Money
  discount: Money
  tax: Money
  total: Money
}
```

### CartValidationResult

```typescript
interface CartValidationResult {
  valid: boolean
  errors: CartValidationError[]
}

interface CartValidationError {
  type: 'out_of_stock' | 'unavailable' | 'quantity_exceeded' | 'minimum_not_met'
  lineId?: string
  message: string
}
```

### SelectionMatrix

```typescript
interface SelectionMatrix {
  options: Array<{
    name: string
    values: Array<{
      value: string
      available: boolean
      inStock: boolean
    }>
  }>
  variantMap: Map<string, ProductVariant>
}
```

## Common Gotchas

### Money amounts are strings

```typescript
// WRONG - String concatenation
const total = price1.amount + price2.amount // "29.9910.00"

// CORRECT - Use arithmetic helpers
const total = addMoney(price1, price2)
```

### Currency must match for arithmetic

```typescript
// WRONG - Different currencies throw
addMoney(usdPrice, eurPrice) // Error!

// CORRECT - Same currency
addMoney(usdPrice1, usdPrice2)
```

### Cart attributes required for multi-tenant

```typescript
// WRONG - Missing tenant context
await commerce.cart.create()

// CORRECT - Include platform attributes
const attributes = buildCartAttributes(tenantSlug, visitorId)
await commerce.cart.create()
await commerce.cart.setAttributes(cartId, attributes)
```

### Cursor is not a page number

```typescript
// WRONG - Cursor as page number
const cursor = page.toString()

// CORRECT - Cursor encodes position + context
const cursor = buildCursor({ offset: (page - 1) * pageSize })
```
