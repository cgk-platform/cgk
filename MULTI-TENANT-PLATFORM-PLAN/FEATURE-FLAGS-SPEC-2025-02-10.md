# Feature Flags Specification

**Created**: 2025-02-10
**Status**: Design Complete
**Purpose**: Platform-wide feature flag management system

---

## Overview

The feature flag system provides granular control over feature rollouts across all tenants. It enables:
- Gradual rollouts with percentage-based targeting
- Per-tenant feature enablement
- Scheduled feature launches
- A/B test integration
- Emergency kill switches

### Existing RAWDOG Implementation

From `/src/lib/subscriptions/feature-flag.ts`, there's a simple toggle system for subscription backend. This specification provides a comprehensive, platform-wide feature flag system.

---

## Flag Types

| Type | Description | Example Use Case |
|------|-------------|------------------|
| `boolean` | Simple on/off toggle | `maintenance_mode: true` |
| `percentage` | Gradual rollout by % | `new_checkout: 25` (25% of users) |
| `tenant_list` | Enable for specific tenants | `wise_payouts: ["rawdog", "brandx"]` |
| `user_list` | Enable for specific users | `beta_features: ["user_123"]` |
| `schedule` | Time-based enablement | `holiday_theme: {start, end}` |
| `variant` | A/B test variants | `checkout_flow: "v2"` |

---

## Database Schema

### Feature Flags Table

```sql
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',

  -- Type and default
  flag_type VARCHAR(20) NOT NULL CHECK (flag_type IN (
    'boolean', 'percentage', 'tenant_list', 'user_list', 'schedule', 'variant'
  )),
  default_value JSONB NOT NULL,

  -- Tenant targeting
  enabled_tenants UUID[] DEFAULT '{}',
  disabled_tenants UUID[] DEFAULT '{}',

  -- User targeting
  enabled_users UUID[] DEFAULT '{}',

  -- Percentage rollout
  percentage INTEGER CHECK (percentage >= 0 AND percentage <= 100),
  percentage_salt VARCHAR(36) DEFAULT gen_random_uuid()::text,

  -- Variants (for A/B tests)
  variants JSONB DEFAULT '[]',  -- [{key: "v1", weight: 50}, {key: "v2", weight: 50}]

  -- Schedule
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id),

  -- Change history (last 50 changes)
  change_history JSONB DEFAULT '[]'
);

CREATE INDEX idx_flags_key ON public.feature_flags(key);
CREATE INDEX idx_flags_category ON public.feature_flags(category);
CREATE INDEX idx_flags_enabled ON public.feature_flags(is_enabled) WHERE is_enabled = true;
CREATE INDEX idx_flags_tags ON public.feature_flags USING GIN(tags);
```

### Flag Overrides Table

Per-tenant or per-user overrides that take precedence over default behavior.

```sql
CREATE TABLE public.feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,

  -- Target (one of these must be set)
  tenant_id UUID REFERENCES public.organizations(id),
  user_id UUID REFERENCES public.users(id),

  -- Override value
  value JSONB NOT NULL,
  reason TEXT,

  -- Expiry (optional)
  expires_at TIMESTAMPTZ,

  -- Audit
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure either tenant_id or user_id is set, not both
  CONSTRAINT override_target_check CHECK (
    (tenant_id IS NOT NULL AND user_id IS NULL) OR
    (tenant_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE INDEX idx_overrides_flag ON public.feature_flag_overrides(flag_id);
CREATE INDEX idx_overrides_tenant ON public.feature_flag_overrides(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_overrides_user ON public.feature_flag_overrides(user_id) WHERE user_id IS NOT NULL;
```

### Flag Audit Log

Detailed history of all flag changes.

