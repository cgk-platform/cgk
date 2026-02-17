# @cgk-platform/commerce-hooks

React hooks and context providers for commerce operations in the CGK platform.

## Installation

```bash
pnpm add @cgk-platform/commerce-hooks
```

## Overview

This package provides type-safe React hooks for cart management, product fetching, checkout, discount codes, and order history. It integrates with server actions for seamless server-client communication.

## Quick Start

```tsx
import {
  CommerceProvider,
  CartProvider,
  useCart,
  useProducts,
  useCheckout,
} from '@cgk-platform/commerce-hooks'
```

## Providers

### CommerceProvider

Top-level provider that supplies commerce context to the entire application.

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

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `config` | `CommerceConfig` | Commerce configuration (provider, currency) |
| `actions` | `CommerceActions` | Server action callbacks for cart, products, orders |
| `tenantSlug` | `string` | Tenant identifier for multi-tenant isolation |

### CartProvider

Lower-level provider for cart-only functionality. Use `CommerceProvider` when you need full commerce features.

```tsx
import { CartProvider } from '@cgk-platform/commerce-hooks'

function App({ children }) {
  return (
    <CartProvider cartActions={cartActions}>
      {children}
    </CartProvider>
  )
}
```

## Cart Hooks

### useCart

Full cart context access. Throws if used outside `CartProvider`.

```tsx
function AddToCartButton({ variantId }: { variantId: string }) {
  const { addItem, isUpdating, error, clearError } = useCart()

  const handleClick = async () => {
    await addItem({ variantId, quantity: 1 })
  }

  return (
    <>
      <button onClick={handleClick} disabled={isUpdating}>
        {isUpdating ? 'Adding...' : 'Add to Cart'}
      </button>
      {error && (
        <div className="error">
          {error}
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
    </>
  )
}
```

**Returns `CartContextValue`:**

| Property | Type | Description |
|----------|------|-------------|
| `cart` | `Cart \| null` | Current cart object |
| `isLoading` | `boolean` | Whether cart is loading |
| `isUpdating` | `boolean` | Whether cart is being updated |
| `error` | `string \| null` | Error message if operation failed |
| `addItem` | `(input: AddToCartInput) => Promise<void>` | Add item to cart |
| `updateQuantity` | `(lineId: string, quantity: number) => Promise<void>` | Update line quantity |
| `removeItem` | `(lineId: string) => Promise<void>` | Remove line from cart |
| `checkout` | `() => void` | Redirect to checkout |
| `getCheckoutUrl` | `() => string \| null` | Get checkout URL |
| `clearError` | `() => void` | Clear error state |
| `refreshCart` | `() => Promise<void>` | Refresh cart from server |
| `applyDiscount` | `(code: string) => Promise<boolean>` | Apply discount code |
| `removeDiscounts` | `() => Promise<void>` | Remove all discounts |

### useCartCount

Get cart item count. Safe to use outside provider (returns 0).

```tsx
function CartIcon() {
  const count = useCartCount()

  return (
    <button>
      Cart {count > 0 && <span className="badge">{count}</span>}
    </button>
  )
}
```

### useCartLoading

Get cart loading state. Safe outside provider (returns false).

```tsx
function CartButton() {
  const isLoading = useCartLoading()
  const count = useCartCount()

  if (isLoading) return <Spinner />
  return <span>{count} items</span>
}
```

### useCartUpdating

Get cart updating state (add/remove/update operations). Safe outside provider.

```tsx
function CartStatus() {
  const isUpdating = useCartUpdating()

  if (isUpdating) return <span>Updating cart...</span>
  return null
}
```

### useCartError

Get cart error state. Safe outside provider (returns null).

```tsx
function CartError() {
  const error = useCartError()
  const { clearError } = useCart()

  if (!error) return null

  return (
    <div className="error">
      {error}
      <button onClick={clearError}>Dismiss</button>
    </div>
  )
}
```

### useCartEmpty

Check if cart is empty. Safe outside provider (returns true).

```tsx
function CartDrawer() {
  const isEmpty = useCartEmpty()

  if (isEmpty) return <p>Your cart is empty</p>
  return <CartLineItems />
}
```

## Product Hooks

### useProducts

Fetch a list of products with pagination.

```tsx
function ProductGrid() {
  const productActions = useProductActions()
  const { products, isLoading, hasNextPage, loadMore, error, refetch } = useProducts(
    productActions,
    { first: 12, tag: 'featured' }
  )

  if (isLoading && products.length === 0) {
    return <ProductGridSkeleton />
  }

  if (error) return <ErrorMessage error={error} />

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {hasNextPage && (
        <button onClick={loadMore} disabled={isLoading}>
          Load More
        </button>
      )}
    </>
  )
}
```

**Options (`UseProductsOptions`):**

