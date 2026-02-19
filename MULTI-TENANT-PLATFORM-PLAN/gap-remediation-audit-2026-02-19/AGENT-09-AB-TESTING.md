# AGENT-09: A/B Testing Audit
**Audit Date**: 2026-02-19  
**Auditor**: Agent-09 (Code Auditor)  
**Scope**: A/B Testing implementation across CGK multi-tenant platform  
**Phase Docs**: PHASE-2AT-ABTESTING-CORE, PHASE-2AT-ABTESTING-ADMIN, PHASE-2AT-ABTESTING-SHIPPING, PHASE-2AT-ABTESTING-STATS  
**Phase Status (per docs)**: All four phases marked ✅ COMPLETE (2026-02-13)

---

## Executive Summary

All four A/B testing phases are marked COMPLETE in the phase documents, but a thorough audit reveals **substantial gaps between documentation and implementation**. The most critical issues are:

1. **CRITICAL: Schema Mismatch** — The migration files (041–047) are early INFRASTRUCTURE-FIX versions that are missing ~18 planned columns in `ab_tests`, and are entirely missing 4 planned tables (`ab_daily_metrics`, `ab_targeting_rules`, `ab_exclusion_groups`, `ab_test_exclusion_groups`). The application code in `db.ts` queries these missing columns/tables, meaning the system **will fail at runtime**.

2. **CRITICAL: Cart Attribute Key Mismatch** — The cart bridge (`_ab_shipping_suffix`) and the Shopify Function GraphQL query (`_ab_shipping_variant`) use different cart attribute keys, meaning shipping A/B tests cannot function end-to-end.

3. **CRITICAL: All Background Jobs Are Stubs** — 14 background job handlers in `packages/jobs/src/handlers/commerce/ab-testing.ts` all contain `// Implementation steps:` comments with no actual implementation, returning hardcoded success responses.

4. **Significant Missing Features** — The `algorithms/` directory (Thompson Sampling, MAB) is absent, several admin components are missing, and 6 planned API routes don't exist.

---

## Legend

- ✅ **DONE** — Fully implemented and matches spec  
- ⚠️ **PARTIAL** — Exists but incomplete or missing key functionality  
- ❌ **NOT DONE** — Planned but not implemented  
- 🔄 **CHANGED** — Implemented differently from the spec (may be intentional)  
- 🚨 **CRITICAL** — Bug/mismatch that will cause runtime failure

---

## Section 1: Database Schema (PHASE-2AT-ABTESTING-CORE)

### 1.1 Core Tables

| Table | Status | Notes |
|-------|--------|-------|
| `ab_tests` | 🚨 CRITICAL | Migration exists (041) but missing ~18 planned columns — see §1.1a |
| `ab_variants` | 🚨 CRITICAL | Migration exists (042) but missing 7 planned columns — see §1.1b |
| `ab_visitors` | 🚨 CRITICAL | Migration exists (043) but missing 11 planned fields — see §1.1c |
| `ab_events` | 🚨 CRITICAL | Migration exists (044) but missing 3 fields; event type enum mismatch — see §1.1d |
| `ab_daily_metrics` | ❌ NOT DONE | Planned table never created; app code queries it → runtime failure |
| `ab_targeting_rules` | ❌ NOT DONE | Planned table never created; app code queries it → runtime failure |
| `ab_exclusion_groups` | ❌ NOT DONE | Planned table never created |
| `ab_test_exclusion_groups` | ❌ NOT DONE | Planned table never created |
| `ab_test_assignments` | ✅ DONE | Migration 045 present |
| `ab_test_conversions` | ✅ DONE | Migration 046 present |
| `ab_shipping_attributions` | ⚠️ PARTIAL | Migration 047 exists but missing 6 planned fields — see §1.1e |
| `template_ab_tests` | ✅ DONE | Migration 048 present |

#### 1.1a `ab_tests` Column Gaps

Planned columns **missing from 041_ab_tests.sql**:

- `tenant_id UUID NOT NULL REFERENCES tenants(id)` — **critical for multi-tenancy**
- `mode TEXT` — `manual | mab | thompson`
- `test_type TEXT` — migration uses `type TEXT` instead (column name mismatch)
- `goal_event TEXT` — conversion goal
- `optimization_metric TEXT`
- `confidence_level REAL`
- `base_url TEXT`
- `is_significant BOOLEAN`
- `traffic_override_variant_id TEXT`
- `shipping_config JSONB`
- `created_by TEXT`
- `started_at TIMESTAMPTZ`
- `ended_at TIMESTAMPTZ`
- `scheduled_start_at TIMESTAMPTZ`
- `scheduled_end_at TIMESTAMPTZ`
- `schedule_timezone TEXT`
- `auto_start BOOLEAN`
- `auto_end BOOLEAN`

Additionally, the migration uses `type` but the app queries `test_type`, and uses `traffic_percentage INTEGER` which has no equivalent in the planned schema.

#### 1.1b `ab_variants` Column Gaps

Planned columns **missing from 042_ab_variants.sql**:

- `tenant_id UUID NOT NULL`
- `url TEXT` — redirect URL for landing page tests
- `url_type TEXT` — `static | landing_page`
- `landing_page_id TEXT`
- `traffic_allocation INTEGER` — migration uses `weight INTEGER` (different column name)
- `preserve_query_params BOOLEAN`
- `shipping_rate_name TEXT`
- `shipping_price_cents INTEGER`
- `shipping_suffix TEXT`

#### 1.1c `ab_visitors` Column Gaps

Planned columns **missing from 043_ab_visitors.sql**:

- `tenant_id UUID NOT NULL`
- `session_id TEXT`
- `landing_page TEXT`, `referrer TEXT`
- `utm_source TEXT`, `utm_medium TEXT`, `utm_campaign TEXT`, `utm_content TEXT`, `utm_term TEXT`
- `device_type TEXT`, `browser TEXT`
- `country TEXT`, `region TEXT`, `city TEXT`
- `user_agent TEXT`, `ip_hash TEXT`

#### 1.1d `ab_events` Column Gaps and Mismatches

- `tenant_id UUID NOT NULL` — missing
- `page_url TEXT` — missing
- `order_id TEXT` — missing
- **Event type mismatch**: plan defines `begin_checkout`, migration uses `checkout_start`
- **Revenue field mismatch**: plan uses `event_value_cents BIGINT`, migration uses `revenue_cents INTEGER`
- Primary key type: plan specifies `BIGSERIAL`, migration uses `TEXT` with `gen_random_uuid()`

#### 1.1e `ab_shipping_attributions` Column Gaps

- `tenant_id UUID NOT NULL` — missing
- `visitor_id TEXT` — missing
- `assigned_variant_id TEXT` — missing (has `variant_id` but missing `assigned_variant_id` distinction)
- `assigned_suffix TEXT` — missing
- `product_revenue_cents BIGINT` — missing
- `net_revenue_cents BIGINT` — missing (NRPV calculation field)
- `is_mismatch BOOLEAN` — missing
- `mismatch_reason TEXT` — missing
- `actual_shipping_price_cents INTEGER` — missing

