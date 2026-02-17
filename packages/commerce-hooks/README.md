# @cgk-platform/commerce-hooks

React hooks and context providers for commerce operations in the CGK platform.

## Installation

```bash
pnpm add @cgk-platform/commerce-hooks
```

## Quick Start

### 1. Set Up Provider

```tsx
// app/layout.tsx
import { CommerceProvider } from '@cgk-platform/commerce-hooks'
import { cartActions, productActions } from '@/lib/commerce/actions'

export default function RootLayout({ children }) {
  return (
    <CommerceProvider
      config={{ provider: 'shopify', currencyCode: 'USD' }}
      actions={{
        cart: cartActions,
        products: productActions,
      }}
      tenantSlug="my-store"
    >
      {children}
    </CommerceProvider>
  )
}
```

### 2. Use Cart Hooks

```tsx
'use client'

import { useCart, useCartCount } from '@cgk-platform/commerce-hooks'

function AddToCartButton({ variantId }) {
  const { addItem, isUpdating } = useCart()

  return (
    <button
      onClick={() => addItem({ variantId, quantity: 1 })}
      disabled={isUpdating}
    >
      Add to Cart
    </button>
  )
}

function CartIcon() {
  const count = useCartCount()
  return <span>Cart ({count})</span>
}
```

### 3. Use Product Hooks

```tsx
'use client'

import { useProducts, useProductActions } from '@cgk-platform/commerce-hooks'

function ProductGrid() {
  const productActions = useProductActions()
  const { products, isLoading, loadMore, hasNextPage } = useProducts(
    productActions,
    { first: 12 }
  )

  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
      {hasNextPage && <button onClick={loadMore}>Load More</button>}
    </div>
  )
}
```

### 4. Use Checkout Hooks

```tsx
'use client'

import { useCheckout, useCanCheckout } from '@cgk-platform/commerce-hooks'

function CheckoutButton() {
  const { redirectToCheckout, isRedirecting } = useCheckout()
  const canCheckout = useCanCheckout()

  return (
    <button
      onClick={redirectToCheckout}
      disabled={!canCheckout || isRedirecting}
    >
      Checkout
    </button>
  )
}
```

## Hooks

### Cart Hooks

| Hook | Description |
|------|-------------|
| `useCart()` | Full cart state and operations |
| `useCartCount()` | Cart item count (safe outside provider) |
| `useCartLoading()` | Cart loading state |
| `useCartUpdating()` | Cart updating state |
| `useCartError()` | Cart error state |
| `useCartEmpty()` | Check if cart is empty |

### Product Hooks

| Hook | Description |
|------|-------------|
| `useProducts(actions, options)` | Fetch product list with pagination |
| `useProductByHandle(actions, handle)` | Fetch single product |
| `useProductSearch(actions, query, options)` | Search products |

### Checkout Hooks

| Hook | Description |
|------|-------------|
| `useCheckout()` | Checkout URL and redirect |
| `useCheckoutUrl()` | Just the checkout URL |
| `useCanCheckout()` | Check if checkout is possible |

### Discount Hooks

| Hook | Description |
|------|-------------|
| `useDiscountCode(actions)` | Validate discount codes |
| `useCartDiscounts()` | Manage cart discount codes |

### Order Hooks

| Hook | Description |
|------|-------------|
| `useOrders(actions, options)` | Fetch order list |
| `useOrder(actions, orderId)` | Fetch single order |
| `useOrderStatus(order)` | Order status helpers |

## Server Actions

Hooks require server actions for backend integration:

```typescript
// lib/commerce/actions.ts
'use server'

import { requireCommerceProvider } from '@/lib/commerce'
import type { CartActions } from '@cgk-platform/commerce-hooks'

export const cartActions: CartActions = {
  getCurrentCart: async () => {
    const commerce = await requireCommerceProvider()
    // Implementation
  },
  addToCart: async (variantId, quantity) => {
    const commerce = await requireCommerceProvider()
    // Implementation
  },
  // ...
}
```

## License

MIT
