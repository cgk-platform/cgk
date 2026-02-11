# PHASE-2SH: Shopify App - Webhooks

> **Status**: COMPLETE
> **Completed**: 2026-02-10
> **Execution**: Week 11-12 (Parallel with PHASE-2SH-SHOPIFY-EXTENSIONS)
> **Dependencies**: PHASE-2SH-SHOPIFY-APP-CORE, PHASE-5A-JOBS-SETUP
> **Blocking**: PHASE-5B-JOBS-COMMERCE (Order sync jobs)

---

## Overview

This phase implements the Shopify webhook infrastructure that receives real-time events from Shopify stores. Webhooks enable the platform to react to orders, customers, fulfillments, and other store events.

**Key Challenge**: Multi-tenant webhook routing. Each tenant's Shopify store sends webhooks to the same endpoints, which must route to the correct tenant context.

---

## Success Criteria

- [x] All critical webhooks registered on app installation
- [x] HMAC signature verification using tenant-specific secrets
- [x] Shop domain → tenant routing works correctly
- [x] Webhook events trigger appropriate background jobs
- [x] Failed webhooks logged with retry tracking
- [x] Webhook health dashboard in admin UI
- [x] Webhook registration sync with Shopify

---

## Webhook Topics

### Critical Webhooks (Auto-registered on Installation)

| Topic | Purpose | Background Job |
|-------|---------|---------------|
| `orders/create` | New order processing | `order-sync`, `attribution`, `commission` |
| `orders/updated` | Order status changes | `order-sync` |
| `orders/paid` | Payment confirmation | `gift-card-rewards`, `pixel-events` |
| `orders/cancelled` | Order cancellation | `commission-reversal`, `ab-test-exclusion` |
| `orders/fulfilled` | Fulfillment complete | `review-email-queue` |
| `refunds/create` | Refund processing | `commission-adjustment`, `pixel-events` |
| `fulfillments/create` | Shipment created | `review-email-queue`, `project-linking` |
| `fulfillments/update` | Tracking updates | `review-email-queue`, `project-linking` |
| `customers/create` | New customer | `customer-sync` |
| `customers/update` | Customer changes | `customer-sync` |
| `app/uninstalled` | App uninstallation | `connection-cleanup` |

### Optional Webhooks (Tenant-configurable)

| Topic | Purpose | Feature Flag |
|-------|---------|--------------|
| `products/create` | Product sync | `commerce.product_sync` |
| `products/update` | Product changes | `commerce.product_sync` |
| `inventory_levels/update` | Stock changes | `commerce.inventory_sync` |
| `checkouts/create` | Abandoned cart | `commerce.abandoned_cart` |
| `checkouts/update` | Cart recovery | `commerce.abandoned_cart` |
| `draft_orders/create` | B2B orders | `commerce.draft_orders` |
| `subscription_contracts/create` | Subscription created | `subscriptions.enabled` |
| `subscription_contracts/update` | Subscription changed | `subscriptions.enabled` |

---

## Database Schema

### webhook_events Table

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  shop TEXT NOT NULL,
  topic TEXT NOT NULL,
  shopify_webhook_id TEXT,
  payload JSONB NOT NULL,
  hmac_verified BOOLEAN NOT NULL DEFAULT FALSE,

  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Deduplication
  idempotency_key TEXT UNIQUE,  -- topic:resource_id

  -- Audit
  received_at TIMESTAMPTZ DEFAULT NOW(),
  headers JSONB,

  UNIQUE(tenant_id, idempotency_key)
);

CREATE INDEX idx_webhook_events_tenant ON webhook_events(tenant_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_topic ON webhook_events(topic);
CREATE INDEX idx_webhook_events_received ON webhook_events(received_at);
```

### webhook_registrations Table

```sql
CREATE TABLE webhook_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  shop TEXT NOT NULL,
  topic TEXT NOT NULL,
  shopify_webhook_id TEXT,
  address TEXT NOT NULL,
  format TEXT DEFAULT 'json',

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'failed', 'deleted')),
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, shop, topic)
);

