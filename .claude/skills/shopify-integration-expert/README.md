# Shopify Integration Expert - CGK Platform

## Design Principles
1. **Dual API Strategy** - Admin API for backend, Storefront API for customer-facing
2. **OAuth Token Security** - Encrypted storage with SHOPIFY_TOKEN_ENCRYPTION_KEY
3. **Webhook HMAC Verification** - Always verify before processing
4. **GraphQL Cursor Pagination** - Handle large datasets efficiently

## Architecture Overview

### Shopify Integration Model
CGK integrates with Shopify in two ways:
1. **Admin API** - Backend operations (orders, inventory, products management, webhooks)
2. **Storefront API** - Customer-facing operations (product display, cart, checkout)

```
TENANT → Shopify Store
├── OAuth App Installation (one-time)
├── Access Token (encrypted in DB)
├── Webhook Registration (automatic)
└── API Requests (Admin or Storefront)
```

### OAuth Token Storage
```sql
-- In tenant_{slug} schema
CREATE TABLE IF NOT EXISTS shopify_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  shop_domain TEXT NOT NULL,                    -- e.g., "rawdog.myshopify.com"
  access_token_encrypted TEXT NOT NULL,         -- Encrypted with SHOPIFY_TOKEN_ENCRYPTION_KEY
  scope TEXT NOT NULL,                          -- OAuth scopes granted
  storefront_access_token TEXT,                 -- Public token for Storefront API
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, shop_domain)
);
```

## API Selection Decision Tree

```
What operation are you doing?

Backend operations:
├─ Order management (fetch, update, fulfill)? → Admin API
├─ Product management (create, update, delete)? → Admin API
├─ Inventory management? → Admin API
├─ Customer data management? → Admin API
├─ Bulk operations? → Admin API (GraphQL bulk queries)
├─ Webhook events? → Admin API
└─ Analytics/reporting? → Admin API

Customer-facing operations:
├─ Product display on storefront? → Storefront API
├─ Cart operations? → Storefront API
├─ Checkout? → Storefront API (or Shopify hosted)
└─ Customer login/account? → Storefront API
```

## Admin API Patterns

### Get Shopify Admin Client
```typescript
import { getShopifyAdminClient } from '@cgk-platform/shopify'

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  const shopify = await getShopifyAdminClient(tenantId)
  if (!shopify) {
    return Response.json(
      { error: 'Shopify not connected. Please install the Shopify app.' },
      { status: 400 }
    )
  }

  // Fetch orders using Admin API
  const orders = await shopify.rest.Order.all({
    session: shopify.session,
    status: 'any',
    limit: 50
  })

  return Response.json({ orders: orders.data })
}
```

### GraphQL Cursor Pagination
**CRITICAL**: Shopify GraphQL uses cursor-based pagination. Always handle `pageInfo.hasNextPage`.

