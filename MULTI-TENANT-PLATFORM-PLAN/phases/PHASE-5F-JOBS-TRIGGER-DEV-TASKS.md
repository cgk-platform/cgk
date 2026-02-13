# PHASE-5F: Trigger.dev Task Integration

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Duration**: 3-4 days (Week 26-27)
**Depends On**: PHASE-5A through PHASE-5E (all handlers complete), PHASE-6B (MCP complete)
**Parallel With**: None
**Blocks**: PHASE-7A (Migration Testing - needs working jobs)

---

## Prerequisites (Run Before Starting Phase 5F)

### 1. Generate Encryption Keys

The jobs package needs access to tenant credentials via `@cgk-platform/integrations`. These credentials are encrypted using `INTEGRATION_ENCRYPTION_KEY`.

Run from repo root:

```bash
./scripts/generate-encryption-keys.sh > .env.generated
```

### 2. Add Keys to Vercel

```bash
./scripts/add-encryption-keys-to-vercel.sh
```

### 3. Pull Keys Locally

```bash
pnpm env:pull
```

### 4. Configure Trigger.dev Env Sync

The trigger.config.ts already includes `syncVercelEnvVars()` extension. For this to work during `npx trigger deploy`, you need Vercel API access.

Create `packages/jobs/.env.development.local`:

```bash
# Get from: https://vercel.com/account/tokens
VERCEL_ACCESS_TOKEN=your-token-from-vercel-dashboard

# Get from: vercel project ls (or Vercel dashboard)
VERCEL_PROJECT_ID=prj_xxxx
```

### 5. Verify Configuration

```bash
# Check encryption key is present
grep INTEGRATION_ENCRYPTION_KEY apps/admin/.env.local

# Dry-run deploy to verify config
cd packages/jobs && npx trigger deploy --dry-run
```

### 6. Install Trigger.dev CLI (if not installed)

```bash
pnpm add -D trigger.dev @trigger.dev/sdk
```

---

## Goal

Wire the 240 job handlers from `@cgk-platform/jobs` to actual Trigger.dev task definitions. Without this phase, the background jobs infrastructure is an abstraction layer only - jobs cannot actually execute.

---

## Current State

**What exists:**
- `packages/jobs/` - Abstraction layer with 240 handlers
- `packages/jobs/src/providers/trigger-dev.ts` - API client
- Event types, middleware, business logic

**What's missing:**
- `trigger.config.ts` - Trigger.dev project configuration
- `src/trigger/*.ts` - Actual task files using `@trigger.dev/sdk`
- Task registration with Trigger.dev platform

---

## Success Criteria

- [ ] `trigger.config.ts` configured for the project
- [ ] All 240 handlers wrapped in Trigger.dev `task()` definitions
- [ ] Tasks organized by category (commerce, creators, analytics, scheduled)
- [ ] Scheduled tasks use `schedules.task()` with correct cron expressions
- [ ] `npx trigger dev` runs successfully in development
- [ ] `npx trigger deploy` deploys to Trigger.dev cloud
- [ ] At least 5 end-to-end job executions verified working
- [ ] `npx tsc --noEmit` passes

---

## Deliverables

### 1. Trigger.dev Configuration

Create `apps/admin/trigger.config.ts` (or dedicated `apps/jobs/`):

```typescript
import { defineConfig } from '@trigger.dev/sdk/v3'

export default defineConfig({
  project: 'cgk-platform',
  runtime: 'node',
  logLevel: 'info',
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 60000,
    },
  },
  dirs: ['./src/trigger'],
})
```

### 2. Task File Structure

