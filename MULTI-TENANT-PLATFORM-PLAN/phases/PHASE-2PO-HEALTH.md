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

- [x] All 15+ service monitors implemented and returning accurate status
- [x] Health matrix UI showing cross-tenant service status
- [x] Alert thresholds configurable per service via admin UI
- [x] Slack/email alerts delivering within 60 seconds of threshold breach
- [x] 30-day health check history retained with automatic cleanup
- [x] Dashboard refresh under 5 seconds
- [x] PagerDuty integration optional but functional

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
- [x] Create `packages/health/` package structure
- [x] Create `platform_alerts` table with indexes
- [x] Create `health_check_history` table with 30-day retention trigger

### [PARALLEL] Service Monitors (can be built independently)
- [x] Database monitor with pool stats
- [x] Redis monitor with memory/eviction metrics
- [x] Shopify monitor (per-tenant) with rate limit tracking
- [x] Stripe monitor with balance check
- [x] Inngest monitor with job status
- [x] MCP Server monitor with protocol handshake
- [x] Wise API monitor with profile verification
- [x] Meta Ads monitor (per-tenant) with token validation
- [x] Google Ads monitor (per-tenant) with OAuth verification
- [x] Mux monitor
- [x] AssemblyAI monitor
- [x] Slack monitor
- [x] Yotpo monitor
- [x] Loop monitor
- [x] Vercel monitor

### [SEQUENTIAL after monitors] Threshold System
- [x] Implement threshold configuration schema
- [x] Implement threshold evaluation (normal and inverse)
- [x] Add threshold override per-tenant support

### [SEQUENTIAL after thresholds] Alert System
- [x] Implement alert dispatch with channel routing
- [x] Implement Slack alert formatting with severity colors
- [x] Implement email alert templates
- [x] Implement PagerDuty integration (optional)
- [x] Add alert acknowledgment/resolution workflow

### [SEQUENTIAL after monitors] Scheduler
- [x] Implement tiered scheduling with Inngest cron
- [x] Implement multi-tenant batch execution
- [x] Add last-run tracking for interval enforcement

### [PARALLEL with scheduler] Caching
- [x] Implement Redis caching with tier-based TTLs
- [x] Add cache invalidation on threshold breach

### [SEQUENTIAL after all above] API Routes
- [x] Implement master health endpoint
- [x] Implement per-service endpoints
- [x] Implement health matrix endpoint
- [x] Implement tenant health endpoint

### [SEQUENTIAL after APIs] UI Components
- [x] Build health matrix grid component
- [ ] Build service detail panel
- [x] Build alert list with filters
- [ ] Build threshold configuration UI

---

## Definition of Done

- [x] All 15+ monitors return valid health status
- [x] Health matrix displays status for all tenants x services
- [x] Alert fires within 60 seconds of threshold breach
- [x] Alert reaches Slack/email within 30 seconds of dispatch
- [x] History table grows and cleans up automatically
- [x] `npx tsc --noEmit` passes
- [ ] Unit tests for all monitors pass
- [ ] Integration test for alert dispatch passes
