# @cgk/analytics - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-10

---

## Purpose

GA4 and attribution tracking for the CGK platform. Provides client-side analytics, server-side events, and creator attribution tracking.

---

## Quick Reference

```typescript
// Client-side
import { initGA4, trackEvent, trackPageView } from '@cgk/analytics'
import { trackAttribution, getAttributionFromCookie } from '@cgk/analytics'

// E-commerce
import { trackAddToCart, trackPurchase } from '@cgk/analytics'

// Server-side
import { trackServerEvent, configureServerAnalytics } from '@cgk/analytics'
```

---

## Key Patterns

### Pattern 1: Initialize GA4

```tsx
// In your app root
import { initGA4 } from '@cgk/analytics'

useEffect(() => {
  initGA4({
    measurementId: process.env.NEXT_PUBLIC_GA4_ID!,
    debug: process.env.NODE_ENV === 'development',
  })
}, [])
```

### Pattern 2: Track Events

```typescript
import { trackEvent, trackPageView } from '@cgk/analytics'

// Custom events
trackEvent('button_click', { button_id: 'signup', location: 'header' })

// Page views (for SPAs)
trackPageView('/products/widget', 'Widget Product Page')
```

### Pattern 3: E-commerce Tracking

```typescript
import { trackViewItem, trackAddToCart, trackPurchase } from '@cgk/analytics'

// View product
trackViewItem({
  item_id: 'SKU123',
  item_name: 'Widget',
  item_brand: 'MyBrand',
  price: 29.99,
})

// Add to cart
trackAddToCart({
  item_id: 'SKU123',
  item_name: 'Widget',
  price: 29.99,
  quantity: 2,
})

// Purchase
trackPurchase({
  transaction_id: 'order_123',
  value: 59.98,
  currency: 'USD',
  items: [{ item_id: 'SKU123', item_name: 'Widget', price: 29.99, quantity: 2 }],
})
```

### Pattern 4: Attribution Tracking

```typescript
import { parseAttributionParams, trackAttribution, getAttributionFromCookie } from '@cgk/analytics'

// On page load, capture attribution
const attribution = parseAttributionParams(window.location.href)
if (attribution.source || attribution.creatorCode) {
  trackAttribution(attribution)
}

// Later, retrieve for order
const orderAttribution = getAttributionFromCookie()
if (orderAttribution?.creatorCode) {
  // Credit the creator
}
```

### Pattern 5: Server-Side Tracking

```typescript
import { configureServerAnalytics, trackServerEvent } from '@cgk/analytics'

// Configure once at startup
configureServerAnalytics({
  measurementId: process.env.GA4_MEASUREMENT_ID!,
  apiSecret: process.env.GA4_API_SECRET!,
})

// Track server events
await trackServerEvent({
  name: 'server_order_completed',
  clientId: clientId, // From cookie
  userId: userId,
  params: { order_id: orderId, value: 99.99 },
})
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `types.ts` | Type definitions | `AnalyticsEvent`, `EventParams` |
| `ga4.ts` | GA4 integration | `initGA4`, `trackEvent`, `trackPageView` |
| `attribution.ts` | Attribution | `trackAttribution`, `parseAttributionParams` |
| `server.ts` | Server tracking | `trackServerEvent` |
| `ecommerce.ts` | E-commerce events | `trackPurchase`, `trackAddToCart`, etc. |

---

## Exports Reference

### GA4

```typescript
initGA4(config: GA4Config): void
trackEvent(name: string, params?: EventParams): void
trackPageView(path?: string, title?: string): void
```

### Attribution

```typescript
parseAttributionParams(url: string | URL): Partial<AttributionData>
trackAttribution(data: Partial<AttributionData>): void
getAttributionFromCookie(): AttributionData | null
```

### E-commerce

```typescript
trackViewItem(item: EcommerceItem): void
trackAddToCart(item: EcommerceItem): void
trackPurchase(purchase: PurchaseEvent): void
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@cgk/core` | Shared types |

---

## Common Gotchas

### 1. Initialize before tracking

```typescript
// WRONG - Track before init
trackEvent('page_view') // Silently fails

// CORRECT - Init first
initGA4({ measurementId: 'G-XXXXX' })
trackEvent('page_view')
```

### 2. Attribution cookie expiry

Attribution data expires after 30 days. For longer attribution windows, store in database.

### 3. Creator code parameter names

```typescript
// Both work for creator attribution
?ref=creator_code
?creator=creator_code
```

---

## Integration Points

### Used by:
- `apps/storefront` - Page and event tracking
- `apps/checkout` - Purchase tracking
- Creator attribution system

### Uses:
- `@cgk/core` - Types