```
apps/admin/src/trigger/
├── index.ts                    # Re-exports all tasks
├── commerce/
│   ├── order-sync.ts          # Order sync tasks
│   ├── review-email.ts        # Review email queue
│   ├── ab-testing.ts          # A/B testing tasks
│   └── product-sync.ts        # Product/customer sync
├── creators/
│   ├── payout-processing.ts   # Payout orchestration
│   ├── communications.ts      # Email sequences
│   └── applications.ts        # Application workflow
├── analytics/
│   ├── attribution.ts         # Attribution processing
│   ├── metrics.ts             # Metrics aggregation
│   └── ad-platforms.ts        # GA4, Meta CAPI
└── scheduled/
    ├── health-checks.ts       # Critical & full health
    ├── digests.ts             # Daily/weekly digests
    ├── alerts.ts              # Alert system
    ├── subscriptions.ts       # Billing processing
    └── maintenance.ts         # Cleanup tasks
```

### 3. Task Pattern

Each task wraps a handler from `@cgk-platform/jobs`:

```typescript
// apps/admin/src/trigger/commerce/order-sync.ts
import { task } from '@trigger.dev/sdk/v3'
import { withTenant } from '@cgk-platform/db'
import type { TenantEvent, SyncOrderPayload } from '@cgk-platform/jobs'

export const syncOrderTask = task({
  id: 'commerce-sync-order',
  retry: {
    maxAttempts: 5,
    factor: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: TenantEvent<SyncOrderPayload>) => {
    const { tenantId, orderId, shopifyOrderId, source } = payload

    // CRITICAL: Tenant isolation
    return withTenant(tenantId, async () => {
      // Import and call the handler logic
      const { syncOrder } = await import('@cgk-platform/jobs/handlers/commerce')
      return syncOrder({ tenantId, orderId, shopifyOrderId, source })
    })
  },
})
```

### 4. Scheduled Task Pattern

```typescript
// apps/admin/src/trigger/scheduled/health-checks.ts
import { schedules } from '@trigger.dev/sdk/v3'
import { sql } from '@cgk-platform/db'

export const criticalHealthCheck = schedules.task({
  id: 'ops-health-check-critical',
  cron: '* * * * *', // Every minute
  run: async () => {
    // Check critical services
    const checks = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkStripe(),
    ])

    const failed = checks.filter(c => !c.healthy)
    if (failed.length > 0) {
      await sendCriticalAlert(failed)
    }

    return { healthy: failed.length === 0, checks }
  },
})

export const fullHealthCheck = schedules.task({
  id: 'ops-health-check-full',
  cron: '*/5 * * * *', // Every 5 minutes
  run: async () => {
    // Full system health check
    // ...
  },
})
```

### 5. Event-Triggered Tasks

For webhook-triggered jobs:

```typescript
// apps/admin/src/trigger/commerce/order-sync.ts
import { task } from '@trigger.dev/sdk/v3'

// This task is triggered via API when Shopify webhook fires
export const orderCreatedTask = task({
  id: 'commerce-order-created',
  queue: {
    name: 'order-processing',
    concurrencyLimit: 10, // Per-tenant limit
  },
  run: async (payload: TenantEvent<OrderCreatedPayload>) => {
    // Process order
  },
})
```

---

## Task Categories & Counts

| Category | Event Tasks | Scheduled Tasks | Total |
|----------|-------------|-----------------|-------|
| Commerce | 46 | 8 | 54 |
| Creators | 46 | 6 | 52 |
| Analytics | 26 | 8 | 34 |
| Scheduled | 40 | 60 | 100 |
| **Total** | **158** | **82** | **240** |

---

## Constraints

- Task IDs must be kebab-case (e.g., `commerce-sync-order`)
- All tasks MUST call `withTenant()` for database operations
- Scheduled tasks MUST handle multi-tenant (iterate all active tenants)
- Max task duration: 30 minutes (Trigger.dev limit)
- Use `task.triggerAndWait()` for orchestration within tasks

---

## Environment Variables

Required in production:

```bash
TRIGGER_SECRET_KEY=tr_prod_xxx
TRIGGER_PROJECT_REF=cgk-platform
```

For development:

