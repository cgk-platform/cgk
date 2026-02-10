# Phase 2B: Platform Operations Systems

**Timeline**: Weeks 8-10
**Status**: Not Started
**Depends On**: Phase 1 (Foundation), Phase 2A (Super Admin shell)

---

## Required Reading Before Starting

**Planning docs location**: `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/`

| Document | Full Path |
|----------|-----------|
| HEALTH-MONITORING-SPEC | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/HEALTH-MONITORING-SPEC-2025-02-10.md` |
| LOGGING-SPEC | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/LOGGING-SPEC-2025-02-10.md` |
| FEATURE-FLAGS-SPEC | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/FEATURE-FLAGS-SPEC-2025-02-10.md` |
| BRAND-ONBOARDING-SPEC | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/BRAND-ONBOARDING-SPEC-2025-02-10.md` |

---

## Overview

Phase 2B implements the cross-cutting platform operations systems: Health Monitoring, Structured Logging, Feature Flags, and Brand Onboarding. These systems span all tenants and are managed from the Super Admin Dashboard.

**Reference Specs**:
- `HEALTH-MONITORING-SPEC-2025-02-10.md`
- `LOGGING-SPEC-2025-02-10.md`
- `FEATURE-FLAGS-SPEC-2025-02-10.md`
- `BRAND-ONBOARDING-SPEC-2025-02-10.md`

---

## Deliverables

### Week 8: Health Monitoring & Logging

#### Health Monitoring System

**Service Monitors** (15+ services):
- [ ] Database monitor (PostgreSQL)
- [ ] Redis monitor
- [ ] Shopify monitor (per-tenant)
- [ ] Stripe monitor
- [ ] Inngest monitor
- [ ] MCP Server monitor
- [ ] Wise API monitor
- [ ] Meta Ads monitor (per-tenant)
- [ ] Google Ads monitor (per-tenant)
- [ ] Mux monitor
- [ ] AssemblyAI monitor
- [ ] Slack monitor
- [ ] Yotpo monitor
- [ ] Loop monitor
- [ ] Vercel monitor

**Scheduling Tiers**:
| Tier | Interval | Services |
|------|----------|----------|
| Critical | 1 min | Database, Redis |
| Core | 5 min | Shopify, Stripe, Inngest |
| Integrations | 15 min | Meta, Google Ads, Wise, MCP |
| External | 30 min | Mux, AssemblyAI, Slack, Yotpo, Loop |

**Alert System**:
- [ ] Alert thresholds configuration
- [ ] Slack integration
- [ ] Email alerts
- [ ] PagerDuty integration (optional)
- [ ] Alert acknowledgment/resolution workflow

**Database Schema**:
```sql
CREATE TABLE public.platform_alerts (...)
CREATE TABLE public.health_check_history (...)
```

#### Structured Logging System

**Log Levels & Retention**:
| Level | Stored | Dashboard | Retention |
|-------|--------|-----------|-----------|
| ERROR | Yes | Real-time stream | 30 days |
| WARN | Yes | Aggregated view | 14 days |
| INFO | Yes | On-demand query | 7 days |
| DEBUG | Conditional | No | 1 day |

**Required Log Context**:
```typescript
interface LogEntry {
  id: string
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug'
  tenantId: string | null
  tenantSlug: string | null
  userId: string | null
  requestId: string
  service: LogService
  action: string
  message: string
  data: Record<string, unknown>
  // ... error fields for error level
}
```

**Deliverables**:
- [ ] `PlatformLogger` class with buffering
- [ ] PostgreSQL partitioned storage
- [ ] Redis real-time streaming
- [ ] WebSocket log stream endpoint
- [ ] Error aggregation with pattern matching
- [ ] Log viewer UI with filters

**Database Schema**:
```sql
CREATE TABLE public.platform_logs (...) PARTITION BY RANGE (timestamp);
-- Monthly partitions
```

---

### Week 9: Feature Flags

**Flag Types**:
| Type | Description | Example |
|------|-------------|---------|
| `boolean` | Simple on/off | `maintenance_mode: true` |
| `percentage` | Gradual rollout | `new_checkout: 25` |
| `tenant_list` | Specific tenants | `wise_payouts: ["rawdog"]` |
| `user_list` | Specific users | `beta_features: ["user_123"]` |
| `schedule` | Time-based | `holiday_theme: {start, end}` |
| `variant` | A/B variants | `checkout_flow: "v2"` |

