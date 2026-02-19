# AGENT-10: Attribution & Analytics Audit
**Date**: 2026-02-19  
**Auditor**: Agent-10 (Subagent — cgk-audit-agent-10)  
**Scope**: `packages/analytics/src/`, `apps/admin/src/` (attribution), `apps/storefront/src/lib/attribution/`, `packages/jobs/src/handlers/analytics/`, `packages/integrations/src/`, DB migrations  
**Phase Docs**: PHASE-2AT-ATTRIBUTION-CORE.md, PHASE-2AT-ATTRIBUTION-ADVANCED.md, PHASE-2AT-ATTRIBUTION-ANALYTICS.md, PHASE-2AT-ATTRIBUTION-INTEGRATIONS.md  
**Reference Docs**: META-ADS-INTEGRATION.md, GOOGLE-ADS-INTEGRATION.md

---

## EXECUTIVE SUMMARY

The CGK attribution system has a **well-architected UI/DB shell that is largely data-starved**. All four attribution phases are marked ✅ COMPLETE in their planning documents, but this audit reveals a **critical gap** between the UI layer and the actual data pipeline. The admin dashboard pages exist and render, but the background jobs that populate `attribution_channel_summary` (the central fact table all analytics pages query) are fully stubbed — they log intent but perform no real database operations.

**Three tiers of completeness**:
1. ✅ UI pages + API routes + type system: **~90% complete**
2. ⚠️ Database schema: **~60% complete** (8+ tables used by application code have no migration)
3. ❌ Data pipeline (background jobs, API calls, ingestion): **~10% complete** (nearly all stubs)

---

## CLASSIFICATION KEY
- ✅ DONE — fully implemented, wired, production-ready
- ⚠️ PARTIAL — code exists but has gaps (schema mismatch, stub bodies, missing wiring)
- ❌ NOT DONE — feature planned but not implemented
- 🔄 CHANGED — implementation differs from plan

---

## PART 1: ATTRIBUTION MODELS

### 1.1 Attribution Model Calculations

| Feature | Status | Notes |
|---|---|---|
| First-touch attribution | ⚠️ PARTIAL | Logic correct in `attribution.ts` handler, but `processAttributionJob` doesn't load touchpoints from DB |
| Last-touch attribution | ⚠️ PARTIAL | Same issue — logic exists, no real data flows through |
| Linear attribution | ⚠️ PARTIAL | Calculation correct in job handler |
| Time-decay attribution | ⚠️ PARTIAL | Half-life configurable (default 7d). Logic correct. No real data. |
| Position-based (40/20/40) | ⚠️ PARTIAL | Logic in `attribution.ts` handler. No real data. |
| Data-driven attribution | ⚠️ PARTIAL | Falls back to `linear` in `calculateCreditByModel()` in db-advanced.ts |
| Last-non-direct attribution | ⚠️ PARTIAL | Type defined, falls back to `isLast ? 100 : 0` |
| All 7 models in settings DB | ✅ DONE | `enabled_models` array in `attribution_settings` includes all 7 |
| Model selector in UI | ✅ DONE | Global model selector wired to all attribution pages |
| Per-model credit display in Journey Detail | ✅ DONE | `calculateCreditByModel()` in db-advanced.ts called correctly |

**Critical gap**: `processAttributionJob` (the handler triggered on each order) does not:
1. Load order revenue from DB — hardcodes `revenue: 0`
2. Load visitor touchpoints from DB — hardcodes empty `[]`
3. Write `attribution_results` rows
4. Queue `sendGA4PurchaseJob` or `sendMetaPurchaseJob`

```
// ACTUAL CODE in attribution.ts line ~234:
const conversion: Conversion = {
  orderId,
  visitorId: job.payload.visitorId || 'visitor_unknown',
  revenue: 0, // Would be loaded from DB  ← STUB
  currency: 'USD',
  timestamp: new Date(),
}
const touchpoints: Touchpoint[] = []  // ← STUB — always empty
```

---

### 1.2 Attribution Windows

| Feature | Status | Notes |
|---|---|---|
| 1d, 3d, 7d, 14d, 28d, 30d, 90d windows | ✅ DONE | All defined in schema + UI |
| LTV (lifetime) window | ✅ DONE | Mapped to 365 days in `parseWindowToDays()` |
| Per-window data aggregation | ❌ NOT DONE | `attributionDailyMetricsJob` doesn't aggregate (stub) |
| Time range picker in UI | ✅ DONE | Wired to all pages via layout context |

---

## PART 2: PIXEL TRACKING & UTM HANDLING

### 2.1 Storefront Attribution (UTM Capture)

| Feature | Status | Notes |
|---|---|---|
| UTM parameter parsing (source/medium/campaign/term/content) | ✅ DONE | `parseAttributionParams()` in storefront/lib/attribution/index.ts |
| Click ID capture: fbclid, gclid, ttclid, msclkid | ✅ DONE | All captured in storefront attribution module |
| Creator/affiliate ref code capture | ✅ DONE | `?ref=` and `?creator=` params captured |
| First-touch vs last-touch cookie storage | ✅ DONE | `firstTouch` + `lastTouch` in cookie |
| Visitor ID generation | ✅ DONE | `generateVisitorId()` from cart/attributes |
| Session ID generation | ✅ DONE | `generateSessionId()` |
| Touchpoint DB write (attribution_touchpoints) | ✅ DONE | `recordTouchpoint()` writes to DB via `withTenant()` |
| Device type detection | ✅ DONE | UA parser: desktop/mobile/tablet |
| Attribution summary for cart tagging | ✅ DONE | `getAttributionSummary()` returns first-touch source/medium + last-touch click ID |

