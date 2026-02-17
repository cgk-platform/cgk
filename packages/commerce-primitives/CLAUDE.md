# @cgk-platform/commerce-primitives - AI Development Guide

> **Package Version**: 1.1.0
> **Last Updated**: 2026-02-16

---

## Purpose

Commerce primitive utilities, formatters, validators, and constants for the CGK platform. Provides shared commerce logic that can be used across storefronts, admin interfaces, and background jobs.

This package contains **NO** database operations or API calls - it's purely functional utilities.

---

## Quick Reference

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

---

## Key Patterns

### Pattern 1: Formatting Money

```typescript
import { formatMoney, parseMoney, addMoney, formatMoneyCompact } from '@cgk-platform/commerce-primitives'
import type { Money } from '@cgk-platform/commerce'

const price: Money = { amount: '29.99', currencyCode: 'USD' }

// Format for display
formatMoney(price)  // "$29.99"
formatMoney(price, { locale: 'de-DE' })  // "29,99 $"
formatMoney(price, { showCents: false })  // "$30"

// Compact format for dashboards
formatMoneyCompact({ amount: '1500000', currencyCode: 'USD' })  // "$1.5M"

// Parse user input
parseMoney('$29.99', 'USD')  // { amount: '29.99', currencyCode: 'USD' }

// Money arithmetic
const total = addMoney(price, { amount: '10.00', currencyCode: 'USD' })
// { amount: '39.99', currencyCode: 'USD' }
```

### Pattern 2: Cart Attributes (Tenant Tracking)

**CRITICAL**: All carts MUST have tenant attributes for order routing.

```typescript
import {
  buildCartAttributes,
  parseCartAttributes,
  generateVisitorId,
  extractUtmParams,
} from '@cgk-platform/commerce-primitives'

// Generate IDs
const visitorId = generateVisitorId()  // "vis_a1b2c3d4e5f6g7h8"

// Extract UTM from URL
const utmParams = extractUtmParams(new URLSearchParams(window.location.search))

// Build attributes for cart creation
const attributes = buildCartAttributes('rawdog', visitorId, {
  ...utmParams,
  sessionId: 'ses_xyz',
  creatorCode: 'CREATOR10',
})

// Parse attributes from existing cart
const parsed = parseCartAttributes(cart.attributes)
console.log(parsed._tenant)  // "rawdog"
```

### Pattern 3: Variant Selection

```typescript
import {
  findVariantByOptions,
  buildSelectionMatrix,
  getAvailableOptionValues,
  getDefaultVariant,
} from '@cgk-platform/commerce-primitives'

// Find variant by selected options
const variant = findVariantByOptions(product.variants, [
  { name: 'Size', value: 'M' },
  { name: 'Color', value: 'Blue' },
])

// Build selection matrix for product page
const matrix = buildSelectionMatrix(product.variants)
// matrix.options = [{ name: 'Size', values: [...] }, { name: 'Color', values: [...] }]

// Get available colors for selected size
const colors = getAvailableOptionValues(
  product.variants,
  'Color',
  [{ name: 'Size', value: 'M' }]
)
// [{ value: 'Blue', available: true, inStock: true }, ...]

// Get default variant
const defaultVariant = getDefaultVariant(product.variants)
```

### Pattern 4: Pagination

```typescript
import {
  buildCursor,
  parseCursor,
  buildPaginationParams,
  generatePageNumbers,
} from '@cgk-platform/commerce-primitives'

// Build cursor for next page
const cursor = buildCursor({ offset: 20, sortKey: 'created_at', sortDirection: 'desc' })

// Parse cursor from URL
const cursorData = parseCursor(searchParams.get('cursor'))

// Build params for commerce provider
const params = buildPaginationParams({
  cursor: cursorData?.offset ? buildCursor(cursorData) : null,
  pageSize: 20,
  sortKey: 'PRICE',
  sortDirection: 'asc',
})

// Generate page numbers for UI
const pages = generatePageNumbers(5, 20)  // Current: 5, Total: 20
// [1, 'ellipsis', 4, 5, 6, 'ellipsis', 20]
```

### Pattern 5: Validation

```typescript
import {
  validateQuantity,
  validateAddToCart,
  validateDiscountCode,
  isCartCheckoutReady,
} from '@cgk-platform/commerce-primitives'

// Validate quantity input
const qtyResult = validateQuantity(5)
if (!qtyResult.valid) {
  showError(qtyResult.error)
}

// Validate add to cart operation
const addResult = validateAddToCart(variant, quantity, currentCart)
if (!addResult.valid) {
  showError(addResult.error)
  return
}

// Validate discount code
const discountResult = validateDiscountCode(discount)
if (!discountResult.isActive) {
  showError(discountResult.error)
}

// Check if cart is ready for checkout
const checkout = isCartCheckoutReady(cart)
if (!checkout.ready) {
  showErrors(checkout.issues)
}
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Barrel export | All exports |
| **formatters/** | | |
| `money.ts` | Money formatting | `formatMoney`, `parseMoney`, `addMoney` |
| `product.ts` | Product formatting | `formatProduct`, `getPriceRange` |
| `cart.ts` | Cart formatting | `formatCart`, `getCartTotals` |
| **utilities/** | | |
| `cart-attributes.ts` | Cart attribute building | `buildCartAttributes`, `parseCartAttributes` |
| `pagination.ts` | Cursor pagination | `buildCursor`, `parseCursor` |
| `variant-selection.ts` | Variant selection | `findVariantByOptions`, `buildSelectionMatrix` |
| **validators/** | | |
| `discount-code.ts` | Discount validation | `validateDiscountCode` |
| `cart.ts` | Cart validation | `validateQuantity`, `validateCart` |
| **constants/** | | |
| `cart.ts` | Cart constants | `CART_COOKIE_NAME`, `MAX_LINE_QUANTITY` |
| `pagination.ts` | Pagination constants | `DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE` |
| **types/** | | |
| `attributes.ts` | Attribute types | `PlatformCartAttributes` |
| `cart.ts` | Cart types | `CartTotals`, `CartValidationResult` |

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@cgk-platform/commerce` | Commerce types (Money, Cart, Product, etc.) |
| `@cgk-platform/core` | Core types |

---

## Common Gotchas

### 1. Money amounts are strings

```typescript
// WRONG - Treating amount as number
const total = price1.amount + price2.amount  // "29.9910.00"

// CORRECT - Use arithmetic helpers
const total = addMoney(price1, price2)
```

### 2. Currency must match for arithmetic

```typescript
// WRONG - Different currencies
addMoney(usdPrice, eurPrice)  // Throws error!

// CORRECT - Same currency
addMoney(usdPrice1, usdPrice2)
```

### 3. Cart attributes required for multi-tenant

```typescript
// WRONG - Missing tenant context
await commerce.cart.create()

// CORRECT - Include platform attributes
const attributes = buildCartAttributes(tenantSlug, visitorId)
await commerce.cart.create()
await commerce.cart.setAttributes(cartId, attributes)
```

### 4. Cursor is not a page number

```typescript
// WRONG - Treating cursor as page number
const cursor = page.toString()

// CORRECT - Cursor encodes position + context
const cursor = buildCursor({ offset: (page - 1) * pageSize })
```

---

## Integration Points

### Used by:
- `apps/storefront` - Product pages, cart, checkout
- `apps/admin` - Order management, product management
- `@cgk-platform/mcp` - Commerce MCP tools

### Uses:
- `@cgk-platform/commerce` - Type definitions only

---

## Testing

```bash
pnpm test        # Run unit tests
pnpm typecheck   # Type check
```
