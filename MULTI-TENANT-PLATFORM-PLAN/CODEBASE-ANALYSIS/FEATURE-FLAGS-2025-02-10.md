# RAWDOG Feature Flags Specification
**Generated**: 2025-02-10
**Purpose**: Feature flag management for multi-tenant platform

---

## Source Codebase Path

**RAWDOG Root**: `/Users/holdenthemic/Documents/rawdog-web/`

---

## Current Implementation

### Existing Feature Flag Hooks

**Location**: `/Users/holdenthemic/Documents/rawdog-web/src/hooks/useFeatureFlag.ts`

```typescript
// Current client-side evaluation
export function useFeatureFlag(flagName: string) {
  // Fetches from /api/ab-tests/flags/evaluate
  // Returns: { enabled, variant, payload, loading, error }
}

export function useFeatureFlagEnabled(flagName: string): boolean
export function useFeatureFlagVariant<T>(flagName: string): T | null
```

### Existing A/B Test Infrastructure

From `/src/lib/ab-testing/db/schema.ts`:
- `ab_tests` - Test definitions
- `ab_variants` - Test variants
- `ab_visitors` - Visitor assignments
- `ab_events` - Event tracking

---

## Multi-Tenant Feature Flag Specification

### Flag Types

| Type | Description | Example |
|------|-------------|---------|
| `boolean` | On/off toggle | `new_checkout_enabled` |
| `percentage` | Gradual rollout (0-100%) | `new_ui_rollout: 25%` |
| `user_list` | Specific user IDs | `beta_testers: [id1, id2]` |
| `tenant_list` | Specific tenants | `wise_payouts: [rawdog, brandx]` |
| `variant` | A/B variants | `checkout_flow: A|B|C` |

---

### Database Schema

```sql
-- Feature flag definitions
CREATE TABLE feature_flags (
  id TEXT PRIMARY KEY, -- e.g., 'new_checkout_flow'
  name TEXT NOT NULL,
  description TEXT,
  flag_type TEXT NOT NULL, -- 'boolean', 'percentage', 'user_list', 'tenant_list', 'variant'
  default_value JSONB NOT NULL, -- { "enabled": false } or { "percentage": 0 }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT,
  is_archived BOOLEAN DEFAULT FALSE
);

-- Flag rules (evaluated in priority order)
CREATE TABLE feature_flag_rules (
  id UUID PRIMARY KEY,
  flag_id TEXT REFERENCES feature_flags(id),
  priority INT NOT NULL, -- Lower = higher priority
  rule_type TEXT NOT NULL, -- 'tenant', 'user', 'percentage', 'always'
  conditions JSONB, -- { "tenant_ids": ["rawdog"] } or { "percentage": 50 }
  value JSONB NOT NULL, -- { "enabled": true } or { "variant": "B" }
  created_at TIMESTAMP DEFAULT NOW()
);

-- Unique constraint on flag + priority
CREATE UNIQUE INDEX idx_flag_rules_priority ON feature_flag_rules(flag_id, priority);

-- Flag evaluation cache (Redis-backed)
-- Key: feature_flag:{flag_id}:{tenant_id}:{user_id}
-- TTL: 60 seconds

-- Audit log
CREATE TABLE feature_flag_audit (
  id UUID PRIMARY KEY,
  flag_id TEXT REFERENCES feature_flags(id),
  action TEXT, -- 'created', 'updated', 'enabled', 'disabled', 'archived'
  previous_value JSONB,
  new_value JSONB,
  changed_by TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);
```

---

### Flag Evaluation Logic

