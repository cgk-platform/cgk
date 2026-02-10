# PHASE-3CP-D: Customer Portal Subscription Provider Integration

**Duration**: 1 week
**Depends On**: PHASE-3CP-A (Portal Pages)
**Parallel With**: PHASE-3CP-B, PHASE-3CP-C
**Blocks**: None (Customer Portal phases are parallel)

---

## Goal

Implement the subscription provider abstraction layer that allows the customer portal to work with multiple subscription backends (Loop, Recharge, Bold, or custom). Each tenant configures which provider they use, and all subscription operations go through this abstraction.

---

## Success Criteria

- [ ] `SubscriptionProvider` interface defines all subscription operations
- [ ] Loop provider implements the interface
- [ ] Recharge provider implements the interface
- [ ] Bold provider implements the interface (optional)
- [ ] Custom/native provider implements the interface
- [ ] Provider selection is per-tenant configurable
- [ ] All portal subscription actions use the abstraction
- [ ] Webhook handlers update local subscription cache
- [ ] Provider credentials are encrypted per-tenant
- [ ] `npx tsc --noEmit` passes

---

## Reference Implementation

**RAWDOG Source Files:**
- `/src/lib/subscriptions/customer-api.ts` - Client-side API calls
- `/src/lib/subscriptions/loop-api.ts` - Loop-specific implementation
- `/src/app/account/subscriptions/[id]/page.tsx` - Subscription management UI

---

## Deliverables

### 1. Subscription Provider Interface

```typescript
// packages/subscriptions/src/types.ts

export interface Subscription {
  id: string
  externalId: string // Provider's ID
  customerId: string
  customerEmail: string
  status: 'active' | 'paused' | 'cancelled' | 'expired'
  frequency: string // e.g., "Every 4 weeks"
  frequencyDays: number
  nextOrderDate: Date | null
  pausedUntil?: Date
  cancelledAt?: Date
  cancellationReason?: string
  createdAt: Date
  updatedAt: Date

  // Line items
  items: SubscriptionItem[]

  // Pricing
  subtotalCents: number
  discountCents: number
  shippingCents: number
  taxCents: number
  totalCents: number
  currencyCode: string

  // Addresses
  shippingAddress: Address
  billingAddress?: Address

  // Payment
  paymentMethod?: PaymentMethod
}

export interface SubscriptionItem {
  id: string
  productId: string
  variantId: string
  title: string
  variantTitle?: string
  quantity: number
  priceCents: number
  imageUrl?: string
}

export interface SubscriptionProvider {
  // Read operations
  getSubscription(id: string): Promise<Subscription | null>
  listSubscriptions(filters?: SubscriptionFilters): Promise<PaginatedResult<Subscription>>
  getSubscriptionByExternalId(externalId: string): Promise<Subscription | null>

  // Lifecycle operations
  pauseSubscription(id: string, options?: PauseOptions): Promise<void>
  resumeSubscription(id: string): Promise<void>
  cancelSubscription(id: string, reason: string): Promise<void>
  reactivateSubscription(id: string): Promise<void>

  // Order operations
  skipNextOrder(id: string): Promise<void>
  rescheduleNextOrder(id: string, newDate: Date): Promise<void>
  triggerOrderNow(id: string): Promise<void>

  // Update operations
  updateShippingAddress(id: string, address: Address): Promise<void>
  updatePaymentMethod(id: string, paymentMethodId: string): Promise<void>
  updateFrequency(id: string, frequencyDays: number): Promise<void>
  addItem(id: string, item: AddItemInput): Promise<void>
  removeItem(id: string, itemId: string): Promise<void>
  updateItemQuantity(id: string, itemId: string, quantity: number): Promise<void>

  // Sync operations
  syncFromProvider(): Promise<SyncResult>
  handleWebhook(event: ProviderWebhookEvent): Promise<void>
}

export interface PauseOptions {
  resumeDate?: Date
  reason?: string
}

export interface SubscriptionFilters {
  status?: 'active' | 'paused' | 'cancelled' | 'all'
  customerId?: string
  customerEmail?: string
  limit?: number
  offset?: number
}
```

### 2. Provider Factory

