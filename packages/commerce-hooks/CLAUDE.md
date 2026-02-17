# @cgk-platform/commerce-hooks - AI Development Guide

> **Package Version**: 1.1.0
> **Last Updated**: 2026-02-16

---

## Purpose

React hooks and context providers for commerce operations in the CGK platform. Provides a type-safe, server-action-integrated approach to cart management, product fetching, checkout, and order history.

---

## Quick Reference

```typescript
import {
  CommerceProvider,
  CartProvider,
  useCart,
  useCartCount,
  useProducts,
  useCheckout,
  useOrders,
} from '@cgk-platform/commerce-hooks'
```

---

## Key Patterns

### Pattern 1: Setting Up CommerceProvider

```tsx
// app/layout.tsx
import { CommerceProvider } from '@cgk-platform/commerce-hooks'
import { cartActions, productActions, orderActions } from '@/lib/commerce/actions'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <CommerceProvider
      config={{ provider: 'shopify', currencyCode: 'USD' }}
      actions={{
        cart: cartActions,
        products: productActions,
        orders: orderActions,
      }}
      tenantSlug="my-store"
    >
      {children}
    </CommerceProvider>
  )
}
```

### Pattern 2: Using Cart Hooks

```tsx
// Add to cart button
function AddToCartButton({ variantId }: { variantId: string }) {
  const { addItem, isUpdating } = useCart()

  return (
    <button
      onClick={() => addItem({ variantId, quantity: 1 })}
      disabled={isUpdating}
    >
      {isUpdating ? 'Adding...' : 'Add to Cart'}
    </button>
  )
}

// Cart icon with count
function CartIcon() {
  const count = useCartCount() // Safe outside provider, returns 0

  return (
    <button>
      Cart {count > 0 && <span>{count}</span>}
    </button>
  )
}
```

### Pattern 3: Using Product Hooks

```tsx
function ProductGrid() {
  const productActions = useProductActions()
  const { products, isLoading, hasNextPage, loadMore } = useProducts(
    productActions,
    { first: 12, tag: 'featured' }
  )

  if (isLoading && products.length === 0) return <Skeleton />

  return (
    <>
      <div className="grid">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
      {hasNextPage && <button onClick={loadMore}>Load More</button>}
    </>
  )
}
```

### Pattern 4: Using Checkout Hooks

```tsx
function CheckoutButton() {
  const { redirectToCheckout, isRedirecting } = useCheckout()
  const canCheckout = useCanCheckout()

  return (
    <button
      onClick={redirectToCheckout}
      disabled={!canCheckout || isRedirecting}
    >
      {isRedirecting ? 'Redirecting...' : 'Checkout'}
    </button>
  )
}
```

### Pattern 5: Order History

```tsx
function OrderHistory() {
  const orderActions = useOrderActions()
  const { orders, isLoading, hasNextPage, loadMore } = useOrders(
    orderActions,
    { first: 10 }
  )

  return (
    <ul>
      {orders.map(order => (
        <OrderListItem key={order.id} order={order} />
      ))}
    </ul>
  )
}
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `context/types.ts` | Type definitions | All types |
| `context/CartContext.tsx` | Cart context | `CartContext` |
| `context/CartProvider.tsx` | Cart provider | `CartProvider` |
| `providers/CommerceProvider.tsx` | Top-level provider | `CommerceProvider`, `useCommerce` |
| `hooks/useCart.ts` | Cart hooks | `useCart`, `useCartCount`, etc. |
| `hooks/useProducts.ts` | Product hooks | `useProducts`, `useProductByHandle` |
| `hooks/useCheckout.ts` | Checkout hooks | `useCheckout`, `useCanCheckout` |
| `hooks/useDiscountCode.ts` | Discount hooks | `useDiscountCode`, `useCartDiscounts` |
| `hooks/useOrders.ts` | Order hooks | `useOrders`, `useOrder` |

---

## Type Reference

### Action Types (Required for Provider)

```typescript
interface CartActions {
  getCurrentCart: () => Promise<Cart | null>
  addToCart: (variantId: string, quantity: number) => Promise<Cart>
  updateCartLine: (lineId: string, quantity: number) => Promise<Cart>
  removeFromCart: (lineId: string) => Promise<Cart>
  applyDiscountCode: (code: string) => Promise<Cart>
  removeDiscountCodes: () => Promise<Cart>
}

interface ProductActions {
  getProducts: (params?: ProductListParams) => Promise<ProductListResult>
  getProductByHandle: (handle: string) => Promise<Product | null>
  searchProducts: (query: string, params?: ProductListParams) => Promise<ProductListResult>
}

interface OrderActions {
  getOrders: (params?: OrderListParams) => Promise<OrderListResult>
  getOrder: (id: string) => Promise<Order | null>
}
```

### CartContextValue

```typescript
interface CartContextValue {
  cart: Cart | null
  isLoading: boolean
  isUpdating: boolean
  error: string | null
  addItem: (input: AddToCartInput) => Promise<void>
  updateQuantity: (lineId: string, quantity: number) => Promise<void>
  removeItem: (lineId: string) => Promise<void>
  checkout: () => void
  getCheckoutUrl: () => string | null
  clearError: () => void
  refreshCart: () => Promise<void>
  applyDiscount: (code: string) => Promise<boolean>
  removeDiscounts: () => Promise<void>
}
```

---

## Hook Safety

| Hook | Safe Outside Provider | Returns |
|------|----------------------|---------|
| `useCart()` | No (throws) | `CartContextValue` |
| `useCartCount()` | Yes | `0` |
| `useCartLoading()` | Yes | `false` |
| `useCartUpdating()` | Yes | `false` |
| `useCartError()` | Yes | `null` |
| `useCartEmpty()` | Yes | `true` |
| `useCommerce()` | No (throws) | `CommerceContextValue` |
| `useCommerceOptional()` | Yes | `null` |

---

## Common Gotchas

### 1. Actions Must Be Server Actions

```typescript
// WRONG - Client-side function
const cartActions = {
  addToCart: (variantId, quantity) => fetch('/api/cart/add', ...)
}

// CORRECT - Server action
'use server'
export async function addToCart(variantId: string, quantity: number) {
  const commerce = await requireCommerceProvider()
  return commerce.cart.addItem(...)
}
```

### 2. All Hooks Need 'use client'

All files using these hooks must have `'use client'` directive since they use React context.

### 3. CommerceProvider vs CartProvider

Use `CommerceProvider` for full commerce features (products, orders).
Use `CartProvider` alone if you only need cart functionality.

### 4. Optimistic Updates Are Built-In

Cart operations include optimistic updates with automatic rollback on error. Don't implement your own.

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `react` | Peer dependency, hooks and context |
| `@cgk-platform/commerce` | Commerce types (Cart, Product, etc.) |

---

## Testing

```bash
# Run tests
pnpm --filter @cgk-platform/commerce-hooks test

# Type check
pnpm --filter @cgk-platform/commerce-hooks typecheck
```
