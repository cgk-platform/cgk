# E-Commerce Operations Patterns

> **Reference document for implementing e-commerce operational features**
> See PLAN.md § E-Commerce Operations for architecture overview

---

## Abandoned Checkout Detection & Recovery

### Database Schema

```sql
CREATE TABLE abandoned_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shopify_checkout_id TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  cart_total DECIMAL(10,2) NOT NULL,
  line_items JSONB NOT NULL,
  recovery_url TEXT,
  status TEXT DEFAULT 'abandoned',  -- abandoned, processing, recovered, expired
  recovery_email_count INTEGER DEFAULT 0,
  max_recovery_emails INTEGER DEFAULT 3,
  recovery_run_id TEXT,
  abandoned_at TIMESTAMPTZ NOT NULL,
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, shopify_checkout_id)
);

CREATE INDEX idx_abandoned_checkouts_recovery ON abandoned_checkouts(
  tenant_id, status, abandoned_at
) WHERE recovered_at IS NULL;
```

### Tracking Pattern

```typescript
// Track abandoned checkouts with tenant isolation
export async function trackAbandonedCheckout(params: {
  tenantId: string
  shopifyCheckoutId: string
  checkoutData: ShopifyCheckout
}): Promise<void> {
  await withTenant(params.tenantId, async () => {
    await sql`
      INSERT INTO abandoned_checkouts (
        tenant_id, shopify_checkout_id, customer_email, customer_phone,
        cart_total, line_items, recovery_url, abandoned_at
      )
      VALUES (
        ${params.tenantId}, ${params.shopifyCheckoutId},
        ${params.checkoutData.email}, ${params.checkoutData.phone},
        ${params.checkoutData.total_price},
        ${JSON.stringify(params.checkoutData.line_items)},
        ${params.checkoutData.recovery_url}, now()
      )
      ON CONFLICT (tenant_id, shopify_checkout_id) DO UPDATE
      SET cart_total = EXCLUDED.cart_total,
          line_items = EXCLUDED.line_items,
          updated_at = now()
    `
  })
}
```

### Recovery Queue Pattern (Atomic Claim)

```typescript
// Claim abandoned checkouts for recovery processing
export async function claimAbandonedCheckoutsForRecovery(
  tenantId: string,
  runId: string,
  options: { hoursOld: number; maxResults: number }
): Promise<AbandonedCheckout[]> {
  return await withTenant(tenantId, async () => {
    const result = await sql`
      UPDATE abandoned_checkouts
      SET status = 'processing', recovery_run_id = ${runId}
      WHERE id IN (
        SELECT id FROM abandoned_checkouts
        WHERE tenant_id = ${tenantId}
          AND recovered_at IS NULL
          AND status = 'abandoned'
          AND abandoned_at < now() - INTERVAL '${options.hoursOld} hours'
          AND recovery_email_count < max_recovery_emails
        ORDER BY cart_total DESC
        LIMIT ${options.maxResults}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `
    return result.rows
  })
}
```

### Draft Order Creation

```typescript
// Create draft order from abandoned checkout for recovery
export async function createRecoveryDraftOrder(params: {
  tenantId: string
  abandonedCheckoutId: string
  discountCode?: string
}): Promise<{ draftOrderId: string; invoiceUrl: string }> {
  const checkout = await getAbandonedCheckout(params.tenantId, params.abandonedCheckoutId)
  const shopifyClient = await getShopifyClient(params.tenantId)

  const result = await shopifyClient.request(`
    mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder { id invoiceUrl }
        userErrors { field message }
      }
    }
  `, {
    input: {
      email: checkout.customer_email,
      lineItems: checkout.line_items.map(item => ({
        variantId: item.variant_id,
        quantity: item.quantity
      })),
      appliedDiscount: params.discountCode ? {
        value: params.discountCode,
        valueType: 'CODE'
      } : null,
      note: `Recovery from abandoned checkout ${checkout.shopify_checkout_id}`
    }
  })

  return {
    draftOrderId: result.draftOrderCreate.draftOrder.id,
    invoiceUrl: result.draftOrderCreate.draftOrder.invoiceUrl
  }
}
```

---

## Promo Code Management

### Validation Pattern (Shopify Source of Truth)

