# @cgk-platform/feature-flags - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2026-02-10

---

## Purpose

Complete feature flag system with 6 flag types, consistent hashing for stable rollouts, and multi-layer caching (memory 10s, Redis 60s).

---

## Quick Reference

```typescript
// Server-side (API routes, RSC)
import { isEnabled, getVariant, evaluate } from '@cgk-platform/feature-flags/server'

const showNewCheckout = await isEnabled('checkout.new_flow', {
  tenantId: 'rawdog',
  userId: 'user_123'
})

// Client-side (React components)
import { useFlag, useVariant, FlagProvider } from '@cgk-platform/feature-flags/react'

const isNewCheckout = useFlag('checkout.new_flow')
```

---

## Key Patterns

### Pattern 1: Server-Side Flag Check

**When to use**: In API routes and server components

```typescript
import { isEnabled, getVariant } from '@cgk-platform/feature-flags/server'

// Boolean check
if (await isEnabled('payments.wise_enabled', { tenantId })) {
  return processWithWise(payout)
}

// Variant check
const variant = await getVariant('checkout.ab_test', { tenantId, userId })
switch (variant) {
  case 'v2':
    return <CheckoutV2 />
  default:
    return <CheckoutControl />
}
```

### Pattern 2: Client-Side Flag Check

**When to use**: In React client components

```tsx
'use client'
import { useFlag, useVariant, FeatureFlag } from '@cgk-platform/feature-flags/react'

// Hook usage
function MyComponent() {
  const showNewFeature = useFlag('feature.new_ui')
  const variant = useVariant('checkout.ab_test')

  if (!showNewFeature) return null
  return <NewFeatureUI variant={variant} />
}

// Component usage
function App() {
  return (
    <FeatureFlag flag="feature.new_ui" fallback={<OldUI />}>
      <NewUI />
    </FeatureFlag>
  )
}
```

### Pattern 3: Flag Provider Setup

**When to use**: In app layout for client-side flags

```tsx
// app/layout.tsx
import { evaluateAllFlags } from '@cgk-platform/feature-flags/server'
import { FlagProvider } from '@cgk-platform/feature-flags/react'

export default async function Layout({ children }) {
  const { results } = await evaluateAllFlags({ tenantId: 'rawdog' })

  return (
    <FlagProvider initialFlags={results} context={{ tenantId: 'rawdog' }}>
      {children}
    </FlagProvider>
  )
}
```

### Pattern 4: Context-Bound Evaluator

**When to use**: When you have a fixed context (middleware, handlers)

```typescript
import { createFlagEvaluator } from '@cgk-platform/feature-flags/server'

// Create once with context
const flags = createFlagEvaluator({ tenantId: 'rawdog', userId })

// Use multiple times
if (await flags.isEnabled('checkout.new_flow')) { /* ... */ }
if (await flags.isEnabled('payments.wise_enabled')) { /* ... */ }
```

---

## Flag Types

| Type | Description | Example |
|------|-------------|---------|
| `boolean` | Simple on/off | `maintenance_mode: true` |
| `percentage` | Gradual rollout | `new_checkout: 25%` |
| `tenant_list` | Specific tenants | `wise_payouts: ["rawdog"]` |
| `user_list` | Specific users | `beta: ["user_123"]` |
| `schedule` | Time-based | `holiday_theme: {start, end}` |
| `variant` | A/B test | `checkout_flow: "v2"` |

---

## Evaluation Order

1. Flag disabled/archived -> return default
2. Schedule check -> outside window returns default
3. User override (highest priority)
4. Tenant override
5. Disabled tenants list
6. Enabled tenants list
7. Enabled users list
8. Percentage rollout (consistent hash)
9. Variant selection (weighted hash)
10. Default value

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `types.ts` | Type definitions | `FeatureFlag`, `EvaluationContext`, etc. |
| `hash.ts` | Consistent hashing | `isInRollout`, `selectVariantSync` |
| `evaluate.ts` | Evaluation logic | `evaluateFlag`, `isFlagEnabled` |
| `cache.ts` | Multi-layer cache | `getGlobalFlagCache`, `createFlagCache` |
| `repository.ts` | Database operations | `createFlag`, `updateFlag`, `killFlag` |
| `server.ts` | Server SDK | `isEnabled`, `getVariant`, `evaluate` |
| `react.tsx` | React SDK | `useFlag`, `useVariant`, `FlagProvider` |
| `platform-flags.ts` | Platform flags | `PLATFORM_FLAGS` |
| `seed.ts` | Seeding | `seedPlatformFlags` |

---

## Caching

- **Memory cache**: 10 second TTL
- **Redis cache**: 60 second TTL
- **Invalidation**: Via Redis pub/sub to all instances

```typescript
import { invalidateFlag, invalidateAllFlags } from '@cgk-platform/feature-flags/server'

// After updating a flag
await invalidateFlag('checkout.new_flow')

// After bulk updates
await invalidateAllFlags()
```

---

## Common Gotchas

### 1. Always pass context

```typescript
// WRONG - No context
await isEnabled('payments.wise_enabled')

// CORRECT - With context
await isEnabled('payments.wise_enabled', { tenantId: 'rawdog' })
```

### 2. Use FlagProvider for client-side

```tsx
// WRONG - useFlag without provider
function Component() {
  const flag = useFlag('feature') // Error: must be in FlagProvider
}

// CORRECT - Wrap in FlagProvider
<FlagProvider initialFlags={flags}>
  <Component />
</FlagProvider>
```

### 3. Percentage uses consistent hashing

```typescript
// Same user always gets same result for same flag
const result1 = await isEnabled('checkout.new_flow', { userId: 'abc' })
const result2 = await isEnabled('checkout.new_flow', { userId: 'abc' })
// result1 === result2 always
```

### 4. Kill switch is immediate

```typescript
// Kill switch bypasses cache and disables immediately
await killFlag('checkout.new_flow', userId, 'Production incident')
// Flag is now disabled for everyone
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@cgk-platform/db` | Database access |
| `@cgk-platform/logging` | Structured logging |
| `@cgk-platform/core` | Shared types |

---

## Testing

```bash
# Run tests
pnpm --filter @cgk-platform/feature-flags test

# Watch mode
pnpm --filter @cgk-platform/feature-flags test:watch
```
