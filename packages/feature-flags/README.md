# @cgk-platform/feature-flags

Feature flag system with 6 flag types, consistent hashing, and multi-layer caching for the CGK platform.

## Installation

```bash
pnpm add @cgk-platform/feature-flags
```

## Features

- **6 Flag Types** - Boolean, variant, percentage, user, rule-based, killswitch
- **Consistent Hashing** - Stable rollouts with sticky assignments
- **Multi-Layer Caching** - Memory + Redis for fast evaluation
- **User Targeting** - Target specific users or segments
- **Percentage Rollouts** - Gradual feature rollouts
- **Rule Engine** - Complex targeting rules
- **Override System** - User/tenant/environment overrides
- **React Hooks** - Easy integration in React components

## Quick Start

### Server-Side Usage

```typescript
import { isEnabled, getVariant, createFlag } from '@cgk-platform/feature-flags/server'

// Check boolean flag
const enabled = await isEnabled('new-checkout-flow', {
  tenantId: 'tenant_123',
  userId: 'user_456',
})

if (enabled) {
  // Use new checkout flow
}

// Get variant flag
const variant = await getVariant('button-color', {
  tenantId: 'tenant_123',
  userId: 'user_456',
})

if (variant === 'blue') {
  // Show blue button
}
```

### Create Feature Flags

```typescript
import { createFlag } from '@cgk-platform/feature-flags/server'

// Boolean flag
await createFlag({
  key: 'new-checkout-flow',
  type: 'boolean',
  enabled: true,
  tenantId: 'tenant_123',
})

// Variant flag
await createFlag({
  key: 'button-color',
  type: 'variant',
  enabled: true,
  tenantId: 'tenant_123',
  variants: ['red', 'blue', 'green'],
  variantWeights: { red: 33, blue: 34, green: 33 },
})

// Percentage rollout
await createFlag({
  key: 'ai-recommendations',
  type: 'percentage',
  enabled: true,
  tenantId: 'tenant_123',
  percentage: 25, // 25% of users
})
```

### React Components

```typescript
'use client'

import { useFlag, useFlagVariant, FlagProvider } from '@cgk-platform/feature-flags/react'

export function Layout({ children }) {
  return (
    <FlagProvider tenantId="tenant_123">
      {children}
    </FlagProvider>
  )
}

function CheckoutButton() {
  const newFlow = useFlag('new-checkout-flow')
  const color = useFlagVariant('button-color', 'red') // default: 'red'
  
  if (newFlow) {
    return <NewCheckoutButton color={color} />
  }
  
  return <OldCheckoutButton />
}
```

### User Overrides

```typescript
import { createOverride } from '@cgk-platform/feature-flags/server'

// Force enable for specific user
await createOverride({
  flagKey: 'new-checkout-flow',
  tenantId: 'tenant_123',
  userId: 'user_beta_tester',
  value: true,
})

// Force specific variant for user
await createOverride({
  flagKey: 'button-color',
  tenantId: 'tenant_123',
  userId: 'user_vip',
  value: 'gold', // Special variant
})
```

### Targeting Rules

```typescript
import { createFlag } from '@cgk-platform/feature-flags/server'

// Rule-based flag
await createFlag({
  key: 'premium-features',
  type: 'rule',
  enabled: true,
  tenantId: 'tenant_123',
  rules: [
    {
      conditions: [
        { attribute: 'plan', operator: 'equals', value: 'premium' },
        { attribute: 'verified', operator: 'equals', value: true },
      ],
      value: true,
    },
  ],
  defaultValue: false,
})
```

## Key Exports

### Server-Side (`/server`)
- `isEnabled(key, context)` - Check boolean flag
- `getVariant(key, context)` - Get variant flag value
- `createFlag(input)` - Create feature flag
- `updateFlag(key, input)` - Update flag
- `deleteFlag(key)` - Delete flag
- `createOverride(input)` - Create user/tenant override
- `evaluateFlag(key, context)` - Full evaluation with details

### Client-Side
- Types: `FeatureFlag`, `FlagType`, `EvaluationContext`
- `isValidFlagKey(key)` - Validate flag key format
- `evaluateFlag()` - Client-safe evaluation (with pre-fetched data)

### React (`/react`)
- `FlagProvider` - Context provider
- `useFlag(key)` - Boolean flag hook
- `useFlagVariant(key, defaultValue)` - Variant flag hook
- `useFlagEnabled(key)` - Alias for useFlag

## Flag Types

1. **Boolean** - Simple on/off toggle
2. **Variant** - Multiple named variants with weights
3. **Percentage** - Rollout to X% of users
4. **User** - Target specific user IDs
5. **Rule** - Complex targeting based on attributes
6. **Killswitch** - Emergency disable (overrides all)

## Evaluation Context

```typescript
type EvaluationContext = {
  tenantId: string
  userId?: string
  userAttributes?: Record<string, any>
  environmentId?: string
}
```

Pass context to get personalized flag evaluation:
- `tenantId` - Required, tenant scope
- `userId` - Optional, for user-specific flags
- `userAttributes` - Optional, for rule-based targeting
- `environmentId` - Optional, for environment-specific flags

## Caching

Flags are cached at two levels:
1. **Memory Cache** - In-process, 60s TTL
2. **Redis Cache** - Shared across instances, 5min TTL

Override with `cacheOptions` when evaluating flags.

## License

MIT