```typescript
// Validate promo code via Shopify GraphQL
export async function validatePromoCode(
  tenantId: string,
  code: string
): Promise<{ valid: boolean; discount?: DiscountDetails; error?: string }> {
  const shopifyClient = await getShopifyClient(tenantId)

  const result = await shopifyClient.request(`
    query priceRuleByCode($code: String!) {
      codeDiscountNodeByCode(code: $code) {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            title
            status
            startsAt
            endsAt
            usageLimit
            recurringCycleLimit
            customerGets {
              value {
                ... on DiscountPercentage { percentage }
                ... on DiscountAmount { amount { amount currencyCode } }
              }
            }
          }
        }
      }
    }
  `, { code })

  if (!result.codeDiscountNodeByCode) {
    return { valid: false, error: 'Code not found' }
  }

  const discount = result.codeDiscountNodeByCode.codeDiscount
  if (discount.status !== 'ACTIVE') {
    return { valid: false, error: `Code is ${discount.status.toLowerCase()}` }
  }

  return { valid: true, discount }
}
```

### Platform Metadata Pattern (Creator Attribution)

```typescript
// Store and retrieve platform-side metadata for promo codes
interface PromoCodeMetadata {
  creatorId?: string
  commissionPercent?: number
  ogSettings?: {
    title: string
    description: string
    image: string
  }
  createdAt: string
  ttl?: number
}

export async function setPromoCodeMetadata(
  tenantId: string,
  code: string,
  metadata: PromoCodeMetadata
): Promise<void> {
  const cache = createTenantCache(tenantId)
  await cache.set(
    `discount_link:${code}`,
    metadata,
    metadata.ttl ? { ex: metadata.ttl } : undefined
  )
}

export async function getPromoCodeWithMetadata(
  tenantId: string,
  code: string
): Promise<PromoCodeWithMetadata | null> {
  const shopifyData = await validatePromoCode(tenantId, code)
  if (!shopifyData.valid) return null

  const cache = createTenantCache(tenantId)
  const metadata = await cache.get(`discount_link:${code}`)

  return {
    ...shopifyData.discount,
    creatorId: metadata?.creatorId,
    commissionPercent: metadata?.commissionPercent,
    ogSettings: metadata?.ogSettings
  }
}
```

### Bulk Code Generation

```typescript
// Generate bulk promo codes with prefix
export async function generateBulkPromoCodes(params: {
  tenantId: string
  prefix: string
  count: number
  discountValue: number
  discountType: 'percentage' | 'fixed_amount'
  expiresAt?: Date
}): Promise<{ codes: string[]; priceRuleId: string }> {
  const shopifyClient = await getShopifyClient(params.tenantId)

  // Create price rule
  const priceRuleResult = await shopifyClient.request(`
    mutation priceRuleCreate($priceRule: PriceRuleInput!) {
      priceRuleCreate(priceRule: $priceRule) {
        priceRule { id }
        priceRuleUserErrors { field message }
      }
    }
  `, {
    priceRule: {
      title: `${params.prefix} Bulk Codes`,
      target: 'LINE_ITEM',
      allocationMethod: 'ACROSS',
      value: params.discountType === 'percentage'
        ? { percentageValue: -params.discountValue }
        : { fixedAmountValue: -params.discountValue },
      customerSelection: { forAllCustomers: true },
      startsAt: new Date().toISOString(),
      endsAt: params.expiresAt?.toISOString()
    }
  })

  const priceRuleId = priceRuleResult.priceRuleCreate.priceRule.id

  // Generate unique codes
  const codes: string[] = []
  for (let i = 0; i < params.count; i++) {
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    codes.push(`${params.prefix}${suffix}`)
  }

  // Create discount codes via bulk mutation
  await shopifyClient.request(`
    mutation discountCodeBulkCreate($priceRuleId: ID!, $codes: [DiscountCodeInput!]!) {
      discountCodeBulkCreate(priceRuleId: $priceRuleId, codes: $codes) {
        job { id }
        userErrors { field message }
      }
    }
  `, {
    priceRuleId,
    codes: codes.map(code => ({ code }))
  })

  return { codes, priceRuleId }
}
```

---

## Selling Plan Configuration

### Database Schema

```sql
CREATE TABLE selling_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  internal_name TEXT,
  selector_title TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  interval_unit TEXT NOT NULL,  -- DAY, WEEK, MONTH
  interval_count INTEGER NOT NULL DEFAULT 1,
  discount_type TEXT NOT NULL,  -- percentage, fixed_amount, explicit_price
  discount_value DECIMAL(10,2) NOT NULL,
  discount_after_payment INTEGER,  -- When discount changes
  discount_after_value DECIMAL(10,2),  -- New discount value
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);
```

