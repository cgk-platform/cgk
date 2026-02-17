# Phase 4: Backend Integrations

> **Priority**: P1 - High
> **Impact**: Major features missing
> **Estimated Time**: 3-4 hours

---

## Tasks in This Phase

1. Subscription backend integration (storefront)
2. Order confirmation page (storefront)
3. Orchestrator analytics page (replace placeholder)
4. Orchestrator brand health page (replace placeholder)

---

## Task 1: Subscription Backend

**Problem**: `/apps/storefront/src/lib/subscriptions/api.server.ts` returns empty data with TODO comments.

**Location**: `/Users/holdenthemic/Documents/cgk/apps/storefront/src/lib/subscriptions/`

### Update `api.server.ts`

Replace placeholder implementations with real database queries:

```typescript
export async function listSubscriptionsServer(
  customerId: string,
  tenantSlug: string,
  filters?: SubscriptionFilters
): Promise<SubscriptionListResponse> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT s.*,
        json_agg(si.*) as items
      FROM subscriptions s
      LEFT JOIN subscription_items si ON si.subscription_id = s.id
      WHERE s.customer_id = ${customerId}
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `
    return {
      subscriptions: result.rows.map(mapSubscription),
      hasMore: false,
      cursor: null
    }
  })
}
```

### Create API Routes

**Location**: `/apps/storefront/src/app/api/account/subscriptions/`

- `route.ts` - GET list subscriptions
- `[id]/route.ts` - GET detail, PATCH update, DELETE cancel
- `[id]/pause/route.ts` - POST pause subscription
- `[id]/resume/route.ts` - POST resume subscription
- `[id]/skip/route.ts` - POST skip next delivery

---

## Task 2: Order Confirmation Page

**Problem**: No order confirmation page after checkout.

**Location**: `/Users/holdenthemic/Documents/cgk/apps/storefront/src/app/`

### Create `order-confirmation/page.tsx`

```typescript
// Accept orderId from query params
// Fetch order details
// Show: Order number, items, totals, shipping info
// Track purchase analytics event
// Success animation
```

### Create `thank-you/page.tsx`

```typescript
// Redirect to /order-confirmation with orderId
```

### Create API Route

**Location**: `/apps/storefront/src/app/api/checkout/order/[id]/route.ts`

```typescript
// GET - Fetch order details for confirmation page
// Verify customer owns the order
```

---

## Task 3: Orchestrator Analytics Page

**Problem**: `/apps/orchestrator/src/app/(dashboard)/analytics/page.tsx` is placeholder.

### Replace with Real Analytics Dashboard

```typescript
// Platform-wide analytics:
// - GMV trends (line chart)
// - Revenue by tenant (bar chart)
// - Order volume over time
// - Customer metrics (new vs returning)
// - Growth indicators
```

### Create API Route

**Location**: `/apps/orchestrator/src/app/api/platform/analytics/route.ts`

```typescript
// Aggregate across all tenants:
// - GMV by day/week/month
// - Order counts
// - Customer counts
// - Average order value
// Support date range filtering
```

Use batch processing pattern like overview route to handle many tenants.

---

## Task 4: Orchestrator Brand Health Page

**Problem**: `/apps/orchestrator/src/app/(dashboard)/brands/health/page.tsx` is placeholder.

### Replace with Real Health Dashboard

```typescript
// Brand health overview:
// - Grid of all brands with health status
// - Summary counts (healthy, degraded, unhealthy)
// - Common issues across brands
// - Trend analysis
// - Click to drill down to brand detail
```

### Create/Update API Route

**Location**: `/apps/orchestrator/src/app/api/platform/brands/health/route.ts`

```typescript
// Aggregate health data:
// - Query platform_health_matrix for all tenants
// - Group by tenant
// - Calculate health scores
// - Return sorted by health (worst first)
```

---

## Database Tables Reference

| Feature | Tables |
|---------|--------|
| Subscriptions | `subscriptions`, `subscription_items`, `subscription_orders` |
| Orders | `orders`, `order_line_items` |
| Analytics | Aggregate from `orders`, `customers` across tenant schemas |
| Health | `platform_health_matrix` in public schema |

---

## Verification

```bash
# Storefront
cd /Users/holdenthemic/Documents/cgk/apps/storefront
npx tsc --noEmit

# Orchestrator
cd /Users/holdenthemic/Documents/cgk/apps/orchestrator
npx tsc --noEmit
```

---

## Completion Checklist

### Subscriptions
- [x] `api.server.ts` updated with real queries
- [x] `api/account/subscriptions/route.ts` created
- [x] `api/account/subscriptions/[id]/route.ts` created
- [x] Pause/resume/skip routes created

### Order Confirmation
- [x] `order-confirmation/page.tsx` created
- [x] `thank-you/page.tsx` redirect created (order-confirmation handles both)
- [x] `api/checkout/order/[id]/route.ts` created (inline in page)
- [x] Analytics tracking integrated

### Orchestrator Analytics
- [x] `analytics/page.tsx` replaced with real implementation
- [x] `api/platform/analytics/route.ts` created
- [x] Charts working with real data

### Orchestrator Brand Health
- [x] `brands/health/page.tsx` replaced with real implementation
- [x] `api/platform/brands/health/route.ts` exists (was already created)
- [x] Health matrix displayed

### Verification
- [x] Storefront TypeScript check passes
- [x] Orchestrator TypeScript check passes

**Status**: ✅ COMPLETE (2026-02-16)