```typescript
// packages/subscriptions/src/factory.ts

export type ProviderType = 'loop' | 'recharge' | 'bold' | 'native'

export async function getSubscriptionProvider(
  tenantId: string
): Promise<SubscriptionProvider> {
  const config = await getSubscriptionConfig(tenantId)

  switch (config.provider) {
    case 'loop':
      return new LoopProvider(tenantId, config)
    case 'recharge':
      return new RechargeProvider(tenantId, config)
    case 'bold':
      return new BoldProvider(tenantId, config)
    case 'native':
      return new NativeProvider(tenantId, config)
    default:
      throw new Error(`Unknown subscription provider: ${config.provider}`)
  }
}

// Configuration schema
interface SubscriptionConfig {
  tenantId: string
  provider: ProviderType
  apiKeyEncrypted?: string
  apiSecretEncrypted?: string
  webhookSecretEncrypted?: string
  storeId?: string
  syncEnabled: boolean
  lastSyncAt?: Date
}
```

### 3. Loop Provider Implementation

```typescript
// packages/subscriptions/src/providers/loop.ts

export class LoopProvider implements SubscriptionProvider {
  private tenantId: string
  private apiKey: string
  private storeId: string

  constructor(tenantId: string, config: SubscriptionConfig) {
    this.tenantId = tenantId
    this.apiKey = decrypt(config.apiKeyEncrypted!)
    this.storeId = config.storeId!
  }

  async getSubscription(id: string): Promise<Subscription | null> {
    // First check local cache
    const cached = await this.getFromCache(id)
    if (cached) return cached

    // Fetch from Loop API
    const response = await this.loopRequest(`/subscriptions/${id}`)
    if (!response.ok) return null

    const data = await response.json()
    const subscription = this.mapLoopSubscription(data)

    // Update cache
    await this.updateCache(subscription)

    return subscription
  }

  async pauseSubscription(id: string, options?: PauseOptions): Promise<void> {
    const subscription = await this.getSubscription(id)
    if (!subscription) throw new Error('Subscription not found')

    await this.loopRequest(`/subscriptions/${subscription.externalId}/pause`, {
      method: 'POST',
      body: JSON.stringify({
        resume_date: options?.resumeDate?.toISOString(),
        reason: options?.reason,
      }),
    })

    // Update local cache
    await withTenant(this.tenantId, () =>
      sql`UPDATE subscriptions SET status = 'paused', paused_until = ${options?.resumeDate}
          WHERE id = ${id} AND tenant_id = ${this.tenantId}`
    )
  }

  async cancelSubscription(id: string, reason: string): Promise<void> {
    const subscription = await this.getSubscription(id)
    if (!subscription) throw new Error('Subscription not found')

    await this.loopRequest(`/subscriptions/${subscription.externalId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cancellation_reason: reason }),
    })

    await withTenant(this.tenantId, () =>
      sql`UPDATE subscriptions
          SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = ${reason}
          WHERE id = ${id} AND tenant_id = ${this.tenantId}`
    )
  }

  async skipNextOrder(id: string): Promise<void> {
    const subscription = await this.getSubscription(id)
    if (!subscription) throw new Error('Subscription not found')

    await this.loopRequest(`/subscriptions/${subscription.externalId}/skip`, {
      method: 'POST',
    })

    // Calculate new next order date
    const newDate = addDays(subscription.nextOrderDate!, subscription.frequencyDays)
    await withTenant(this.tenantId, () =>
      sql`UPDATE subscriptions SET next_order_date = ${newDate}
          WHERE id = ${id} AND tenant_id = ${this.tenantId}`
    )
  }

  async rescheduleNextOrder(id: string, newDate: Date): Promise<void> {
    const subscription = await this.getSubscription(id)
    if (!subscription) throw new Error('Subscription not found')

    await this.loopRequest(`/subscriptions/${subscription.externalId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ next_order_date: newDate.toISOString() }),
    })

    await withTenant(this.tenantId, () =>
      sql`UPDATE subscriptions SET next_order_date = ${newDate}
          WHERE id = ${id} AND tenant_id = ${this.tenantId}`
    )
  }

  async handleWebhook(event: LoopWebhookEvent): Promise<void> {
    switch (event.type) {
      case 'subscription.created':
        await this.createLocalSubscription(event.data)
        break
      case 'subscription.updated':
        await this.updateLocalSubscription(event.data)
        break
      case 'subscription.cancelled':
        await this.markCancelled(event.data.id, event.data.cancellation_reason)
        break
      case 'subscription.paused':
        await this.markPaused(event.data.id, event.data.resume_date)
        break
      case 'subscription.resumed':
        await this.markActive(event.data.id)
        break
    }
  }

  private async loopRequest(path: string, options?: RequestInit): Promise<Response> {
    return fetch(`https://api.loopwork.co/v1${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Loop-Store-Id': this.storeId,
        ...options?.headers,
      },
    })
  }

  private mapLoopSubscription(data: LoopSubscriptionData): Subscription {
    return {
      id: data.internal_id || data.id,
      externalId: data.id,
      customerId: data.customer_id,
      customerEmail: data.customer_email,
      status: this.mapLoopStatus(data.status),
      frequency: data.frequency_label,
      frequencyDays: data.frequency_days,
      nextOrderDate: data.next_order_date ? new Date(data.next_order_date) : null,
      pausedUntil: data.paused_until ? new Date(data.paused_until) : undefined,
      items: data.line_items.map(this.mapLoopItem),
      subtotalCents: Math.round(data.subtotal * 100),
      discountCents: Math.round((data.discount || 0) * 100),
      shippingCents: Math.round((data.shipping || 0) * 100),
      taxCents: Math.round((data.tax || 0) * 100),
      totalCents: Math.round(data.total * 100),
      currencyCode: data.currency || 'USD',
      shippingAddress: this.mapAddress(data.shipping_address),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }
}
```

### 4. Recharge Provider Implementation

```typescript
// packages/subscriptions/src/providers/recharge.ts

