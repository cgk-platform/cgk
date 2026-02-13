# PHASE-5A: Background Jobs Infrastructure

> **STATUS**: ✅ COMPLETE (2026-02-12)
> **Completed By**: Wave 3A Agents

**Duration**: 3-4 days (Week 19)
**Depends On**: PHASE-4D (Creator Tax complete)
**Parallel With**: None (foundation for all 5B-5E phases)
**Blocks**: PHASE-5B, PHASE-5C, PHASE-5D, PHASE-5E

---

## Goal

Establish reliable background job infrastructure that handles 199+ async workflows. Choose the best provider for the platform's needs, build a vendor-agnostic abstraction, and ensure the setup is **portable and easy to install** for new platform users.

---

## Outcome Requirements

The background jobs system must:
- Execute 199+ async workflows reliably
- Handle retries with backoff for transient failures
- Support scheduled/cron jobs (40+ scheduled tasks)
- Support event-driven triggers (webhooks, user actions)
- Enforce tenant isolation (tenantId in every job)
- Be simple for developers (ideally no separate worker process)
- Be easy for installing users to set up (CLI-first, minimal web config)

---

## Portability Requirements (CRITICAL)

This platform will be installed by other users. The background jobs system must be:

### CLI-First Setup
```bash
# User should be able to set up with something like:
npx @cgk-platform/cli setup:jobs

# NOT require:
# - Signing up for a service through web UI first
# - Complex manual configuration
# - Multiple dashboard logins
```

### Minimal Web Configuration
- API keys/tokens should be the ONLY thing users get from a web dashboard
- Everything else configurable via CLI or env vars
- Document exactly what web steps are required (keep to minimum)

### Clear Setup Documentation
The implementing agent MUST create:
- `docs/setup/BACKGROUND-JOBS.md` - Complete setup guide
- Include: provider signup, API key retrieval, env vars, verification steps
- Include: estimated time to set up (target: < 15 minutes)

---

## Success Criteria

- [x] Provider chosen with documented reasoning
- [x] Abstraction layer allows provider swapping
- [x] All event types defined (40+ categories)
- [x] Tenant isolation enforced (tenantId required in all events)
- [x] Dev environment works easily (no complex worker setup preferred)
- [x] **Setup guide created** with CLI-first approach
- [x] **New user can set up in < 15 minutes** following guide

---

## Provider Evaluation

### ✅ RECOMMENDED: Trigger.dev v4

**Decision**: Use **Trigger.dev v4** as the background jobs provider.

**Rationale**:
1. **Institutional Knowledge**: RAWDOG has 199 Trigger.dev tasks - patterns are already documented
2. **Proven at Scale**: Already running production workloads successfully
3. **Portability**: Cloud-hosted OR self-hostable
4. **DX**: `npx trigger dev` for local development, `triggerAndWait()` for orchestration
5. **Tenant Isolation**: Pass `tenantId` in every task payload (already established pattern)
6. **Familiar API**: Team already knows v4 SDK patterns (task(), not deprecated client.defineJob())

**Alternatives Evaluated**:

| Provider | Score | Notes |
|----------|-------|-------|
| **Trigger.dev v4** | ✅ 90/100 | Recommended - known, proven, good DX |
| **Inngest** | 85/100 | Great DX, but new learning curve, different patterns |
| **Vercel Cron** | 60/100 | Too limited for 199 tasks, no orchestration |
| **Upstash QStash** | 70/100 | Simple but lacks step orchestration |
| **BullMQ + Redis** | 75/100 | Requires managing Redis worker, more ops burden |

**Decision Criteria** (weighted):
1. Portability - Easy for new users to set up (30%)
2. Institutional knowledge - Team familiarity (25%)
3. Developer experience - Simple local development (20%)
4. Reliability - Retries, failure handling (15%)
5. Cost at scale (10%)

---

## Deliverables

### Jobs Package (`packages/jobs`)
```
packages/jobs/
├── src/
│   ├── types.ts        # JobProvider interface
│   ├── factory.ts      # Provider factory
│   ├── events.ts       # All event type definitions
│   ├── providers/
│   │   ├── index.ts
│   │   └── [chosen].ts # Chosen provider implementation
│   └── index.ts        # Package exports
├── package.json
└── README.md           # Setup instructions
```