**Deliverables**:
- [ ] `feature_flags` table with all flag types
- [ ] `feature_flag_overrides` table (per-tenant/user)
- [ ] `feature_flag_audit` table
- [ ] Consistent hashing for rollouts
- [ ] Multi-layer caching (memory 10s, Redis 60s)
- [ ] Cache invalidation with pub/sub
- [ ] React `useFlag` hook
- [ ] Server-side `isEnabled()` helper
- [ ] Flag management UI in orchestrator
- [ ] Rollout slider with presets
- [ ] Emergency kill switch
- [ ] Staged rollout automation

**Core Evaluation Logic**:
```typescript
export async function evaluateFlag(
  flagKey: string,
  context: EvaluationContext
): Promise<EvaluationResult>
```

**Evaluation Order**:
1. Flag disabled/archived → return default
2. Schedule check → outside window returns default
3. User override (highest priority)
4. Tenant override
5. Disabled tenants list
6. Enabled tenants list
7. Enabled users list
8. Percentage rollout
9. Variant selection
10. Default value

**Platform Flags to Seed**:
- `platform.maintenance_mode`
- `platform.new_tenant_signup`
- `checkout.new_flow`
- `checkout.express_pay`
- `payments.wise_enabled`
- `payments.instant_payouts`
- `mcp.streaming_enabled`
- `mcp.tools_v2`
- `ai.review_moderation`
- `ai.product_descriptions`
- `creators.v2_portal`
- `creators.self_service_onboarding`
- `admin.realtime_dashboard`
- `admin.ai_insights`

---

### Week 10: Brand Onboarding Wizard

**7-Step Wizard**:

| Step | Name | Required | Description |
|------|------|----------|-------------|
| 1 | Basic Information | Yes | Brand name, slug, domain, colors |
| 2 | Connect Shopify | Yes | OAuth flow, webhook setup |
| 3 | Configure Payments | Conditional | Stripe Connect, Wise setup |
| 4 | Enable Features | Yes | Module toggles, feature flags |
| 5 | Invite Users | No | Initial admin invitations |
| 6 | Import Data | No | Historical data import |
| 7 | Review & Launch | Yes | Verification and go-live |

**Deliverables**:
- [ ] `onboarding_sessions` table
- [ ] Step 1: Basic info form with slug validation
- [ ] Step 2: Shopify OAuth with scope selection
- [ ] Step 3: Stripe Connect + Wise setup
- [ ] Step 4: Feature module toggles
- [ ] Step 5: User invitation sending
- [ ] Step 6: Shopify data import job
- [ ] Step 7: Launch checklist verification
- [ ] `useOnboarding` React hook for wizard state
- [ ] Session persistence across page reloads
- [ ] Resume capability for abandoned sessions
- [ ] Post-onboarding welcome email
- [ ] Guided tour for new admin users

**Database Extensions**:
```sql
CREATE TABLE public.onboarding_sessions (...)
ALTER TABLE public.organizations ADD COLUMN onboarding_status ...
ALTER TABLE public.organizations ADD COLUMN setup_checklist ...
```

---

## API Routes

### Health Monitoring
```
/api/platform/health/
├── route.ts                  # GET master health status
├── [service]/route.ts        # GET per-service health
├── matrix/route.ts           # GET cross-tenant matrix
└── tenant/[id]/route.ts      # GET tenant health
```

### Logging
```
/api/platform/logs/
├── route.ts                  # GET/query logs
├── stream/route.ts           # WebSocket real-time
└── aggregates/route.ts       # GET error aggregates
```

### Feature Flags
```
/api/platform/flags/
├── route.ts                  # GET list, POST create
├── [key]/
│   ├── route.ts              # GET, PATCH, DELETE
│   └── overrides/route.ts    # GET, POST overrides
└── evaluate/route.ts         # POST evaluate flag(s)
```

### Onboarding
```
/api/platform/onboarding/
├── route.ts                  # POST create session
├── [id]/route.ts             # GET session
└── [id]/step/route.ts        # POST step completion

/api/platform/brands/
├── onboard/step-1/route.ts   # POST create org
├── launch/route.ts           # POST launch brand
└── ...
```

---

## Page Structure