### CRUD Pattern with Caching

```typescript
// Get selling plans with tenant isolation and caching
export async function getSellingPlans(tenantId: string): Promise<SellingPlan[]> {
  const cache = createTenantCache(tenantId)
  const cached = await cache.get('selling-plans:all')
  if (cached) return cached

  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT * FROM selling_plans
      WHERE tenant_id = ${tenantId}
      ORDER BY priority ASC
    `
  })

  const plans = result.rows
  await cache.set('selling-plans:all', plans, { ex: 300 }) // 5 min cache
  return plans
}

// Create selling plan with discount windows
export async function createSellingPlan(params: {
  tenantId: string
  name: string
  selectorTitle: string
  intervalUnit: 'DAY' | 'WEEK' | 'MONTH'
  intervalCount: number
  discountType: 'percentage' | 'fixed_amount' | 'explicit_price'
  discountValue: number
  discountAfterPayment?: number
  discountAfterValue?: number
}): Promise<SellingPlan> {
  const cache = createTenantCache(params.tenantId)

  const plan = await withTenant(params.tenantId, async () => {
    const result = await sql`
      INSERT INTO selling_plans (
        tenant_id, name, selector_title, interval_unit, interval_count,
        discount_type, discount_value, discount_after_payment, discount_after_value
      )
      VALUES (
        ${params.tenantId}, ${params.name}, ${params.selectorTitle},
        ${params.intervalUnit}, ${params.intervalCount},
        ${params.discountType}, ${params.discountValue},
        ${params.discountAfterPayment}, ${params.discountAfterValue}
      )
      RETURNING *
    `
    return result.rows[0]
  })

  // Invalidate cache
  await cache.del('selling-plans:all')

  return plan
}
```

---

## Samples & Trial Tracking

### Configuration Schema

```typescript
interface SamplesConfig {
  ugcTags: string[]           // Tags that identify UGC samples
  tiktokTags: string[]        // Tags that identify TikTok samples
  channelPatterns: string[]   // Channel patterns (e.g., 'tiktok shop')
  zeroPriceOnly: boolean      // Only count $0 orders as TikTok samples
}