### Event Type Categories
Define all events from existing background tasks:
- **Commerce**: `order.created`, `order.fulfilled`, `customer.created`
- **Reviews**: `review.submitted`, `review.reminder.scheduled`
- **Creators**: `creator.applied`, `creator.approved`, `payout.requested`
- **Attribution**: `touchpoint.recorded`, `conversion.attributed`
- **Video**: `video.upload.completed`, `video.transcription.started`, `video.transcription.completed`, `video.ai.generated`
- **DAM**: `dam.asset.uploaded`, `dam.gdrive.sync.requested`, `dam.rights.expiry.check`, `dam.export.requested`
- **Scheduled**: `daily.metrics`, `hourly.sync`, `weekly.digest`, `video.sync.recovery`, `dam.rights.expiry.daily`

### Setup CLI Command
```bash
# Add to @cgk-platform/cli
npx @cgk-platform/cli setup:jobs

# Should:
# 1. Check if provider is configured (env vars)
# 2. If not, guide user through setup
# 3. Verify connection works
# 4. Create initial configuration
```

### Documentation
- `docs/setup/BACKGROUND-JOBS.md` - User-facing setup guide
- `packages/jobs/README.md` - Developer documentation

---

## Constraints

- MUST enforce tenant isolation (tenantId required in all event payloads)
- MUST create vendor-agnostic abstraction (can swap providers)
- MUST document setup process clearly for new users
- SHOULD prefer CLI setup over web dashboard configuration
- SHOULD work without separate worker process if possible

---

## Tenant Isolation (MANDATORY)

**READ**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Every job event MUST include tenantId:

```typescript
// Event type definition - tenantId is REQUIRED
type TenantEvent<T> = T & { tenantId: string }

export type Events = {
  'order.created': TenantEvent<{ orderId: string }>
  'payout.requested': TenantEvent<{ payoutId: string }>
  // ALL events require tenantId
}

// Sending an event
await jobs.send('order.created', {
  tenantId: 'rawdog',  // REQUIRED
  orderId: 'order_123'
})

// Job handler MUST use tenant context
async function handleOrderCreated(event: Events['order.created']) {
  const { tenantId, orderId } = event

  await withTenant(tenantId, async () => {
    // All database operations scoped to tenant
    const order = await sql`SELECT * FROM orders WHERE id = ${orderId}`
  })
}
```

---

## Pattern References

**RAWDOG code to reference:**
- `src/trigger/` - Extract all task IDs and payload types
- `CODEBASE-ANALYSIS/AUTOMATIONS-TRIGGER-DEV-2025-02-10.md` - Complete task inventory

**Skills to invoke:**
- Context7 MCP: "[chosen provider] TypeScript setup" - Provider-specific patterns

---

## AI Discretion Areas

The implementing agent should determine:
1. **Which provider to use** - Evaluate and document decision
2. Event naming conventions (kebab-case vs dot notation)
3. Grouping of related events
4. Retry policies and defaults
5. How to structure the CLI setup command

---

## Tasks

### [SEQUENTIAL] Provider Evaluation
- [ ] Evaluate each provider against criteria
- [ ] Document pros/cons for portability
- [ ] Make recommendation with reasoning
- [ ] Get approval before proceeding

### [PARALLEL after approval] Package Setup
- [ ] Create `packages/jobs/` directory structure
- [ ] Add package.json with chosen provider dependency
- [ ] Configure TypeScript

### [PARALLEL after approval] Event Type Definition
- [ ] Extract all event types from existing tasks (199 tasks → ~80 events)
- [ ] Group events by category
- [ ] Define TypeScript interfaces with tenantId required
- [ ] Export event types

### [SEQUENTIAL after Package Setup] Provider Implementation
- [ ] Implement chosen provider wrapper
- [ ] Implement JobProvider interface
- [ ] Add factory function
- [ ] Test basic send/receive

### [SEQUENTIAL after Implementation] CLI Setup Command
- [ ] Add `setup:jobs` command to @cgk-platform/cli
- [ ] Implement provider detection
- [ ] Implement guided setup flow
- [ ] Implement verification step

### [SEQUENTIAL after CLI] Documentation
- [ ] Create `docs/setup/BACKGROUND-JOBS.md`
- [ ] Document all env vars needed
- [ ] Document web steps required (keep minimal)
- [ ] Include verification steps
- [ ] Test documentation with fresh setup

---

## Definition of Done

- [ ] Provider chosen and documented
- [ ] `packages/jobs/` exports working JobProvider
- [ ] All event types defined with TypeScript interfaces
- [ ] Tenant isolation enforced (tenantId required)
- [ ] `npx @cgk-platform/cli setup:jobs` works
- [ ] `docs/setup/BACKGROUND-JOBS.md` is complete
- [ ] New user can complete setup in < 15 minutes
- [ ] `npx tsc --noEmit` passes