### 1.2 Missing Indexes

Per plan, missing indexes:
- `idx_ab_tests_tenant_status ON ab_tests(tenant_id, status)` — missing since `tenant_id` doesn't exist
- `idx_ab_visitors_lookup ON ab_visitors(tenant_id, test_id, visitor_id)` — missing tenant_id
- `idx_ab_daily_metrics_lookup ON ab_daily_metrics(tenant_id, test_id, date)` — table doesn't exist

---

## Section 2: Core Library (`packages/ab-testing/src/`)

### 2.1 Assignment Module

| File | Status | Notes |
|------|--------|-------|
| `assignment/hash.ts` | ✅ DONE | MurmurHash3 implemented |
| `assignment/allocate.ts` | ✅ DONE | Traffic allocation with cumulative bucketing implemented |
| `assignment/assign.ts` | ✅ DONE | Visitor assignment logic present |
| `assignment/cookies.ts` | ✅ DONE | Cookie parsing/serialization present |

### 2.2 Targeting Module

| File | Status | Notes |
|------|--------|-------|
| `targeting/evaluate.ts` | ✅ DONE | Rule evaluation with AND/OR logic |
| `targeting/conditions.ts` | ✅ DONE | Condition matchers present |
| `targeting/geo.ts` | ✅ DONE | Geo extraction from headers (Cloudflare/Vercel) |

### 2.3 Tracking Module

| File | Status | Notes |
|------|--------|-------|
| `tracking/events.ts` | ⚠️ PARTIAL | Event queue implemented; batch flushing logic present; but flush callback must be wired to actual DB insert (no DB layer in package) |
| `tracking/attribution.ts` | ✅ DONE | Order attribution logic present |
| `tracking/cart-bridge.ts` | 🚨 CRITICAL | Uses `_ab_shipping_suffix` key; Shopify Function reads `_ab_shipping_variant` — **keys don't match** |

### 2.4 Algorithms Module (MAB/Thompson Sampling)

| File | Status | Notes |
|------|--------|-------|
| `algorithms/` directory | ❌ NOT DONE | **Directory does not exist** |
| `algorithms/thompson.ts` | ❌ NOT DONE | Thompson Sampling — only referenced in `types.ts` as a type |
| `algorithms/epsilon-greedy.ts` | ❌ NOT DONE | Epsilon-greedy — not implemented |
| `algorithms/manual.ts` | ❌ NOT DONE | Fixed allocation wrapper — not implemented |

**Impact**: The background optimization jobs reference MAB/Thompson algorithms that don't exist. Dynamic traffic reallocation is completely non-functional.

### 2.5 Scheduler Module

| File | Status | Notes |
|------|--------|-------|
| `scheduler/` directory | ❌ NOT DONE | **Directory does not exist** |
| `scheduler/service.ts` | ❌ NOT DONE | Test lifecycle scheduling — not implemented |
| `scheduler/cron.ts` | ❌ NOT DONE | Scheduled start/stop cron — not implemented |

**Impact**: Scheduled auto-start/auto-end for tests will not work.

### 2.6 Database Layer

| File | Status | Notes |
|------|--------|-------|
| `db/` directory | ❌ NOT DONE | **Directory does not exist** |
| `db/schema.ts` | ❌ NOT DONE | Schema definitions — not implemented |
| `db/queries.ts` | ❌ NOT DONE | Database operations — not implemented |
| `db/mappers.ts` | ❌ NOT DONE | DB ↔ Type mappers — not implemented |
| `db/redis.ts` | ❌ NOT DONE | Redis caching — not implemented |

**Note**: DB operations for admin are handled by `apps/admin/src/lib/ab-tests/db.ts` but this is admin-only and queries non-existent columns/tables.

### 2.7 Shipping Module

| File | Status | Notes |
|------|--------|-------|
| `shipping/config.ts` | ✅ DONE | Config types and `CART_ATTRIBUTE_KEYS` defined |
| `shipping/cart-bridge.ts` | 🚨 CRITICAL | Uses `_ab_shipping_suffix`; Shopify Function uses `_ab_shipping_variant` |
| `shipping/hooks.ts` | ✅ DONE | `useShippingABTest` hook present |
| `shipping/attribution.ts` | ⚠️ PARTIAL | Logic present but queries non-existent DB fields |
| `shipping/results.ts` | ✅ DONE | NRPV calculation logic present |
| `shipping/index.ts` | ✅ DONE | Exports present |

---

## Section 3: Statistics Module (`packages/ab-testing/src/statistics/`)

| File | Status | Notes |
|------|--------|-------|
| `core.ts` | ✅ DONE | Z-test, Welch's t-test, normalCDF, chi-squared, sample size |
| `bootstrap.ts` | ✅ DONE | Bootstrap CI with percentile and BCa methods |
| `cuped.ts` | ✅ DONE | CUPED variance reduction, covariate selection |
| `srm.ts` | ✅ DONE | Chi-squared SRM detection, segment SRM |
| `novelty.ts` | ✅ DONE | Exponential decay fitting for novelty detection |
| `drift.ts` | ✅ DONE | Population drift, time drift detection |
| `multiple-testing.ts` | ✅ DONE | Holm-Bonferroni, Bonferroni, Benjamini-Hochberg |
| `index.ts` | ✅ DONE | Public exports |

**Assessment**: The statistics module is the most complete part of the implementation. All planned statistical methods are present and appear properly implemented.

---

## Section 4: Guardrails & LTV (`packages/ab-testing/src/guardrails/`, `src/analysis/`)

| File | Status | Notes |
|------|--------|-------|
| `guardrails/types.ts` | ✅ DONE | Guardrail types and presets |
| `guardrails/evaluate.ts` | ✅ DONE | Evaluation engine with auto-pause/stop |
| `guardrails/index.ts` | ✅ DONE | Exports |
| `analysis/ltv.ts` | ✅ DONE | 30/60/90 day LTV, repurchase rate, bootstrap CIs |
| `analysis/index.ts` | ✅ DONE | Exports |

---

## Section 5: Background Jobs (`packages/jobs/src/handlers/commerce/ab-testing.ts`)

**Assessment: ALL 14 JOB HANDLERS ARE STUBS** 🚨

Every handler has a comment block listing `// Implementation steps:` with a numbered list of what needs to be done, then returns a hardcoded `{ success: true, data: { ...zeros } }`. No actual DB operations, Redis interactions, or algorithm calls are made.

