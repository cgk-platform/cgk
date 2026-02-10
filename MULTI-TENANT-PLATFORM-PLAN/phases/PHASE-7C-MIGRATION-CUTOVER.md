# PHASE-7C: Production Cutover

**Duration**: 1 week (Week 26)
**Depends On**: PHASE-7B (Migration Testing complete)
**Parallel With**: None
**Blocks**: PHASE-8 (Audit)

---

## Goal

Execute zero-downtime production cutover from the old RAWDOG system to the new multi-tenant platform using blue-green deployment, with comprehensive monitoring, documented rollback triggers, and post-cutover validation.

---

## Success Criteria

- [ ] Pre-cutover checklist 100% complete
- [ ] DNS TTL lowered to 5 minutes before cutover
- [ ] Blue-green deployment configured with gradual traffic shift
- [ ] Monitoring dashboard operational with all panels
- [ ] Alert rules configured and firing correctly
- [ ] Cutover completed with < 1 minute total downtime
- [ ] All smoke tests pass post-cutover
- [ ] No rollback triggers activated in first 24 hours
- [ ] All integrations verified (webhooks, email, payments)

---

## Deliverables

### Cutover Automation
- `tooling/cutover/cutover.ts` - Main cutover orchestration script
- `tooling/cutover/rollback.ts` - Rollback automation
- `tooling/cutover/smoke-tests.ts` - Post-cutover smoke tests
- `tooling/cutover/final-sync.ts` - Final data sync script

### Monitoring
- `tooling/monitoring/dashboard.ts` - Dashboard configuration
- `tooling/monitoring/alerts.ts` - Alert rule definitions
- `tooling/monitoring/health-check.ts` - Health check endpoints

### Documentation
- `docs/runbooks/CUTOVER-RUNBOOK.md` - Step-by-step cutover procedure
- `docs/runbooks/ROLLBACK-RUNBOOK.md` - Rollback procedure
- `docs/runbooks/POST-CUTOVER-CHECKLIST.md` - Verification steps

---

## Constraints

- MUST achieve zero-downtime (maintenance mode < 60 seconds for final sync)
- MUST use blue-green deployment (not in-place updates)
- MUST support immediate rollback for first 24 hours
- MUST NOT delete old system for 30 days post-cutover
- Rollback triggers are non-negotiable (error rate > 5%, latency p95 > 2s, checkout failures > 1%)

---

## Pattern References

**RAWDOG code to reference:**
- `scripts/` - Script patterns for tooling
- `src/lib/health/` - Health check patterns

**Spec documents:**
- `ARCHITECTURE.md` - Infrastructure topology
- `CODEBASE-ANALYSIS/INTEGRATIONS-2025-02-10.md` - Integration endpoints to verify

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Load balancer configuration (Vercel, Cloudflare, custom)
2. Traffic shift percentage steps (10->50->100 vs 25->50->75->100)
3. Monitoring system choice (Grafana, Datadog, custom)
4. Alert channel configuration (Slack webhook format, PagerDuty integration)
5. Old system decommission timeline (30-60 days)

---

## Tasks

### [PARALLEL] Pre-Cutover Preparation
- [ ] Create pre-cutover checklist script with verification:
  - All tests passing
  - Performance benchmarks met
  - Data migration complete
  - Data validation passing
  - DNS TTL lowered to 5 minutes
  - Team notified of maintenance window
  - Rollback plan documented
- [ ] Prepare DNS update commands/configuration
- [ ] Create team notification templates

### [PARALLEL] Monitoring Setup
- [ ] Create dashboard configuration with panels:
  - Request Rate: `rate(http_requests_total[5m])`
  - Error Rate: `rate(http_errors_total[5m]) / rate(http_requests_total[5m])`
  - Latency P95: `histogram_quantile(0.95, http_request_duration_seconds)`
  - Database Connections: `pg_stat_activity_count`
  - Redis Memory: `redis_memory_used_bytes / redis_memory_max_bytes`
- [ ] Define thresholds:
  - Request Rate: warning 1000, critical 2000
  - Error Rate: warning 0.01, critical 0.05
  - Latency P95: warning 0.5s, critical 2s
  - DB Connections: warning 80%, critical 95%
  - Redis Memory: warning 70%, critical 90%
- [ ] Configure alerts:
  - High Error Rate: error_rate > 0.05 for 5m -> critical -> slack + pagerduty
  - Slow Responses: latency_p95 > 2s for 5m -> warning -> slack

### [SEQUENTIAL after Preparation] Blue-Green Deployment
- [ ] Implement deploy() function for green environment
- [ ] Implement runHealthChecks() for deployment verification
- [ ] Implement runSmokeTests() for functional verification
- [ ] Implement updateLoadBalancer() with traffic shifting:
  - Support `gradual` strategy: 10% -> 50% -> 100%
  - Support `immediate` strategy for rollback
- [ ] Implement monitorForIssues() with duration parameter

### [SEQUENTIAL after Blue-Green] Rollback Automation
- [ ] Define rollback triggers (automatic):
  - Error rate > 5% for 5 minutes
  - API latency p95 > 2s for 5 minutes
  - Checkout failures > 1%
  - Payment processing errors
  - Data integrity issues detected
- [ ] Implement automatic rollback logic
- [ ] Implement manual rollback command
- [ ] Create rollback verification steps

### [SEQUENTIAL after Rollback] Cutover Day Automation
- [ ] Create cutover script with steps:
  1. Enable maintenance mode on old site
  2. Run final data sync
  3. Validate final sync
  4. Update DNS records
  5. Disable maintenance mode on new site
  6. Run smoke tests
  7. Begin monitoring period
- [ ] Create post-cutover checklist validation:
  - Monitor performance metrics
  - Check error logging
  - Validate webhook processing
  - Confirm email delivery
  - Test checkout flow
  - Verify creator portal access
  - Check MCP connectivity

### [SEQUENTIAL after all above] Documentation
- [ ] Create CUTOVER-RUNBOOK.md with step-by-step procedure
- [ ] Create ROLLBACK-RUNBOOK.md with decision tree
- [ ] Create POST-CUTOVER-CHECKLIST.md
- [ ] Document old system archive procedure (30 day retention)

---

## Definition of Done

- [ ] Pre-cutover checklist script runs and passes
- [ ] Monitoring dashboard shows all 5 panels with live data
- [ ] Alerts fire correctly when thresholds exceeded (test with synthetic load)
- [ ] Blue-green deployment scripts execute successfully in staging
- [ ] Rollback completes in < 2 minutes when triggered
- [ ] All runbooks reviewed by team
- [ ] Cutover dry-run completed in staging environment
- [ ] `npx tsc --noEmit` passes
- [ ] Team sign-off on go/no-go decision
