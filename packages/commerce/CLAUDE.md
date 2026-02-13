# @cgk-platform/commerce - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-10

---

## Purpose

Commerce provider abstraction for the CGK platform. Provides a unified interface for product catalog, cart, checkout, and order operations across different commerce backends.

---

## Quick Reference

```typescript
import { createCommerceClient, type CommerceClient } from '@cgk-platform/commerce'
import type { Product, Order, Cart } from '@cgk-platform/commerce'
```

---

## Key Patterns

### Pattern 1: Creating a Commerce Client

```typescript
import { createCommerceClient } from '@cgk-platform/commerce'

const commerce = createCommerceClient({
  provider: 'shopify',
  storeDomain: 'my-store.myshopify.com',
  storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN,
})
```

### Pattern 2: Product Operations

```typescript
// Get a single product
const product = await commerce.getProduct('gid://shopify/Product/123')

// Get products with options
const products = await commerce.getProducts({
  first: 10,
  query: 'tag:featured',
  sortKey: 'PRICE',
})
```

### Pattern 3: Cart Operations

```typescript
// Create a cart
const cart = await commerce.createCart()

// Add item to cart
const updatedCart = await commerce.addToCart(cart.id, {
  merchandiseId: 'gid://shopify/ProductVariant/456',
  quantity: 1,
})

// Remove item from cart
await commerce.removeFromCart(cart.id, lineId)
```

### Pattern 4: Checkout

```typescript
const checkout = await commerce.createCheckout(cart.id)
// Redirect user to checkout.webUrl
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `types.ts` | Type definitions | All commerce types |
| `client.ts` | Client factory | `createCommerceClient` |
| `products.ts` | Product operations | `getProduct`, `getProducts` |
| `orders.ts` | Order operations | `getOrder`, `getOrders` |
| `cart.ts` | Cart operations | `createCart`, `addToCart`, etc. |
| `checkout.ts` | Checkout operations | `createCheckout` |

---

## Exports Reference

### Factory

```typescript
createCommerceClient(config: CommerceConfig): CommerceClient
```

### Types

- `Product`, `ProductVariant`, `ProductImage`
- `Order`, `OrderLineItem`
- `Cart`, `CartItem`, `CartItemInput`
- `Checkout`, `CheckoutLineItem`
- `Money`, `PriceRange`

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@cgk-platform/core` | Shared types |
| `@cgk-platform/db` | Order persistence |

---

## Common Gotchas

### 1. Provider must be configured

```typescript
// WRONG - Using standalone functions without client
await getProduct('123') // Throws error

// CORRECT - Use client methods
const client = createCommerceClient(config)
await client.getProduct('123')
```

### 2. Money amounts are strings

```typescript
// Product prices are strings for precision
const price = product.priceRange.minVariantPrice.amount // "29.99"
const numericPrice = parseFloat(price) // 29.99
```

---

## Integration Points

### Used by:
- `apps/storefront` - Product display, cart
- `@cgk-platform/mcp` - Commerce tools for AI
- `@cgk-platform/analytics` - E-commerce tracking

### Uses:
- `@cgk-platform/core` - Types
- `@cgk-platform/db` - Order storage