| Job | Status | Notes |
|-----|--------|-------|
| `abHourlyMetricsAggregationJob` | ❌ STUB | Returns `testsProcessed: 0` always |
| `abNightlyReconciliationJob` | ❌ STUB | Returns `testsReconciled: 0` always |
| `abAggregateTestMetricsJob` | ❌ STUB | Returns `variantsProcessed: 0` always |
| `abSyncRedisToPostgresJob` | ❌ STUB | Returns `testsSynced: 0` always |
| `abDailyMetricsSummaryJob` | ❌ STUB | Never sends Slack or email |
| `abOptimizationJob` | ❌ STUB | Never calls Thompson/MAB algorithm |
| `abOptimizeTestJob` | ❌ STUB | Never updates variant weights |
| `abOptimizationSummaryJob` | ❌ STUB | Never generates recommendations |
| `abOrderReconciliationJob` | ❌ STUB | Never reconciles orders |
| `abOrderReconciliationManualJob` | ❌ STUB | Never attributes orders |
| `abTestSchedulerJob` | ❌ STUB | Never starts/stops/transitions tests |
| `handleABTestCreatedJob` | ❌ STUB | Never initializes Redis counters |
| `handleABTestStartedJob` | ❌ STUB | Never enables assignment |
| `handleABTestEndedJob` | ❌ STUB | Never syncs final metrics |

**Impact**: Metrics will never be aggregated, tests will never auto-start/stop, MAB will never rebalance traffic, order attribution will never reconcile, daily summaries will never send.

---

## Section 6: Shopify Function — Shipping A/B Test

| Item | Status | Notes |
|------|--------|-------|
| Extension directory | 🔄 CHANGED | Plan: `shipping-ab-test/`, Actual: `delivery-customization/` |
| `src/lib.rs` | ✅ DONE | Function logic implemented with unit tests |
| `src/run.graphql` | 🚨 CRITICAL | Reads `_ab_shipping_variant`; cart bridge writes `_ab_shipping_suffix` |
| Subscription bypass | ✅ DONE | Correctly passes through subscription orders |
| Suffix extraction | ✅ DONE | Pattern `" (X)"` correctly extracted |
| Unit tests | ✅ DONE | Tests for valid/invalid patterns, hide logic |
| `test-inputs/` fixtures | ❌ NOT DONE | Plan specifies `variant-a.json`, `variant-b.json`, `no-variant.json` |
| `Cargo.toml` | ✅ DONE | Present with correct dependencies |
| `shopify.extension.toml` | 🔄 CHANGED | Name is "Platform Delivery Customization", handle is "delivery-customization" |

### Critical Cart Attribute Key Mismatch

The end-to-end shipping A/B test flow is broken due to a key mismatch:

```
cart-bridge.ts sets:      { key: '_ab_shipping_suffix', value: variantSuffix }
run.graphql reads:         shippingVariant: attribute(key: "_ab_shipping_variant")
```

One of these must be changed to match the other. The Rust function correctly passes `shipping_variant` through its struct alias, so the fix is likely in `cart-bridge.ts` or `config.ts` where `CART_ATTRIBUTE_KEYS.SHIPPING_SUFFIX = '_ab_shipping_suffix'` should be `'_ab_shipping_variant'`.

---

## Section 7: Admin Pages (`apps/admin/src/`)

### 7.1 Page Routes

| Page | Status | Notes |
|------|--------|-------|
| `/admin/ab-tests` (list) | ✅ DONE | List page implemented |
| `/admin/ab-tests/new` | ✅ DONE | Wizard page implemented |
| `/admin/ab-tests/[testId]` | ✅ DONE | Detail/results page implemented |
| `/admin/ab-tests/[testId]/edit` | ❌ NOT DONE | Edit page directory not present |
| `/admin/ab-tests/data-quality` | ✅ DONE | Quality monitoring page implemented |
| `/admin/templates/ab-tests` | ⚠️ PARTIAL | Template list likely exists but missing key components |
| `/admin/templates/ab-tests/[id]` | ⚠️ PARTIAL | Detail page exists but engagement chart is placeholder text |

### 7.2 Admin Components

