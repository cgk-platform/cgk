# @cgk-platform/commerce

Commerce provider abstraction for the CGK platform - unified interface for Shopify and future e-commerce platforms.

## Installation

```bash
pnpm add @cgk-platform/commerce
```

## Features

- **Provider-Agnostic API** - Write code once, work with any commerce backend
- **Shopify Integration** - Full Shopify Admin and Storefront API support
- **Product Operations** - List, search, and fetch products
- **Cart Management** - Create, update, and manage shopping carts
- **Checkout Operations** - Generate checkout URLs and process orders
- **Order Management** - Fetch and track customer orders
- **Customer Operations** - Customer data and authentication
- **Discount Handling** - Apply and validate discount codes
- **Google Product Feed** - Generate Google Merchant Center feeds

## Quick Start

### Create Commerce Provider

```typescript
import { createCommerceProvider } from '@cgk-platform/commerce'

const commerce = await createCommerceProvider({
  provider: 'shopify',
  credentials: {
    storefrontToken: process.env.SHOPIFY_STOREFRONT_TOKEN,
    adminToken: process.env.SHOPIFY_ADMIN_TOKEN,
    shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
  },
  currencyCode: 'USD',
})
```

### Fetch Products

```typescript
const products = await commerce.products.list({
  first: 12,
  sortKey: 'BEST_SELLING',
})

console.log(products.nodes) // Product[]
console.log(products.pageInfo) // { hasNextPage, endCursor }

// Fetch single product
const product = await commerce.products.getByHandle('premium-cotton-sheets')
```

### Cart Operations

```typescript
// Create cart
const cart = await commerce.cart.create({
  lines: [
    { variantId: 'gid://shopify/ProductVariant/123', quantity: 2 },
  ],
  attributes: [
    { key: 'tenant_slug', value: 'my-brand' },
  ],
})

// Update cart
const updatedCart = await commerce.cart.update(cart.id, {
  lines: [
    { id: 'line_item_id', quantity: 3 },
  ],
})

// Apply discount
await commerce.cart.applyDiscount(cart.id, 'SUMMER20')

// Get checkout URL
const checkoutUrl = await commerce.checkout.getCheckoutUrl(cart.id)
```

### Search Products

```typescript
const results = await commerce.products.search({
  query: 'organic cotton sheets',
  first: 20,
  filters: {
    productType: 'Bedding',
    available: true,
  },
})
```

### Fetch Orders

```typescript
const orders = await commerce.orders.list({
  first: 10,
  customerId: 'customer_123',
})

// Get single order
const order = await commerce.orders.getById('order_456')
console.log(order.fulfillmentStatus) // 'fulfilled', 'unfulfilled', etc.
```

### Google Product Feed

```typescript
import { generateGoogleFeed } from '@cgk-platform/commerce'

// Generate XML feed
const feedXml = await generateGoogleFeed({
  products,
  baseUrl: 'https://my-brand.com',
  currencyCode: 'USD',
  brand: 'My Brand',
})

// Save or serve feed
await writeFile('public/google-feed.xml', feedXml)
```

## Direct Shopify Provider

For Shopify-specific features:

```typescript
import { createShopifyProvider } from '@cgk-platform/commerce'

const shopify = createShopifyProvider({
  storefrontToken: process.env.SHOPIFY_STOREFRONT_TOKEN,
  adminToken: process.env.SHOPIFY_ADMIN_TOKEN,
  shopDomain: 'my-store.myshopify.com',
})

// Access Shopify-specific methods
const metafields = await shopify.products.getMetafields(productId)
```

## Key Exports

### Provider
- `createCommerceProvider(config)` - Create provider instance
- `createShopifyProvider(config)` - Direct Shopify provider

### Types
- `CommerceProvider` - Provider interface
- `Product`, `ProductVariant`, `ProductImage`
- `Cart`, `CartLine`, `CartCost`
- `Order`, `OrderLineItem`
- `Customer`, `Address`
- `Checkout`, `CheckoutLineItem`
- `Discount`, `Money`, `PriceRange`

### Operations
- `ProductOperations` - Product queries
- `CartOperations` - Cart management
- `CheckoutOperations` - Checkout flow
- `OrderOperations` - Order tracking
- `CustomerOperations` - Customer data
- `DiscountOperations` - Discount codes

### Google Feed
- `generateGoogleFeed()` - Generate XML feed
- Google Merchant Center compatible format

## Provider Interface

All providers implement:

```typescript
interface CommerceProvider {
  products: ProductOperations
  cart: CartOperations
  checkout: CheckoutOperations
  orders: OrderOperations
  customers: CustomerOperations
  discounts: DiscountOperations
  webhooks?: WebhookHandler
}
```

This ensures your code works regardless of backend platform.

## License

MIT
