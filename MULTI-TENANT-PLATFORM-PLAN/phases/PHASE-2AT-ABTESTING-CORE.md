# PHASE-2AT: A/B Testing Core

**Status**: COMPLETE
**Completed**: 2026-02-10

**Duration**: 1.5 weeks (Week 12-13)
**Depends On**: PHASE-2B-ADMIN-COMMERCE, PHASE-2PO-FLAGS
**Parallel With**: PHASE-2AT-ABTESTING-STATS
**Blocks**: PHASE-2AT-ABTESTING-ADMIN

---

## Goal

Build the foundational A/B testing infrastructure including test management, variant assignment, visitor tracking, and event attribution. This enables tenants to run experiments on landing pages, pricing, and checkout flows.

---

## Success Criteria

- [ ] Tests can be created with multiple variants (not just A/B, but A/B/C/D/n)
- [ ] Consistent visitor assignment using deterministic hashing
- [ ] Assignment persists across sessions via cookies
- [ ] Events (page_view, add_to_cart, begin_checkout, purchase) track correctly
- [ ] Revenue attribution links orders to test variants
- [ ] Test lifecycle (draft → running → paused → completed) works
- [ ] Multi-armed bandit allocation automatically shifts traffic to winners
- [ ] Targeting rules filter visitors by device, geo, UTM, behavior
- [ ] Test scheduling (start/end dates) with auto-start/stop
- [ ] Tenant isolation enforced on all test data
- [ ] `npx tsc --noEmit` passes

---

## Deliverables

### Database Schema

```sql
-- Core test definition
CREATE TABLE ab_tests (
  id TEXT PRIMARY KEY,  -- ULID
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft, running, paused, completed
  mode TEXT NOT NULL DEFAULT 'manual',   -- manual, mab, thompson
  test_type TEXT NOT NULL DEFAULT 'landing_page',  -- landing_page, shipping, email
  goal_event TEXT NOT NULL,  -- page_view, add_to_cart, begin_checkout, purchase
  optimization_metric TEXT NOT NULL DEFAULT 'revenue_per_visitor',
  confidence_level REAL NOT NULL DEFAULT 0.95,  -- 0.9, 0.95, 0.99
  base_url TEXT NOT NULL,  -- URL pattern to match
  winner_variant_id TEXT,
  is_significant BOOLEAN DEFAULT false,
  traffic_override_variant_id TEXT,  -- Force all traffic to this variant
  shipping_config JSONB,  -- For testType='shipping'
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  scheduled_start_at TIMESTAMPTZ,
  scheduled_end_at TIMESTAMPTZ,
  schedule_timezone TEXT DEFAULT 'America/New_York',
  auto_start BOOLEAN DEFAULT false,
  auto_end BOOLEAN DEFAULT false
);

-- Test variants
CREATE TABLE ab_variants (
  id TEXT PRIMARY KEY,  -- ULID
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- "Control", "Variant A", etc.
  url TEXT,  -- Redirect URL or landing page path
  url_type TEXT DEFAULT 'static',  -- static, landing_page
  landing_page_id TEXT,  -- Reference to landing page builder
  traffic_allocation INTEGER NOT NULL,  -- 0-100 percentage
  is_control BOOLEAN NOT NULL DEFAULT false,
  preserve_query_params BOOLEAN DEFAULT true,
  -- Shipping test fields
  shipping_rate_name TEXT,
  shipping_price_cents INTEGER,
  shipping_suffix TEXT,  -- 'A', 'B', 'C', 'D'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Visitor assignments
CREATE TABLE ab_visitors (
  id TEXT PRIMARY KEY,  -- ULID
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES ab_variants(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,  -- From cookie (21 chars)
  session_id TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Attribution data
  landing_page TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  -- Device/Geo data
  device_type TEXT,  -- desktop, mobile, tablet
  browser TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  user_agent TEXT,
  ip_hash TEXT,  -- Hashed for privacy
  UNIQUE(tenant_id, test_id, visitor_id)
);

-- Event tracking
CREATE TABLE ab_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- page_view, add_to_cart, begin_checkout, purchase
  event_value_cents BIGINT,  -- Revenue for purchase events
  order_id TEXT,
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily aggregated metrics (for fast dashboard queries)
CREATE TABLE ab_daily_metrics (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  date DATE NOT NULL,
  visitors INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  page_views INTEGER NOT NULL DEFAULT 0,
  add_to_carts INTEGER NOT NULL DEFAULT 0,
  begin_checkouts INTEGER NOT NULL DEFAULT 0,
  purchases INTEGER NOT NULL DEFAULT 0,
  revenue_cents BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, test_id, variant_id, date)
);

-- Targeting rules
CREATE TABLE ab_targeting_rules (
  id TEXT PRIMARY KEY,  -- ULID
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  conditions JSONB NOT NULL,  -- Array of conditions
  logic TEXT NOT NULL DEFAULT 'and',  -- and, or
  action TEXT NOT NULL,  -- include, exclude, assign_variant
  assigned_variant_id TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exclusion groups (prevent users from being in multiple tests)
CREATE TABLE ab_exclusion_groups (
  id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ab_test_exclusion_groups (
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  exclusion_group_id TEXT NOT NULL REFERENCES ab_exclusion_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (test_id, exclusion_group_id)
);

-- Indexes
CREATE INDEX idx_ab_tests_tenant_status ON ab_tests(tenant_id, status);
CREATE INDEX idx_ab_visitors_lookup ON ab_visitors(tenant_id, test_id, visitor_id);
CREATE INDEX idx_ab_events_test ON ab_events(tenant_id, test_id, created_at);
CREATE INDEX idx_ab_daily_metrics_lookup ON ab_daily_metrics(tenant_id, test_id, date);
```