| Component | Status | Notes |
|-----------|--------|-------|
| `TestList.tsx` | ✅ DONE | List with pagination and status filter |
| `TestCard.tsx` | ❌ NOT DONE | Card view item — not implemented |
| `QuickStats.tsx` | ✅ DONE | Summary stats bar |
| `TestFilters.tsx` | ✅ DONE | Filter component |
| `TestActions.tsx` | ✅ DONE | Start/pause/stop/end actions |
| `CreateWizard/index.tsx` | ✅ DONE | Wizard container |
| `CreateWizard/Step1Basics.tsx` | ✅ DONE | Name, type, hypothesis |
| `CreateWizard/Step2Variants.tsx` | ✅ DONE | Variant configuration |
| `CreateWizard/Step3Targeting.tsx` | ✅ DONE | Audience targeting |
| `CreateWizard/Step4Schedule.tsx` | ✅ DONE | Dates and guardrails |
| `CreateWizard/Step5Review.tsx` | ✅ DONE | Final review |
| `ResultsDashboard/index.tsx` | ✅ DONE | Main results view |
| `ResultsDashboard/SignificanceBanner.tsx` | ✅ DONE | Winner/significance status |
| `ResultsDashboard/VariantTable.tsx` | ✅ DONE | Variant comparison table |
| `ResultsDashboard/ConversionChart.tsx` | 🔄 CHANGED | Uses hand-rolled SVG instead of Recharts (spec required Recharts) |
| `ResultsDashboard/FunnelChart.tsx` | 🔄 CHANGED | Uses CSS bars instead of Recharts |
| `ResultsDashboard/SegmentAnalysisTabs.tsx` | ✅ DONE | Segment breakdown by device/geo/source |
| `ResultsDashboard/AOVDistribution.tsx` | ❌ NOT DONE | Revenue distribution panel — not implemented |
| `ResultsDashboard/GuardrailStatus.tsx` | ✅ DONE | Guardrail status card |
| `ResultsDashboard/DataQualityCard.tsx` | ✅ DONE | Data quality summary |
| `ResultsDashboard/TestConfigCard.tsx` | ✅ DONE | Test configuration summary |
| `ResultsDashboard/TestHeader.tsx` | ✅ DONE | Test header with status |
| `DataQuality/SRMDashboard.tsx` | ✅ DONE | SRM monitoring (named differently from plan's `SRMAlert`) |
| `DataQuality/NoveltyDashboard.tsx` | ✅ DONE | Novelty monitoring |
| `DataQuality/DriftDashboard.tsx` | ✅ DONE | Drift monitoring |
| `DataQuality/QualityIssuesList.tsx` | ✅ DONE | Quality issues list |
| `DataQuality/Overview.tsx` | ✅ DONE | Overview component |
| `CUPEDPanel.tsx` | ❌ NOT DONE | Variance reduction view — not implemented |
| `LTVSettingsPanel.tsx` | ❌ NOT DONE | Long-term tracking settings — not implemented |
| `ExportPanel.tsx` | ❌ NOT DONE | PDF/CSV export UI panel — not implemented |
| `TargetingRuleEditor.tsx` | ❌ NOT DONE | Planned as standalone component — editing inline in wizard only |
| `GuardrailDashboard.tsx` | ❌ NOT DONE | Standalone guardrail dashboard — only `GuardrailStatus` sidebar card exists |
| `TemplateTestHeader` | ❌ NOT DONE | Template test header component |
| `TemplatePreviewCard` | ❌ NOT DONE | Template preview cards (A/B) |
| `TemplateResultsTable` | ❌ NOT DONE | Template results comparison |
| `TemplateEngagementChart` | ❌ NOT DONE | Template engagement over time (currently "Chart placeholder" text) |

### 7.3 API Routes

| Route | Status | Notes |
|-------|--------|-------|
| `GET /api/admin/ab-tests` | ✅ DONE | List with filters |
| `POST /api/admin/ab-tests` | ✅ DONE | Create test from wizard data |
| `GET /api/admin/ab-tests/[testId]` | ✅ DONE | Test detail |
| `PATCH /api/admin/ab-tests/[testId]` | ✅ DONE | Update test |
| `DELETE /api/admin/ab-tests/[testId]` | ✅ DONE | Delete test |
| `POST /api/admin/ab-tests/[testId]/start` | ✅ DONE | Start test |
| `POST /api/admin/ab-tests/[testId]/pause` | ✅ DONE | Pause test |
| `POST /api/admin/ab-tests/[testId]/end` | ✅ DONE | End test |
| `GET /api/admin/ab-tests/[testId]/results` | ✅ DONE | Get results |
| `GET /api/admin/ab-tests/[testId]/segments` | ✅ DONE | Segment breakdown |
| `GET /api/admin/ab-tests/[testId]/srm` | ✅ DONE | SRM analysis |
| `GET/POST /api/admin/ab-tests/[testId]/guardrails` | ✅ DONE | Guardrail config |
| `GET /api/admin/ab-tests/[testId]/export` | ✅ DONE | CSV export (PDF partial) |
| `GET /api/admin/ab-tests/[testId]/cuped` | ❌ NOT DONE | CUPED analysis endpoint |
| `GET /api/admin/ab-tests/[testId]/bootstrap` | ❌ NOT DONE | Bootstrap CI endpoint |
| `GET /api/admin/ab-tests/[testId]/ltv` | ❌ NOT DONE | LTV analysis endpoint |
| `GET /api/admin/ab-tests/[testId]/attribution` | ❌ NOT DONE | Attribution breakdown endpoint |
| `GET/POST /api/admin/ab-tests/exclusion-groups` | ❌ NOT DONE | Exclusion group management |
| `POST /api/admin/ab-tests/webhooks` | ❌ NOT DONE | Webhook handlers |
| `GET /api/admin/ab-tests/data-quality` | ✅ DONE | Quality overview |
| `GET /api/admin/ab-tests/shipping` | ✅ DONE | List shipping tests |
| `POST /api/admin/ab-tests/shipping` | ✅ DONE | Create shipping test |
| `GET /api/admin/ab-tests/shipping/[id]` | ✅ DONE | Shipping test detail |
| `GET /api/admin/ab-tests/shipping/[id]/results` | ✅ DONE | Shipping NRPV results |

### 7.4 Admin Bulk Actions

| Feature | Status | Notes |
|---------|--------|-------|
| Archive (single) | ⚠️ PARTIAL | Archive icon imported, UI may exist but API route not confirmed |
| Delete (single) | ✅ DONE | DELETE route present |
| Bulk archive/delete | ❌ NOT DONE | Planned but not implemented |

---

## Section 8: Runtime Failure Analysis

The following scenarios will cause **runtime errors** when executed:

### 8.1 Any Test Creation
`POST /api/admin/ab-tests` → `db.ts::createABTest()` → inserts into `ab_tests` with columns `mode`, `test_type`, `goal_event`, `optimization_metric`, `confidence_level`, `base_url`, `schedule_timezone`, `auto_start`, `auto_end`, `scheduled_start_at`, `scheduled_end_at` → **PostgreSQL error: column does not exist**

### 8.2 Any Test Listing
`GET /api/admin/ab-tests` → `db.ts::getABTests()` → queries `test_type` from `ab_tests` (column is actually `type`) → **PostgreSQL error: column "test_type" does not exist**

### 8.3 Any Test Dashboard Load
`GET /api/admin/ab-tests/[testId]/results` → `db.ts::getTestResults()` → joins `ab_daily_metrics` → **PostgreSQL error: relation "ab_daily_metrics" does not exist**

### 8.4 Targeting Rules Fetch
`db.ts::getTargetingRules()` → queries `ab_targeting_rules` → **PostgreSQL error: relation "ab_targeting_rules" does not exist**

### 8.5 Any Shipping Test End-to-End
Cart bridge sets `_ab_shipping_suffix` → Shopify Function reads `_ab_shipping_variant` → **shipping variant is always `null`** → all shipping rates shown to all visitors (test has no effect)

---

## Section 9: Detailed TODO Lists

### 🔴 P0 — Must Fix Before Any Testing

#### TODO-001: Fix Database Schema (ab_tests)

Create migration `060_ab_tests_schema_fix.sql`:

```sql
-- Add missing columns to ab_tests
ALTER TABLE ab_tests
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'manual' 
    CHECK (mode IN ('manual', 'mab', 'thompson')),
  ADD COLUMN IF NOT EXISTS test_type TEXT NOT NULL DEFAULT 'landing_page'
    CHECK (test_type IN ('landing_page', 'shipping', 'email')),
  ADD COLUMN IF NOT EXISTS goal_event TEXT NOT NULL DEFAULT 'purchase'
    CHECK (goal_event IN ('page_view', 'add_to_cart', 'begin_checkout', 'purchase')),
  ADD COLUMN IF NOT EXISTS optimization_metric TEXT NOT NULL DEFAULT 'revenue_per_visitor',
  ADD COLUMN IF NOT EXISTS confidence_level REAL NOT NULL DEFAULT 0.95,
  ADD COLUMN IF NOT EXISTS base_url TEXT,
  ADD COLUMN IF NOT EXISTS is_significant BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS traffic_override_variant_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_config JSONB,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS schedule_timezone TEXT DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS auto_start BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_end BOOLEAN DEFAULT false;

-- Backfill test_type from type for existing rows
UPDATE ab_tests SET test_type = type WHERE test_type IS NULL;

-- Add tenant isolation index
CREATE INDEX IF NOT EXISTS idx_ab_tests_tenant_status 
  ON ab_tests(tenant_id, status);
```

#### TODO-002: Fix Database Schema (ab_variants)

```sql
ALTER TABLE ab_variants
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS url_type TEXT DEFAULT 'static' 
    CHECK (url_type IN ('static', 'landing_page')),
  ADD COLUMN IF NOT EXISTS landing_page_id TEXT,
  ADD COLUMN IF NOT EXISTS traffic_allocation INTEGER 
    GENERATED ALWAYS AS (weight) STORED,  -- or separate column
  ADD COLUMN IF NOT EXISTS preserve_query_params BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS shipping_rate_name TEXT,
  ADD COLUMN IF NOT EXISTS shipping_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS shipping_suffix TEXT;

-- Note: db.ts queries traffic_allocation but migration has weight.
-- Must either rename weight->traffic_allocation or add computed column.
```

#### TODO-003: Create Missing Tables

```sql
-- ab_daily_metrics
CREATE TABLE IF NOT EXISTS ab_daily_metrics (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES ab_variants(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_ab_daily_metrics_lookup 
  ON ab_daily_metrics(tenant_id, test_id, date);

-- ab_targeting_rules
CREATE TABLE IF NOT EXISTS ab_targeting_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  conditions JSONB NOT NULL,
  logic TEXT NOT NULL DEFAULT 'and' CHECK (logic IN ('and', 'or')),
  action TEXT NOT NULL CHECK (action IN ('include', 'exclude', 'assign_variant')),
  assigned_variant_id TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ab_targeting_rules_test 
  ON ab_targeting_rules(tenant_id, test_id);

-- ab_exclusion_groups
CREATE TABLE IF NOT EXISTS ab_exclusion_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ab_test_exclusion_groups
CREATE TABLE IF NOT EXISTS ab_test_exclusion_groups (
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  exclusion_group_id TEXT NOT NULL REFERENCES ab_exclusion_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (test_id, exclusion_group_id)
);
```

#### TODO-004: Fix Cart Attribute Key Mismatch

**File**: `packages/ab-testing/src/shipping/config.ts`

```typescript
// CURRENT (WRONG):
export const CART_ATTRIBUTE_KEYS = {
  SHIPPING_SUFFIX: '_ab_shipping_suffix',  // ← this key is wrong
  ...
}

// FIX: Change to match what delivery-customization/src/run.graphql reads
export const CART_ATTRIBUTE_KEYS = {
  SHIPPING_SUFFIX: '_ab_shipping_variant',  // ← must match GraphQL
  ...
}
```

Also update `packages/ab-testing/src/shipping/hooks.ts` line 149:
```typescript
// CURRENT: (a) => a.key === '_ab_shipping_suffix'
// FIX:     (a) => a.key === '_ab_shipping_variant'
```

#### TODO-005: Fix ab_visitors Schema

```sql
ALTER TABLE ab_visitors
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS landing_page TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS device_type TEXT,
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS ip_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_ab_visitors_lookup 
  ON ab_visitors(tenant_id, test_id, visitor_id);
```

#### TODO-006: Fix ab_events Schema

```sql
ALTER TABLE ab_events
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS page_url TEXT,
  ADD COLUMN IF NOT EXISTS order_id TEXT;

-- Normalize event types (checkout_start → begin_checkout)
UPDATE ab_events SET event_type = 'begin_checkout' WHERE event_type = 'checkout_start';
ALTER TABLE ab_events DROP CONSTRAINT IF EXISTS ab_events_event_type_check;
ALTER TABLE ab_events ADD CONSTRAINT ab_events_event_type_check 
  CHECK (event_type IN ('page_view', 'add_to_cart', 'begin_checkout', 'purchase', 'custom'));
```

#### TODO-007: Fix ab_shipping_attributions Schema

```sql
ALTER TABLE ab_shipping_attributions
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS visitor_id TEXT,
  ADD COLUMN IF NOT EXISTS assigned_suffix TEXT,
  ADD COLUMN IF NOT EXISTS actual_shipping_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS product_revenue_cents BIGINT,
  ADD COLUMN IF NOT EXISTS net_revenue_cents BIGINT,
  ADD COLUMN IF NOT EXISTS is_mismatch BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mismatch_reason TEXT;
```

---

### 🟠 P1 — Required for A/B Tests to Actually Work

#### TODO-008: Implement Thompson Sampling Algorithm

**New file**: `packages/ab-testing/src/algorithms/thompson.ts`

```typescript
/**
 * Thompson Sampling for Multi-Armed Bandit
 * 
 * Updates variant traffic allocations based on conversion performance.
 * Uses Beta distribution sampling to balance exploration vs exploitation.
 */

export interface VariantStats {
  variantId: string
  visitors: number
  conversions: number
}

/**
 * Sample from Beta distribution using inverse CDF approximation.
 * Alpha = successes + 1, Beta = failures + 1.
 */
export function betaSample(alpha: number, beta: number): number {
  // Use inverse-CDF approximation via normal distribution
  // For production, consider a proper gamma-based implementation
  const mean = alpha / (alpha + beta)
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1))
  const std = Math.sqrt(variance)
  // Box-Muller transform for normal sample
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return Math.min(1, Math.max(0, mean + std * z))
}

/**
 * Run Thompson Sampling to determine optimal allocation.
 * Sample 1000 times to estimate probability of each variant being best.
 */
export function thompsonSample(
  variants: VariantStats[],
  sampleCount: number = 1000
): Map<string, number> {
  const wins: Map<string, number> = new Map(
    variants.map(v => [v.variantId, 0])
  )

  for (let i = 0; i < sampleCount; i++) {
    let bestSample = -1
    let bestVariant = ''

    for (const v of variants) {
      const alpha = v.conversions + 1
      const beta = v.visitors - v.conversions + 1
      const sample = betaSample(alpha, beta)
      if (sample > bestSample) {
        bestSample = sample
        bestVariant = v.variantId
      }
    }

    if (bestVariant) {
      wins.set(bestVariant, (wins.get(bestVariant) ?? 0) + 1)
    }
  }

  // Convert wins to percentages (minimum 5% allocation to prevent starvation)
  const allocations = new Map<string, number>()
  const MIN_ALLOCATION = 5
  const remainingPool = 100 - MIN_ALLOCATION * variants.length
  
  for (const [variantId, winCount] of wins.entries()) {
    const baseAllocation = Math.round((winCount / sampleCount) * remainingPool)
    allocations.set(variantId, MIN_ALLOCATION + baseAllocation)
  }

  return allocations
}
```

**New file**: `packages/ab-testing/src/algorithms/epsilon-greedy.ts`

```typescript
export function epsilonGreedy(
  variants: VariantStats[],
  epsilon: number = 0.1
): Map<string, number> {
  const exploitVariant = variants.reduce(
    (best, v) =>
      v.visitors > 0 && v.conversions / v.visitors > (best.visitors > 0 ? best.conversions / best.visitors : 0)
        ? v
        : best,
    variants[0]!
  )

  const allocations = new Map<string, number>()
  const explorationShare = Math.round(epsilon * 100 / variants.length)
  const exploitShare = 100 - explorationShare * (variants.length - 1)

  for (const v of variants) {
    allocations.set(v.variantId, v.variantId === exploitVariant.variantId ? exploitShare : explorationShare)
  }

  return allocations
}
```

**New file**: `packages/ab-testing/src/algorithms/index.ts` — exports all three algorithms.

#### TODO-009: Implement Background Job Handlers (14 jobs)

**File**: `packages/jobs/src/handlers/commerce/ab-testing.ts`

Replace all stub implementations with real logic. Priority order:

1. **`abTestSchedulerJob`** — Critical for auto-start/stop. Query `ab_tests` where:
   - `status = 'scheduled' AND auto_start = true AND scheduled_start_at <= now()` → set `status = 'running'`, `started_at = now()`
   - `status = 'running' AND auto_end = true AND scheduled_end_at <= now()` → set `status = 'completed'`, `ended_at = now()`

2. **`handleABTestCreatedJob`** — Initialize Redis counters per variant:
   ```
   HSET ab:{tenantId}:{testId}:{variantId} impressions 0 conversions 0 revenue 0
   ```

3. **`abHourlyMetricsAggregationJob`** — Read Redis counters, upsert into `ab_daily_metrics`

4. **`abSyncRedisToPostgresJob`** — Full sync Redis → Postgres for durability

5. **`abOptimizationJob`** / **`abOptimizeTestJob`** — Call `thompsonSample()` or `epsilonGreedy()`, update `ab_variants.weight` (or `traffic_allocation` once column added)

6. **`abOrderReconciliationJob`** — Query orders without AB attribution, look up visitor assignments, create conversion records

7. **`abNightlyReconciliationJob`** — Recalculate from raw events, validate aggregates

8. **`abDailyMetricsSummaryJob`** — Query active tests, format message, send to Slack webhook

9. **Remaining 6 jobs** — Implement per their `// Implementation steps:` documentation

#### TODO-010: Implement Test Scheduler Module

**New directory**: `packages/ab-testing/src/scheduler/`

- `service.ts`: Core scheduling logic (start/stop/transition tests)
- `cron.ts`: Exports cron expressions (already defined in `AB_TESTING_SCHEDULES`)

The `abTestSchedulerJob` (TODO-009 #1) needs this module.

#### TODO-011: Create Redis Layer in ab-testing Package

**New file**: `packages/ab-testing/src/db/redis.ts`

```typescript
import type { RedisClient } from '@cgk-platform/redis'

export const AB_REDIS_KEYS = {
  testCounter: (tenantId: string, testId: string, variantId: string) =>
    `ab:${tenantId}:${testId}:${variantId}:counters`,
  activeTests: (tenantId: string) =>
    `ab:${tenantId}:active_tests`,
  variantAssignment: (tenantId: string, testId: string, visitorId: string) =>
    `ab:${tenantId}:${testId}:assignment:${visitorId}`,
}

export async function incrementCounter(
  redis: RedisClient,
  tenantId: string,
  testId: string,
  variantId: string,
  field: 'impressions' | 'conversions' | 'revenue',
  value: number = 1
): Promise<void> {
  const key = AB_REDIS_KEYS.testCounter(tenantId, testId, variantId)
  await redis.hIncrBy(key, field, value)
}

export async function getCounters(
  redis: RedisClient,
  tenantId: string,
  testId: string,
  variantId: string
): Promise<{ impressions: number; conversions: number; revenue: number }> {
  const key = AB_REDIS_KEYS.testCounter(tenantId, testId, variantId)
  const data = await redis.hGetAll(key)
  return {
    impressions: parseInt(data.impressions ?? '0', 10),
    conversions: parseInt(data.conversions ?? '0', 10),
    revenue: parseInt(data.revenue ?? '0', 10),
  }
}
```

---

### 🟡 P2 — Required for Full Feature Completeness

#### TODO-012: Add Missing API Routes

1. **`GET /api/admin/ab-tests/[testId]/cuped`**
   - Call `applyCUPEDComparison()` from `packages/ab-testing/src/statistics/cuped.ts`
   - Return variance reduction, adjusted metrics, covariate correlation

2. **`GET /api/admin/ab-tests/[testId]/bootstrap`**
   - Call `bootstrapConversionRate()` and `bootstrapRatio()` from `statistics/bootstrap.ts`
   - Return confidence intervals for each variant's conversion rate and relative lift

3. **`GET /api/admin/ab-tests/[testId]/ltv`**
   - Call `compareLTV()` from `analysis/ltv.ts`
   - Return 30/60/90-day LTV comparison between variants

4. **`GET /api/admin/ab-tests/[testId]/attribution`**
   - Return order attribution breakdown for this test
   - Join `ab_shipping_attributions`, `ab_test_conversions` where applicable

5. **`GET/POST /api/admin/ab-tests/exclusion-groups`**
   - CRUD for `ab_exclusion_groups` and `ab_test_exclusion_groups`

6. **`POST /api/admin/ab-tests/webhooks`**
   - Handle Shopify order webhooks → call `attributeShippingOrder()`

#### TODO-013: Build Missing Admin UI Components

1. **`components/ab-tests/ResultsDashboard/AOVDistribution.tsx`**
   - Histogram showing order value distribution per variant
   - Use SVG bars or integrate Recharts (BarChart)

2. **`components/ab-tests/CUPEDPanel.tsx`**
   - Show variance reduction %, adjusted conversion rates, covariate details
   - Fetch from `/api/admin/ab-tests/[testId]/cuped`

3. **`components/ab-tests/LTVSettingsPanel.tsx`**
   - 30/60/90 day LTV table per variant
   - Fetch from `/api/admin/ab-tests/[testId]/ltv`

4. **`components/ab-tests/ExportPanel.tsx`**
   - Button to download CSV / generate PDF
   - Currently just a bare route; no UI panel exists

5. **`components/ab-tests/TargetingRuleEditor.tsx`** (standalone)
   - Extract the rule builder from wizard Step3 into reusable component
   - Used in both create wizard and test edit page

6. **`components/ab-tests/GuardrailDashboard.tsx`** (full page component)
   - Expand current `GuardrailStatus` sidebar card into full dashboard
   - Show all guardrails, current values, trend over time

7. **Template test components**:
   - `TemplateTestHeader.tsx`
   - `TemplatePreviewCard.tsx` 
   - `TemplateResultsTable.tsx`
   - `TemplateEngagementChart.tsx` (currently "Chart placeholder" text)

#### TODO-014: Create Test Edit Page

**New file**: `apps/admin/src/app/admin/ab-tests/[testId]/edit/page.tsx`

```typescript
// Edit page for draft/paused tests
// Reuse CreateWizard components pre-populated with test data
export default async function EditTestPage({ params }: { params: { testId: string } }) {
  return (
    <div>
      <PageHeader title="Edit Test" />
      <CreateWizard testId={params.testId} isEdit />
    </div>
  )
}
```

Requires `CreateWizard` to accept optional `testId` prop and pre-populate wizard state.

#### TODO-015: Add test-inputs Fixtures for Shopify Function

**New directory**: `apps/shopify-app/extensions/delivery-customization/test-inputs/`

```json
// variant-a.json
{
  "cart": {
    "shippingVariant": { "value": "A" },
    "visitorId": { "value": "01ABCDEF1234567890XYZ" },
    "lines": [],
    "deliveryGroups": [
      {
        "deliveryOptions": [
          { "handle": "rate-a", "title": "Standard Shipping (A)", "cost": { "amount": "8.74" } },
          { "handle": "rate-b", "title": "Standard Shipping (B)", "cost": { "amount": "5.99" } }
        ]
      }
    ]
  }
}
```

#### TODO-016: Migrate Charts to Recharts

The spec requires Recharts (already in stack). Current implementation uses hand-rolled SVG polylines and CSS bars:

**Files to update**:
- `ResultsDashboard/ConversionChart.tsx` → Replace SVG `<polyline>` with `<LineChart>` from Recharts
- `ResultsDashboard/FunnelChart.tsx` → Replace CSS bars with `<BarChart>` from Recharts
- `apps/admin/src/app/admin/templates/ab-tests/[id]/page.tsx` → Replace "Chart placeholder" with real `<AreaChart>`

```typescript
// Example Recharts conversion
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

<ResponsiveContainer width="100%" height={256}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} />
    <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
    <Legend />
    {variantNames.map((name, i) => (
      <Line key={name} type="monotone" dataKey={name} stroke={colors[i]} dot={false} />
    ))}
  </LineChart>
</ResponsiveContainer>
```

#### TODO-017: Implement Bulk Actions

**File**: `apps/admin/src/components/ab-tests/TestList.tsx`

The Archive icon is imported but bulk selection and bulk API calls are likely incomplete:

- Add checkboxes to rows
- Track selected test IDs in state
- Add bulk action bar that appears when items are selected
- Wire to `DELETE /api/admin/ab-tests/[testId]` for each selected

---

### 🟢 P3 — Polish and Completeness

#### TODO-018: Package Database Layer

The planned `packages/ab-testing/src/db/` module should contain tenant-scoped DB operations usable by any service (not just admin). Currently DB logic is only in the admin app.

- `db/schema.ts` — Zod schemas for AB test row types
- `db/queries.ts` — Reusable tenant-scoped query functions
- `db/mappers.ts` — Row → TypeScript type mappers

#### TODO-019: Add Redis to Real-Time Event Tracking

Currently `tracking/events.ts` has an `EventQueue` with a `flushCallback` but the flush callback is never wired to anything by default. 

- The queue's `onFlush` callback should write to `ab_events` table directly or via Redis
- Add Redis increment for real-time counter updates (< 100ms path)

#### TODO-020: Verify TypeScript Compilation

Run `npx tsc --noEmit` from the platform root. Given the schema mismatches (queries referencing non-existent columns via template literals, not typed queries), there may be no compile errors but runtime behavior will fail silently.

---

## Section 10: Feature Classification Summary

| Feature | Phase | Status |
|---------|-------|--------|
| **CORE** | | |
| `ab_tests` table (full schema) | CORE | 🚨 CRITICAL — schema incomplete |
| `ab_variants` table (full schema) | CORE | 🚨 CRITICAL — schema incomplete |
| `ab_visitors` table (full schema) | CORE | 🚨 CRITICAL — schema incomplete |
| `ab_events` table (full schema) | CORE | 🚨 CRITICAL — schema incomplete, type mismatch |
| `ab_daily_metrics` table | CORE | ❌ NOT DONE |
| `ab_targeting_rules` table | CORE | ❌ NOT DONE |
| `ab_exclusion_groups` tables | CORE | ❌ NOT DONE |
| MurmurHash3 assignment | CORE | ✅ DONE |
| Traffic allocation algorithm | CORE | ✅ DONE |
| Cookie management | CORE | ✅ DONE |
| Visitor assignment | CORE | ✅ DONE |
| Targeting rule evaluation | CORE | ✅ DONE |
| Geo detection | CORE | ✅ DONE |
| Event queue/batch recording | CORE | ⚠️ PARTIAL — no DB flush wired |
| Order attribution | CORE | ⚠️ PARTIAL — queries non-existent fields |
| Thompson Sampling (MAB) | CORE | ❌ NOT DONE |
| Epsilon-greedy algorithm | CORE | ❌ NOT DONE |
| Test scheduler | CORE | ❌ NOT DONE |
| ab-testing/src/db/ layer | CORE | ❌ NOT DONE |
| Redis caching layer | CORE | ❌ NOT DONE |
| **STATS** | | |
| Z-test significance | STATS | ✅ DONE |
| Bootstrap confidence intervals | STATS | ✅ DONE |
| CUPED variance reduction | STATS | ✅ DONE |
| SRM detection | STATS | ✅ DONE |
| Novelty effect detection | STATS | ✅ DONE |
| Population drift detection | STATS | ✅ DONE |
| Holm-Bonferroni correction | STATS | ✅ DONE |
| Guardrails evaluation engine | STATS | ✅ DONE |
| LTV analysis (30/60/90 day) | STATS | ✅ DONE |
| **SHIPPING** | | |
| Shopify Function (delivery-customization) | SHIPPING | 🔄 CHANGED — dir name, file name |
| Shipping rate filtering logic | SHIPPING | ✅ DONE |
| Subscription bypass | SHIPPING | ✅ DONE |
| Cart attribute sync | SHIPPING | 🚨 CRITICAL — key mismatch |
| Shipping test API (create/list) | SHIPPING | ✅ DONE |
| Shipping test results (NRPV) | SHIPPING | ✅ DONE |
| Shipping attribution (DB) | SHIPPING | ⚠️ PARTIAL — missing key fields |
| Mismatch detection | SHIPPING | ⚠️ PARTIAL — schema missing is_mismatch |
| test-inputs/ fixtures | SHIPPING | ❌ NOT DONE |
| **ADMIN** | | |
| Test list page | ADMIN | ✅ DONE |
| Create wizard (all 5 steps) | ADMIN | ✅ DONE |
| Test detail page | ADMIN | ✅ DONE |
| Test edit page | ADMIN | ❌ NOT DONE |
| Data quality page | ADMIN | ✅ DONE |
| Template test list | ADMIN | ⚠️ PARTIAL |
| Template test detail | ADMIN | ⚠️ PARTIAL — placeholder chart |
| Significance banner | ADMIN | ✅ DONE |
| Variant table | ADMIN | ✅ DONE |
| Conversion chart | ADMIN | 🔄 CHANGED — SVG instead of Recharts |
| Funnel chart | ADMIN | 🔄 CHANGED — CSS bars instead of Recharts |
| Segment analysis | ADMIN | ✅ DONE |
| AOV distribution panel | ADMIN | ❌ NOT DONE |
| CUPED panel | ADMIN | ❌ NOT DONE |
| LTV settings panel | ADMIN | ❌ NOT DONE |
| Export panel (UI) | ADMIN | ❌ NOT DONE |
| Guardrail dashboard (full) | ADMIN | ❌ NOT DONE (only sidebar card) |
| Targeting rule editor (standalone) | ADMIN | ❌ NOT DONE (inline in wizard only) |
| Bulk actions | ADMIN | ❌ NOT DONE |
| TestCard component | ADMIN | ❌ NOT DONE |
| CUPED API route | ADMIN | ❌ NOT DONE |
| Bootstrap API route | ADMIN | ❌ NOT DONE |
| LTV API route | ADMIN | ❌ NOT DONE |
| Attribution API route | ADMIN | ❌ NOT DONE |
| Exclusion groups API | ADMIN | ❌ NOT DONE |
| Webhooks API | ADMIN | ❌ NOT DONE |
| **JOBS** | | |
| abTestSchedulerJob (auto-start/stop) | CORE | ❌ STUB |
| abHourlyMetricsAggregationJob | CORE | ❌ STUB |
| abNightlyReconciliationJob | CORE | ❌ STUB |
| abSyncRedisToPostgresJob | CORE | ❌ STUB |
| abDailyMetricsSummaryJob | CORE | ❌ STUB |
| abOptimizationJob | CORE | ❌ STUB |
| abOptimizeTestJob | CORE | ❌ STUB |
| abOptimizationSummaryJob | CORE | ❌ STUB |
| abOrderReconciliationJob | CORE | ❌ STUB |
| abOrderReconciliationManualJob | CORE | ❌ STUB |
| handleABTestCreatedJob | CORE | ❌ STUB |
| handleABTestStartedJob | CORE | ❌ STUB |
| handleABTestEndedJob | CORE | ❌ STUB |
| abAggregateTestMetricsJob | CORE | ❌ STUB |

---

## Section 11: Recommended Remediation Order

**Week 1 (P0 — Nothing works without these)**:
1. TODO-001: Fix `ab_tests` schema (add 18 columns)
2. TODO-002: Fix `ab_variants` schema (rename weight → traffic_allocation, add 8 columns)
3. TODO-003: Create `ab_daily_metrics`, `ab_targeting_rules`, `ab_exclusion_groups` tables
4. TODO-004: Fix cart attribute key (`_ab_shipping_suffix` → `_ab_shipping_variant`)
5. TODO-005: Fix `ab_visitors` schema
6. TODO-006: Fix `ab_events` schema + event type normalization
7. TODO-007: Fix `ab_shipping_attributions` schema

**Week 2 (P1 — Core functionality)**:
8. TODO-008: Implement Thompson Sampling and epsilon-greedy algorithms
9. TODO-009: Implement all 14 background job handlers (start with scheduler, Redis init, hourly agg)
10. TODO-010: Implement scheduler module
11. TODO-011: Create Redis layer in ab-testing package

**Week 3 (P2 — Feature completeness)**:
12. TODO-012: Add 6 missing API routes (CUPED, bootstrap, LTV, attribution, exclusion-groups, webhooks)
13. TODO-013: Build 7 missing admin UI components
14. TODO-014: Create test edit page
15. TODO-015: Add test-inputs fixtures
16. TODO-016: Migrate charts to Recharts
17. TODO-017: Implement bulk actions

**Week 4 (P3 — Polish)**:
18. TODO-018: Package database layer
19. TODO-019: Wire Redis to real-time event tracking
20. TODO-020: Full TypeScript compilation audit

---

## Appendix: Files Audited

```
packages/ab-testing/src/index.ts
packages/ab-testing/src/types.ts
packages/ab-testing/src/config.ts
packages/ab-testing/src/server.ts
packages/ab-testing/src/assignment/{hash,allocate,assign,cookies}.ts
packages/ab-testing/src/targeting/{evaluate,conditions,geo,index}.ts
packages/ab-testing/src/tracking/{events,attribution,cart-bridge}.ts
packages/ab-testing/src/statistics/{core,bootstrap,cuped,srm,novelty,drift,multiple-testing,index}.ts
packages/ab-testing/src/guardrails/{types,evaluate,index}.ts
packages/ab-testing/src/analysis/{ltv,index}.ts
packages/ab-testing/src/shipping/{config,cart-bridge,hooks,attribution,results,index}.ts
packages/db/src/migrations/tenant/041_ab_tests.sql
packages/db/src/migrations/tenant/042_ab_variants.sql
packages/db/src/migrations/tenant/043_ab_visitors.sql
packages/db/src/migrations/tenant/044_ab_events.sql
packages/db/src/migrations/tenant/045_ab_test_assignments.sql
packages/db/src/migrations/tenant/046_ab_test_conversions.sql
packages/db/src/migrations/tenant/047_ab_shipping_attributions.sql
packages/db/src/migrations/tenant/048_template_ab_tests.sql
packages/jobs/src/handlers/commerce/ab-testing.ts
packages/jobs/src/trigger/commerce/ab-testing.ts
apps/admin/src/lib/ab-tests/db.ts
apps/admin/src/lib/ab-tests/hooks.ts
apps/admin/src/lib/ab-tests/types.ts
apps/admin/src/app/admin/ab-tests/page.tsx
apps/admin/src/app/admin/ab-tests/new/page.tsx
apps/admin/src/app/admin/ab-tests/[testId]/page.tsx
apps/admin/src/app/admin/ab-tests/data-quality/page.tsx
apps/admin/src/app/admin/templates/ab-tests/[id]/page.tsx
apps/admin/src/components/ab-tests/CreateWizard/{index,Step1-5}.tsx
apps/admin/src/components/ab-tests/ResultsDashboard/{index,SignificanceBanner,VariantTable,ConversionChart,FunnelChart,SegmentAnalysisTabs,GuardrailStatus,DataQualityCard,TestConfigCard,TestHeader}.tsx
apps/admin/src/components/ab-tests/DataQuality/{SRMDashboard,NoveltyDashboard,DriftDashboard,QualityIssuesList,Overview}.tsx
apps/admin/src/components/ab-tests/{TestList,TestCard,QuickStats,TestFilters,TestActions}.tsx
apps/admin/src/app/api/admin/ab-tests/route.ts
apps/admin/src/app/api/admin/ab-tests/[testId]/{route,start,pause,end,results,segments,srm,guardrails,export}/route.ts
apps/admin/src/app/api/admin/ab-tests/data-quality/route.ts
apps/admin/src/app/api/admin/ab-tests/shipping/{route,[id]/route,[id]/results/route}.ts
apps/shopify-app/extensions/delivery-customization/src/lib.rs
apps/shopify-app/extensions/delivery-customization/src/run.graphql
apps/shopify-app/extensions/delivery-customization/shopify.extension.toml
apps/shopify-app/extensions/delivery-customization/Cargo.toml
```