```sql
CREATE TABLE public.feature_flag_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES public.feature_flags(id),
  flag_key VARCHAR(100) NOT NULL,

  action VARCHAR(20) NOT NULL CHECK (action IN (
    'created', 'updated', 'enabled', 'disabled', 'archived',
    'override_added', 'override_removed', 'rollout_changed'
  )),

  -- Change details
  old_value JSONB,
  new_value JSONB,
  changed_fields TEXT[],

  -- Context
  tenant_id UUID REFERENCES public.organizations(id),
  user_id UUID REFERENCES public.users(id),
  reason TEXT,

  -- Audit
  performed_by UUID NOT NULL REFERENCES public.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_flag_audit_flag ON public.feature_flag_audit(flag_id, performed_at DESC);
CREATE INDEX idx_flag_audit_key ON public.feature_flag_audit(flag_key);
CREATE INDEX idx_flag_audit_time ON public.feature_flag_audit(performed_at DESC);
```

---

## Flag Evaluation Logic

### Core Evaluation Function

```typescript
// packages/feature-flags/src/evaluate.ts
export interface EvaluationContext {
  tenantId?: string
  userId?: string
  sessionId?: string
  attributes?: Record<string, unknown>  // Custom attributes for targeting
}

export interface EvaluationResult {
  value: boolean | string | number | object
  source: 'default' | 'override' | 'targeting' | 'rollout' | 'schedule' | 'disabled'
  flagId: string
  flagKey: string
  evaluatedAt: string
}

export async function evaluateFlag(
  flagKey: string,
  context: EvaluationContext = {}
): Promise<EvaluationResult> {
  const flag = await getFlag(flagKey)

  // 1. Flag doesn't exist
  if (!flag) {
    return {
      value: false,
      source: 'default',
      flagId: '',
      flagKey,
      evaluatedAt: new Date().toISOString(),
    }
  }

  // 2. Flag is disabled or archived
  if (!flag.isEnabled || flag.isArchived) {
    return {
      value: flag.defaultValue,
      source: 'disabled',
      flagId: flag.id,
      flagKey,
      evaluatedAt: new Date().toISOString(),
    }
  }

  // 3. Check schedule
  const now = new Date()
  if (flag.startsAt && now < flag.startsAt) {
    return resultWith(flag, flag.defaultValue, 'schedule')
  }
  if (flag.endsAt && now > flag.endsAt) {
    return resultWith(flag, flag.defaultValue, 'schedule')
  }

  // 4. Check user override (highest priority)
  if (context.userId) {
    const userOverride = await getUserOverride(flag.id, context.userId)
    if (userOverride && !isExpired(userOverride)) {
      return resultWith(flag, userOverride.value, 'override')
    }
  }

  // 5. Check tenant override
  if (context.tenantId) {
    const tenantOverride = await getTenantOverride(flag.id, context.tenantId)
    if (tenantOverride && !isExpired(tenantOverride)) {
      return resultWith(flag, tenantOverride.value, 'override')
    }
  }

  // 6. Check disabled tenants list
  if (context.tenantId && flag.disabledTenants.includes(context.tenantId)) {
    return resultWith(flag, false, 'targeting')
  }

  // 7. Check enabled tenants list
  if (flag.enabledTenants.length > 0) {
    if (context.tenantId && flag.enabledTenants.includes(context.tenantId)) {
      return resultWith(flag, true, 'targeting')
    }
    return resultWith(flag, false, 'targeting')
  }

  // 8. Check enabled users list
  if (flag.enabledUsers.length > 0) {
    if (context.userId && flag.enabledUsers.includes(context.userId)) {
      return resultWith(flag, true, 'targeting')
    }
  }

  // 9. Handle percentage rollout
  if (flag.flagType === 'percentage' && flag.percentage !== null) {
    const hash = computeRolloutHash(
      context.userId || context.sessionId || context.tenantId || 'anonymous',
      flagKey,
      flag.percentageSalt
    )
    const inRollout = hash < flag.percentage
    return resultWith(flag, inRollout, 'rollout')
  }

  // 10. Handle variant selection
  if (flag.flagType === 'variant' && flag.variants.length > 0) {
    const variant = selectVariant(
      context.userId || context.sessionId || 'anonymous',
      flagKey,
      flag.variants,
      flag.percentageSalt
    )
    return resultWith(flag, variant, 'rollout')
  }

  // 11. Return default value
  return resultWith(flag, flag.defaultValue, 'default')
}

function resultWith(
  flag: FeatureFlag,
  value: any,
  source: EvaluationResult['source']
): EvaluationResult {
  return {
    value,
    source,
    flagId: flag.id,
    flagKey: flag.key,
    evaluatedAt: new Date().toISOString(),
  }
}
```