```typescript
async function evaluateFlag(
  flagId: string,
  context: {
    tenantId: string
    userId?: string
    sessionId?: string
    attributes?: Record<string, any>
  }
): Promise<FlagResult> {
  // 1. Check Redis cache
  const cached = await redis.get(`feature_flag:${flagId}:${context.tenantId}:${context.userId}`)
  if (cached) return JSON.parse(cached)

  // 2. Load flag and rules from database
  const flag = await sql`SELECT * FROM feature_flags WHERE id = ${flagId}`
  const rules = await sql`
    SELECT * FROM feature_flag_rules
    WHERE flag_id = ${flagId}
    ORDER BY priority ASC
  `

  // 3. Evaluate rules in priority order
  for (const rule of rules) {
    if (matchesRule(rule, context)) {
      const result = { ...rule.value, matched_rule: rule.id }
      await cacheResult(flagId, context, result)
      return result
    }
  }

  // 4. Return default value
  return flag.default_value
}

function matchesRule(rule: Rule, context: Context): boolean {
  switch (rule.rule_type) {
    case 'tenant':
      return rule.conditions.tenant_ids.includes(context.tenantId)
    case 'user':
      return rule.conditions.user_ids.includes(context.userId)
    case 'percentage':
      const hash = murmurhash3(context.sessionId || context.userId)
      return (hash % 100) < rule.conditions.percentage
    case 'always':
      return true
  }
}
```

---

### API Endpoints

#### List Flags
```
GET /api/admin/feature-flags
Response: { flags: Flag[] }
```

#### Create Flag
```
POST /api/admin/feature-flags
Body: {
  id: "new_checkout_flow",
  name: "New Checkout Flow",
  description: "Streamlined checkout experience",
  flag_type: "percentage",
  default_value: { enabled: false, percentage: 0 }
}
```

#### Update Flag
```
PATCH /api/admin/feature-flags/:id
Body: {
  name: "Updated Name",
  rules: [
    { priority: 1, rule_type: "tenant", conditions: { tenant_ids: ["rawdog"] }, value: { enabled: true } },
    { priority: 2, rule_type: "percentage", conditions: { percentage: 25 }, value: { enabled: true } }
  ]
}
```

#### Evaluate Flag (Client)
```
GET /api/feature-flags/evaluate?flags=new_checkout,feature_x
Headers: X-Tenant-ID, X-User-ID, X-Session-ID
Response: {
  "new_checkout": { enabled: true, variant: "A" },
  "feature_x": { enabled: false }
}
```

---

### Core Flags for Multi-Tenant Platform

| Flag ID | Type | Default | Description |
|---------|------|---------|-------------|
| `new_checkout_flow` | percentage | 0% | New checkout UI |
| `ai_review_moderation` | boolean | false | AI-powered review filtering |
| `wise_payouts` | tenant_list | [] | Enable Wise for tenants |
| `mcp_streaming` | boolean | true | Use streaming MCP transport |
| `inngest_jobs` | percentage | 100% | Use Inngest vs Trigger.dev |
| `new_landing_builder` | boolean | true | New LP builder UI |
| `subscription_v2` | boolean | false | New subscription engine |
| `ab_test_shipping` | tenant_list | [] | Shipping A/B test |
| `creator_portal_v2` | percentage | 0% | New creator portal |
| `advanced_attribution` | tenant_list | [] | ML attribution model |

---

### Client-Side SDK

```typescript
// React hook
import { useFeatureFlag, useFeatureFlags } from '@/lib/feature-flags/client'

function CheckoutPage() {
  const { enabled, loading } = useFeatureFlag('new_checkout_flow')

  if (loading) return <Skeleton />

  return enabled ? <NewCheckout /> : <LegacyCheckout />
}

// Bulk evaluation (preferred for performance)
function App() {
  const flags = useFeatureFlags(['new_checkout', 'ai_reviews', 'subscription_v2'])

  return (
    <FlagProvider value={flags}>
      <Routes />
    </FlagProvider>
  )
}
```

### Server-Side SDK

```typescript
// In API routes or server components
import { evaluateFlag, evaluateFlags } from '@/lib/feature-flags/server'

export async function GET(request: Request) {
  const tenantId = getTenantId(request)
  const userId = getUserId(request)

  const { enabled } = await evaluateFlag('new_checkout_flow', { tenantId, userId })

  if (enabled) {
    return handleNewCheckout()
  }
  return handleLegacyCheckout()
}
```

---

### Gradual Rollout Strategy