| Option | Type | Description |
|--------|------|-------------|
| `first` | `number` | Number of products to fetch |
| `after` | `string` | Cursor for pagination |
| `query` | `string` | Search query |
| `sortKey` | `'TITLE' \| 'PRICE' \| 'CREATED_AT' \| 'UPDATED_AT' \| 'BEST_SELLING'` | Sort field |
| `reverse` | `boolean` | Reverse sort order |
| `tag` | `string` | Filter by tag |
| `collection` | `string` | Filter by collection |
| `skip` | `boolean` | Skip initial fetch |

**Returns (`UseProductsReturn`):**

| Property | Type | Description |
|----------|------|-------------|
| `products` | `Product[]` | List of products |
| `isLoading` | `boolean` | Loading state |
| `error` | `string \| null` | Error message |
| `hasNextPage` | `boolean` | More products available |
| `loadMore` | `() => Promise<void>` | Load next page |
| `refetch` | `() => Promise<void>` | Refetch from beginning |

### useProductByHandle

Fetch a single product by its URL handle.

```tsx
function ProductPage({ handle }: { handle: string }) {
  const productActions = useProductActions()
  const { product, isLoading, error, refetch } = useProductByHandle(productActions, handle)

  if (isLoading) return <ProductSkeleton />
  if (error) return <ErrorMessage error={error} />
  if (!product) return <NotFound />

  return <ProductDetails product={product} />
}
```

### useProductSearch

Search products with pagination.

```tsx
function SearchResults({ query }: { query: string }) {
  const productActions = useProductActions()
  const { products, isLoading, hasNextPage, loadMore } = useProductSearch(
    productActions,
    query,
    { first: 20 }
  )

  if (isLoading && products.length === 0) return <SearchSkeleton />
  if (products.length === 0) return <NoResults query={query} />

  return (
    <>
      <ProductGrid products={products} />
      {hasNextPage && <button onClick={loadMore}>Load More</button>}
    </>
  )
}
```

## Checkout Hooks

### useCheckout

Full checkout context with redirect functionality.

```tsx
function CheckoutButton() {
  const { checkoutUrl, redirectToCheckout, isRedirecting, getCheckoutUrl } = useCheckout()

  return (
    <button
      onClick={redirectToCheckout}
      disabled={!checkoutUrl || isRedirecting}
    >
      {isRedirecting ? 'Redirecting...' : 'Proceed to Checkout'}
    </button>
  )
}
```

**Returns (`UseCheckoutReturn`):**

| Property | Type | Description |
|----------|------|-------------|
| `checkoutUrl` | `string \| null` | Current checkout URL |
| `isRedirecting` | `boolean` | Redirect in progress |
| `redirectToCheckout` | `() => void` | Trigger redirect |
| `getCheckoutUrl` | `() => string \| null` | Get URL without redirect |

### useCheckoutUrl

Get just the checkout URL (lighter weight).

```tsx
function ShareCartButton() {
  const checkoutUrl = useCheckoutUrl()

  if (!checkoutUrl) return null

  return (
    <button onClick={() => navigator.clipboard.writeText(checkoutUrl)}>
      Copy Checkout Link
    </button>
  )
}
```

### useCanCheckout

Check if checkout is possible.

```tsx
function CartFooter() {
  const canCheckout = useCanCheckout()

  return (
    <div>
      <CartTotal />
      <CheckoutButton disabled={!canCheckout} />
    </div>
  )
}
```

Returns `false` when:
- Cart is loading or updating
- Cart is null or empty
- No checkout URL available

## Discount Hooks

### useDiscountCode

Validate discount codes before applying.

```tsx
function DiscountInput() {
  const [code, setCode] = useState('')
  const { validate, discount, error, isValidating, reset } = useDiscountCode(discountActions)
  const { applyDiscount } = useCart()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const valid = await validate(code)
    if (valid) {
      await applyDiscount(code)
      setCode('')
      reset()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="Discount code"
      />
      <button type="submit" disabled={isValidating}>
        {isValidating ? 'Checking...' : 'Apply'}
      </button>
      {error && <span className="error">{error}</span>}
      {discount && <span className="success">{discount.code} applied!</span>}
    </form>
  )
}
```

**Returns (`UseDiscountCodeReturn`):**

| Property | Type | Description |
|----------|------|-------------|
| `isValidating` | `boolean` | Validation in progress |
| `discount` | `Discount \| null` | Validated discount |
| `error` | `string \| null` | Validation error |
| `validate` | `(code: string) => Promise<boolean>` | Validate a code |
| `reset` | `() => void` | Reset state |

### useCartDiscounts

Manage discount codes applied to cart.

```tsx
function DiscountManager() {
  const {
    appliedCodes,
    applicableCodes,
    hasDiscount,
    totalDiscount,
    applyCode,
    removeAllCodes,
    isApplying,
    error,
  } = useCartDiscounts()

  return (
    <div>
      {appliedCodes.map(code => (
        <Tag key={code.code}>
          {code.code}
          {code.applicable ? <Check /> : <X />}
        </Tag>
      ))}
      {hasDiscount && <span>Saved: ${totalDiscount}</span>}
      <button onClick={removeAllCodes}>Remove All</button>
    </div>
  )
}
```