**Note**: The storefront attribution module is the most complete piece of the entire attribution system.

---

### 2.2 Shopify Session-Stitching Web Pixel

| Feature | Status | Notes |
|---|---|---|
| Shopify Web Pixel Extension scaffold | ✅ DONE | `apps/shopify-app/extensions/session-stitching-pixel/src/index.ts` |
| Cart attribute extraction (GA4 client_id, session_id) | ✅ DONE | Reads `_ga4_client_id`, `_ga4_session_id` from checkout attributes |
| Cart attribute extraction (Meta fbp, fbc, external_id) | ✅ DONE | Reads `_meta_fbp`, `_meta_fbc`, `_meta_external_id` |
| checkout_started event → GA4 begin_checkout | ✅ DONE | `sendGA4Event('begin_checkout', ...)` |
| checkout_started event → Meta InitiateCheckout | ✅ DONE | `sendMetaEvent('InitiateCheckout', ...)` |
| payment_info_submitted → GA4 add_payment_info | ✅ DONE | Implemented |
| payment_info_submitted → Meta AddPaymentInfo | ✅ DONE | Implemented |
| checkout_completed → GA4 purchase | ✅ DONE | Sends via Measurement Protocol directly from pixel |
| checkout_completed → Meta Purchase CAPI | ✅ DONE | Sends directly to `graph.facebook.com/v21.0/{pixelId}/events` |
| PII hashing (SHA-256 for Meta) | ✅ DONE | Uses `crypto.subtle.digest('SHA-256')` correctly |
| Platform event forwarding (CGK API) | ⚠️ PARTIAL | Calls `${PLATFORM_API_URL}/api/events/checkout` — this route does not exist in admin app |
| TikTok Events API from pixel | ❌ NOT DONE | Only GA4 and Meta implemented in pixel; no TikTok |
| Debug mode logging | ✅ DONE | Gated behind `enable_debug` setting |

---

### 2.3 Pixel Monitoring in Admin (Integrations-DB)

| Feature | Status | Notes |
|---|---|---|
| Pixel health metrics UI (GA4/Meta/TikTok) | ✅ DONE | `/admin/attribution/pixels` page |
| Pixel health metrics backend | ⚠️ PARTIAL | `getPixelHealthMetrics()` queries `attribution_results` for columns that **don't exist** in schema |
| Pixel event stream backend | ⚠️ PARTIAL | `getPixelEvents()` queries `attribution_results` for `source`, `event_type`, `session_id`, `matched_order_id`, `raw_data` — none of these columns exist in `attribution_results` (schema only has: `conversion_id`, `touchpoint_id`, `model`, `attribution_window`, `credit`, `attributed_revenue`) |
| Meta EMQ score tracking | ⚠️ PARTIAL | Queries `meta_ad_connections.emq_score` — column **does not exist** in `018_integrations.sql` schema |
| Pixel alert configs | ⚠️ PARTIAL | Returns hardcoded in-memory defaults, no `pixel_alert_configs` table |
| Pixel failure log | ⚠️ PARTIAL | Same schema mismatch — queries non-existent columns |
| Retry pixel event | ⚠️ PARTIAL | Updates `attribution_results.retry_count` — column doesn't exist in schema |

**Schema mismatch detail**: The integration-db.ts pixel monitoring code was written against a hypothetical `attribution_results` schema that acts as an event log table (like `{source, event_type, session_id, matched_order_id, raw_data, error_message}`). The actual `attribution_results` is a pure attribution credit table (`{conversion_id, touchpoint_id, model, credit, attributed_revenue}`). These are fundamentally different — a **new table is needed**.

---

## PART 3: AD PLATFORM INTEGRATIONS

### 3.1 Meta Ads (OAuth + CAPI)

| Feature | Status | Notes |
|---|---|---|
| Meta OAuth connect flow | ✅ DONE | `packages/integrations/src/meta/oauth.ts` — completeMetaOAuth, selectMetaAdAccount |
| Meta token refresh | ✅ DONE | `packages/integrations/src/meta/refresh.ts` |
| Meta `meta_ad_connections` DB table | ✅ DONE | `018_integrations.sql` |
| Meta Ads health monitor | ✅ DONE | `packages/health/src/monitors/meta.ts` |
| Meta CAPI send from background job | ⚠️ PARTIAL | `sendMetaPurchaseJob` builds correct payload but **API call is commented out** |
| Meta CAPI tenant credentials lookup | ❌ NOT DONE | Job has `// Implementation would: query meta_ad_connections for access_token` — not implemented |
| Meta pixel ID → tenancy mapping | ❌ NOT DONE | No table/config links tenant to pixel ID for CAPI calls |
| Meta spend sync job | ⚠️ PARTIAL | `syncMetaAdsSpendJob` defined but API call is stub; no `meta_daily_spend` table |
| Meta EMQ score fetch + store | ❌ NOT DONE | No code to fetch EMQ from Meta API; no `emq_score` column in `meta_ad_connections` |
| Meta Ads page in admin integrations | ✅ DONE | `/admin/integrations/meta-ads/page.tsx` |
| PII hashing (SHA-256) in CAPI job | ⚠️ PARTIAL | `hashPII()` returns `sha256_${value}` (placeholder, not real hash) |

