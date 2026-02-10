# PHASE-2PO-FLAGS: Feature Flags System

**Duration**: Week 9 (5 days)
**Depends On**: Phase 1 (database, auth), Phase 2A (super admin shell for UI)
**Parallel With**: None
**Blocks**: None (storefronts and admin can use flags once available)

---

## Goal

Implement a comprehensive feature flag system with 6 flag types, consistent hashing for stable rollouts, multi-layer caching (memory 10s, Redis 60s), and a full management UI with emergency kill switch.

---

## Success Criteria

- [ ] All 6 flag types working (boolean, percentage, tenant_list, user_list, schedule, variant)
- [ ] Consistent hashing produces stable rollout assignments
- [ ] Multi-layer caching with proper invalidation via pub/sub
- [ ] Flag management UI with rollout slider and presets
- [ ] Emergency kill switch disables flag immediately
- [ ] Full audit trail of all flag changes
- [ ] React `useFlag` hook working in client components
- [ ] Server-side `isEnabled()` helper working in API routes
- [ ] All 14 platform flags seeded
- [ ] Flag evaluation under 10ms

---

## Deliverables

### Flag Types

| Type | Description | Example |
|------|-------------|---------|
| `boolean` | Simple on/off | `maintenance_mode: true` |
| `percentage` | Gradual rollout | `new_checkout: 25` (25% of users) |
| `tenant_list` | Specific tenants enabled | `wise_payouts: ["rawdog", "brandx"]` |
| `user_list` | Specific users enabled | `beta_features: ["user_123"]` |
| `schedule` | Time-based enablement | `holiday_theme: {start, end}` |
| `variant` | A/B test variants | `checkout_flow: "v2"` |

### Database Tables

- `feature_flags` - Flag definitions with all targeting options
- `feature_flag_overrides` - Per-tenant/user overrides with expiry
- `feature_flag_audit` - Complete change history

### Evaluation Order (Critical)

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

### Platform Flags to Seed (14 required)

1. `platform.maintenance_mode` - Enable maintenance page
2. `platform.new_tenant_signup` - Allow new brand creation
3. `checkout.new_flow` - New checkout experience (percentage)
4. `checkout.express_pay` - Apple Pay / Google Pay
5. `payments.wise_enabled` - Wise for international payouts (tenant_list)
6. `payments.instant_payouts` - Instant payout option
7. `mcp.streaming_enabled` - MCP streaming transport
8. `mcp.tools_v2` - New tool implementations (percentage)
9. `ai.review_moderation` - AI auto-moderate reviews
10. `ai.product_descriptions` - AI product descriptions
11. `creators.v2_portal` - Redesigned creator portal (tenant_list)
12. `creators.self_service_onboarding` - No admin approval needed
13. `admin.realtime_dashboard` - WebSocket dashboard updates
14. `admin.ai_insights` - AI business insights (percentage)

### Package Structure

```
packages/feature-flags/
  evaluate.ts       - Core evaluation logic with all rules
  hash.ts           - Consistent hashing for rollouts
  cache.ts          - Multi-layer caching with invalidation
  server.ts         - isEnabled(), getVariant(), getAllFlags()
  react.tsx         - FlagProvider, useFlag, useFlags hooks
  platform-flags.ts - Pre-defined flag definitions
  seed.ts           - Flag seeder function
```

### API Routes

```
/api/platform/flags/
  route.ts              - GET list, POST create
  [key]/
    route.ts            - GET, PATCH, DELETE
    overrides/route.ts  - GET, POST overrides
  evaluate/route.ts     - POST evaluate flag(s)
```

### UI Pages

```
apps/orchestrator/src/app/flags/
  page.tsx          - Flag list with filters
  new/page.tsx      - Create flag form
  rollouts/page.tsx - Active rollouts view
  audit/page.tsx    - Audit log
  [key]/page.tsx    - Flag editor with tabs
```

---

## Constraints

