# PHASE-5D: Analytics Job Migrations

**Duration**: 4-5 days (Week 20-21)
**Depends On**: PHASE-5A (Jobs Infrastructure Setup), **PHASE-2D-PL-CONFIGURATION** (for tenant cost configs)
**Parallel With**: PHASE-5B, PHASE-5C (after 5A complete)
**Blocks**: None

---

## P&L Configuration Dependency

**CRITICAL**: Analytics jobs must use tenant-specific cost configurations from [PHASE-2D-PL-CONFIGURATION.md](./PHASE-2D-PL-CONFIGURATION.md):

- **P&L generation jobs** must load `TenantCostConfig` for payment processing rates, fulfillment costs
- **COGS calculation** must respect `TenantCOGSConfig.source` (Shopify vs internal)
- **Metrics aggregation** must use tenant's formula preferences for margin calculations
- **Ad spend sync** must respect tenant's configured platforms and account mappings

---

## Goal

Migrate all analytics and attribution Trigger.dev tasks to Inngest, including attribution processing, metrics aggregation, ad platform syncing, and reporting jobs. This covers approximately 30 tasks that power the analytics pipeline.

---

## Success Criteria

- [ ] All 17 attribution tasks migrated
- [ ] GA4 and Meta CAPI event sending working
- [ ] TikTok spend sync operational
- [ ] Daily metrics aggregation running
- [ ] Attribution models calculating correctly (first-touch, last-touch, linear, time-decay)
- [ ] Fairing survey sync working
- [ ] ML training pipeline functional (30 min timeout supported)

---

## Deliverables

### Attribution Processing Functions (17 tasks)
- `processAttribution` - Main conversion attribution:
  - Step: Get conversion details
  - Step: Find touchpoints
  - Step: Calculate all models
  - Step: Store results
  - Step: Send to GA4
  - Step: Send to Meta CAPI
- `attributionDailyMetrics` - 2:10 AM aggregation
- `attributionExportScheduler` - Every 15 min exports
- `attributionFairingBridge` - Hourly :15 survey sync
- `attributionMLTraining` - 4 AM daily (30 min timeout)
- `attributionOrderReconciliation` - Hourly :45 catch-up
- `attributionOrderReconciliationManual` - Manual trigger
- `attributionRecalculateRecent` - 4 AM last 3 days
- `syncTikTokSpendDaily` - 3 AM TikTok sync
- `attributionVTASync` - 2:30 AM view-through sync
- `attributionProcessUnattributed` - Hourly :30 retry 50
- `attributionWebhookQueue` - Every 5 min queue processing

### Metrics Aggregation Functions
- `aggregateDailyMetrics` - 2 AM per-tenant aggregation:
  - Revenue metrics
  - Attribution metrics
  - Customer metrics
  - Store daily snapshot
- `hourlyMetricsRollup` - Hourly intermediate aggregation
- `weeklyMetricsSummary` - Weekly trend analysis

### Ad Platform Integration Functions
- `sendGA4Purchase` - GA4 Measurement Protocol
- `sendMetaPurchase` - Meta Conversions API
- `sendTikTokEvent` - TikTok Events API
- Ad spend sync (Meta, Google, TikTok)

---

## Constraints

- ML training MUST support 30 minute timeout (use Inngest long-running)
- GA4/Meta CAPI MUST deduplicate events (use order ID as dedup key)
- Attribution recalculation MUST be idempotent
- Metrics aggregation MUST be tenant-isolated
- Ad spend sync MUST handle API rate limits

---

## Pattern References

**Skills to invoke:**
- Context7 MCP: "Inngest long running functions" - 30 min timeout support
- Context7 MCP: "Inngest step.sleep patterns" - Delay between API calls

**RAWDOG code to reference:**
- `src/trigger/attribution-daily-metrics.ts` - Daily aggregation
- `src/trigger/attribution-fairing-bridge.ts` - Survey sync
- `src/trigger/attribution-ml-training.ts` - ML pipeline
- `src/trigger/attribution-order-reconciliation.ts` - Reconciliation
- `src/trigger/attribution-tiktok-sync.ts` - TikTok integration
- `src/trigger/attribution-vta-sync.ts` - View-through attribution
- `src/trigger/attribution-unattributed.ts` - Unattributed retry
- `src/trigger/attribution-webhook-queue.ts` - Webhook processing

**Spec documents:**
- `CODEBASE-ANALYSIS/AUTOMATIONS-TRIGGER-DEV-2025-02-10.md` - Task schedules

