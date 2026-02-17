# @cgk-platform/ab-testing

A/B testing infrastructure with multi-variant support, MAB allocation, and targeting rules for the CGK platform.

## Installation

```bash
pnpm add @cgk-platform/ab-testing
```

## Features

- **Multi-Variant Testing** - Test multiple variants with flexible allocation strategies
- **MAB (Multi-Armed Bandit)** - Dynamic allocation based on performance
- **Targeting Rules** - Sophisticated visitor targeting with conditions
- **Shipping Tests** - Specialized A/B testing for shipping rates
- **Event Tracking** - Track conversions, goals, and engagement
- **Statistical Analysis** - Confidence levels and variant performance metrics

## Quick Start

### Server-Side Assignment

```typescript
import { assignVisitorToTest } from '@cgk-platform/ab-testing/server'

const assignment = await assignVisitorToTest({
  testId: 'test_123',
  visitorId: 'visitor_abc',
  tenantId: 'tenant_xyz',
})

console.log(assignment.variantId) // 'control' or 'variant_a'
```

### Client-Side Cookie Management

```typescript
import {
  getOrCreateVisitorId,
  getAssignmentFromCookie,
  addAssignmentToCookie,
} from '@cgk-platform/ab-testing'

const visitorId = getOrCreateVisitorId(cookies)
const assignment = getAssignmentFromCookie(cookies, 'test_123')

const updatedCookie = addAssignmentToCookie(existingCookie, {
  testId: 'test_123',
  variantId: 'variant_a',
  assignedAt: Date.now(),
})
```

### Shipping Rate Testing

```typescript
import {
  createShippingABTestSyncHook,
  syncShippingVariantToCart,
} from '@cgk-platform/ab-testing'

// React hook for automatic cart sync
const useShippingSync = createShippingABTestSyncHook()

function CheckoutPage() {
  useShippingSync()
  // Shipping variant automatically synced to cart
}

// Manual sync
await syncShippingVariantToCart({
  cartId: 'cart_123',
  testId: 'shipping_test',
  variantId: 'free_shipping',
})
```

## Key Exports

### Types
- `ABTest`, `ABVariant`, `ABVisitor`, `ABEvent`
- `AllocationMode`, `TestStatus`, `TestType`
- `TargetingRule`, `TargetingCondition`, `VisitorContext`
- `ShippingTestConfig`, `ShippingAttribution`

### Assignment
- `generateVisitorId()` - Create unique visitor IDs
- `getOrCreateVisitorId()` - Get or create from cookies
- `getAssignmentFromCookie()` - Read test assignments
- `addAssignmentToCookie()` - Store test assignments

### Shipping Tests
- `createShippingABTestSyncHook()` - React hook for cart sync
- `syncShippingVariantToCart()` - Manual cart sync
- `cartNeedsSync()` - Check if sync is needed
- `extractShippingAssignmentFromCookie()` - Read shipping variant

### Hashing & Distribution
- `computeHash()` - Murmur3 hash for consistent assignment
- `hashToPercentage()` - Convert hash to 0-100 range

## Configuration

```typescript
import {
  AB_COOKIE_NAME,
  AB_COOKIE_MAX_AGE,
  MAB_CONFIG,
  TARGETING_CONFIG,
} from '@cgk-platform/ab-testing'

console.log(AB_COOKIE_NAME) // '_cgk_ab'
console.log(MAB_CONFIG.explorationRate) // 0.1
```

## Server-Only Functions

For test management and analytics, import from `/server`:

```typescript
import {
  createTest,
  updateTest,
  trackEvent,
  getTestResults,
} from '@cgk-platform/ab-testing/server'
```

## License

MIT