---

### 3.2 Google Ads (OAuth + Spend Sync)

| Feature | Status | Notes |
|---|---|---|
| Google Ads OAuth connect flow | ✅ DONE | `packages/integrations/src/google-ads/oauth.ts` |
| Google Ads token refresh | ✅ DONE | `packages/integrations/src/google-ads/refresh.ts` |
| Google Ads `google_ads_connections` DB table | ✅ DONE | `018_integrations.sql` |
| Google Ads health monitor | ✅ DONE | `packages/health/src/monitors/google-ads.ts` |
| Google Ads spend sync job | ⚠️ PARTIAL | `syncGoogleAdsSpendJob` defined — GAQL query built but no API call made, no `google_daily_spend` table |
| Google Ads customer ID → tenant mapping | ❌ NOT DONE | Job has `// Implementation would: query google_ads_connections` — stub |
| GCLid → conversion upload | ❌ NOT DONE | Not planned in phases, not implemented |
| Google Ads Enhanced Conversions | ❌ NOT DONE | Not implemented |
| google_daily_spend table | ❌ NOT DONE | No migration exists for spend cache |

---

### 3.3 TikTok Ads

| Feature | Status | Notes |
|---|---|---|
| TikTok Events API job handler | ⚠️ PARTIAL | `sendTikTokEventJob` builds payload but API call is commented out |
| TikTok spend sync | ❌ NOT DONE | `SyncTikTokSpendPayload` type exists, job handler referenced but not found |
| TikTok OAuth / connection | ❌ NOT DONE | No `packages/integrations/src/tiktok/` directory |
| TikTok admin page | ✅ DONE | `/admin/integrations/tiktok-ads/page.tsx` |
| TikTok `tiktok_connections` DB table | ❌ NOT DONE | No migration |
| ttclid capture in storefront | ✅ DONE | Captured in UTM/click ID parser |
| TikTok Events API from web pixel | ❌ NOT DONE | Not implemented in session-stitching pixel |
| PII hashing for TikTok | ⚠️ PARTIAL | Same placeholder `sha256_${value}` issue |

---

### 3.4 Secondary Platforms (Snapchat, Pinterest, LinkedIn, MNTN, Affiliate)

| Feature | Status | Notes |
|---|---|---|
| `attribution_platform_connections` DB table | ❌ NOT DONE | **No migration exists** — all queries will fail |
| Secondary platform connections UI | ✅ DONE | `/admin/attribution/platforms/page.tsx` |
| Secondary platform CRUD API | ✅ DONE | API routes at `/api/admin/attribution/platforms/` |
| Secondary platform sync job | ❌ NOT DONE | Stub only; no actual sync logic for any platform |

---

## PART 4: CONVERSION TRACKING

### 4.1 Order-to-Touchpoint Matching

| Feature | Status | Notes |
|---|---|---|
| attribution_touchpoints table | ✅ DONE | Full schema with visitor_id, session_id, click IDs |
| attribution_conversions table | ✅ DONE | order_id, revenue, customer_id, is_first_purchase |
| attribution_results table | ✅ DONE | Correct schema for multi-model credit storage |
| Order → conversion record creation | ❌ NOT DONE | No code writes to `attribution_conversions` when order created (Shopify webhook) |
| Visitor → customer identity stitching | ❌ NOT DONE | No code links `visitor_id` from touchpoint cookie to `customer_id` at checkout |
| `processAttributionJob` actually processes | ❌ NOT DONE | Handler is a full stub (see §1.1 above) |
| Order reconciliation job | ⚠️ PARTIAL | `attributionOrderReconciliationJob` defined but stub — no actual DB queries |
| Webhook queue processing | ⚠️ PARTIAL | `AttributionWebhookQueuePayload` type + job defined, stub only |
| Unattributed order handling | ⚠️ PARTIAL | `attributionProcessUnattributedJob` defined, stub only |

---

### 4.2 Server-Side Event Forwarding

| Feature | Status | Notes |
|---|---|---|
| GA4 Measurement Protocol purchase | ⚠️ PARTIAL | Payload correctly built in both pixel + job; **job API call commented out** |
| Meta CAPI purchase | ⚠️ PARTIAL | Payload built; **job API call commented out**; pixel sends directly ✅ |
| GA4 + Meta from Shopify pixel (checkout only) | ✅ DONE | Shopify pixel sends both directly on `checkout_completed` |
| `trackServerPurchase()` in packages/analytics/src/server.ts | ✅ DONE | Generic helper implemented, but nothing calls it in production flow |
| Deduplication (event_id from orderId) | ⚠️ PARTIAL | `generateEventId()` exists but uses `Date.now()` — not deterministic across retries |
| `/api/events/checkout` platform ingestion endpoint | ❌ NOT DONE | Referenced by Shopify pixel (`PLATFORM_API_URL/api/events/checkout`) but route does not exist |

---

## PART 5: ROAS REPORTING

### 5.1 ROAS Calculation & Display