CREATE INDEX idx_webhook_registrations_tenant ON webhook_registrations(tenant_id);
```

---

## Webhook Handler Implementation

### Main Webhook Router

```typescript
// packages/shopify/src/webhooks/handler.ts
import { verifyShopifyWebhook, getTenantForShop } from './utils'
import { routeToHandler } from './router'

export async function handleShopifyWebhook(request: Request): Promise<Response> {
  const startTime = Date.now()

  // Extract headers
  const shop = request.headers.get('x-shopify-shop-domain')
  const topic = request.headers.get('x-shopify-topic')
  const hmac = request.headers.get('x-shopify-hmac-sha256')
  const webhookId = request.headers.get('x-shopify-webhook-id')
  const apiVersion = request.headers.get('x-shopify-api-version')

  if (!shop || !topic || !hmac) {
    return new Response('Missing required headers', { status: 400 })
  }

  // Get tenant for this shop
  const tenantId = await getTenantForShop(shop)
  if (!tenantId) {
    console.warn(`[Webhook] Unknown shop: ${shop}, topic: ${topic}`)
    // Return 200 to prevent Shopify from retrying
    return new Response('Shop not registered', { status: 200 })
  }

  // Read body for verification and processing
  const body = await request.text()

  // Verify HMAC signature
  const credentials = await getShopifyCredentials(tenantId)
  if (!credentials.webhookSecret) {
    console.error(`[Webhook] No webhook secret for tenant ${tenantId}`)
    return new Response('Configuration error', { status: 500 })
  }

  const isValid = verifyShopifyWebhook(body, hmac, credentials.webhookSecret)
  if (!isValid) {
    console.error(`[Webhook] Invalid signature for ${shop}, topic: ${topic}`)
    // Return 401 - Shopify will retry
    return new Response('Invalid signature', { status: 401 })
  }

  // Parse payload
  let payload: any
  try {
    payload = JSON.parse(body)
  } catch (e) {
    console.error(`[Webhook] Invalid JSON for ${shop}, topic: ${topic}`)
    return new Response('Invalid JSON', { status: 400 })
  }

  // Generate idempotency key
  const resourceId = payload.id || payload.order_id || webhookId
  const idempotencyKey = `${topic}:${resourceId}`

  // Check for duplicate
  const existing = await checkDuplicateWebhook(tenantId, idempotencyKey)
  if (existing) {
    console.log(`[Webhook] Duplicate ignored: ${idempotencyKey}`)
    return new Response('Already processed', { status: 200 })
  }

  // Log webhook event
  const eventId = await logWebhookEvent({
    tenantId,
    shop,
    topic,
    shopifyWebhookId: webhookId,
    payload,
    hmacVerified: true,
    idempotencyKey,
    headers: Object.fromEntries(request.headers),
  })

  // Route to topic-specific handler
  try {
    await routeToHandler(tenantId, topic, payload, eventId)

    // Mark as completed
    await updateWebhookStatus(eventId, 'completed')

    const duration = Date.now() - startTime
    console.log(`[Webhook] ${topic} processed in ${duration}ms for ${shop}`)

    return new Response('OK', { status: 200 })
  } catch (error) {
    // Log error and mark as failed
    await updateWebhookStatus(eventId, 'failed', error.message)
    console.error(`[Webhook] ${topic} failed for ${shop}:`, error)

    // Return 200 anyway to prevent infinite retries
    // We'll handle retries ourselves
    return new Response('Processing error', { status: 200 })
  }
}
```

### Topic Router

```typescript
// packages/shopify/src/webhooks/router.ts
import { handleOrderCreate, handleOrderUpdate, handleOrderPaid } from './handlers/orders'
import { handleFulfillmentUpdate } from './handlers/fulfillments'
import { handleRefundCreate } from './handlers/refunds'
import { handleCustomerSync } from './handlers/customers'
import { handleAppUninstalled } from './handlers/app'

type WebhookHandler = (
  tenantId: string,
  payload: any,
  eventId: string
) => Promise<void>

const HANDLERS: Record<string, WebhookHandler> = {
  'orders/create': handleOrderCreate,
  'orders/updated': handleOrderUpdate,
  'orders/paid': handleOrderPaid,
  'orders/cancelled': handleOrderUpdate,
  'orders/fulfilled': handleOrderUpdate,
  'refunds/create': handleRefundCreate,
  'fulfillments/create': handleFulfillmentUpdate,
  'fulfillments/update': handleFulfillmentUpdate,
  'customers/create': handleCustomerSync,
  'customers/update': handleCustomerSync,
  'app/uninstalled': handleAppUninstalled,
}