export class RechargeProvider implements SubscriptionProvider {
  private tenantId: string
  private apiKey: string

  constructor(tenantId: string, config: SubscriptionConfig) {
    this.tenantId = tenantId
    this.apiKey = decrypt(config.apiKeyEncrypted!)
  }

  async pauseSubscription(id: string, options?: PauseOptions): Promise<void> {
    const subscription = await this.getSubscription(id)
    if (!subscription) throw new Error('Subscription not found')

    // Recharge uses different endpoint structure
    await this.rechargeRequest(`/subscriptions/${subscription.externalId}/pause`, {
      method: 'POST',
    })

    await this.updateLocalStatus(id, 'paused', options?.resumeDate)
  }

  async skipNextOrder(id: string): Promise<void> {
    const subscription = await this.getSubscription(id)
    if (!subscription) throw new Error('Subscription not found')

    // Recharge skips via charges endpoint
    const charges = await this.rechargeRequest(
      `/charges?subscription_id=${subscription.externalId}&status=QUEUED`
    )

    if (charges.charges[0]) {
      await this.rechargeRequest(`/charges/${charges.charges[0].id}/skip`, {
        method: 'POST',
      })
    }
  }

  private async rechargeRequest(path: string, options?: RequestInit): Promise<any> {
    const response = await fetch(`https://api.rechargeapps.com${path}`, {
      ...options,
      headers: {
        'X-Recharge-Access-Token': this.apiKey,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    return response.json()
  }
}
```

### 5. Native Provider Implementation

For tenants using Shopify's native subscriptions without a third-party app:

```typescript
// packages/subscriptions/src/providers/native.ts

export class NativeProvider implements SubscriptionProvider {
  private tenantId: string
  private shopifyClient: ShopifyClient

  constructor(tenantId: string, config: SubscriptionConfig) {
    this.tenantId = tenantId
    this.shopifyClient = getShopifyClient(tenantId)
  }

  async listSubscriptions(filters?: SubscriptionFilters): Promise<PaginatedResult<Subscription>> {
    // Use Shopify Selling Plan API
    const query = `
      query GetSubscriptionContracts($first: Int!, $query: String) {
        subscriptionContracts(first: $first, query: $query) {
          nodes {
            id
            status
            nextBillingDate
            customer { id email }
            lines(first: 10) {
              nodes {
                id
                title
                quantity
                currentPrice { amount currencyCode }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `

    const response = await this.shopifyClient.graphql(query, {
      first: filters?.limit || 25,
      query: filters?.status ? `status:${filters.status.toUpperCase()}` : undefined,
    })

    return {
      items: response.subscriptionContracts.nodes.map(this.mapShopifySubscription),
      hasMore: response.subscriptionContracts.pageInfo.hasNextPage,
      cursor: response.subscriptionContracts.pageInfo.endCursor,
    }
  }

  async pauseSubscription(id: string, options?: PauseOptions): Promise<void> {
    const mutation = `
      mutation PauseSubscription($id: ID!) {
        subscriptionContractPause(subscriptionContractId: $id) {
          contract { id status }
          userErrors { field message }
        }
      }
    `

    await this.shopifyClient.graphql(mutation, { id })
    await this.updateLocalStatus(id, 'paused', options?.resumeDate)
  }
}
```

### 6. Webhook Handlers

```typescript
// apps/portal/src/app/api/webhooks/subscriptions/[provider]/route.ts

export async function POST(
  req: Request,
  { params }: { params: { provider: string } }
) {
  const signature = req.headers.get('x-webhook-signature')
  const body = await req.text()

  // Verify webhook signature based on provider
  const verified = await verifyWebhookSignature(params.provider, body, signature)
  if (!verified) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)

  // Find tenant by provider webhook config
  const tenantId = await getTenantByWebhookId(params.provider, event.store_id || event.shop_id)
  if (!tenantId) {
    return Response.json({ error: 'Unknown tenant' }, { status: 404 })
  }

  // Get provider and handle webhook
  const provider = await getSubscriptionProvider(tenantId)
  await provider.handleWebhook(event)

  return Response.json({ received: true })
}
```

### 7. Local Subscription Cache Schema

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  external_id VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL, -- loop, recharge, bold, native

  -- Customer
  customer_id VARCHAR(255),
  customer_email VARCHAR(255),

  -- Status
  status VARCHAR(50) NOT NULL,
  paused_until TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,

  -- Schedule
  frequency_days INTEGER,
  frequency_label VARCHAR(100),
  next_order_date TIMESTAMP,

  -- Pricing (cents)
  subtotal_cents INTEGER,
  discount_cents INTEGER DEFAULT 0,
  shipping_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER,
  currency_code VARCHAR(3) DEFAULT 'USD',

  -- Addresses (JSON)
  shipping_address JSONB,
  billing_address JSONB,

  -- Items (JSON)
  items JSONB,

  -- Metadata
  raw_data JSONB, -- Full provider response for debugging
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,

  UNIQUE(tenant_id, external_id, provider)
);

CREATE INDEX idx_subscriptions_tenant_customer ON subscriptions(tenant_id, customer_email);
CREATE INDEX idx_subscriptions_tenant_status ON subscriptions(tenant_id, status);
```

---

## File Structure

```
packages/subscriptions/
├── src/
│   ├── types.ts                    # Subscription, SubscriptionProvider interfaces
│   ├── factory.ts                  # getSubscriptionProvider()
│   ├── config.ts                   # getSubscriptionConfig(), saveConfig()
│   ├── providers/
│   │   ├── loop.ts                 # LoopProvider
│   │   ├── recharge.ts             # RechargeProvider
│   │   ├── bold.ts                 # BoldProvider
│   │   └── native.ts               # NativeProvider (Shopify)
│   ├── cache/
│   │   ├── sync.ts                 # Sync subscriptions from provider
│   │   └── queries.ts              # Local cache queries
│   └── webhooks/
│       ├── verify.ts               # Webhook signature verification
│       └── handlers.ts             # Common webhook handling logic

apps/portal/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── webhooks/
│   │           └── subscriptions/
│   │               └── [provider]/
│   │                   └── route.ts
│   └── lib/
│       └── subscriptions/
│           └── client.ts           # Client-side API wrapper
```

---

## Admin Configuration

**Route:** `/admin/settings/subscriptions`

**Settings:**
- Provider selection (Loop, Recharge, Bold, Native)
- API Key (encrypted)
- API Secret (if required)
- Webhook Secret (for verification)
- Store ID (if required)
- Sync enabled toggle
- Sync frequency (hourly, daily)
- Last sync timestamp

---

## Anti-Patterns

```typescript
// ❌ NEVER - Call provider API directly from portal
const response = await fetch('https://api.loopwork.co/v1/subscriptions/...')

// ✅ ALWAYS - Use provider abstraction
const provider = await getSubscriptionProvider(tenantId)
const subscription = await provider.getSubscription(id)

// ❌ NEVER - Store credentials in plaintext
await sql`UPDATE ... SET api_key = ${apiKey}`

// ✅ ALWAYS - Encrypt credentials
await sql`UPDATE ... SET api_key_encrypted = ${encrypt(apiKey)}`

// ❌ NEVER - Skip local cache update
await provider.pauseSubscription(id)
// Subscription still shows as active locally!

// ✅ ALWAYS - Update local cache after provider call
await provider.pauseSubscription(id, options)
// Provider implementation updates local cache

// ❌ NEVER - Process webhooks without signature verification
const event = await req.json()
await processEvent(event)

// ✅ ALWAYS - Verify webhook signatures
const verified = await verifyWebhookSignature(provider, body, signature)
if (!verified) return Response.json({ error: 'Invalid' }, { status: 401 })
```

---

## Definition of Done

- [ ] `SubscriptionProvider` interface fully implemented
- [ ] Loop provider works for all operations
- [ ] Recharge provider works for all operations
- [ ] Native provider works for Shopify subscriptions
- [ ] Provider selection is tenant-configurable
- [ ] Webhook handlers update local cache
- [ ] Credentials are encrypted at rest
- [ ] Sync job keeps local cache updated
- [ ] All portal actions use provider abstraction
- [ ] `npx tsc --noEmit` passes
