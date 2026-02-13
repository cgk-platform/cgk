# @cgk-platform/shopify - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-10

---

## Purpose

Shopify Admin and Storefront API clients for the CGK platform. Provides typed GraphQL clients for interacting with Shopify stores.

---

## Quick Reference

```typescript
import { createStorefrontClient, createAdminClient } from '@cgk-platform/shopify'
import { verifyWebhook, type WebhookPayload } from '@cgk-platform/shopify'
```

---

## Key Patterns

### Pattern 1: Storefront API Client

```typescript
import { createStorefrontClient } from '@cgk-platform/shopify'

const storefront = createStorefrontClient({
  storeDomain: 'my-store.myshopify.com',
  storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN,
})

const products = await storefront.query(`
  query {
    products(first: 10) {
      edges {
        node {
          id
          title
          handle
        }
      }
    }
  }
`)
```

### Pattern 2: Admin API Client

```typescript
import { createAdminClient } from '@cgk-platform/shopify'

const admin = createAdminClient({
  storeDomain: 'my-store.myshopify.com',
  adminAccessToken: process.env.SHOPIFY_ADMIN_TOKEN,
})

const order = await admin.query(`
  query ($id: ID!) {
    order(id: $id) {
      id
      name
      totalPrice
    }
  }
`, { id: 'gid://shopify/Order/123' })
```

### Pattern 3: Webhook Verification

```typescript
import { verifyWebhook, parseWebhook } from '@cgk-platform/shopify'

export async function POST(req: Request) {
  const body = await req.text()
  const hmac = req.headers.get('x-shopify-hmac-sha256')!

  if (!verifyWebhook(body, hmac, process.env.SHOPIFY_WEBHOOK_SECRET!)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const webhook = parseWebhook(
    body,
    req.headers.get('x-shopify-topic')!,
    req.headers.get('x-shopify-shop-domain')!
  )

  // Process webhook...
}
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `config.ts` | Configuration | `ShopifyConfig`, `normalizeStoreDomain` |
| `types.ts` | Shopify types | `ShopifyProduct`, `ShopifyOrder`, etc. |
| `storefront.ts` | Storefront client | `createStorefrontClient` |
| `admin.ts` | Admin client | `createAdminClient` |
| `graphql.ts` | Query helpers | `storefrontQuery`, `adminQuery` |
| `webhooks.ts` | Webhook utils | `verifyWebhook`, `parseWebhook` |

---

## Exports Reference

### Clients

```typescript
createStorefrontClient(config: StorefrontConfig): StorefrontClient
createAdminClient(config: AdminConfig): AdminClient
```

### Types

- `ShopifyProduct`, `ShopifyVariant`, `ShopifyImage`
- `ShopifyOrder`, `ShopifyLineItem`
- `ShopifyCustomer`, `ShopifyAddress`
- `ShopifyCollection`

### Webhook Types

```typescript
type WebhookTopic = 'orders/create' | 'orders/updated' | 'products/create' | ...
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@cgk-platform/core` | Shared types |
| `@shopify/shopify-api` | Official Shopify SDK (optional) |

---

## Common Gotchas

### 1. Store domain normalization

```typescript
// These all work - domain is normalized automatically
createStorefrontClient({ storeDomain: 'my-store' })
createStorefrontClient({ storeDomain: 'my-store.myshopify.com' })
createStorefrontClient({ storeDomain: 'https://my-store.myshopify.com/' })
```

### 2. API version matters

```typescript
// Specify version for consistency
createAdminClient({
  storeDomain: 'my-store',
  adminAccessToken: token,
  apiVersion: '2024-01', // Default if not specified
})
```

### 3. GraphQL errors are thrown

```typescript
try {
  const result = await storefront.query(query)
} catch (error) {
  // Handle both network and GraphQL errors
}
```

---

## Integration Points

### Used by:
- `@cgk-platform/commerce` - Shopify provider implementation
- `apps/storefront` - Direct Shopify access
- Webhook handlers

### Uses:
- `@cgk-platform/core` - Types