### Consistent Hashing for Rollouts

```typescript
// packages/feature-flags/src/hash.ts
import { createHash } from 'crypto'

/**
 * Compute a consistent hash for percentage-based rollouts.
 * Same user+flag combination always returns same value (0-99).
 */
export function computeRolloutHash(
  identifier: string,
  flagKey: string,
  salt: string
): number {
  const input = `${salt}:${flagKey}:${identifier}`
  const hash = createHash('sha256').update(input).digest('hex')
  const numeric = parseInt(hash.slice(0, 8), 16)
  return numeric % 100
}

/**
 * Select a variant based on weighted distribution.
 */
export function selectVariant(
  identifier: string,
  flagKey: string,
  variants: Array<{ key: string; weight: number }>,
  salt: string
): string {
  const hash = computeRolloutHash(identifier, flagKey, salt)

  let cumulative = 0
  for (const variant of variants) {
    cumulative += variant.weight
    if (hash < cumulative) {
      return variant.key
    }
  }

  // Fallback to first variant
  return variants[0]?.key || 'control'
}
```

---

## Caching Strategy

### Multi-Layer Cache

```typescript
// packages/feature-flags/src/cache.ts

// Layer 1: In-memory cache (10 second TTL)
const memoryCache = new Map<string, { flag: FeatureFlag; expiresAt: number }>()
const MEMORY_TTL = 10_000

// Layer 2: Redis cache (60 second TTL)
const REDIS_TTL = 60

export async function getFlag(key: string): Promise<FeatureFlag | null> {
  // Check memory cache
  const cached = memoryCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.flag
  }

  // Check Redis cache
  const redis = getRedis()
  const redisKey = `flags:${key}`
  const redisCached = await redis.get(redisKey)

  if (redisCached) {
    const flag = JSON.parse(redisCached)
    memoryCache.set(key, { flag, expiresAt: Date.now() + MEMORY_TTL })
    return flag
  }

  // Fetch from database
  const [flag] = await sql`
    SELECT * FROM public.feature_flags
    WHERE key = ${key} AND is_archived = false
  `

  if (flag) {
    // Cache in Redis
    await redis.setex(redisKey, REDIS_TTL, JSON.stringify(flag))
    // Cache in memory
    memoryCache.set(key, { flag, expiresAt: Date.now() + MEMORY_TTL })
  }

  return flag || null
}

// Cache invalidation on flag update
export async function invalidateFlag(key: string): Promise<void> {
  const redis = getRedis()

  // Clear memory cache
  memoryCache.delete(key)

  // Clear Redis cache
  await redis.del(`flags:${key}`)

  // Publish invalidation event for other instances
  await redis.publish('flags:invalidate', key)
}

// Subscribe to invalidation events
export async function subscribeToInvalidations(): Promise<void> {
  const subscriber = getRedis().duplicate()
  await subscriber.subscribe('flags:invalidate')

  subscriber.on('message', (channel, key) => {
    if (channel === 'flags:invalidate') {
      memoryCache.delete(key)
    }
  })
}
```

---

## Client SDK

### React Hook

```typescript
// packages/feature-flags/src/react.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface FlagContextValue {
  flags: Record<string, boolean | string | number>
  isLoading: boolean
  refresh: () => Promise<void>
}

const FlagContext = createContext<FlagContextValue | null>(null)

export function FlagProvider({
  children,
  tenantId,
  userId,
}: {
  children: React.ReactNode
  tenantId?: string
  userId?: string
}) {
  const [flags, setFlags] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)

  const refresh = async () => {
    const response = await fetch('/api/flags/evaluate-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, userId }),
    })
    const data = await response.json()
    setFlags(data.flags)
    setIsLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [tenantId, userId])

  return (
    <FlagContext.Provider value={{ flags, isLoading, refresh }}>
      {children}
    </FlagContext.Provider>
  )
}

export function useFlag<T = boolean>(flagKey: string, defaultValue?: T): T {
  const context = useContext(FlagContext)
  if (!context) {
    throw new Error('useFlag must be used within a FlagProvider')
  }

  return (context.flags[flagKey] ?? defaultValue) as T
}

export function useFlags(): Record<string, any> {
  const context = useContext(FlagContext)
  if (!context) {
    throw new Error('useFlags must be used within a FlagProvider')
  }
  return context.flags
}
```