```
apps/orchestrator/src/app/
├── ops/
│   ├── errors/page.tsx       # Error explorer
│   ├── logs/page.tsx         # Log viewer
│   ├── health/page.tsx       # Health matrix
│   └── jobs/page.tsx         # Job monitoring
├── flags/
│   ├── page.tsx              # Flag list
│   ├── new/page.tsx          # Create flag
│   ├── rollouts/page.tsx     # Active rollouts
│   ├── audit/page.tsx        # Audit log
│   └── [key]/page.tsx        # Flag editor
└── brands/
    └── new/
        ├── page.tsx          # Wizard container
        ├── step-1/page.tsx   # Basic info
        ├── step-2/page.tsx   # Shopify
        ├── step-3/page.tsx   # Payments
        ├── step-4/page.tsx   # Features
        ├── step-5/page.tsx   # Users
        ├── step-6/page.tsx   # Import
        └── step-7/page.tsx   # Launch
```

---

## Packages Created

### `packages/health/`
```
src/
├── monitors/
│   ├── database.ts
│   ├── redis.ts
│   ├── shopify.ts
│   ├── stripe.ts
│   ├── inngest.ts
│   └── ...
├── thresholds.ts
├── evaluator.ts
├── alerts/
│   ├── channels.ts
│   └── dispatch.ts
├── scheduler.ts
└── cache.ts
```

### `packages/logging/`
```
src/
├── logger.ts                 # PlatformLogger class
├── factory.ts                # createLogger, createRequestLogger
├── types.ts                  # LogEntry, LogContext
├── config.ts                 # Level config per environment
├── redis-stream.ts           # Real-time streaming
├── retention.ts              # Cleanup jobs
└── error-aggregation.ts      # Pattern matching
```

### `packages/feature-flags/`
```
src/
├── evaluate.ts               # Core evaluation logic
├── hash.ts                   # Consistent hashing
├── cache.ts                  # Multi-layer caching
├── server.ts                 # Server-side helpers
├── react.tsx                 # FlagProvider, useFlag
├── platform-flags.ts         # Pre-defined flags
└── seed.ts                   # Flag seeder
```

---

## Success Criteria

### Health Monitoring
- [ ] All 15+ service monitors implemented
- [ ] Health matrix showing cross-tenant status
- [ ] Alert thresholds configurable per service
- [ ] Slack/email alerts delivering reliably
- [ ] 30-day health history retention
- [ ] <5 second dashboard refresh

### Logging
- [ ] All services using structured logging
- [ ] Tenant context in every log entry
- [ ] Real-time log stream working
- [ ] Error aggregation with pattern matching
- [ ] Full-text search on log messages
- [ ] Retention policies enforced automatically
- [ ] <1 second query response for recent logs

### Feature Flags
- [ ] All 6 flag types working
- [ ] Consistent hashing for stable rollouts
- [ ] Multi-layer caching with invalidation
- [ ] Flag UI with rollout controls
- [ ] Emergency kill switch working
- [ ] Full audit trail of all changes
- [ ] <10ms flag evaluation time

### Brand Onboarding
- [ ] All 7 wizard steps complete
- [ ] Shopify OAuth flow working
- [ ] Stripe Connect integration working
- [ ] Feature toggles saving correctly
- [ ] User invitations sending
- [ ] Data import from Shopify working
- [ ] Launch verification checks passing
- [ ] Session persistence across reloads

---

## Dependencies

**Required Before Implementation:**
- Phase 1 database schema
- Phase 1 authentication
- Phase 2A super admin shell (for UI placement)
- Inngest setup for scheduled checks

**Can Be Parallelized:**
- Health monitoring and logging (Week 8)
- Feature flags is independent (Week 9)
- Onboarding depends on Shopify/Stripe OAuth (Week 10)

---

## Integration Points

### With Super Admin Dashboard (Phase 2A)
- Health matrix in `/ops/health`
- Log viewer in `/ops/logs`
- Error explorer in `/ops/errors`
- Flag management in `/flags`
- Brand creation in `/brands/new`

### With Brand Admin (Phase 2)
- Logger used in all API routes
- Feature flags evaluated per-tenant
- Health checks run per-tenant

### With Inngest (Phase 5)
- Health check scheduler
- Log retention cleanup
- Staged rollout automation

---

## Testing Requirements

- [ ] Unit: All health monitors
- [ ] Unit: Log entry creation
- [ ] Unit: Flag evaluation logic
- [ ] Unit: Consistent hashing
- [ ] Integration: Alert dispatch
- [ ] Integration: Log streaming
- [ ] Integration: Flag caching
- [ ] E2E: Complete onboarding flow
- [ ] E2E: Flag rollout with caching
- [ ] E2E: Health monitoring and alerting