#### Percentage-Based Rollout
```
Day 1:  5% rollout (canary)
Day 3:  10% rollout (if metrics stable)
Day 5:  25% rollout
Day 7:  50% rollout
Day 10: 100% rollout
```

#### Tenant-First Rollout
```
Phase 1: Internal testing (demo brand)
Phase 2: Beta tenants (opt-in)
Phase 3: 25% of production tenants
Phase 4: 100% of tenants
```

---

### Metrics & Analytics

#### Track flag evaluations
```sql
CREATE TABLE feature_flag_analytics (
  id BIGSERIAL PRIMARY KEY,
  flag_id TEXT,
  tenant_id TEXT,
  result JSONB, -- { enabled: true, variant: "A" }
  evaluated_at TIMESTAMP DEFAULT NOW()
);

-- Aggregate daily
CREATE TABLE feature_flag_daily_stats (
  flag_id TEXT,
  date DATE,
  tenant_id TEXT,
  evaluations INT,
  enabled_count INT,
  disabled_count INT,
  variant_counts JSONB, -- { "A": 100, "B": 95 }
  PRIMARY KEY (flag_id, date, tenant_id)
);
```

---

### Admin UI Components

#### Flag List View
```
┌─────────────────────────────────────────────────────────────┐
│ Feature Flags                               [+ Create Flag] │
├─────────────────────────────────────────────────────────────┤
│ Filter: [All Types ▼] [All Tenants ▼]                       │
├─────────────────────────────────────────────────────────────┤
│ Flag                    │ Type       │ Status    │ Scope    │
├─────────────────────────────────────────────────────────────┤
│ new_checkout_flow       │ percentage │ 50%       │ Global   │
│ ai_review_moderation    │ boolean    │ ✅ On     │ RAWDOG   │
│ wise_payouts            │ tenant     │ 2/3       │ Select   │
│ mcp_streaming           │ boolean    │ ✅ On     │ Global   │
└─────────────────────────────────────────────────────────────┘
```

#### Flag Detail View
```
┌─────────────────────────────────────────────────────────────┐
│ new_checkout_flow                                [Archive]  │
├─────────────────────────────────────────────────────────────┤
│ Description: New streamlined checkout experience            │
│ Type: Percentage rollout                                    │
│ Created: 2025-01-15 by john@rawdog.com                     │
│                                                             │
│ Rules (evaluated in order):                                 │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 1. Tenant: RAWDOG → Enabled (100%)                      ││
│ │ 2. Percentage: 50% → Enabled                            ││
│ │ 3. Default → Disabled                                   ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Rollout:                                                    │
│ [████████████░░░░░░░░░░░░] 50%                             │
│                                                             │
│ Analytics (Last 7 Days):                                    │
│ ├─ Evaluations: 45,000                                     │
│ ├─ Enabled: 22,500 (50%)                                   │
│ ├─ Conversion Rate (enabled): 4.2%                         │
│ └─ Conversion Rate (disabled): 3.8%                        │
│                                                             │
│ Audit Log:                                                  │
│ ├─ 2025-02-10 10:00 - Rollout increased to 50% (john)     │
│ ├─ 2025-02-08 14:30 - Rollout increased to 25% (john)     │
│ └─ 2025-02-05 09:00 - Flag created (john)                 │
└─────────────────────────────────────────────────────────────┘
```

---

### Implementation Checklist

#### Phase 1: Core Infrastructure
- [ ] Database schema for flags and rules
- [ ] Server-side evaluation function
- [ ] Redis caching layer
- [ ] Basic API endpoints

#### Phase 2: Client SDK
- [ ] React hooks for flag evaluation
- [ ] Bulk evaluation for performance
- [ ] Local development overrides

#### Phase 3: Admin UI
- [ ] Flag list and search
- [ ] Flag creation/editing
- [ ] Rule builder interface
- [ ] Audit log viewer

#### Phase 4: Analytics
- [ ] Evaluation tracking
- [ ] Daily aggregation
- [ ] A/B test integration
- [ ] Conversion impact analysis