| Feature | Status | Notes |
|---|---|---|
| ROAS column in `attribution_channel_summary` | ✅ DONE | Schema has `roas DECIMAL(10,4)` |
| ROAS display in channels page | ✅ DONE | UI implemented |
| ROAS Index page | ✅ DONE | `/admin/attribution/roas-index/page.tsx` + API route |
| MER (Marketing Efficiency Ratio) in KPIs | ✅ DONE | Defined in overview types |
| ROAS by model comparison | ✅ DONE | Model comparison page implemented |
| ROAS anomaly detection in AI Insights | ✅ DONE | Implemented in `insights-engine.ts` |
| Actual spend data flowing into ROAS | ❌ NOT DONE | `attribution_channel_summary.spend` is never populated (daily metrics job is stub) |
| Google Ads spend sync → channel summary | ❌ NOT DONE | `syncGoogleAdsSpendJob` stub; no `google_daily_spend` table |
| Meta Ads spend sync → channel summary | ❌ NOT DONE | `syncMetaAdsSpendJob` stub; no `meta_daily_spend` table |
| Channel summary aggregation job | ❌ NOT DONE | `attributionDailyMetricsJob` is a complete stub |

**Result**: ROAS on all pages will show `0` or `null` in production because spend data is never populated.

---

## PART 6: ATTRIBUTION DASHBOARD

### 6.1 Core Dashboard Pages (Phase 2AT-A)

| Page/Feature | Status | Notes |
|---|---|---|
| `/admin/attribution` — Overview dashboard | ✅ DONE | Page + API route + DB query exist |
| KPI cards (Revenue, Conversions, ROAS, MER) | ✅ DONE | UI + API + DB |
| Channel breakdown widget | ✅ DONE | Queries `attribution_channel_summary` |
| Platform comparison (Meta/Google/TikTok) | ✅ DONE | UI + query |
| Model selector (7 models) | ✅ DONE | Global layout context |
| Time range picker | ✅ DONE | Wired to all pages |
| Real-time toggle (48hr view) | ✅ DONE | UI implemented |
| Settings page | ✅ DONE | `/admin/attribution/settings/page.tsx` |
| Data quality dashboard | ✅ DONE | `/admin/attribution/data-quality/page.tsx` |
| Setup wizard | ✅ DONE | `/admin/attribution/setup/page.tsx` |
| `attribution_data_quality_snapshots` population | ❌ NOT DONE | No job writes to this table |

---

### 6.2 Analytics Pages (Phase 2AT-B)

| Page/Feature | Status | Notes |
|---|---|---|
| Channels page (hierarchical drill-down) | ✅ DONE | UI + API + DB query exist |
| Products attribution page | ✅ DONE | `/admin/attribution/products/` |
| Creatives performance page | ✅ DONE | `/admin/attribution/creatives/` |
| Cohorts / LTV analysis page | ✅ DONE | `/admin/attribution/cohorts/` |
| ROAS Index page | ✅ DONE | `/admin/attribution/roas-index/` |
| Model comparison page | ✅ DONE | `/admin/attribution/model-comparison/` |
| Creative saved views | ⚠️ PARTIAL | API route exists; `creative_saved_views` table **has no migration** |
| All pages return real data | ❌ NOT DONE | All query `attribution_channel_summary` which is never populated |

---

### 6.3 Advanced Analytics (Phase 2AT-C)

| Page/Feature | Status | Notes |
|---|---|---|
| Customer journeys list | ✅ DONE | `/admin/attribution/journeys/` + DB query |
| Journey touchpoint timeline | ✅ DONE | `getCustomerJourneys()` + `getJourneyById()` |
| Path analysis (common paths) | ✅ DONE | `getPathAnalysis()` in db-advanced.ts |
| MMM page | ✅ DONE | `/admin/attribution/mmm/` |
| MMM DB table migration | ✅ DONE | `054_mmm_models.sql` |
| MMM model schema match | ❌ NOT DONE | **Critical mismatch** — code queries `model_fit`, `results` columns; DB has `model_r_squared`, `model_mape`, `contribution_by_channel` |
| MMM budget optimizer | ✅ DONE | `optimizeBudget()` logic implemented (math only, no real data) |
| Incrementality experiments CRUD | ✅ DONE | Full CRUD in db-advanced.ts |
| `incrementality_experiments` DB table | ❌ NOT DONE | **No migration exists** — all CRUD will throw |
| AI Insights page | ✅ DONE | `/admin/attribution/ai-insights/` + engine |
| `ai_insights_cache` DB table | ❌ NOT DONE | **No migration exists** — cache saves will throw |
| Real AI model (vs. rule-based) | ❌ NOT DONE | Insights engine is rule-based statistics (z-score, linear regression), not LLM/ML |
| ML model training per-tenant | ❌ NOT DONE | `mlTrainingJob` stub; acknowledged as requiring PHASE-5D |
| Data-driven attribution (ML-trained) | ❌ NOT DONE | Falls back to linear in all paths |
| View-through attribution (VTA) | ❌ NOT DONE | `AttributionVTASyncPayload` type exists, job stub, no implementation |
| Fairing post-purchase survey bridge | ❌ NOT DONE | `attributionFairingBridgeJob` stub, no Fairing API client |

---

### 6.4 Integrations (Phase 2AT-D)