- Flag keys MUST match pattern `^[a-z][a-z0-9._]+$`
- Percentage salt MUST be unique per flag (for independent rollouts)
- Memory cache TTL: 10 seconds
- Redis cache TTL: 60 seconds
- Cache invalidation via Redis pub/sub to all instances
- Kill switch MUST log emergency action to audit

---

## Pattern References

**Spec documents:**
- `FEATURE-FLAGS-SPEC-2025-02-10.md` - Complete implementation details

**RAWDOG code to reference:**
- `/src/lib/subscriptions/feature-flag.ts` - Simple toggle pattern (extend this)

**MCPs to consult:**
- Context7 MCP: "Redis pub/sub patterns"
- Context7 MCP: "Consistent hashing algorithms"

---

## AI Discretion Areas

The implementing agent should determine:
1. Whether to use xxhash or sha256 for consistent hashing
2. Optimal memory cache implementation (Map vs LRU)
3. Whether variant weights should sum to 100 or be relative
4. Flag archive vs hard delete strategy

---

## Tasks

### [PARALLEL] Database Setup
- [ ] Create `feature_flags` table with all columns and indexes
- [ ] Create `feature_flag_overrides` table with constraints
- [ ] Create `feature_flag_audit` table with indexes

### [PARALLEL] Core Evaluation
- [ ] Implement `EvaluationContext` and `EvaluationResult` types
- [ ] Implement `evaluateFlag()` with full evaluation order
- [ ] Implement schedule window checking
- [ ] Implement override lookup (user, then tenant)
- [ ] Implement targeting list checks

### [PARALLEL with evaluation] Hashing
- [ ] Implement `computeRolloutHash()` for percentage rollouts
- [ ] Implement `selectVariant()` for weighted variant selection
- [ ] Ensure hash is deterministic for same inputs

### [SEQUENTIAL after evaluation] Caching
- [ ] Implement in-memory cache with 10s TTL
- [ ] Implement Redis cache with 60s TTL
- [ ] Implement `getFlag()` with multi-layer lookup
- [ ] Implement `invalidateFlag()` for cache clearing
- [ ] Implement pub/sub subscriber for cross-instance invalidation

### [SEQUENTIAL after caching] Server SDK
- [ ] Implement `isEnabled()` helper
- [ ] Implement `getVariant()` helper
- [ ] Implement `getAllFlags()` for bulk evaluation

### [PARALLEL with server SDK] React SDK
- [ ] Implement `FlagContext` and `FlagProvider`
- [ ] Implement `useFlag()` hook with type inference
- [ ] Implement `useFlags()` hook for all flags
- [ ] Add loading state handling

### [SEQUENTIAL after evaluation] API Routes
- [ ] Implement flag CRUD endpoints
- [ ] Implement override management endpoints
- [ ] Implement evaluation endpoint
- [ ] Add audit logging to all mutations

### [SEQUENTIAL after APIs] UI Components
- [ ] Build flag list table with category filter
- [ ] Build flag editor with tabs (settings, targeting, rollout, overrides, history)
- [ ] Build rollout slider with presets (0, 10, 25, 50, 75, 100)
- [ ] Build staged rollout automation trigger
- [ ] Build emergency kill switch with confirmation dialog
- [ ] Build override management table
- [ ] Build audit log timeline

### [SEQUENTIAL after SDK] Flag Seeding
- [ ] Define all 14 platform flags in `platform-flags.ts`
- [ ] Implement `seedPlatformFlags()` function
- [ ] Add seed check to app initialization

---

## Definition of Done

- [ ] All 6 flag types evaluate correctly
- [ ] Hash produces consistent results across requests
- [ ] Cache invalidation propagates to all instances
- [ ] Kill switch disables flag within 1 second
- [ ] Audit log records all changes with user, timestamp, before/after
- [ ] All 14 platform flags seeded on first run
- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests for evaluation logic pass
- [ ] Unit tests for consistent hashing pass
- [ ] Integration test for cache invalidation passes