### Server-Side Helper

```typescript
// packages/feature-flags/src/server.ts
import { evaluateFlag, EvaluationContext } from './evaluate'

export async function isEnabled(
  flagKey: string,
  context?: EvaluationContext
): Promise<boolean> {
  const result = await evaluateFlag(flagKey, context)
  return Boolean(result.value)
}

export async function getVariant(
  flagKey: string,
  context?: EvaluationContext
): Promise<string> {
  const result = await evaluateFlag(flagKey, context)
  return String(result.value)
}

export async function getAllFlags(
  context?: EvaluationContext
): Promise<Record<string, any>> {
  const flags = await sql`
    SELECT key FROM public.feature_flags
    WHERE is_enabled = true AND is_archived = false
  `

  const results: Record<string, any> = {}

  await Promise.all(
    flags.map(async (flag) => {
      const result = await evaluateFlag(flag.key, context)
      results[flag.key] = result.value
    })
  )

  return results
}
```

---

## Flag Management UI

### Flag List Page

```typescript
// apps/orchestrator/src/app/flags/page.tsx
export default async function FlagsPage({
  searchParams,
}: {
  searchParams: { category?: string; status?: string; search?: string }
}) {
  const flags = await getFlags(searchParams)
  const categories = await getFlagCategories()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feature Flags</h1>
        <Button asChild>
          <Link href="/flags/new">Create Flag</Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={searchParams.category}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={searchParams.status}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="search"
              placeholder="Search flags..."
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Flag Table */}
      <FlagTable flags={flags} />
    </div>
  )
}
```

### Flag Editor

```typescript
// apps/orchestrator/src/app/flags/[key]/page.tsx
export default async function FlagEditorPage({
  params,
}: {
  params: { key: string }
}) {
  const flag = await getFlag(params.key)
  const tenants = await getAllTenants()
  const auditLog = await getFlagAuditLog(flag.id, 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{flag.name}</h1>
          <p className="text-muted-foreground">{flag.key}</p>
        </div>
        <div className="flex gap-2">
          <FlagStatusBadge flag={flag} />
          <FlagToggle flag={flag} />
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="targeting">Targeting</TabsTrigger>
          <TabsTrigger value="rollout">Rollout</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <FlagSettingsForm flag={flag} />
        </TabsContent>

        <TabsContent value="targeting">
          <FlagTargetingForm flag={flag} tenants={tenants} />
        </TabsContent>

        <TabsContent value="rollout">
          <FlagRolloutForm flag={flag} />
        </TabsContent>

        <TabsContent value="overrides">
          <FlagOverridesTable flag={flag} tenants={tenants} />
        </TabsContent>

        <TabsContent value="history">
          <FlagAuditLog entries={auditLog} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### Rollout Controls

```typescript
// apps/orchestrator/src/components/flags/rollout-controls.tsx
'use client'