### Core Library

```
packages/ab-testing/
├── src/
│   ├── index.ts                 # Public exports
│   ├── types.ts                 # Type definitions
│   ├── config.ts                # Configuration
│   │
│   ├── assignment/
│   │   ├── hash.ts              # Deterministic hashing (MurmurHash3)
│   │   ├── allocate.ts          # Traffic allocation algorithm
│   │   ├── assign.ts            # Visitor assignment logic
│   │   └── cookies.ts           # Cookie management
│   │
│   ├── targeting/
│   │   ├── evaluate.ts          # Rule evaluation engine
│   │   ├── conditions.ts        # Condition matchers
│   │   └── geo.ts               # Geo detection (IP-based)
│   │
│   ├── tracking/
│   │   ├── events.ts            # Event recording
│   │   ├── attribution.ts       # Order attribution
│   │   └── cart-bridge.ts       # Cart attribute injection
│   │
│   ├── algorithms/
│   │   ├── manual.ts            # Fixed allocation
│   │   ├── thompson.ts          # Thompson Sampling (MAB)
│   │   └── epsilon-greedy.ts    # Epsilon-greedy (optional)
│   │
│   ├── scheduler/
│   │   ├── service.ts           # Test scheduling logic
│   │   └── cron.ts              # Scheduled start/stop
│   │
│   └── db/
│       ├── schema.ts            # Schema definitions
│       ├── queries.ts           # Database operations
│       ├── mappers.ts           # DB ↔ Type mappers
│       └── redis.ts             # Redis caching
└── package.json
```

### Visitor Assignment Algorithm

```typescript
// packages/ab-testing/src/assignment/hash.ts

/**
 * MurmurHash3 for consistent visitor assignment.
 * Same visitor + same test = same variant every time.
 */
export function murmurHash3(key: string, seed: number = 0): number {
  // Implementation of MurmurHash3
}

/**
 * Assign visitor to variant based on hash and traffic allocation.
 */
export function assignVariant(
  visitorId: string,
  testId: string,
  variants: Variant[]
): Variant {
  // Hash visitor+test to get consistent 0-1 value
  const hash = murmurHash3(`${visitorId}:${testId}`)
  const normalizedHash = hash / 0xffffffff  // 0-1 range

  // Walk through variants by allocation
  let cumulativeAllocation = 0
  for (const variant of variants) {
    cumulativeAllocation += variant.trafficAllocation / 100
    if (normalizedHash < cumulativeAllocation) {
      return variant
    }
  }

  // Fallback to control (shouldn't happen with valid allocations)
  return variants.find(v => v.isControl) || variants[0]
}
```

### Multi-Armed Bandit (Thompson Sampling)

```typescript
// packages/ab-testing/src/algorithms/thompson.ts

/**
 * Thompson Sampling for dynamic traffic allocation.
 * Automatically shifts traffic toward winning variants.
 */
export function thompsonSample(variants: VariantStats[]): Variant {
  const samples: { variant: Variant; sample: number }[] = []

  for (const v of variants) {
    // Beta distribution sampling
    // alpha = conversions + 1
    // beta = visitors - conversions + 1
    const alpha = v.conversions + 1
    const beta = v.visitors - v.conversions + 1
    const sample = betaSample(alpha, beta)
    samples.push({ variant: v.variant, sample })
  }

  // Select variant with highest sample
  samples.sort((a, b) => b.sample - a.sample)
  return samples[0].variant
}

/**
 * Update allocations based on Thompson Sampling.
 * Run periodically (e.g., every hour) to rebalance traffic.
 */
export async function updateMabAllocations(
  tenantId: string,
  testId: string
): Promise<void> {
  const stats = await getVariantStats(tenantId, testId)

  // Sample 1000 times to estimate allocation
  const samples: Record<string, number> = {}
  for (const v of stats) samples[v.variant.id] = 0

  for (let i = 0; i < 1000; i++) {
    const winner = thompsonSample(stats)
    samples[winner.id]++
  }

  // Update allocations
  for (const v of stats) {
    const newAllocation = Math.round((samples[v.variant.id] / 1000) * 100)
    await updateVariantAllocation(tenantId, testId, v.variant.id, newAllocation)
  }
}
```

### Targeting Rule Evaluation