| Page/Feature | Status | Notes |
|---|---|---|
| Pixels page + EMQ + event stream | ✅ DONE | UI complete |
| Pixels DB queries work | ❌ NOT DONE | Schema mismatch (see §2.3) |
| Secondary platforms page | ✅ DONE | UI + API complete |
| `attribution_platform_connections` table | ❌ NOT DONE | **No migration** |
| Influencers page | ✅ DONE | UI + API + CRUD |
| `attribution_influencers` DB table | ❌ NOT DONE | **No migration** |
| Influencer metrics (revenue, conversions) | ⚠️ PARTIAL | `getInfluencerMetrics()` returns all zeros (placeholder) |
| Scheduled reports CRUD | ✅ DONE | Full CRUD API |
| `attribution_scheduled_reports` DB table | ❌ NOT DONE | **No migration** |
| Report email delivery | ❌ NOT DONE | `recordReportSent()` updates status but no email is sent |
| Export configurations CRUD | ✅ DONE | Full CRUD API |
| `attribution_export_configs` DB table | ❌ NOT DONE | **No migration** |
| Export job execution | ❌ NOT DONE | `attributionExportSchedulerJob` stub |
| Export full history | ⚠️ PARTIAL | `getExportHistory()` returns only last run; no `export_history` table |
| Custom dashboards CRUD | ✅ DONE | Full CRUD API + widget system |
| `attribution_custom_dashboards` DB table | ❌ NOT DONE | **No migration** |
| Klaviyo integration | ✅ DONE | `packages/integrations/src/klaviyo/` — OAuth connect + config |

---

## PART 7: SCHEMA GAPS (CRITICAL — NO MIGRATIONS)

The following tables are **referenced in application code** but have **no SQL migration**. Every operation against them will throw a PostgreSQL relation-does-not-exist error.

| Table | Used In | Blocked Features |
|---|---|---|
| `attribution_platform_connections` | integrations-db.ts | Secondary platform CRUD (Snapchat, Pinterest, LinkedIn, MNTN, Affiliate) |
| `attribution_influencers` | integrations-db.ts | Influencer tracking |
| `attribution_scheduled_reports` | integrations-db.ts | Scheduled report delivery |
| `attribution_export_configs` | integrations-db.ts | Export configuration |
| `attribution_custom_dashboards` | integrations-db.ts | Custom dashboard builder |
| `incrementality_experiments` | db-advanced.ts | All incrementality testing |
| `ai_insights_cache` | db-advanced.ts | AI insights caching |
| `creative_saved_views` | API route (creatives) | Saved views in Creatives page |
| `pixel_event_log` (needed) | integrations-db.ts | Pixel monitoring event stream (currently wrongly queries attribution_results) |
| `pixel_alert_configs` (needed) | integrations-db.ts | Pixel alert configuration persistence |
| `meta_daily_spend` (needed) | syncMetaAdsSpendJob | Meta spend data cache |
| `google_daily_spend` (needed) | syncGoogleAdsSpendJob | Google Ads spend data cache |

---

## PART 8: SCHEMA COLUMN MISMATCHES (RUNTIME ERRORS)

### 8.1 MMM Model — `db-advanced.ts` vs `054_mmm_models.sql`

| Code Queries | DB Schema Has | Fix |
|---|---|---|
| `model_fit` (jsonb) | ❌ Missing | Add `model_fit JSONB` column OR refactor to use `model_r_squared` + `model_mape` |
| `results` (jsonb: channels/saturationCurves) | ❌ Missing | Add `results JSONB` OR map to `contribution_by_channel` + `saturation_params` |
| `status` (draft/training/completed/failed) | Has `status mmm_model_status ENUM ('training','ready','failed','archived')` | Values mismatch: 'draft' and 'completed' don't exist in enum |
| `completed_at` | ❌ Missing | Add `completed_at TIMESTAMPTZ` |
| `tenant_id` | ❌ Missing | DB table has no `tenant_id` — ALL MMM queries are cross-tenant! |

### 8.2 Pixel Monitoring — `integrations-db.ts` vs `009_attribution.sql`

Code queries `attribution_results` for:
- `source` ❌ → doesn't exist (attribution_results has: `model`, `attribution_window`, `credit`, `attributed_revenue`)
- `event_type` ❌
- `session_id` ❌
- `customer_id` ❌
- `matched_order_id` ❌
- `raw_data` ❌
- `error_message` ❌
- `retry_count` ❌

**Fix**: Create a new `pixel_event_log` table to capture raw pixel events separate from `attribution_results`.

### 8.3 Meta EMQ — `integrations-db.ts` vs `018_integrations.sql`

Code queries `meta_ad_connections` for:
- `emq_score` ❌ → doesn't exist
- `emq_parameter_scores` ❌ → doesn't exist
- `last_emq_check_at` ❌ → doesn't exist

**Fix**: Add these columns to `meta_ad_connections` via new migration.

### 8.4 MMM Tenant Isolation

The `mmm_models` table in migration `054_mmm_models.sql` has **no `tenant_id` column**. The code in `db-advanced.ts` correctly filters by `tenant_id`, but this column does not exist in the schema — queries will fail AND tenant isolation is broken.

---

## PART 9: PACKAGES/ANALYTICS/SRC ASSESSMENT

The `packages/analytics/src/` package is a **lightweight browser/server analytics utility** for GA4. It is NOT the core attribution engine.