export function RolloutControls({ flag }: { flag: FeatureFlag }) {
  const [percentage, setPercentage] = useState(flag.percentage || 0)
  const [isUpdating, setIsUpdating] = useState(false)

  const presetValues = [0, 10, 25, 50, 75, 100]

  async function updateRollout(newPercentage: number) {
    setIsUpdating(true)
    try {
      await updateFlag(flag.key, { percentage: newPercentage })
      setPercentage(newPercentage)
      toast.success(`Rollout updated to ${newPercentage}%`)
    } catch (error) {
      toast.error('Failed to update rollout')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Percentage Rollout</CardTitle>
        <CardDescription>
          Gradually roll out to a percentage of users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Slider */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Current Rollout</Label>
            <span className="font-bold">{percentage}%</span>
          </div>
          <Slider
            value={[percentage]}
            onValueChange={([v]) => setPercentage(v)}
            onValueCommit={([v]) => updateRollout(v)}
            max={100}
            step={1}
            disabled={isUpdating}
          />
        </div>

        {/* Presets */}
        <div className="flex gap-2">
          {presetValues.map(value => (
            <Button
              key={value}
              variant={percentage === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateRollout(value)}
              disabled={isUpdating}
            >
              {value}%
            </Button>
          ))}
        </div>

        {/* Staged Rollout */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Staged Rollout</h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => stagedRollout([10, 25, 50, 100])}
              disabled={isUpdating}
            >
              10% → 25% → 50% → 100%
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Automatically increase rollout every 24 hours if no errors
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Emergency Kill Switch

```typescript
// apps/orchestrator/src/components/flags/kill-switch.tsx
'use client'

export function KillSwitch({ flag }: { flag: FeatureFlag }) {
  const [showConfirm, setShowConfirm] = useState(false)

  async function disableFlag() {
    await updateFlag(flag.key, {
      isEnabled: false,
      percentage: 0,
    })

    // Log emergency action
    await logFlagAudit(flag.id, 'disabled', {
      reason: 'Emergency kill switch activated',
      performedBy: getCurrentUserId(),
    })

    toast.success('Flag disabled via kill switch')
    setShowConfirm(false)
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowConfirm(true)}
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        Kill Switch
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Feature?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately disable <strong>{flag.name}</strong> for all
              users and tenants. This action is logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={disableFlag}>
              Disable Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

---

## Core Platform Flags

Pre-defined flags for platform-level features.

```typescript
// packages/feature-flags/src/platform-flags.ts
export const PLATFORM_FLAGS = {
  // Platform Operations
  'platform.maintenance_mode': {
    name: 'Maintenance Mode',
    description: 'Enable maintenance page for all storefronts',
    type: 'boolean',
    defaultValue: false,
    category: 'platform',
  },
  'platform.new_tenant_signup': {
    name: 'New Tenant Signup',
    description: 'Allow new brand creation',
    type: 'boolean',
    defaultValue: true,
    category: 'platform',
  },

  // Commerce Provider (Dual Checkout Architecture)
  'commerce.provider': {
    name: 'Commerce Provider',
    description: 'Backend for products, cart, checkout: shopify (default) or custom (Stripe)',
    type: 'variant',
    defaultValue: 'shopify',
    variants: [
      { key: 'shopify', weight: 100 },  // Default: Shopify Headless
      { key: 'custom', weight: 0 }       // Opt-in: Custom + Stripe
    ],
    category: 'commerce',
  },

  // Checkout
  'checkout.new_flow': {
    name: 'New Checkout Flow',
    description: 'Enable redesigned checkout experience',
    type: 'percentage',
    defaultValue: false,
    category: 'checkout',
  },
  'checkout.express_pay': {
    name: 'Express Payment Options',
    description: 'Show Apple Pay / Google Pay buttons',
    type: 'boolean',
    defaultValue: true,
    category: 'checkout',
  },

  // Payments
  'payments.wise_enabled': {
    name: 'Wise Payouts',
    description: 'Enable Wise for international payouts',
    type: 'tenant_list',
    defaultValue: false,
    category: 'payments',
  },
  'payments.instant_payouts': {
    name: 'Instant Payouts',
    description: 'Enable instant payout option (higher fee)',
    type: 'boolean',
    defaultValue: false,
    category: 'payments',
  },

  // MCP
  'mcp.streaming_enabled': {
    name: 'MCP Streaming',
    description: 'Use streaming transport for MCP',
    type: 'boolean',
    defaultValue: true,
    category: 'mcp',
  },
  'mcp.tools_v2': {
    name: 'MCP Tools V2',
    description: 'Enable new tool implementations',
    type: 'percentage',
    defaultValue: false,
    category: 'mcp',
  },

  // AI Features
  'ai.review_moderation': {
    name: 'AI Review Moderation',
    description: 'Use AI to auto-moderate reviews',
    type: 'boolean',
    defaultValue: false,
    category: 'ai',
  },
  'ai.product_descriptions': {
    name: 'AI Product Descriptions',
    description: 'Generate product descriptions with AI',
    type: 'boolean',
    defaultValue: false,
    category: 'ai',
  },

  // Attribution
  'attribution.shapley_model': {
    name: 'Shapley Attribution',
    description: 'Use Shapley value model for attribution',
    type: 'percentage',
    defaultValue: false,
    category: 'attribution',
  },
  'attribution.markov_chains': {
    name: 'Markov Chain Attribution',
    description: 'Use Markov chain model for attribution',
    type: 'boolean',
    defaultValue: false,
    category: 'attribution',
  },

  // Creator Portal
  'creators.v2_portal': {
    name: 'Creator Portal V2',
    description: 'Enable redesigned creator portal',
    type: 'tenant_list',
    defaultValue: false,
    category: 'creators',
  },
  'creators.self_service_onboarding': {
    name: 'Self-Service Onboarding',
    description: 'Allow creators to onboard without admin approval',
    type: 'boolean',
    defaultValue: false,
    category: 'creators',
  },

  // Admin Features
  'admin.realtime_dashboard': {
    name: 'Realtime Dashboard',
    description: 'Enable WebSocket updates on dashboard',
    type: 'boolean',
    defaultValue: true,
    category: 'admin',
  },
  'admin.ai_insights': {
    name: 'AI Business Insights',
    description: 'Show AI-generated business insights',
    type: 'percentage',
    defaultValue: false,
    category: 'admin',
  },
} as const

export type PlatformFlagKey = keyof typeof PLATFORM_FLAGS
```

### Flag Seeder

```typescript
// packages/feature-flags/src/seed.ts
export async function seedPlatformFlags(userId: string): Promise<void> {
  for (const [key, config] of Object.entries(PLATFORM_FLAGS)) {
    const existing = await sql`
      SELECT id FROM public.feature_flags WHERE key = ${key}
    `

    if (existing.length === 0) {
      await sql`
        INSERT INTO public.feature_flags (
          key, name, description, flag_type, default_value,
          category, created_by
        ) VALUES (
          ${key},
          ${config.name},
          ${config.description},
          ${config.type},
          ${JSON.stringify(config.defaultValue)},
          ${config.category},
          ${userId}
        )
      `
    }
  }
}
```

---

## API Routes

### Flag CRUD

```typescript
// apps/orchestrator/src/app/api/platform/flags/route.ts
export const dynamic = 'force-dynamic'

// List all flags
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const flags = await sql`
    SELECT * FROM public.feature_flags
    WHERE is_archived = ${searchParams.get('includeArchived') === 'true' ? sql`true OR true` : sql`false`}
      ${searchParams.get('category') ? sql`AND category = ${searchParams.get('category')}` : sql``}
    ORDER BY category, name
  `

  return Response.json({ flags })
}

// Create new flag
export async function POST(req: Request) {
  const body = await req.json()
  const userId = await getAuthUserId()

  // Validate key format
  if (!/^[a-z][a-z0-9._]+$/.test(body.key)) {
    return Response.json(
      { error: 'Invalid key format. Use lowercase letters, numbers, dots, and underscores.' },
      { status: 400 }
    )
  }

  const [flag] = await sql`
    INSERT INTO public.feature_flags (
      key, name, description, flag_type, default_value,
      category, tags, created_by
    ) VALUES (
      ${body.key},
      ${body.name},
      ${body.description},
      ${body.flagType},
      ${JSON.stringify(body.defaultValue)},
      ${body.category || 'general'},
      ${body.tags || []},
      ${userId}
    )
    RETURNING *
  `

  // Audit log
  await logFlagAudit(flag.id, 'created', { newValue: flag }, userId)

  return Response.json({ flag }, { status: 201 })
}
```

### Flag Update

```typescript
// apps/orchestrator/src/app/api/platform/flags/[key]/route.ts
export async function PATCH(
  req: Request,
  { params }: { params: { key: string } }
) {
  const body = await req.json()
  const userId = await getAuthUserId()

  // Get current state for audit
  const [oldFlag] = await sql`
    SELECT * FROM public.feature_flags WHERE key = ${params.key}
  `

  if (!oldFlag) {
    return Response.json({ error: 'Flag not found' }, { status: 404 })
  }

  // Build update
  const updates: string[] = []
  const values: any[] = []

  const allowedFields = [
    'name', 'description', 'is_enabled', 'percentage',
    'enabled_tenants', 'disabled_tenants', 'enabled_users',
    'starts_at', 'ends_at', 'variants', 'tags', 'metadata'
  ]

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${values.length + 1}`)
      values.push(body[field])
    }
  }

  if (updates.length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  updates.push('updated_at = NOW()')
  updates.push(`updated_by = $${values.length + 1}`)
  values.push(userId)

  const [newFlag] = await sql.query(
    `UPDATE public.feature_flags
     SET ${updates.join(', ')}
     WHERE key = $${values.length + 1}
     RETURNING *`,
    [...values, params.key]
  )

  // Invalidate cache
  await invalidateFlag(params.key)

  // Audit log
  await logFlagAudit(newFlag.id, 'updated', {
    oldValue: oldFlag,
    newValue: newFlag,
    changedFields: Object.keys(body),
  }, userId)

  return Response.json({ flag: newFlag })
}
```

### Flag Evaluation API

```typescript
// apps/orchestrator/src/app/api/platform/flags/evaluate/route.ts
export async function POST(req: Request) {
  const { flagKey, flagKeys, context } = await req.json()

  if (flagKey) {
    const result = await evaluateFlag(flagKey, context)
    return Response.json({ result })
  }

  if (flagKeys && Array.isArray(flagKeys)) {
    const results: Record<string, EvaluationResult> = {}

    await Promise.all(
      flagKeys.map(async (key: string) => {
        results[key] = await evaluateFlag(key, context)
      })
    )

    return Response.json({ results })
  }

  // Return all flags
  const flags = await getAllFlags(context)
  return Response.json({ flags })
}
```

---

## Usage Examples

### In Server Components

```typescript
// apps/admin/src/app/admin/checkout/page.tsx
import { isEnabled, getVariant } from '@repo/feature-flags/server'
import { getTenantContext } from '@/lib/tenant'

export default async function CheckoutPage() {
  const tenant = await getTenantContext()

  const showNewCheckout = await isEnabled('checkout.new_flow', {
    tenantId: tenant.id,
  })

  const checkoutVariant = await getVariant('checkout.variant', {
    tenantId: tenant.id,
  })

  if (showNewCheckout) {
    return <NewCheckoutFlow variant={checkoutVariant} />
  }

  return <LegacyCheckout />
}
```

### In Client Components

```typescript
// apps/storefront/src/components/checkout-button.tsx
'use client'

import { useFlag } from '@repo/feature-flags/react'

export function CheckoutButton() {
  const showExpressPay = useFlag('checkout.express_pay', false)

  return (
    <div className="space-y-2">
      {showExpressPay && (
        <>
          <ApplePayButton />
          <GooglePayButton />
        </>
      )}
      <StandardCheckoutButton />
    </div>
  )
}
```

### In API Routes

```typescript
// apps/admin/src/app/api/payouts/route.ts
import { isEnabled } from '@repo/feature-flags/server'

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id')

  const wiseEnabled = await isEnabled('payments.wise_enabled', { tenantId })

  if (wiseEnabled && isInternationalPayout(body)) {
    return processWisePayout(body)
  }

  return processStripePayout(body)
}
```

---

## Success Criteria

- [ ] All flag types implemented (boolean, percentage, tenant_list, user_list, schedule, variant)
- [ ] Consistent hashing for stable rollouts
- [ ] Multi-layer caching with invalidation
- [ ] Flag UI with rollout controls
- [ ] Emergency kill switch working
- [ ] Full audit trail of all changes
- [ ] Client SDK (React hooks)
- [ ] Server-side helpers
- [ ] Platform flags seeded
- [ ] <10ms flag evaluation time

---

## Dependencies

- PostgreSQL for flag storage
- Redis for caching and pub/sub
- Phase 1 authentication (users table)
- Super admin middleware for UI