## Order Hooks

### useOrders

Fetch customer order history with pagination.

```tsx
function OrderHistory() {
  const orderActions = useOrderActions()
  const { orders, isLoading, hasNextPage, loadMore, error, refetch } = useOrders(
    orderActions,
    { first: 10 }
  )

  if (isLoading && orders.length === 0) return <OrderListSkeleton />
  if (error) return <ErrorMessage error={error} />
  if (orders.length === 0) return <EmptyState message="No orders yet" />

  return (
    <>
      <ul>
        {orders.map(order => (
          <OrderListItem key={order.id} order={order} />
        ))}
      </ul>
      {hasNextPage && (
        <button onClick={loadMore} disabled={isLoading}>
          Load More Orders
        </button>
      )}
    </>
  )
}
```

### useOrder

Fetch a single order by ID.

```tsx
function OrderDetails({ orderId }: { orderId: string }) {
  const orderActions = useOrderActions()
  const { order, isLoading, error, refetch } = useOrder(orderActions, orderId)

  if (isLoading) return <OrderDetailsSkeleton />
  if (error) return <ErrorMessage error={error} />
  if (!order) return <NotFound message="Order not found" />

  return (
    <div>
      <h1>Order #{order.orderNumber}</h1>
      <OrderStatus status={order.fulfillmentStatus} />
      <OrderLineItems items={order.lineItems} />
      <OrderTotals order={order} />
    </div>
  )
}
```

### useOrderStatus

Get formatted status information for an order.

```tsx
function OrderStatusBadge({ order }: { order: Order }) {
  const {
    fulfillmentLabel,
    financialLabel,
    isComplete,
    isPending,
    isCancelled,
    isRefunded,
  } = useOrderStatus(order)

  return (
    <div>
      <Badge variant={isComplete ? 'success' : isPending ? 'warning' : 'default'}>
        {fulfillmentLabel}
      </Badge>
      <Badge>{financialLabel}</Badge>
    </div>
  )
}
```

## Type Definitions

### AddToCartInput

```typescript
interface AddToCartInput {
  variantId: string
  quantity: number
  sellingPlanId?: string  // For subscriptions
}
```

### CartActions

Server action callbacks required by providers.

```typescript
interface CartActions {
  getCurrentCart: () => Promise<Cart | null>
  addToCart: (variantId: string, quantity: number) => Promise<Cart>
  updateCartLine: (lineId: string, quantity: number) => Promise<Cart>
  removeFromCart: (lineId: string) => Promise<Cart>
  applyDiscountCode: (code: string) => Promise<Cart>
  removeDiscountCodes: () => Promise<Cart>
}
```

### ProductActions

```typescript
interface ProductActions {
  getProducts: (params?: ProductListParams) => Promise<ProductListResult>
  getProductByHandle: (handle: string) => Promise<Product | null>
  searchProducts: (query: string, params?: ProductListParams) => Promise<ProductListResult>
}
```

### OrderActions

```typescript
interface OrderActions {
  getOrders: (params?: OrderListParams) => Promise<OrderListResult>
  getOrder: (id: string) => Promise<Order | null>
}
```

### PlatformCartAttributes

Cart attributes for tenant tracking and attribution.

```typescript
interface PlatformCartAttributes {
  _tenant: string              // Required: tenant slug
  _visitor_id: string          // Visitor identifier
  _ab_test_id?: string         // A/B test ID
  _ab_variant_id?: string      // A/B test variant
  _attribution_source?: string // UTM source
  _attribution_campaign?: string
  _attribution_medium?: string
  _free_gifts?: string         // Applied gift rule IDs
  _session_id?: string
}
```

## Hook Safety Reference

| Hook | Safe Outside Provider | Returns When Missing |
|------|----------------------|---------------------|
| `useCart()` | No (throws) | N/A |
| `useCartCount()` | Yes | `0` |
| `useCartLoading()` | Yes | `false` |
| `useCartUpdating()` | Yes | `false` |
| `useCartError()` | Yes | `null` |
| `useCartEmpty()` | Yes | `true` |
| `useCommerce()` | No (throws) | N/A |
| `useCommerceOptional()` | Yes | `null` |

## Important Notes

### Actions Must Be Server Actions

```typescript
// CORRECT - Server action
'use server'
export async function addToCart(variantId: string, quantity: number) {
  const commerce = await requireCommerceProvider()
  return commerce.cart.addItem(...)
}

// WRONG - Client-side function
const cartActions = {
  addToCart: (variantId, quantity) => fetch('/api/cart/add', ...)
}
```

### All Hooks Require 'use client'

Files using these hooks must have the `'use client'` directive.

### Optimistic Updates Are Built-In

Cart operations include optimistic updates with automatic rollback on error. Do not implement your own.