```typescript
// packages/ab-testing/src/targeting/evaluate.ts

export interface VisitorContext {
  visitorId: string
  url: string
  referrer?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  deviceType?: 'desktop' | 'mobile' | 'tablet'
  browser?: string
  country?: string
  region?: string
  city?: string
  cookies?: Record<string, string>
}

export type TargetingResult =
  | { action: 'include' }
  | { action: 'exclude' }
  | { action: 'assign_variant'; variantId: string }
  | { action: 'default' }

export function evaluateTargeting(
  rules: TargetingRule[],
  context: VisitorContext
): TargetingResult {
  // Sort by priority (higher first)
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)

  for (const rule of sortedRules) {
    if (matchesRule(rule, context)) {
      return {
        action: rule.action,
        variantId: rule.action === 'assign_variant' ? rule.assignedVariantId : undefined
      } as TargetingResult
    }
  }

  return { action: 'default' }
}

function matchesRule(rule: TargetingRule, context: VisitorContext): boolean {
  const results = rule.conditions.map(c => matchesCondition(c, context))

  if (rule.logic === 'and') {
    return results.every(r => r)
  } else {
    return results.some(r => r)
  }
}
```

### Cookie Structure

```typescript
// packages/ab-testing/src/assignment/cookies.ts

export interface ABCookie {
  v: string  // Visitor ID (21 chars, ULID-style)
  t: {       // Test assignments
    [testId: string]: {
      var: string   // Variant ID
      at: number    // Assigned timestamp (Unix)
      sh?: string   // Shipping suffix (for shipping tests)
    }
  }
}

export const AB_COOKIE_NAME = '_ab'
export const AB_COOKIE_MAX_AGE = 365 * 24 * 60 * 60  // 1 year

export function parseABCookie(cookie: string | undefined): ABCookie | null {
  if (!cookie) return null
  try {
    return JSON.parse(atob(cookie))
  } catch {
    return null
  }
}

export function serializeABCookie(cookie: ABCookie): string {
  return btoa(JSON.stringify(cookie))
}

export function getOrCreateVisitorId(cookies: ABCookie | null): string {
  if (cookies?.v) return cookies.v
  return generateULID()
}
```

---

## Constraints

- Visitor IDs MUST be deterministic and persist for 1 year
- Assignment algorithm MUST be consistent (same input = same output)
- All test data MUST be tenant-isolated
- Events MUST be recorded in real-time (< 100ms latency)
- MAB reallocations should run periodically (not on every request)
- Cookie size MUST stay under 4KB even with many active tests

---

## Pattern References

**Skills to invoke:**
- None for this phase (backend/logic only)

**MCPs to consult:**
- Context7 MCP: Statistical testing libraries, hashing algorithms

**RAWDOG code to reference:**
- `src/lib/ab-testing/types.ts` - Complete type definitions
- `src/lib/ab-testing/assignment.ts` - Assignment logic
- `src/lib/ab-testing/cookies.ts` - Cookie management
- `src/lib/ab-testing/algorithms/allocation.ts` - MAB implementation
- `src/lib/ab-testing/db/` - Database patterns

**Spec documents:**
- `CODEBASE-ANALYSIS/DATABASE-SCHEMA-2025-02-10.md` - Schema patterns

---

## AI Discretion Areas

The implementing agent should determine:
1. Hashing algorithm choice (MurmurHash3, xxHash, or simpler)
2. Cookie compression strategy if size becomes an issue
3. Redis caching strategy for hot test lookups
4. Event batching vs. real-time insertion trade-offs
5. MAB reallocation frequency (hourly, 15-min, etc.)

---

## Tasks

### [PARALLEL] Database Schema
- [ ] Create migration files for all A/B testing tables
- [ ] Add tenant_id foreign keys and indexes
- [ ] Create db/queries.ts with tenant-scoped operations
- [ ] Add db/mappers.ts for type conversions

### [PARALLEL] Assignment Engine
- [ ] Implement MurmurHash3 hashing function
- [ ] Build assignVariant() with allocation logic
- [ ] Create cookie parsing and serialization
- [ ] Add getOrCreateVisitorId() function
- [ ] Wire up assignment persistence to database

### [PARALLEL] Targeting Engine
- [ ] Create condition matchers for all targeting types
- [ ] Build rule evaluation with AND/OR logic
- [ ] Add geo detection from IP (using free MaxMind DB or similar)
- [ ] Implement device/browser detection from User-Agent

### [SEQUENTIAL after assignment] MAB Algorithm
- [ ] Implement Thompson Sampling
- [ ] Build allocation update function
- [ ] Create background task for periodic reallocation
- [ ] Add exploration/exploitation balance config

### [SEQUENTIAL after targeting] Test Scheduler
- [ ] Build scheduled start/stop logic
- [ ] Create cron task for checking schedules
- [ ] Implement timezone-aware scheduling
- [ ] Add auto-start/auto-end configuration

---

## Definition of Done

- [ ] Tests can be created with 2+ variants
- [ ] Visitors get consistent assignment across sessions
- [ ] Targeting rules correctly include/exclude visitors
- [ ] Events record in < 100ms
- [ ] MAB automatically shifts traffic toward winners
- [ ] Scheduled tests start/stop at configured times
- [ ] All data is tenant-isolated
- [ ] `npx tsc --noEmit` passes