```bash
TRIGGER_SECRET_KEY=tr_dev_xxx
```

---

## AI Discretion Areas

The implementing agent should determine:

1. **App location**: Create in `apps/admin/src/trigger/` or dedicated `apps/jobs/`
2. **Handler import strategy**: Dynamic imports vs static for bundle size
3. **Queue configuration**: Concurrency limits per task category
4. **Error reporting**: Integration with alert system
5. **Batch task optimization**: Use `batchTrigger` where appropriate

---

## Tasks

### [SEQUENTIAL] Setup
- [ ] Create `trigger.config.ts` with project settings
- [ ] Install `@trigger.dev/sdk` in the app
- [ ] Verify `npx trigger dev` connects

### [PARALLEL] Commerce Tasks (~54)
- [ ] Create `src/trigger/commerce/order-sync.ts` (6 tasks)
- [ ] Create `src/trigger/commerce/review-email.ts` (8 tasks)
- [ ] Create `src/trigger/commerce/ab-testing.ts` (15 tasks)
- [ ] Create `src/trigger/commerce/product-sync.ts` (13 tasks)
- [ ] Create scheduled commerce tasks (8 tasks)

### [PARALLEL] Creator Tasks (~52)
- [ ] Create `src/trigger/creators/payout-processing.ts` (15 tasks)
- [ ] Create `src/trigger/creators/communications.ts` (15 tasks)
- [ ] Create `src/trigger/creators/applications.ts` (12 tasks)
- [ ] Create `src/trigger/creators/analytics.ts` (4 tasks)
- [ ] Create scheduled creator tasks (6 tasks)

### [PARALLEL] Analytics Tasks (~34)
- [ ] Create `src/trigger/analytics/attribution.ts` (12 tasks)
- [ ] Create `src/trigger/analytics/metrics.ts` (4 tasks)
- [ ] Create `src/trigger/analytics/ad-platforms.ts` (6 tasks)
- [ ] Create `src/trigger/analytics/ml-training.ts` (2 tasks)
- [ ] Create scheduled analytics tasks (10 tasks)

### [PARALLEL] Scheduled/System Tasks (~100)
- [ ] Create `src/trigger/scheduled/health-checks.ts` (3 tasks)
- [ ] Create `src/trigger/scheduled/digests.ts` (4 tasks)
- [ ] Create `src/trigger/scheduled/alerts.ts` (9 tasks)
- [ ] Create `src/trigger/scheduled/subscriptions.ts` (9 tasks)
- [ ] Create `src/trigger/scheduled/media-processing.ts` (8 tasks)
- [ ] Create `src/trigger/scheduled/webhook-queue.ts` (5 tasks)
- [ ] Create `src/trigger/scheduled/sms-queue.ts` (4 tasks)
- [ ] Create `src/trigger/scheduled/additional.ts` (39+ tasks)

### [SEQUENTIAL] Verification
- [ ] Run `npx trigger dev` and verify tasks register
- [ ] Test 5 representative tasks end-to-end
- [ ] Run `npx trigger deploy --env production`
- [ ] Verify tasks appear in Trigger.dev dashboard
- [ ] Run `npx tsc --noEmit`

---

## Definition of Done

- [ ] All 240 handlers have corresponding Trigger.dev tasks
- [ ] `trigger.config.ts` properly configured
- [ ] `npx trigger dev` runs without errors
- [ ] 5+ tasks verified working end-to-end
- [ ] Production deployment successful
- [ ] Tasks visible in Trigger.dev dashboard
- [ ] `npx tsc --noEmit` passes
- [ ] Documentation updated with deployment steps

---

## References

- [Trigger.dev v4 SDK Docs](https://trigger.dev/docs)
- `packages/jobs/src/handlers/` - Handler implementations
- `packages/jobs/src/events.ts` - Event type definitions
- `docs/setup/BACKGROUND-JOBS.md` - Setup guide