| File | Status | Notes |
|---|---|---|
| `types.ts` | ✅ DONE | Basic event/config types |
| `ga4.ts` | ✅ DONE | GA4 browser initialization, `trackEvent()`, `trackPageView()`, `setUserProperties()` |
| `server.ts` | ✅ DONE | `trackServerEvent()`, `trackServerPurchase()` for GA4 Measurement Protocol |
| `ecommerce.ts` | ✅ DONE | `trackPurchase()`, `trackAddToCart()`, `trackViewItem()`, etc. |
| Meta CAPI client | ❌ NOT DONE | Not in this package — handled in jobs |
| TikTok Events API client | ❌ NOT DONE | Not in this package |
| Attribution model calculations | ❌ NOT DONE | Not here — in jobs package |
| Wired into storefront/admin | ⚠️ PARTIAL | GA4 module exists; unclear if initialized in either app's entry point |

---

## PART 10: JOB PIPELINE COMPLETENESS

| Job | File | Status | Missing |
|---|---|---|---|
| `analytics/process-attribution` | attribution.ts | ❌ STUB | DB reads (order + touchpoints), DB writes (results), job triggers |
| `analytics/attribution-daily-metrics` | attribution.ts | ❌ STUB | Full aggregation into channel_summary |
| `analytics/attribution-export-scheduler` | attribution.ts | ❌ STUB | Export generation, file upload |
| `analytics/attribution-fairing-bridge` | attribution.ts | ❌ STUB | Fairing API client, response matching |
| `analytics/attribution-order-reconciliation` | attribution.ts | ❌ STUB | DB queries for unattributed orders |
| `analytics/attribution-recalculate-recent` | attribution.ts | ❌ STUB | Recalculation logic |
| `analytics/attribution-vta-sync` | attribution.ts | ❌ STUB | View-through attribution sync |
| `analytics/attribution-process-unattributed` | attribution.ts | ❌ STUB | Unattributed order handling |
| `analytics/attribution-webhook-queue` | attribution.ts | ❌ STUB | Webhook queue processing |
| `analytics/send-ga4-purchase` | ad-platforms.ts | ⚠️ PARTIAL | API call commented out; credentials not fetched |
| `analytics/send-meta-purchase` | ad-platforms.ts | ⚠️ PARTIAL | API call commented out; PII hash is placeholder |
| `analytics/send-tiktok-event` | ad-platforms.ts | ⚠️ PARTIAL | API call commented out; no TikTok connection table |
| `analytics/sync-google-ads-spend` | ad-platforms.ts | ⚠️ PARTIAL | No API call; no target table; no auth |
| `analytics/sync-meta-ads-spend` | ad-platforms.ts | ⚠️ PARTIAL | No API call; no target table; no auth |
| ML training job | ml-training.ts | ❌ STUB | Training checkpoint logic is placeholder |

---

## PART 11: DETAILED TODO LISTS

### 🔴 P0 — BLOCKING (DB will throw without these)

**TODO-1: Create missing DB migrations**
```
Files to create in packages/db/src/migrations/tenant/:
- 060_attribution_integrations.sql
    CREATE TABLE attribution_platform_connections (...)
    CREATE TABLE attribution_influencers (...)
    CREATE TABLE attribution_scheduled_reports (...)
    CREATE TABLE attribution_export_configs (...)
    CREATE TABLE attribution_custom_dashboards (...)
    CREATE TABLE creative_saved_views (...)
    CREATE TABLE ai_insights_cache (...)
    CREATE TABLE incrementality_experiments (...)
    CREATE TABLE pixel_event_log (...)
    CREATE TABLE pixel_alert_configs (...)

- 061_mmm_model_fixes.sql
    ALTER TABLE mmm_models ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE mmm_models ADD COLUMN model_fit JSONB;
    ALTER TABLE mmm_models ADD COLUMN results JSONB;
    ALTER TABLE mmm_models ADD COLUMN completed_at TIMESTAMPTZ;
    -- Migrate status enum: add 'draft' and 'completed' values
    CREATE INDEX idx_mmm_models_tenant ON mmm_models(tenant_id);

- 062_attribution_spend_cache.sql
    CREATE TABLE meta_daily_spend (...)  
    CREATE TABLE google_daily_spend (...)
    CREATE TABLE tiktok_daily_spend (...)

- 063_meta_connection_emq.sql
    ALTER TABLE meta_ad_connections ADD COLUMN emq_score DECIMAL(5,2);
    ALTER TABLE meta_ad_connections ADD COLUMN emq_parameter_scores JSONB;
    ALTER TABLE meta_ad_connections ADD COLUMN last_emq_check_at TIMESTAMPTZ;
```

**TODO-2: Fix `processAttributionJob` to actually process**
```typescript
// File: packages/jobs/src/handlers/analytics/attribution.ts
// Handler: analytics/process-attribution

Steps:
1. Load order from DB using withTenant(tenantId, () => sql`SELECT revenue FROM orders WHERE id = ${orderId}`)
2. Create attribution_conversions record
3. Load visitor touchpoints: sql`SELECT * FROM attribution_touchpoints WHERE visitor_id = ${visitorId} AND occurred_at <= NOW()`  
4. Calculate all 5+ attribution models using existing functions
5. Bulk-insert into attribution_results
6. Trigger sendGA4PurchaseJob
7. Trigger sendMetaPurchaseJob
```