**Reference docs (copied to plan folder):**
- `reference-docs/META-ADS-INTEGRATION.md` - Meta CAPI patterns, rate limits, async reports
- `reference-docs/GOOGLE-ADS-INTEGRATION.md` - Google Ads GAQL queries, spend sync
- `reference-docs/TIKTOK-ADS-INTEGRATION.md` - TikTok Events API, spend sync

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Attribution model weighting defaults (time-decay half-life, etc.)
2. Batch sizes for unattributed retry (50 vs 100)
3. ML training data windowing (30 days vs 90 days)
4. Metrics rollup granularity (hourly vs 15-minute)

---

## Tasks

### [PARALLEL] Attribution Processing Migration
- [ ] Migrate `processAttribution` with steps:
  - Get conversion from tenant database
  - Query touchpoints by visitor ID
  - Calculate first-touch, last-touch, linear, time-decay
  - Store results per model
  - Send GA4 purchase event
  - Send Meta CAPI purchase event
- [ ] Migrate reconciliation jobs:
  - Hourly :45 automatic
  - Manual trigger capability
- [ ] Migrate unattributed retry (hourly :30)

### [PARALLEL] Ad Platform Sync Migration
- [ ] Migrate TikTok spend sync (3 AM daily)
- [ ] Migrate Fairing survey bridge (hourly :15)
- [ ] Migrate VTA sync (2:30 AM daily)
- [ ] Migrate webhook queue processing (every 5 min)
- [ ] Configure rate limiting for each platform API

### [PARALLEL] Metrics Aggregation Migration
- [ ] Migrate daily metrics aggregation (2 AM):
  - Loop through active tenants
  - Aggregate revenue, attribution, customers
  - Store daily snapshot
- [ ] Migrate ML training (4 AM, 30 min timeout):
  - Configure Inngest for long-running
  - Handle checkpoint saves
- [ ] Migrate recalculation (4 AM, last 3 days)

### [SEQUENTIAL after migrations] GA4/Meta Validation
- [ ] Verify GA4 events appearing in GA4 Real-Time
- [ ] Verify Meta CAPI events in Events Manager
- [ ] Check deduplication working (no duplicate purchases)
- [ ] Validate attribution values match across platforms

---

## Cron Schedule Reference

| Task | Schedule | Inngest Cron |
|------|----------|--------------|
| Attribution daily metrics | Daily 2:10 AM | `10 2 * * *` |
| Attribution VTA sync | Daily 2:30 AM | `30 2 * * *` |
| TikTok spend sync | Daily 3 AM | `0 3 * * *` |
| ML training | Daily 4 AM | `0 4 * * *` |
| Attribution recalculate | Daily 4 AM | `0 4 * * *` |
| Export scheduler | Every 15 min | `*/15 * * * *` |
| Fairing bridge | Every hour :15 | `15 * * * *` |
| Order reconciliation | Every hour :45 | `45 * * * *` |
| Process unattributed | Every hour :30 | `30 * * * *` |
| Webhook queue | Every 5 min | `*/5 * * * *` |

---

## Attribution Models

All models must calculate and store separately:

| Model | Description | Storage Field |
|-------|-------------|---------------|
| First-Touch | 100% to first touchpoint | `attribution_first` |
| Last-Touch | 100% to last touchpoint | `attribution_last` |
| Linear | Equal split across all | `attribution_linear` |
| Time-Decay | Half-life weighted | `attribution_time_decay` |
| Position-Based | 40/20/40 first/mid/last | `attribution_position` |

Each conversion stores all 5 model results for flexible reporting.

---

## Long-Running Task Configuration

ML training requires special Inngest configuration:

```typescript
inngest.createFunction(
  {
    id: 'attribution-ml-training',
    retries: 1,
    // Long-running support
    timeoutSeconds: 1800, // 30 minutes
  },
  { cron: '0 4 * * *' },
  async ({ step }) => {
    // Training logic with checkpoints
  }
)
```

---

## Definition of Done

- [ ] All 30 analytics tasks responding to events
- [ ] Attribution calculations matching legacy system
- [ ] GA4 events verified in GA4 Real-Time reports
- [ ] Meta CAPI events verified in Events Manager
- [ ] TikTok events verified in TikTok Ads Manager
- [ ] Daily metrics aggregating for all tenants
- [ ] ML training completing within 30 min window
- [ ] `npx tsc --noEmit` passes
- [ ] Attribution model parity verified
