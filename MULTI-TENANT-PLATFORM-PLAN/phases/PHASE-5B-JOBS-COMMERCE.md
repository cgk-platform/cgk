# PHASE-5B: Commerce Job Migrations

**Duration**: 5-6 days (Week 19-20)
**Depends On**: PHASE-5A (Jobs Infrastructure Setup)
**Parallel With**: PHASE-5C (after 5A complete)
**Blocks**: None (can overlap with 5C, 5D, 5E after 5A)

---

## Goal

Migrate all commerce-related Trigger.dev tasks to Inngest, including order sync, review email queue, product sync, and A/B testing jobs. This covers approximately 60 tasks that handle the core e-commerce pipeline.

---

## Success Criteria

- [ ] All 11 A/B testing tasks migrated and functional
- [ ] All 4+ review email queue tasks migrated
- [ ] Order sync pipeline complete (create, update, reconciliation)
- [ ] Product sync from Shopify working
- [ ] Customer sync working
- [ ] Rate limiting configured per tenant (10 req/s default)
- [ ] Parallel run with Trigger.dev validated (zero data loss)

---

## Deliverables

### Order Sync Functions (~15 tasks)
- `syncOrder` - Main order sync from Shopify webhook
- `syncOrderBatch` - Batch sync for backfill
- `orderReconciliation` - Hourly catch-up for missed orders
- Order-triggered attribution processing
- Order-triggered creator commission credit
- Order-triggered review email scheduling

### Review Email Queue Functions (4+ tasks)
- `processReviewEmailQueue` - Every 5 min, process 50 scheduled
- `reviewEmailAwaitingDelivery` - Daily fallback promotion
- `retryFailedReviewEmails` - Every 15 min, retry failed (5 max)
- `sendQueuedReviewEmail` - Manual resend capability
- Follow-up sequence scheduling (sequence 1 → sequence 2)

### A/B Testing Functions (11 tasks)
- `abHourlyMetricsAggregation` - Aggregate Redis counters hourly
- `abNightlyReconciliation` - 2 AM full reconciliation
- `abAggregateTestMetrics` - On-demand manual reconciliation
- `abSyncRedisToPostgres` - Every 6 hours sync
- `abDailyMetricsSummary` - 8 AM Slack summary
- `abOptimization` - Every 15 min MAB/Thompson updates
- `abOptimizeTest` - Single test optimization
- `abOptimizationSummary` - 9 AM daily report
- `abOrderReconciliation` - Hourly order catch-up
- `abOrderReconciliationManual` - Manual reconciliation
- `abTestScheduler` - Every 5 min test transitions

### Product & Customer Sync (~5 tasks)
- Product sync from Shopify
- Customer sync from Shopify
- Inventory updates
- Collection sync

---

## Constraints

- Order sync MUST complete within 30 seconds (Shopify webhook timeout)
- Review emails MUST respect 0.55s delay between Resend API calls
- A/B metrics MUST maintain Redis → Postgres sync integrity
- All functions MUST include tenant context for multi-tenant isolation
- Rate limiting MUST be per-tenant, not global

---

## Pattern References

**Skills to invoke:**
- Context7 MCP: "Inngest step functions patterns" - Step-based execution
- Context7 MCP: "Inngest rate limiting configuration" - Per-key rate limits

**RAWDOG code to reference:**
- `src/trigger/review-email-queue.ts` - Current review email implementation
- `src/trigger/ab-metrics-aggregation.ts` - A/B metrics patterns
- `src/trigger/ab-optimization.ts` - Optimization logic
- `src/trigger/ab-order-reconciliation.ts` - Order reconciliation

**Spec documents:**
- `AUTOMATIONS-TRIGGER-DEV-2025-02-10.md` - Task inventory with schedules

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Step granularity within order sync (how many steps vs atomic operations)
2. Batch sizes for queue processing (50 vs 100 vs dynamic)
3. Retry backoff strategy (exponential vs fixed intervals)
4. Error categorization (retryable vs terminal failures)

---

## Tasks

### [PARALLEL] Order Sync Migration
- [ ] Migrate `syncOrder` with step-based execution:
  - Step: Fetch order from Shopify
  - Step: Save to tenant database
  - Step: Process attribution
  - Step: Credit creator commission (if discount used)
  - Step: Schedule review email
- [ ] Migrate `syncOrderBatch` for backfill operations
- [ ] Migrate `orderReconciliation` scheduled job

### [PARALLEL] Review Email Queue Migration
- [ ] Migrate `processReviewEmailQueue`:
  - Check if already reviewed (skip if yes)
  - Get order details
  - Calculate incentive tier
  - Send email via Resend
  - Schedule follow-up if sequence 1
- [ ] Migrate `reviewEmailAwaitingDelivery` (daily fallback)
- [ ] Migrate `retryFailedReviewEmails` (15 min retry)
- [ ] Migrate `sendQueuedReviewEmail` (manual trigger)
- [ ] Configure rate limiting: 10 emails/second per tenant

### [PARALLEL] A/B Testing Migration
- [ ] Migrate all 11 A/B testing tasks with schedules:
  - Hourly: `:15` aggregation, `:15` order reconciliation
  - Every 15 min: optimization updates
  - Every 5 min: test scheduler
  - Every 6 hours: Redis → Postgres sync
  - Daily 2 AM: nightly reconciliation
  - Daily 8 AM: metrics summary
  - Daily 9 AM: optimization summary

### [SEQUENTIAL after migrations] Parallel Run Validation
- [ ] Deploy Inngest functions alongside Trigger.dev
- [ ] Route new events to BOTH systems
- [ ] Compare outputs for 24-48 hours
- [ ] Verify zero data loss or inconsistency
- [ ] Document any behavioral differences

### [SEQUENTIAL after validation] Cutover
- [ ] Disable Trigger.dev for commerce events
- [ ] Keep Trigger.dev running for in-flight jobs (24h drain)
- [ ] Monitor Inngest-only operation
- [ ] Archive Trigger.dev commerce task code

---

## Cron Schedule Reference

| Task | Schedule | Inngest Cron |
|------|----------|--------------|
| Review queue processing | Every 5 min | `*/5 * * * *` |
| Review retry failed | Every 15 min | `*/15 * * * *` |
| Review awaiting delivery | Daily 12 PM | `0 12 * * *` |
| AB hourly aggregation | Every hour :15 | `15 * * * *` |
| AB optimization | Every 15 min | `*/15 * * * *` |
| AB test scheduler | Every 5 min | `*/5 * * * *` |
| AB Redis sync | Every 6 hours | `0 */6 * * *` |
| AB nightly reconciliation | Daily 2 AM | `0 2 * * *` |
| AB metrics summary | Daily 8 AM | `0 8 * * *` |
| AB optimization summary | Daily 9 AM | `0 9 * * *` |
| AB order reconciliation | Every hour :15 | `15 * * * *` |

---

## Definition of Done

- [ ] All 60 commerce tasks responding to events
- [ ] Order sync completing within 30 second SLA
- [ ] Review emails sending with rate limits respected
- [ ] A/B metrics flowing Redis → Postgres correctly
- [ ] 24-48 hour parallel run completed successfully
- [ ] Trigger.dev commerce tasks archived
- [ ] `npx tsc --noEmit` passes
- [ ] Integration tests for critical paths