**TODO-3: Fix pixel monitoring schema mismatch**
```
File: apps/admin/src/lib/attribution/integrations-db.ts

1. Create new pixel_event_log table (migration 060)
2. Refactor getPixelEvents(), getPixelFailures(), getPixelHealthMetrics() to query pixel_event_log
3. Add route handler that writes to pixel_event_log when checkout events arrive
4. Create /api/events/checkout endpoint that the Shopify pixel calls
```

---

### 🔴 P1 — HIGH PRIORITY (Core analytics non-functional without these)

**TODO-4: Implement `attributionDailyMetricsJob`**
```typescript
// File: packages/jobs/src/handlers/analytics/attribution.ts
// Should:
1. Query attribution_results JOIN attribution_conversions JOIN attribution_touchpoints for targetDate
2. Group by (channel, platform, model, attribution_window)
3. Sum: touchpoints, conversions, revenue, spend (from daily_spend tables)
4. Calculate: roas = revenue/spend, cpa = spend/conversions
5. Upsert into attribution_channel_summary
// This unblocks ALL analytics pages
```

**TODO-5: Implement ad platform API calls**
```typescript
// File: packages/jobs/src/handlers/analytics/ad-platforms.ts

For sendMetaPurchaseJob:
1. Query meta_ad_connections for tenant's access_token + pixel_id
2. Decrypt access_token using packages/integrations/src/encryption.ts
3. Uncomment and fix fetch() call to Meta CAPI
4. Fix hashPII() to use actual crypto.createHash('sha256')
5. Use deterministic event_id = hash(tenantId + orderId + 'meta') not Date.now()

For sendGA4PurchaseJob:
1. Query tenant settings for ga4_measurement_id + ga4_api_secret
2. Uncomment fetch() call to GA4 Measurement Protocol

For syncMetaAdsSpendJob:
1. Query meta_ad_connections for access_token + ad_account_id
2. Call /act_{ad_account_id}/insights?level=campaign&fields=spend,campaign_id,campaign_name&date_preset=yesterday
3. Write results to meta_daily_spend table

For syncGoogleAdsSpendJob:
1. Query google_ads_connections for refresh_token + customer_id
2. Exchange for access_token using packages/integrations/src/google-ads/refresh.ts
3. Execute GAQL query via Google Ads API REST endpoint
4. Write results to google_daily_spend table
```

**TODO-6: Order → Attribution pipeline hookup**
```
The Shopify order webhook fires but nothing creates an attribution_conversions record.
File: apps/admin/src/app/api/webhooks/shopify/orders/paid/route.ts (or equivalent)

Steps:
1. In order paid webhook handler: extract visitor_id from order attributes
2. Insert row into attribution_conversions
3. Trigger processAttributionJob with {tenantId, orderId, visitorId}
4. Trigger sendGA4PurchaseJob + sendMetaPurchaseJob
```

**TODO-7: Create `/api/events/checkout` ingestion endpoint**
```
The Shopify session-stitching pixel POSTs to ${PLATFORM_API_URL}/api/events/checkout
but this route does not exist.

File to create: apps/admin/src/app/api/events/checkout/route.ts

Should:
1. Accept checkout session data (ga4_client_id, meta_fbp, etc.)
2. Write to pixel_event_log table
3. Optionally trigger attribution processing
```

---

### 🟡 P2 — MEDIUM PRIORITY

**TODO-8: Fix MMM model CRUD in db-advanced.ts**
```typescript
// File: apps/admin/src/lib/attribution/db-advanced.ts
// getMMMModel() and getMMMResults() query wrong column names

Option A (Preferred): Add missing columns to mmm_models (migration 061):
  - model_fit JSONB
  - results JSONB  
  - completed_at TIMESTAMPTZ
  - tenant_id TEXT
  - status values: add 'draft', 'completed' to enum

Option B: Refactor db-advanced.ts to use existing columns:
  - model_fit → {r_squared: model_r_squared, mape: model_mape}
  - results → {channels: contribution_by_channel}
  - status mapping: 'ready' → 'completed', 'training' → 'training'
```

**TODO-9: Implement influencer metrics**
```typescript
// File: apps/admin/src/lib/attribution/integrations-db.ts
// getInfluencerMetrics() currently returns all zeros

Real implementation:
1. Query attribution_results joined with orders by creator_code = influencer's discount/ref codes
2. Sum: revenue, conversions
3. Calculate: aov = revenue/conversions
4. Calculate: commissionEarned = revenue * commission_rate
5. new_customer_percent: count where is_first_purchase / total
```

**TODO-10: Implement report email delivery**
```typescript
// File: apps/admin/src/lib/attribution/integrations-db.ts
// recordReportSent() updates DB status but no email is sent

Create: apps/admin/src/lib/attribution/report-generator.ts
1. Generate attribution summary for report date range
2. Format as PDF or HTML email
3. Send via existing email infrastructure (packages/ai-agents/src/integrations/email/)
4. Call recordReportSent() after success
```

**TODO-11: TikTok integration completion**
```
Missing entirely:
1. Create packages/integrations/src/tiktok/ directory with oauth.ts, refresh.ts, config.ts
2. Create tiktok_connections DB table (add to migration 060 or separate)
3. Implement syncTikTokSpendJob (type exists, handler is missing)
4. Add TikTok to session-stitching pixel (sendTikTokEvent equivalent)
5. Uncomment API call in sendTikTokEventJob + wire credentials
```