export async function routeToHandler(
  tenantId: string,
  topic: string,
  payload: any,
  eventId: string
): Promise<void> {
  const handler = HANDLERS[topic]

  if (!handler) {
    console.log(`[Webhook] No handler for topic: ${topic}`)
    return
  }

  await handler(tenantId, payload, eventId)
}
```

### Order Webhook Handler

```typescript
// packages/shopify/src/webhooks/handlers/orders.ts
import { withTenant, sql } from '@cgk/db'
import { triggerJob } from '@cgk/jobs'

export async function handleOrderCreate(
  tenantId: string,
  payload: OrderPayload,
  eventId: string
): Promise<void> {
  const shopifyId = payload.id.toString()
  const orderName = payload.name

  // Upsert order to local database
  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO orders (
        shopify_id,
        shopify_order_number,
        created_at,
        customer_email,
        customer_id,
        gross_sales_cents,
        discounts_cents,
        net_sales_cents,
        taxes_cents,
        shipping_cents,
        total_price_cents,
        financial_status,
        fulfillment_status,
        discount_codes,
        tags,
        currency,
        synced_at
      ) VALUES (
        ${shopifyId},
        ${orderName},
        ${new Date(payload.created_at)},
        ${payload.email || payload.customer?.email},
        ${payload.customer?.id?.toString()},
        ${parseCents(payload.subtotal_price)},
        ${parseCents(payload.total_discounts)},
        ${parseCents(payload.subtotal_price) - parseCents(payload.total_discounts)},
        ${parseCents(payload.total_tax)},
        ${parseCents(payload.total_shipping_price_set?.shop_money?.amount)},
        ${parseCents(payload.total_price)},
        ${mapFinancialStatus(payload.financial_status)},
        ${mapFulfillmentStatus(payload.fulfillment_status)},
        ${payload.discount_codes?.map(d => d.code) || []},
        ${payload.tags?.split(',').map(t => t.trim()) || []},
        ${payload.currency || 'USD'},
        NOW()
      )
      ON CONFLICT (shopify_id) DO UPDATE SET
        financial_status = EXCLUDED.financial_status,
        fulfillment_status = EXCLUDED.fulfillment_status,
        synced_at = NOW()
    `
  })

  // Trigger background jobs
  await Promise.all([
    // Attribution processing
    triggerJob('order/attribution', {
      tenantId,
      orderId: shopifyId,
      orderName,
      noteAttributes: payload.note_attributes,
      discountCodes: payload.discount_codes,
      customerEmail: payload.email || payload.customer?.email,
    }),

    // Creator commission check
    triggerJob('order/commission', {
      tenantId,
      orderId: shopifyId,
      discountCodes: payload.discount_codes?.map(d => d.code) || [],
      netSalesCents: parseCents(payload.subtotal_price) - parseCents(payload.total_discounts),
    }),

    // A/B test attribution
    triggerJob('order/ab-attribution', {
      tenantId,
      orderId: shopifyId,
      orderName,
      noteAttributes: payload.note_attributes,
      shippingLines: payload.shipping_lines,
      totalCents: parseCents(payload.total_price),
    }),
  ])

  console.log(`[Webhook] Order ${orderName} created for tenant ${tenantId}`)
}

export async function handleOrderPaid(
  tenantId: string,
  payload: OrderPayload,
  eventId: string
): Promise<void> {
  // First do standard order update
  await handleOrderUpdate(tenantId, payload, eventId)

  // Then process paid-specific actions
  await Promise.all([
    // Gift card rewards
    triggerJob('order/gift-card-rewards', {
      tenantId,
      orderId: payload.id.toString(),
      lineItems: payload.line_items,
      customerEmail: payload.email || payload.customer?.email,
      customerId: payload.customer?.id?.toString(),
    }),

    // Send pixel events
    triggerJob('order/pixel-events', {
      tenantId,
      orderId: payload.id.toString(),
      orderName: payload.name,
      totalPrice: payload.total_price,
      subtotalPrice: payload.subtotal_price,
      totalTax: payload.total_tax,
      shippingPrice: payload.total_shipping_price_set?.shop_money?.amount,
      lineItems: payload.line_items,
      customerEmail: payload.email || payload.customer?.email,
      customerPhone: payload.customer?.phone,
      noteAttributes: payload.note_attributes,
      shippingAddress: payload.shipping_address,
    }),
  ])
}

export async function handleOrderUpdate(
  tenantId: string,
  payload: OrderPayload,
  eventId: string
): Promise<void> {
  const shopifyId = payload.id.toString()

  await withTenant(tenantId, async () => {
    await sql`
      UPDATE orders
      SET
        financial_status = ${mapFinancialStatus(payload.financial_status)},
        fulfillment_status = ${mapFulfillmentStatus(payload.fulfillment_status)},
        synced_at = NOW()
      WHERE shopify_id = ${shopifyId}
    `
  })

  // If cancelled, exclude from A/B tests
  if (payload.cancelled_at) {
    await triggerJob('order/ab-test-exclusion', {
      tenantId,
      orderId: shopifyId,
      orderName: payload.name,
      reason: 'cancelled',
    })
  }
}
```

---

## Webhook Registration

### Register Webhooks on Installation

```typescript
// packages/shopify/src/webhooks/register.ts
import { createAdminClient } from '../client'

const REQUIRED_TOPICS = [
  'orders/create',
  'orders/updated',
  'orders/paid',
  'orders/cancelled',
  'orders/fulfilled',
  'refunds/create',
  'fulfillments/create',
  'fulfillments/update',
  'customers/create',
  'customers/update',
  'app/uninstalled',
]

export async function registerWebhooks(tenantId: string, shop: string): Promise<void> {
  const credentials = await getShopifyCredentials(tenantId)
  const client = createAdminClient(shop, credentials.accessToken)

  const webhookAddress = `${process.env.PLATFORM_API_URL}/api/webhooks/shopify`

  for (const topic of REQUIRED_TOPICS) {
    try {
      const result = await client.post('/webhooks.json', {
        webhook: {
          topic,
          address: webhookAddress,
          format: 'json',
        },
      })

      await withTenant(tenantId, async () => {
        await sql`
          INSERT INTO webhook_registrations (tenant_id, shop, topic, shopify_webhook_id, address)
          VALUES (${tenantId}, ${shop}, ${topic}, ${result.webhook.id}, ${webhookAddress})
          ON CONFLICT (tenant_id, shop, topic) DO UPDATE SET
            shopify_webhook_id = EXCLUDED.shopify_webhook_id,
            status = 'active',
            updated_at = NOW()
        `
      })

      console.log(`[Webhook] Registered ${topic} for ${shop}`)
    } catch (error) {
      console.error(`[Webhook] Failed to register ${topic} for ${shop}:`, error)
      throw error
    }
  }
}
```

### Sync Webhooks (Health Check)

```typescript
// packages/shopify/src/webhooks/sync.ts
export async function syncWebhookRegistrations(tenantId: string): Promise<SyncResult> {
  const credentials = await getShopifyCredentials(tenantId)
  const client = createAdminClient(credentials.shop, credentials.accessToken)

  // Get current registrations from Shopify
  const response = await client.get('/webhooks.json')
  const shopifyWebhooks = response.webhooks

  // Get our tracked registrations
  const ourRegistrations = await withTenant(tenantId, async () => {
    return sql`
      SELECT * FROM webhook_registrations
      WHERE tenant_id = ${tenantId}
      AND shop = ${credentials.shop}
    `
  })

  const results = {
    added: [] as string[],
    removed: [] as string[],
    unchanged: [] as string[],
  }

  // Check for missing webhooks
  for (const topic of REQUIRED_TOPICS) {
    const exists = shopifyWebhooks.some((w: any) => w.topic === topic)
    if (!exists) {
      await registerSingleWebhook(tenantId, credentials.shop, topic)
      results.added.push(topic)
    } else {
      results.unchanged.push(topic)
    }
  }

  // Clean up orphaned registrations
  for (const reg of ourRegistrations.rows) {
    const existsInShopify = shopifyWebhooks.some(
      (w: any) => w.id.toString() === reg.shopify_webhook_id
    )
    if (!existsInShopify) {
      await withTenant(tenantId, async () => {
        await sql`
          UPDATE webhook_registrations
          SET status = 'deleted', updated_at = NOW()
          WHERE id = ${reg.id}
        `
      })
      results.removed.push(reg.topic)
    }
  }

  return results
}
```

---

## HMAC Verification

```typescript
// packages/shopify/src/webhooks/utils.ts
import crypto from 'crypto'

export function verifyShopifyWebhook(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(signature)
    )
  } catch {
    return false
  }
}
```

---

## Admin UI: Webhook Health Dashboard

### Dashboard Page

```typescript
// apps/admin/src/app/admin/integrations/shopify-app/webhooks/page.tsx
export default function WebhookHealthPage() {
  const { data: health } = useWebhookHealth()
  const { data: recentEvents } = useRecentWebhookEvents()
  const syncMutation = useSyncWebhooks()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhook Health"
        description="Monitor Shopify webhook delivery and processing"
        action={
          <Button onClick={() => syncMutation.mutate()} loading={syncMutation.isPending}>
            Sync Registrations
          </Button>
        }
      />

      {/* Registration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Success</TableHead>
                <TableHead>Failures</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {health?.registrations.map((reg) => (
                <TableRow key={reg.topic}>
                  <TableCell className="font-mono text-sm">{reg.topic}</TableCell>
                  <TableCell>
                    <StatusBadge status={reg.status} />
                  </TableCell>
                  <TableCell>{formatRelative(reg.lastSuccessAt)}</TableCell>
                  <TableCell>{reg.failureCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resource</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEvents?.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{formatRelative(event.receivedAt)}</TableCell>
                  <TableCell className="font-mono text-sm">{event.topic}</TableCell>
                  <TableCell>
                    <StatusBadge status={event.status} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {extractResourceId(event.payload)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## API Routes

```
GET /api/webhooks/shopify
  - Main webhook receiver (all topics)
  - Verifies HMAC, routes to handlers

GET /api/admin/integrations/shopify/webhooks/health
  - Returns registration status and recent failures

POST /api/admin/integrations/shopify/webhooks/sync
  - Syncs webhook registrations with Shopify
  - Re-registers missing webhooks

GET /api/admin/integrations/shopify/webhooks/events
  - Lists recent webhook events with filters
  - Supports pagination

POST /api/admin/integrations/shopify/webhooks/retry/:eventId
  - Manually retry a failed webhook
```

---

## Background Jobs for Webhooks

### Failed Webhook Retry Job

```typescript
// packages/jobs/src/webhooks/retry-failed.ts
export const retryFailedWebhooks = defineJob({
  id: 'webhooks/retry-failed',
  schedule: '*/5 * * * *', // Every 5 minutes

  run: async () => {
    const failedEvents = await sql`
      SELECT * FROM webhook_events
      WHERE status = 'failed'
      AND retry_count < 3
      AND received_at > NOW() - INTERVAL '24 hours'
      ORDER BY received_at ASC
      LIMIT 50
    `

    for (const event of failedEvents.rows) {
      try {
        await routeToHandler(event.tenant_id, event.topic, event.payload, event.id)
        await sql`
          UPDATE webhook_events
          SET status = 'completed', processed_at = NOW()
          WHERE id = ${event.id}
        `
      } catch (error) {
        await sql`
          UPDATE webhook_events
          SET retry_count = retry_count + 1, error_message = ${error.message}
          WHERE id = ${event.id}
        `
      }
    }
  },
})
```

### Webhook Health Check Job

```typescript
// packages/jobs/src/webhooks/health-check.ts
export const webhookHealthCheck = defineJob({
  id: 'webhooks/health-check',
  schedule: '0 * * * *', // Every hour

  run: async () => {
    const tenants = await sql`
      SELECT DISTINCT tenant_id, shop FROM shopify_connections
      WHERE status = 'active'
    `

    for (const { tenant_id, shop } of tenants.rows) {
      try {
        const result = await syncWebhookRegistrations(tenant_id)

        if (result.added.length > 0) {
          console.log(`[Health] Re-registered ${result.added.length} webhooks for ${shop}`)
        }
      } catch (error) {
        console.error(`[Health] Webhook sync failed for ${shop}:`, error)
      }
    }
  },
})
```

---

## Non-Negotiable Requirements

1. **HMAC Verification**: Every webhook MUST be verified before processing
2. **Tenant Isolation**: Webhooks route to correct tenant based on shop domain
3. **Idempotency**: Duplicate webhooks handled gracefully
4. **Error Isolation**: Failed handlers don't affect other webhooks
5. **Retry Logic**: Failed webhooks retried with exponential backoff
6. **Visibility**: All webhook events logged for debugging

---

## Reference Implementation

```
RAWDOG Reference Files:
- /src/app/api/webhooks/shopify/orders/route.ts  # Order webhook handlers
- /src/app/api/webhooks/shopify/customers/route.ts
- /src/app/api/webhooks/shopify/checkouts/route.ts
- /src/lib/shopify/credentials.ts                # Webhook secret retrieval
```

---

## Definition of Done

- [x] All required webhooks registered on app installation
- [x] HMAC verification passes for valid webhooks
- [x] Shop → tenant routing works correctly
- [x] Webhook events logged to database
- [x] Failed webhooks retry automatically
- [x] Admin UI shows webhook health status
- [x] Sync command re-registers missing webhooks
- [x] Background jobs process webhook events

---

## Implementation Summary

### Files Created

**Database Migration:**
- `/packages/db/src/migrations/tenant/015_shopify_webhooks.sql` - webhook_events, webhook_registrations, shopify_connections tables

**Webhook Infrastructure (`packages/shopify/src/webhooks/`):**
- `types.ts` - TypeScript types for webhooks, payloads, handlers
- `utils.ts` - HMAC verification, tenant routing, status mapping utilities
- `router.ts` - Topic-to-handler routing
- `handler.ts` - Main webhook request handler
- `register.ts` - Webhook registration with Shopify API
- `health.ts` - Health monitoring and event statistics
- `index.ts` - Module exports

**Webhook Handlers (`packages/shopify/src/webhooks/handlers/`):**
- `orders.ts` - orders/create, orders/updated, orders/paid, orders/cancelled
- `fulfillments.ts` - fulfillments/create, fulfillments/update
- `refunds.ts` - refunds/create
- `customers.ts` - customers/create, customers/update
- `app.ts` - app/uninstalled
- `index.ts` - Handler exports

**Background Jobs (`packages/jobs/src/webhooks/`):**
- `retry-failed.ts` - Retry failed webhooks every 5 minutes
- `health-check.ts` - Webhook health check every hour, cleanup job
- `index.ts` - Job exports

**API Routes (`apps/admin/src/app/api/`):**
- `webhooks/shopify/route.ts` - Main webhook receiver endpoint
- `admin/integrations/shopify/webhooks/health/route.ts` - Health status
- `admin/integrations/shopify/webhooks/sync/route.ts` - Sync registrations
- `admin/integrations/shopify/webhooks/events/route.ts` - List events
- `admin/integrations/shopify/webhooks/retry/[eventId]/route.ts` - Manual retry

**Admin UI:**
- `apps/admin/src/app/admin/integrations/shopify-app/webhooks/page.tsx` - Webhook health dashboard

**Tests:**
- `packages/shopify/src/webhooks/__tests__/utils.test.ts` - Utility function tests
- `packages/shopify/src/webhooks/__tests__/router.test.ts` - Router tests

### Key Features Implemented

1. **HMAC Verification**: Timing-safe signature verification using crypto.timingSafeEqual
2. **Tenant Isolation**: Shop domain -> tenant routing via organizations table
3. **Idempotency**: Duplicate detection using topic:resource_id keys
4. **Event Logging**: All webhooks logged with status, payload, headers
5. **Automatic Retry**: Failed webhooks retried up to 3 times with exponential backoff
6. **Health Monitoring**: Dashboard shows registration status, event statistics
7. **Sync Command**: Re-registers missing webhooks with Shopify API
8. **Background Jobs**: Scheduled retry and health check jobs
