# PHASE-2PO-HEALTH: Health Monitoring System

**Duration**: Week 8 (5 days)
**Depends On**: Phase 1 (database, auth), Phase 2A (super admin shell)
**Parallel With**: PHASE-2PO-LOGGING
**Blocks**: None (other phases can proceed)

---

## Goal

Implement platform-wide health monitoring with 15+ service monitors, tiered scheduling, configurable alert thresholds, and multi-channel alert delivery (Slack, email, PagerDuty).

---

## Success Criteria

- [ ] All 15+ service monitors implemented and returning accurate status
- [ ] Health matrix UI showing cross-tenant service status
- [ ] Alert thresholds configurable per service via admin UI
- [ ] Slack/email alerts delivering within 60 seconds of threshold breach
- [ ] 30-day health check history retained with automatic cleanup
- [ ] Dashboard refresh under 5 seconds
- [ ] PagerDuty integration optional but functional

---

## Deliverables

### Service Monitors (15+ required)

| Tier | Interval | Services |
|------|----------|----------|
| Critical | 1 min | Database (PostgreSQL), Redis |
| Core | 5 min | Shopify (per-tenant), Stripe, Inngest |
| Integration | 15 min | Meta Ads (per-tenant), Google Ads (per-tenant), Wise, MCP Server |
| External | 30 min | Mux, AssemblyAI, Slack, Yotpo, Loop, Vercel |

### Database Tables

- `platform_alerts` - Alert records with severity (p1/p2/p3), status (open/acknowledged/resolved), delivery tracking
- `health_check_history` - Time-series health data with 30-day retention

### API Routes

```
/api/platform/health/
  route.ts              - GET master health status
  [service]/route.ts    - GET per-service health
  matrix/route.ts       - GET cross-tenant matrix
  tenant/[id]/route.ts  - GET tenant-specific health
```

### Package Structure

```
packages/health/
  monitors/       - Individual service monitor implementations
  thresholds.ts   - Default and configurable thresholds
  evaluator.ts    - Threshold evaluation logic
  alerts/         - Alert channel implementations
  scheduler.ts    - Tiered scheduling logic
  cache.ts        - Redis caching for health results
```

### UI Components

- Health matrix table (service x tenant grid)
- Service detail panel with latency charts
- Alert list with acknowledgment workflow
- Threshold configuration forms

---

## Constraints

- Each monitor MUST return `{ status, latencyMs, details }` structure
- Status values: `healthy`, `degraded`, `unhealthy`, `unknown`
- Per-tenant monitors (Shopify, Meta, Google Ads) require credential lookup
- Critical tier checks MUST complete within 10 seconds
- Cache TTLs: Critical 30s, Core 120s, Integration 300s, External 600s

---

## Pattern References

**Spec documents:**
- `HEALTH-MONITORING-SPEC-2025-02-10.md` - Complete implementation details

**Reference docs (copied to plan folder):**
- `reference-docs/ADMIN-PATTERNS.md` - **CRITICAL**: Cache-busting for API routes, Neon pooling gotchas, multi-tenant query patterns
- `reference-docs/META-ADS-INTEGRATION.md` - Meta Ads API rate limits (for health monitor)
- `reference-docs/GOOGLE-ADS-INTEGRATION.md` - Google Ads API patterns (for health monitor)
- `reference-docs/TIKTOK-ADS-INTEGRATION.md` - TikTok API patterns (for health monitor)

**RAWDOG code to reference:**
- `/src/lib/ops/health/` - Existing health check patterns (12+ services)
- `/src/lib/ops/health/scheduler.ts` - Batch execution pattern

**MCPs to consult:**
- Context7 MCP: "Inngest scheduled function patterns"
- Context7 MCP: "Redis pub/sub for real-time updates"

---

## AI Discretion Areas

The implementing agent should determine:
1. Whether to use WebSocket or polling for dashboard real-time updates
2. Optimal batch sizes for multi-tenant health checks
3. Whether to store raw response data or summary metrics
4. Alert deduplication strategy (by signature vs time window)

---

## Tasks

### [PARALLEL] Infrastructure Setup
- [ ] Create `packages/health/` package structure
- [ ] Create `platform_alerts` table with indexes
- [ ] Create `health_check_history` table with 30-day retention trigger

### [PARALLEL] Service Monitors (can be built independently)
- [ ] Database monitor with pool stats
- [ ] Redis monitor with memory/eviction metrics
- [ ] Shopify monitor (per-tenant) with rate limit tracking
- [ ] Stripe monitor with balance check
- [ ] Inngest monitor with job status
- [ ] MCP Server monitor with protocol handshake
- [ ] Wise API monitor with profile verification
- [ ] Meta Ads monitor (per-tenant) with token validation
- [ ] Google Ads monitor (per-tenant) with OAuth verification
- [ ] Mux monitor
- [ ] AssemblyAI monitor
- [ ] Slack monitor
- [ ] Yotpo monitor
- [ ] Loop monitor
- [ ] Vercel monitor

### [SEQUENTIAL after monitors] Threshold System
- [ ] Implement threshold configuration schema
- [ ] Implement threshold evaluation (normal and inverse)
- [ ] Add threshold override per-tenant support

### [SEQUENTIAL after thresholds] Alert System
- [ ] Implement alert dispatch with channel routing
- [ ] Implement Slack alert formatting with severity colors
- [ ] Implement email alert templates
- [ ] Implement PagerDuty integration (optional)
- [ ] Add alert acknowledgment/resolution workflow

### [SEQUENTIAL after monitors] Scheduler
- [ ] Implement tiered scheduling with Inngest cron
- [ ] Implement multi-tenant batch execution
- [ ] Add last-run tracking for interval enforcement

### [PARALLEL with scheduler] Caching
- [ ] Implement Redis caching with tier-based TTLs
- [ ] Add cache invalidation on threshold breach

### [SEQUENTIAL after all above] API Routes
- [ ] Implement master health endpoint
- [ ] Implement per-service endpoints
- [ ] Implement health matrix endpoint
- [ ] Implement tenant health endpoint

### [SEQUENTIAL after APIs] UI Components
- [ ] Build health matrix grid component
- [ ] Build service detail panel
- [ ] Build alert list with filters
- [ ] Build threshold configuration UI

---

## Definition of Done

- [ ] All 15+ monitors return valid health status
- [ ] Health matrix displays status for all tenants x services
- [ ] Alert fires within 60 seconds of threshold breach
- [ ] Alert reaches Slack/email within 30 seconds of dispatch
- [ ] History table grows and cleans up automatically
- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests for all monitors pass
- [ ] Integration test for alert dispatch passes