```typescript
import { getShopifyAdminClient } from '@cgk-platform/shopify'

async function fetchAllProducts(tenantId: string) {
  const shopify = await getShopifyAdminClient(tenantId)
  if (!shopify) throw new Error('Shopify not connected')

  let hasNextPage = true
  let cursor: string | null = null
  const allProducts = []

  while (hasNextPage) {
    const query = `
      query GetProducts($cursor: String) {
        products(first: 250, after: $cursor) {
          edges {
            node {
              id
              title
              description
              handle
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 5) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `

    const response = await shopify.graphql(query, { cursor })
    const data = await response.json()

    const products = data.data.products.edges.map((edge: any) => edge.node)
    allProducts.push(...products)

    hasNextPage = data.data.products.pageInfo.hasNextPage
    cursor = data.data.products.pageInfo.endCursor
  }

  return allProducts
}
```

### Bulk Operations
For large datasets (thousands of products), use Shopify's Bulk Operations API:

```typescript
async function bulkFetchProducts(tenantId: string) {
  const shopify = await getShopifyAdminClient(tenantId)
  if (!shopify) throw new Error('Shopify not connected')

  // Start bulk operation
  const bulkQuery = `
    mutation {
      bulkOperationRunQuery(
        query: """
        {
          products {
            edges {
              node {
                id
                title
                description
                variants {
                  edges {
                    node {
                      id
                      price
                      sku
                    }
                  }
                }
              }
            }
          }
        }
        """
      ) {
        bulkOperation {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const response = await shopify.graphql(bulkQuery)
  const data = await response.json()

  const operationId = data.data.bulkOperationRunQuery.bulkOperation.id

  // Poll for completion
  let status = 'RUNNING'
  while (status === 'RUNNING') {
    await new Promise(resolve => setTimeout(resolve, 2000))  // Wait 2 seconds

    const statusQuery = `
      query {
        node(id: "${operationId}") {
          ... on BulkOperation {
            id
            status
            url
          }
        }
      }
    `

    const statusResponse = await shopify.graphql(statusQuery)
    const statusData = await statusResponse.json()

    status = statusData.data.node.status

    if (status === 'COMPLETED') {
      const dataUrl = statusData.data.node.url

      // Download JSONL file
      const fileResponse = await fetch(dataUrl)
      const jsonl = await fileResponse.text()

      // Parse JSONL
      const products = jsonl
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))

      return products
    }

    if (status === 'FAILED') {
      throw new Error('Bulk operation failed')
    }
  }
}
```

## Storefront API Patterns

### Get Storefront Client
```typescript
import { getShopifyStorefrontClient } from '@cgk-platform/shopify'

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  const storefront = await getShopifyStorefrontClient(tenantId)
  if (!storefront) {
    return Response.json(
      { error: 'Shopify storefront not configured' },
      { status: 400 }
    )
  }

  // Fetch products for display
  const query = `
    query GetProducts {
      products(first: 20) {
        edges {
          node {
            id
            title
            description
            handle
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  `

  const response = await storefront.request(query)
  const data = await response.json()

  return Response.json({ products: data.data.products.edges })
}
```

### Cart Operations (Storefront API)
```typescript
async function createCart(tenantId: string, items: Array<{ variantId: string; quantity: number }>) {
  const storefront = await getShopifyStorefrontClient(tenantId)
  if (!storefront) throw new Error('Storefront not configured')

  const mutation = `
    mutation CreateCart($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    priceV2 {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
          estimatedCost {
            totalAmount {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const variables = {
    input: {
      lines: items.map(item => ({
        merchandiseId: item.variantId,
        quantity: item.quantity
      }))
    }
  }

  const response = await storefront.request(mutation, { variables })
  const data = await response.json()

  return data.data.cartCreate.cart
}
```

## Webhook Patterns

### HMAC Verification
**CRITICAL**: Always verify HMAC signature before processing webhooks.

```typescript
import crypto from 'crypto'

export async function POST(req: Request) {
  const hmac = req.headers.get('x-shopify-hmac-sha256')
  const shopDomain = req.headers.get('x-shopify-shop-domain')

  if (!hmac || !shopDomain) {
    return Response.json({ error: 'Missing headers' }, { status: 400 })
  }

  const body = await req.text()

  // Get Shopify app secret from env
  const secret = process.env.SHOPIFY_API_SECRET
  if (!secret) {
    throw new Error('SHOPIFY_API_SECRET not configured')
  }

  // Calculate HMAC
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64')

  // Compare with header (constant-time comparison)
  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac))) {
    console.error('HMAC verification failed')
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Parse verified body
  const data = JSON.parse(body)

  // Determine tenant from shop domain
  const tenantId = await getTenantByShopDomain(shopDomain)
  if (!tenantId) {
    return Response.json({ error: 'Unknown shop' }, { status: 404 })
  }

  // Process webhook via background job
  await tasks.trigger(`shopify/webhook/${data.topic}`, {
    tenantId,
    data
  })

  return Response.json({ received: true })
}

async function getTenantByShopDomain(shopDomain: string): Promise<string | null> {
  const result = await sql`
    SELECT o.slug
    FROM public.organizations o
    WHERE EXISTS (
      SELECT 1 FROM tenant_rawdog.shopify_config sc
      WHERE sc.organization_id = o.id
        AND sc.shop_domain = ${shopDomain}
    )
    LIMIT 1
  `
  return result.rows[0]?.slug || null
}
```

### Webhook Registration
```typescript
import { getShopifyAdminClient } from '@cgk-platform/shopify'

async function registerWebhooks(tenantId: string) {
  const shopify = await getShopifyAdminClient(tenantId)
  if (!shopify) throw new Error('Shopify not connected')

  const webhookTopics = [
    'orders/create',
    'orders/updated',
    'orders/cancelled',
    'products/create',
    'products/update',
    'products/delete',
    'customers/create',
    'customers/update'
  ]

  const webhookUrl = `https://cgk.com/api/webhooks/shopify`

  for (const topic of webhookTopics) {
    const mutation = `
      mutation {
        webhookSubscriptionCreate(
          topic: ${topic.toUpperCase().replace('/', '_')}
          webhookSubscription: {
            callbackUrl: "${webhookUrl}"
            format: JSON
          }
        ) {
          webhookSubscription {
            id
            topic
            endpoint {
              __typename
              ... on WebhookHttpEndpoint {
                callbackUrl
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    await shopify.graphql(mutation)
  }
}
```

## Product Sync Patterns

### Sync Products to Local DB
```typescript
import { getShopifyAdminClient } from '@cgk-platform/shopify'

async function syncProductsToDatabase(tenantId: string) {
  const shopify = await getShopifyAdminClient(tenantId)
  if (!shopify) throw new Error('Shopify not connected')

  // Fetch products from Shopify
  const products = await fetchAllProducts(tenantId)

  // Upsert to local database
  await withTenant(tenantId, async () => {
    for (const product of products) {
      const image = product.images.edges[0]?.node

      await sql`
        INSERT INTO products (
          id,
          title,
          description,
          handle,
          price_cents,
          currency,
          image_url,
          image_alt,
          shopify_data,
          created_at,
          updated_at
        ) VALUES (
          ${product.id},
          ${product.title},
          ${product.description || ''},
          ${product.handle},
          ${Math.round(parseFloat(product.priceRangeV2.minVariantPrice.amount) * 100)},
          ${product.priceRangeV2.minVariantPrice.currencyCode},
          ${image?.url || null},
          ${image?.altText || null},
          ${JSON.stringify(product)},
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          handle = EXCLUDED.handle,
          price_cents = EXCLUDED.price_cents,
          currency = EXCLUDED.currency,
          image_url = EXCLUDED.image_url,
          image_alt = EXCLUDED.image_alt,
          shopify_data = EXCLUDED.shopify_data,
          updated_at = NOW()
      `
    }
  })
}
```

### Webhook-Triggered Sync
```typescript
export const syncProductFromWebhook = task({
  id: 'shopify/webhook/products-update',
  run: async (payload: { tenantId: string; data: any }) => {
    const { tenantId, data } = payload

    const product = data

    await withTenant(tenantId, async () => {
      await sql`
        INSERT INTO products (
          id,
          title,
          description,
          handle,
          price_cents,
          currency,
          image_url,
          shopify_data,
          created_at,
          updated_at
        ) VALUES (
          ${`gid://shopify/Product/${product.id}`},
          ${product.title},
          ${product.body_html || ''},
          ${product.handle},
          ${Math.round(parseFloat(product.variants[0]?.price || '0') * 100)},
          'USD',
          ${product.image?.src || null},
          ${JSON.stringify(product)},
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          handle = EXCLUDED.handle,
          price_cents = EXCLUDED.price_cents,
          image_url = EXCLUDED.image_url,
          shopify_data = EXCLUDED.shopify_data,
          updated_at = NOW()
      `
    })
  }
})
```

## OAuth Flow

### Installation URL
```typescript
function getShopifyInstallUrl(shop: string, redirectUri: string): string {
  const scopes = [
    'read_products',
    'write_products',
    'read_orders',
    'write_orders',
    'read_customers',
    'write_customers',
    'read_inventory',
    'write_inventory'
  ].join(',')

  const apiKey = process.env.SHOPIFY_API_KEY
  const nonce = randomUUID()

  return `https://${shop}/admin/oauth/authorize?` +
    `client_id=${apiKey}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${nonce}`
}
```

### OAuth Callback Handler
```typescript
export async function GET(req: Request) {
  const url = new URL(req.url)
  const shop = url.searchParams.get('shop')
  const code = url.searchParams.get('code')
  const hmac = url.searchParams.get('hmac')

  if (!shop || !code || !hmac) {
    return Response.json({ error: 'Missing parameters' }, { status: 400 })
  }

  // Verify HMAC
  const params = Object.fromEntries(url.searchParams.entries())
  delete params.hmac
  delete params.signature

  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')

  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
    .update(sortedParams)
    .digest('hex')

  if (hash !== hmac) {
    return Response.json({ error: 'Invalid HMAC' }, { status: 401 })
  }

  // Exchange code for access token
  const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code
    })
  })

  const { access_token, scope } = await tokenResponse.json()

  // Encrypt and store token
  const encryptedToken = encrypt(access_token)

  // Determine tenant (from state or session)
  const tenantId = await getTenantFromSession(req)

  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO shopify_config (
        id,
        organization_id,
        shop_domain,
        access_token_encrypted,
        scope,
        installed_at
      ) VALUES (
        ${randomUUID()},
        (SELECT id FROM public.organizations WHERE slug = ${tenantId}),
        ${shop},
        ${encryptedToken},
        ${scope},
        NOW()
      )
      ON CONFLICT (organization_id, shop_domain) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        scope = EXCLUDED.scope,
        updated_at = NOW()
    `
  })

  // Register webhooks
  await registerWebhooks(tenantId)

  // Redirect to success page
  return Response.redirect(`https://${tenantId}.cgk.com/settings/integrations?shopify=success`)
}
```

## Common Gotchas
1. **Not verifying HMAC on webhooks** → Security vulnerability
2. **Using Admin API for storefront** → Wrong API, public token exposed
3. **Not handling cursor pagination** → Missing data
4. **Storing tokens in plain text** → Security vulnerability
5. **Missing scope in OAuth** → API calls fail
6. **Not registering webhooks** → No real-time updates
7. **Float arithmetic for prices** → Use cents (INTEGER)
8. **Hardcoded shop domain** → Multi-tenant confusion
9. **No retry logic for rate limits** → Failed API calls
10. **Missing metadata.tenantId in API calls** → Can't debug issues

## Rate Limiting

Shopify enforces rate limits:
- **REST API**: 2 requests/second (burst: 40)
- **GraphQL API**: 1000 cost points per second (calculated per query)

```typescript
// Use exponential backoff for rate limit errors
async function shopifyRequestWithRetry(fn: () => Promise<any>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      if (err.response?.status === 429) {
        const retryAfter = parseInt(err.response.headers.get('Retry-After') || '2')
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
      } else {
        throw err
      }
    }
  }
  throw new Error('Max retries exceeded')
}
```

## References
- Shopify Admin client: `/packages/shopify/src/admin-client.ts`
- Shopify Storefront client: `/packages/shopify/src/storefront-client.ts`
- OAuth handler: `/apps/admin/src/app/api/auth/shopify/callback/route.ts`
- Webhook handler: `/apps/admin/src/app/api/webhooks/shopify/route.ts`
- Product sync job: `/packages/jobs/src/tasks/shopify/sync-products.ts`
- Shopify docs: https://shopify.dev/docs/api

---

*This skill prevents webhook security issues, API selection errors, and data sync problems.*