**TODO-12: Fix deduplication in ad platform jobs**
```typescript
// File: packages/jobs/src/handlers/analytics/ad-platforms.ts
// generateEventId() uses Date.now() — not safe across retries

Fix:
function generateEventId(tenantId: string, orderId: string, platform: string): string {
  // Deterministic: same inputs always produce same ID
  const input = `${tenantId}:${orderId}:${platform}`
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 32)
}
```

---

### 🟢 P3 — LOWER PRIORITY

**TODO-13: Implement Fairing bridge**
```
No Fairing API client exists.
1. Create packages/integrations/src/fairing/ client
2. Implement attributionFairingBridgeJob:
   - POST to Fairing API for survey responses in date range
   - Match responses by order_id to attribution_conversions
   - Store HDYHAU (How Did You Hear About Us) as attribution signal
3. Attribution settings already has fairing_bridge_enabled flag
```

**TODO-14: View-Through Attribution**
```
AttributionVTASyncPayload type + job defined but stub.
1. For Meta: use Reach & Frequency data from Meta API for impression events
2. Create impression touchpoint type (touchpoint_type = 'view' vs 'click')
3. attribution_mode 'clicks_plus_views' already in settings schema
4. VTA window separate from click window
```

**TODO-15: Data Quality Snapshot population**
```
attribution_data_quality_snapshots table exists but nothing writes to it.
Create: analytics/attribution-data-quality-snapshot job
1. Count orders with/without attribution → coverage_score
2. Calculate session_id / visitor_id / email_hash / device_fingerprint coverage
3. Query pixel health per platform
4. Write daily snapshot
```

**TODO-16: Export execution**
```
attributionExportSchedulerJob is a stub.
1. Build CSV/JSON export from attribution_channel_summary + attribution_results
2. Support destinations: s3, gcs, sftp (ExportConfiguration.destinationType)
3. Create export_history table for full audit trail
4. Send completion notification
```

**TODO-17: ML training pipeline**
```
ml-training.ts is a skeleton.
Depends on PHASE-5D (acknowledged in phase doc).
1. Implement actual gradient descent for time-decay half-life optimization
2. Store optimized parameters in attribution_settings
3. Schedule per-tenant training on weekly basis
4. Requires sufficient data (minimum order count threshold)
```

---

## PART 12: PACKAGES/ANALYTICS TODOS

**TODO-18: Wire GA4 into storefront/admin**
```
packages/analytics/src/ga4.ts exports initGA4(), trackEvent(), trackPurchase()
but there is no evidence these are called in:
- apps/storefront/src/app/layout.tsx (or _app)
- apps/admin/src/app/layout.tsx

Action: 
1. Confirm GA4 is initialized in storefront layout (or remove dead code)
2. Ensure trackPurchase() fires on order confirmation
3. Coordinate with session-stitching pixel to avoid double-counting
```

**TODO-19: Add Meta CAPI package**
```
packages/analytics/src/ has GA4 clients but no Meta CAPI client.
This is split between jobs (server-side) and pixel (Shopify checkout).
No client for non-Shopify storefront contexts (custom checkout pages, etc.)

Create: packages/analytics/src/meta-capi.ts
- sendPurchaseEvent(pixelId, accessToken, eventData)
- hashPII(value) — real SHA-256 implementation
```

---

## SUMMARY SCORECARD

| Category | ✅ Done | ⚠️ Partial | ❌ Not Done | Score |
|---|---|---|---|---|
| Attribution Models (UI+Logic) | 7 | 7 | 2 | 43% |
| UTM/Click ID Capture | 9 | 0 | 1 | 90% |
| Shopify Session-Stitching Pixel | 12 | 2 | 2 | 75% |
| Meta Ads Integration | 5 | 4 | 4 | 36% |
| Google Ads Integration | 4 | 2 | 4 | 40% |
| TikTok Integration | 2 | 1 | 5 | 25% |
| Secondary Platforms | 2 | 0 | 3 | 40% |
| Conversion Tracking Pipeline | 1 | 3 | 5 | 11% |
| ROAS Reporting (Data) | 4 | 0 | 5 | 44% |
| Attribution Dashboard Pages | 18 | 2 | 2 | 82% |
| Advanced Analytics (MMM/Incrementality/AI) | 8 | 4 | 6 | 44% |
| DB Migrations | 7 | 0 | 8 | 47% |
| Background Jobs | 0 | 5 | 11 | 9% |
| **OVERALL** | **79** | **30** | **58** | **47%** |

---

## RECOMMENDED REMEDIATION ORDER

1. **Week 1**: TODO-1 (missing migrations) + TODO-3 (pixel schema fix) + TODO-7 (checkout ingestion route) — unblocks all DB operations
2. **Week 2**: TODO-2 (processAttributionJob) + TODO-6 (webhook hookup) — creates first real attribution data
3. **Week 3**: TODO-4 (daily metrics aggregation) + TODO-5 (Meta/Google API calls) — unblocks all analytics pages
4. **Week 4**: TODO-8 (MMM fix) + TODO-9 (influencer metrics) + TODO-12 (deduplication)
5. **Week 5+**: TODO-10 (report delivery) + TODO-11 (TikTok) + TODO-13 (Fairing)
6. **Post-PHASE-5D**: TODO-17 (ML training)

---

*Audit completed 2026-02-19 by cgk-audit-agent-10*