// Default configuration
const DEFAULT_SAMPLES_CONFIG: SamplesConfig = {
  ugcTags: ['ugc-sample', 'ugc', 'creator-sample'],
  tiktokTags: ['tiktok-sample', 'tiktok-shop-sample'],
  channelPatterns: ['tiktok%', '%tiktok shop%'],
  zeroPriceOnly: true
}
```

### Query Pattern

```typescript
// Get sample orders by type with tenant isolation
export async function getSampleOrders(params: {
  tenantId: string
  sampleType: 'ugc' | 'tiktok' | 'all'
  fulfillmentStatus?: 'pending' | 'fulfilled' | 'partial'
  limit?: number
}): Promise<SampleOrder[]> {
  const config = await getSamplesConfig(params.tenantId)
  const limit = params.limit || 500

  return await withTenant(params.tenantId, async () => {
    // Build dynamic query based on sample type
    let typeCondition: string

    if (params.sampleType === 'ugc') {
      typeCondition = `tags && ${config.ugcTags}::text[]`
    } else if (params.sampleType === 'tiktok') {
      typeCondition = `(
        tags && ${config.tiktokTags}::text[]
        OR source_name ILIKE ANY(${config.channelPatterns}::text[])
      )${config.zeroPriceOnly ? ' AND total_price = 0' : ''}`
    } else {
      typeCondition = `(
        tags && ${config.ugcTags}::text[]
        OR tags && ${config.tiktokTags}::text[]
        OR source_name ILIKE ANY(${config.channelPatterns}::text[])
      )`
    }

    const fulfillmentCondition = params.fulfillmentStatus
      ? `AND fulfillment_status = '${params.fulfillmentStatus}'`
      : ''

    const result = await sql.query(`
      SELECT * FROM orders
      WHERE tenant_id = $1
        AND (${typeCondition})
        ${fulfillmentCondition}
      ORDER BY created_at DESC
      LIMIT $2
    `, [params.tenantId, limit])

    return result.rows
  })
}
```

---

## Customer Segmentation

### Shopify Segments Sync

```typescript
// Sync customer segments from Shopify
export async function syncCustomerSegments(tenantId: string): Promise<Segment[]> {
  const shopifyClient = await getShopifyClient(tenantId)

  const result = await shopifyClient.request(`
    query segments {
      segments(first: 100) {
        edges {
          node {
            id
            name
            query
          }
        }
      }
    }
  `)

  const segments = result.segments.edges.map(e => e.node)

  // Store in tenant cache
  const cache = createTenantCache(tenantId)
  await cache.set('customer-segments', segments, { ex: 3600 }) // 1 hour

  // Always include "All customers" preset
  return [
    { id: '__ALL__', name: 'All customers', query: '' },
    ...segments
  ]
}
```

### RFM Segmentation

```typescript
// Calculate RFM (Recency, Frequency, Monetary) segments
export async function calculateRFMSegments(tenantId: string): Promise<RFMSegment[]> {
  return await withTenant(tenantId, async () => {
    const result = await sql`
      WITH customer_rfm AS (
        SELECT
          customer_id,
          DATE_PART('day', now() - MAX(created_at)) as recency,
          COUNT(*) as frequency,
          SUM(total_price) as monetary
        FROM orders
        WHERE tenant_id = ${tenantId}
          AND created_at > now() - INTERVAL '365 days'
        GROUP BY customer_id
      ),
      rfm_scores AS (
        SELECT
          customer_id,
          NTILE(5) OVER (ORDER BY recency DESC) as r_score,
          NTILE(5) OVER (ORDER BY frequency) as f_score,
          NTILE(5) OVER (ORDER BY monetary) as m_score
        FROM customer_rfm
      )
      SELECT
        customer_id,
        r_score,
        f_score,
        m_score,
        CASE
          WHEN r_score >= 4 AND f_score >= 4 THEN 'champions'
          WHEN r_score >= 3 AND f_score >= 3 THEN 'loyal'
          WHEN r_score >= 4 AND f_score <= 2 THEN 'new'
          WHEN r_score <= 2 AND f_score >= 3 THEN 'at_risk'
          WHEN r_score <= 2 AND f_score <= 2 THEN 'hibernating'
          ELSE 'potential'
        END as segment
      FROM rfm_scores
    `
    return result.rows
  })
}

// RFM segment descriptions
const RFM_SEGMENTS = {
  champions: 'Bought recently, buy often, spend the most',
  loyal: 'Buy regularly, responsive to promotions',
  new: 'Recent first-time buyers',
  at_risk: 'Used to buy frequently, haven\'t bought recently',
  hibernating: 'Last purchase was long ago, low frequency',
  potential: 'Recent buyers with average frequency'
}
```

---

## Anti-Patterns

```typescript
// ❌ NEVER - Query without tenant isolation
const checkouts = await sql`SELECT * FROM abandoned_checkouts`

// ✅ ALWAYS - Include tenant context
const checkouts = await withTenant(tenantId, () =>
  sql`SELECT * FROM abandoned_checkouts WHERE tenant_id = ${tenantId}`
)

// ❌ NEVER - Validate promo codes locally
const isValid = localPromoCodes.includes(code)

// ✅ ALWAYS - Validate via Shopify (source of truth)
const { valid } = await validatePromoCode(tenantId, code)

// ❌ NEVER - Hardcode sample detection tags
const isSample = order.tags.includes('ugc-sample')

// ✅ ALWAYS - Use tenant-configured tags
const config = await getSamplesConfig(tenantId)
const isSample = order.tags.some(t => config.ugcTags.includes(t))

// ❌ NEVER - Store data without tenant prefix
await redis.set('selling-plans', plans)

// ✅ ALWAYS - Use tenant-scoped cache
const cache = createTenantCache(tenantId)
await cache.set('selling-plans:all', plans)

// ❌ NEVER - Skip atomic claim for queue processing
const entries = await sql`SELECT * FROM recovery_queue WHERE status = 'pending'`
for (const entry of entries) { /* race condition! */ }

// ✅ ALWAYS - Use FOR UPDATE SKIP LOCKED
const entries = await sql`
  UPDATE recovery_queue SET status = 'processing'
  WHERE id IN (
    SELECT id FROM recovery_queue WHERE status = 'pending'
    LIMIT 50 FOR UPDATE SKIP LOCKED
  ) RETURNING *
`
```
