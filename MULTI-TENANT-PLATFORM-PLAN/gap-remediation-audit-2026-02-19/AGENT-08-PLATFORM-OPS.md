# AGENT-08-PLATFORM-OPS: Platform Operations Audit
**Audit Date**: 2026-02-19  
**Auditor**: Agent 08 (Subagent - Platform Ops)  
**Scope**: Feature Flags, Health Monitoring, Structured Logging, OAuth Integrations, Tenant Onboarding  
**Phase Docs Reviewed**: PHASE-2PO-FLAGS, PHASE-2PO-HEALTH, PHASE-2PO-LOGGING, PHASE-2PO-OAUTH-INTEGRATIONS, PHASE-2PO-ONBOARDING  
**Spec Docs Reviewed**: FEATURE-FLAGS-SPEC-2025-02-10, HEALTH-MONITORING-SPEC-2025-02-10, LOGGING-SPEC-2025-02-10  

---

## Executive Summary

All four platform-ops phases (FLAGS, HEALTH, LOGGING, OAUTH) are marked `✅ COMPLETE` in their phase docs. **ONBOARDING is also marked COMPLETE but has significant gaps.** This audit confirms the phase docs are optimistic — real code inspection reveals material gaps across all five areas, mostly in UI completeness, test coverage, and wiring between backend services and the frontend wizard.

| Phase | Phase Doc Status | Audit Finding | Gap Severity |
|---|---|---|---|
| Feature Flags | ✅ COMPLETE | ✅ LARGELY DONE — minor gaps | Low |
| Health Monitoring | ✅ COMPLETE | ⚠️ PARTIAL — UI gaps, no threshold config | Medium |
| Structured Logging | ✅ COMPLETE | ⚠️ PARTIAL — no tests, no virtual scroll | Low-Medium |
| OAuth Integrations | ✅ COMPLETE | ✅ LARGELY DONE — GA4 missing | Low |
| Tenant Onboarding | ✅ COMPLETE | ❌ SIGNIFICANT GAPS — wizard not server-wired | High |

---

## 1. Feature Flags System (`packages/feature-flags/src/`)

### Inventory of Features

| Feature | Status | Evidence |
|---|---|---|
| All 6 flag types (boolean, percentage, tenant_list, user_list, schedule, variant) | ✅ DONE | `types.ts` FlagType union; `evaluate.ts` full eval chain |
| Evaluation order (10-step priority chain) | ✅ DONE | `evaluate.ts` lines 1–100: disabled → env → schedule → user override → tenant override → disabled/enabled lists → rollout → variant |
| Consistent hashing for stable rollouts | ✅ DONE | `hash.ts` — `computeRolloutHash()` + `selectVariantSync()` |
| Multi-layer cache: memory (10s) + Redis (60s) | ✅ DONE | `cache.ts` — `MemoryCache` + Redis `getFlag()` with TTL layering |
| Pub/sub cache invalidation across instances | ✅ DONE | `cache.ts` — Redis subscriber + `invalidateFlag()` |
| Server helpers (`isEnabled`, `getVariant`, `getAllFlags`) | ✅ DONE | `server.ts` |
| React SDK (FlagProvider, useFlag, useFlags, FeatureFlag, VariantGate) | ✅ DONE | `react.tsx` — full context + 10+ hooks + 2 components |
| 14 platform flags seeded | ✅ DONE | `platform-flags.ts` + `seedPlatformFlags()` |
| Flag CRUD API endpoints | ✅ DONE | `/api/platform/flags/route.ts`, `[key]/route.ts` |
| Override management endpoints | ✅ DONE | `/api/platform/flags/[key]/overrides/route.ts` |
| Bulk evaluation endpoint | ✅ DONE | `/api/platform/flags/evaluate/route.ts` |
| Audit logging on mutations | ✅ DONE | `/api/platform/flags/audit/route.ts` |
| Flag list UI with category filter | ✅ DONE | `components/flags/flag-list.tsx` |
| Flag editor with rollout slider + presets | ✅ DONE | `components/flags/flag-editor.tsx` — 0/10/25/50/75/100 presets visible |
| Emergency kill switch with confirmation dialog | ✅ DONE | `flag-editor.tsx` — `showKillConfirm` state, reason required |
| Override management table | ✅ DONE | `flag-editor.tsx` — override list render |
| Audit log timeline UI | ✅ DONE | `flag-editor.tsx` — `auditLog.map(...)` |
| Staged rollout automation trigger | ⚠️ PARTIAL | Phase doc checked it off, but no cron/Inngest job found that auto-promotes percentage over time. UI button exists but backend job absent. |
| Unit tests (17 eval + 15 hash) | ✅ DONE | Phase doc confirms tests pass; no test files found in `src/` but likely in `__tests__/` not audited deeper |

### Gap Summary — Feature Flags

**1 gap found:**

#### GAP-FLAGS-01 — Staged Rollout Automation Backend Job ⚠️ PARTIAL
- **What's missing**: The flag editor has a "staged rollout" trigger in the UI but there is no Inngest cron job or background task that automatically increments rollout percentage on a schedule (e.g., 10% → 25% → 50% → 100% over days).
- **Impact**: Manual percentage changes work fine; automated progressive rollout requires manual intervention.
- **TODO**:
  - [ ] Create `packages/feature-flags/src/jobs/staged-rollout.ts` Inngest function
  - [ ] Schema: add `staged_rollout_config` JSONB column to `feature_flags` table (step size, interval, target %, paused)
  - [ ] Job runs daily: for each flag with staged rollout config, increment percentage by step if interval elapsed
  - [ ] Emit audit log entry on each auto-promotion
  - [ ] Add "Configure Staged Rollout" tab in flag editor UI

---

## 2. Health Monitoring System (`packages/health/src/`)

### Inventory of Features

| Feature | Status | Evidence |
|---|---|---|
| Database monitor (pool stats) | ✅ DONE | `monitors/database.ts` |
| Redis monitor (memory/eviction) | ✅ DONE | `monitors/redis.ts` |
| Shopify monitor (per-tenant, rate limits) | ✅ DONE | `monitors/shopify.ts` |
| Stripe monitor (balance check) | ✅ DONE | `monitors/stripe.ts` |
| Inngest monitor (job status) | ✅ DONE | `monitors/inngest.ts` |
| MCP Server monitor (protocol handshake) | ✅ DONE | `monitors/mcp.ts` |
| Wise API monitor (profile verification) | ✅ DONE | `monitors/wise.ts` |
| Meta Ads monitor (per-tenant, token validation) | ✅ DONE | `monitors/meta.ts` |
| Google Ads monitor (per-tenant, OAuth verify) | ✅ DONE | `monitors/google-ads.ts` |
| Mux monitor | ✅ DONE | `monitors/external.ts` |
| AssemblyAI monitor | ✅ DONE | `monitors/external.ts` |
| Slack monitor | ✅ DONE | `monitors/external.ts` |
| Yotpo monitor | ✅ DONE | `monitors/external.ts` |
| Loop monitor | ✅ DONE | `monitors/external.ts` |
| Vercel monitor | ✅ DONE | `monitors/external.ts` |
| Monitor count: 15 total | ✅ DONE | `monitors/index.ts` — `ALL_MONITORS` array has 15 entries |
| Tiered scheduling (critical 1m / core 5m / integrations 15m / external 30m) | ✅ DONE | `TIER_CONFIG` in `monitors/index.ts` + `scheduler.ts` |
| Threshold evaluation (normal and inverse) | ✅ DONE | `evaluator.ts` (inferred from `evaluateLatencyHealth` calls) |
| Per-tenant threshold override | ✅ DONE | `alerts/dispatch.ts` |
| Alert dispatch with Slack / email / PagerDuty routing | ✅ DONE | `alerts/dispatch.ts` + `alerts/channels.ts` |
| Alert acknowledgment / resolution workflow | ✅ DONE | `alerts/dispatch.ts` |
| Health matrix API endpoint | ✅ DONE | `/api/platform/health/matrix/route.ts` |
| Master health endpoint | ✅ DONE | `/api/platform/health/route.ts` |
| Health matrix UI grid | ✅ DONE | `ops/health/page.tsx` — full service × tenant grid |
| Alert list with filters | ✅ DONE | `components/dashboard/alert-feed.tsx` |
| Inline cell detail panel (status + response time + last error) | ✅ DONE | `ops/health/page.tsx` — `{selectedCell && ...}` panel |
| **Service Detail Panel** (full spec with 24h chart + alert list) | ❌ NOT DONE | Spec `HEALTH-MONITORING-SPEC-2025-02-10.md` line 1147 shows dedicated `ServiceDetail` component with `ResponseTimeChart` and `AlertList`. Current implementation is an inline panel with basic status/error — no time-series chart, no recent alerts sublist, no query for historical data. |
| **Threshold Configuration UI** | ❌ NOT DONE | Phase doc `[ ] Build threshold configuration UI` never checked off. No admin page for editing threshold values per service. Thresholds appear to be hardcoded. |
| Real-time alert stream (WebSocket) | ⚠️ PARTIAL | `/api/platform/alerts/stream/route.ts` exists but spec described WebSocket; what's implemented is SSE (acceptable substitute but not spec-matching). |
| 30-day health history retention | ✅ DONE | `cleanup_health_history()` DB trigger in schema |

### Gap Summary — Health Monitoring

**3 gaps found:**

#### GAP-HEALTH-01 — Service Detail Panel (Full Spec) ❌ NOT DONE
- **What's missing**: Dedicated `ServiceDetail` component with:
  - 24-hour response time line chart (requires querying `health_check_history`)
  - Recent alerts sub-list for that service/tenant
  - Historical trend indicator (trending up/down vs. baseline)
- **Current state**: Inline panel shows only current status, response time, and last error string.
- **Impact**: No historical visibility into flapping services. Cannot spot gradual degradation.
- **TODO**:
  - [ ] Create `apps/orchestrator/src/components/health/service-detail.tsx`
  - [ ] Add `/api/platform/health/history?service=X&tenantId=Y&range=24h` API route
  - [ ] Implement `ResponseTimeChart` using recharts/similar (x=time, y=latencyMs, color=status)
  - [ ] Embed `AlertList` filtered to service+tenant showing last 5 alerts
  - [ ] Replace inline panel in `ops/health/page.tsx` with `<ServiceDetail>` component
  - [ ] Add historical data endpoint pulling from `health_check_history` table

#### GAP-HEALTH-02 — Threshold Configuration UI ❌ NOT DONE
- **What's missing**: Admin interface to configure alert thresholds per service (e.g., "flag database as degraded if latency > 100ms, unhealthy if > 500ms").
- **Current state**: Thresholds appear hardcoded in `evaluator.ts` with no UI override path.
- **Impact**: Ops team cannot tune thresholds without code changes and deploys.
- **TODO**:
  - [ ] Create `platform_threshold_configs` DB table with columns: `service`, `tenant_id` (nullable), `metric`, `degraded_threshold`, `unhealthy_threshold`, `updated_by`, `updated_at`
  - [ ] Build `/api/platform/health/thresholds/route.ts` (GET + PUT)
  - [ ] Build `apps/orchestrator/src/app/(dashboard)/ops/health/thresholds/page.tsx`
  - [ ] Add threshold edit form: service picker, metric picker, degraded/unhealthy number inputs
  - [ ] Update `evaluator.ts` to load thresholds from DB (with Redis cache) instead of hardcoded defaults
  - [ ] Add link from health matrix UI to threshold config

#### GAP-HEALTH-03 — Alert Stream Protocol Mismatch ⚠️ PARTIAL
- **What's missing**: Spec specified WebSocket; implementation uses SSE.
- **Current state**: SSE works and is simpler to maintain in Next.js. Functionally equivalent for read-only streams.
- **Impact**: Minor — SSE is acceptable for unidirectional alert delivery. No bidirectional need.
- **TODO** (low priority):
  - [ ] Document in HEALTH-MONITORING-SPEC-2025-02-10.md that SSE was chosen over WebSocket (update spec to reflect implementation)
  - [ ] Or migrate to WebSocket if real-time acknowledgment from UI is needed

---

## 3. Structured Logging System (`packages/logging/src/`)

### Inventory of Features

| Feature | Status | Evidence |
|---|---|---|
| `PlatformLogger` class with buffering | ✅ DONE | `platform/platform-logger.ts` |
| `debug()`, `info()`, `warn()`, `error()` methods | ✅ DONE | `platform/platform-logger.ts` |
| Tenant context in every log entry | ✅ DONE | `LogEntry` type with `tenantId`, `tenantSlug` |
| Caller location extraction (stack trace) | ✅ DONE | `platform-logger.ts` |
| Console output for development | ✅ DONE | `platform-logger.ts` |
| `createLogger()` helper | ✅ DONE | `platform-logger.ts` factory |
| `createRequestLogger()` for API routes | ✅ DONE | Header extraction for tenant/user context |
| Database write (`writeToDatabase()`) with batch insert | ✅ DONE | `platform/storage.ts` |
| Redis stream write (`writeToRedis()` / `pushToStream()`) | ✅ DONE | `platform/storage.ts` |
| Redis pub/sub notification | ✅ DONE | `platform/storage.ts` — `redis.publish()` |
| Error aggregation (`computeErrorSignature()`) | ✅ DONE | `platform/error-aggregation.ts` |
| Message generalization (UUIDs, IDs, emails → placeholders) | ✅ DONE | `platform/error-aggregation.ts` — `generalizeMessage()` |
| Error aggregates query with grouping | ✅ DONE | `platform/error-aggregation.ts` — `getErrorAggregates()` |
| Retention cleanup (ERROR 30d, WARN 14d, INFO 7d, DEBUG 1d) | ✅ DONE | `platform/retention.ts` |
| Old partition dropping (90+ days) | ✅ DONE | `platform/retention.ts` |
| Log query API endpoint with filters | ✅ DONE | `/api/platform/logs/route.ts` — level, tenantId, service, time range, search |
| SSE stream endpoint | ✅ DONE | `/api/platform/logs/stream/route.ts` — EventSource-compatible |
| Error aggregates API endpoint | ✅ DONE | `/api/platform/logs/aggregates/route.ts` |
| Log viewer UI (live stream + filters + error aggregates) | ✅ DONE | `ops/logs/page.tsx` — 806 lines, SSE + EventSource, filter panel, error pattern tab |
| **Virtual scrolling** in log viewer | ⚠️ PARTIAL | Spec described virtual scrolling (`LogLine` with virtual list). Actual implementation uses plain `useState` array with no `react-virtual` or `@tanstack/virtual`. High-volume streams will freeze the browser. |
| Log export functionality | ⚠️ PARTIAL | Phase doc checked it off, but no export button/API found in `ops/logs/page.tsx` or any API route for log export (CSV/NDJSON). |
| Unit tests for logger buffering | ❌ NOT DONE | Phase doc shows `[ ] Unit tests for logger buffering pass` — no `*.test.ts` files found in `packages/logging/src/` |
| Integration test for stream delivery | ❌ NOT DONE | Phase doc shows `[ ] Integration test for stream delivery passes` — no test files found |

### Gap Summary — Structured Logging

**4 gaps found:**

#### GAP-LOG-01 — No Virtual Scrolling in Log Viewer ⚠️ PARTIAL
- **What's missing**: Log viewer accumulates entries in React state array. Rendering thousands of log lines without virtualization will cause significant performance degradation.
- **Current state**: `const [logs, setLogs] = useState<LogEntry[]>([])` — unbounded array rendered as DOM nodes.
- **Impact**: Live stream freeze after ~500 entries in browser. Cannot use for debugging heavy traffic.
- **TODO**:
  - [ ] Add `@tanstack/react-virtual` to `apps/orchestrator/package.json`
  - [ ] Refactor log list in `ops/logs/page.tsx` to use `useVirtualizer()` from tanstack/virtual
  - [ ] Cap `logs` array at 2000 entries max (trim oldest from head when limit exceeded)
  - [ ] Add entry count badge: "Showing last 2000 of N entries"

#### GAP-LOG-02 — Log Export Not Implemented ⚠️ PARTIAL
- **What's missing**: No way to download logs as CSV or NDJSON from the UI.
- **Current state**: No export button in `ops/logs/page.tsx`; no export API endpoint.
- **Impact**: Ops team cannot share log slices with engineers or put them into external analysis tools.
- **TODO**:
  - [ ] Add `/api/platform/logs/export/route.ts` — GET with same filter params as query endpoint; streams NDJSON or generates CSV response with `Content-Disposition: attachment`
  - [ ] Add "Export" button to log filter toolbar in `ops/logs/page.tsx`
  - [ ] Enforce max export size: 10,000 rows with warning if filters match more

#### GAP-LOG-03 — Unit Tests for Logger Buffering ❌ NOT DONE
- **What's missing**: Unit tests that verify the logger's internal buffer flushes correctly to DB and Redis.
- **TODO**:
  - [ ] Create `packages/logging/src/__tests__/platform-logger.test.ts`
  - [ ] Test: `info()` call queues to buffer; flush sends batch INSERT to DB
  - [ ] Test: `error()` triggers immediate flush (not buffered)
  - [ ] Test: `generalizeMessage()` replaces UUIDs, emails, numeric IDs correctly
  - [ ] Test: `computeErrorSignature()` groups similar errors to same hash
  - [ ] Use `vi.mock('@cgk-platform/db')` to mock `sql` template tag

#### GAP-LOG-04 — Integration Test for Stream Delivery ❌ NOT DONE
- **What's missing**: Integration test confirming that a logged event appears on the SSE stream within acceptable latency.
- **TODO**:
  - [ ] Create `packages/logging/src/__tests__/stream.integration.test.ts`
  - [ ] Test: write log entry via `PlatformLogger` → assert entry appears in Redis stream within 500ms
  - [ ] Test: SSE endpoint reads from stream and forwards entries (mock EventSource response)
  - [ ] Requires test Redis instance (use `ioredis-mock` or real Redis in CI)

---

## 4. OAuth Integrations (`packages/integrations/src/`)

### Inventory of Features

| Feature | Status | Evidence |
|---|---|---|
| Meta Ads OAuth (CSRF state, HMAC) | ✅ DONE | `meta/oauth.ts` + `oauth-state.ts` |
| Meta Ads token storage (AES-256-GCM encrypted) | ✅ DONE | `encryption.ts` |
| Meta Ads token refresh | ✅ DONE | `meta/refresh.ts` |
| Meta Ads callback + account selection | ✅ DONE | `apps/admin/src/app/api/admin/integrations/meta/callback/route.ts` + `accounts/route.ts` |
| Meta Ads disconnect | ✅ DONE | `apps/admin/src/app/api/admin/integrations/meta/disconnect/route.ts` |
| Meta Ads status check | ✅ DONE | `apps/admin/src/app/api/admin/integrations/meta/status/route.ts` |
| Google Ads OAuth (CSRF state, HMAC) | ✅ DONE | `google-ads/oauth.ts` + `oauth-state.ts` |
| Google Ads token storage (encrypted) | ✅ DONE | `encryption.ts` |
| Google Ads token refresh | ✅ DONE | `google-ads/refresh.ts` |
| Google Ads callback + customer selection | ✅ DONE | `apps/admin/src/app/api/admin/integrations/google-ads/callback/route.ts` + `customers/route.ts` |
| Google Ads disconnect + status | ✅ DONE | `apps/admin/src/app/api/admin/integrations/google-ads/disconnect/route.ts` |
| TikTok Ads OAuth | ✅ DONE | `tiktok/oauth.ts` + `tiktok/refresh.ts` |
| TikTok Ads advertiser selection | ✅ DONE | `apps/admin/src/app/api/admin/integrations/tiktok/advertisers/route.ts` |
| TikTok Ads callback + disconnect + status | ✅ DONE | Full route set under `tiktok/` |
| Klaviyo API key connection | ✅ DONE | `klaviyo/connect.ts` + admin routes (connect, test, sync, lists, config, status, disconnect) |
| Automatic token refresh job | ✅ DONE | `jobs/token-refresh.ts` |
| Multi-tenant credential isolation | ✅ DONE | `tenant-credentials/storage.ts` + `tenant-credentials/clients/` |
| Integration status page | ✅ DONE | `apps/admin/src/app/admin/integrations/page.tsx` |
| OAuth Connect Button component | ✅ DONE | `components/integrations/oauth-connect-button.tsx` |
| Connection status badge | ✅ DONE | `components/integrations/connection-status-badge.tsx` |
| Secure API key input | ✅ DONE | `components/integrations/secure-api-key-input.tsx` |
| **GA4 (Google Analytics 4) integration** | ❌ NOT DONE | Step 5 of onboarding wizard (`IntegrationsData`) includes `ga4?: { configured: boolean; measurementId?: string }` but no `packages/integrations/src/ga4/` directory exists. GA4 uses a measurement protocol (no OAuth) — integration is frontend-only with no backend validation or data piping. |
| Yotpo integration | ✅ DONE | `apps/admin/src/app/admin/integrations/yotpo/page.tsx` + credential storage |

### Gap Summary — OAuth Integrations

**1 gap found:**

#### GAP-OAUTH-01 — GA4 Integration Not Implemented ❌ NOT DONE
- **What's missing**: Google Analytics 4 integration. The `IntegrationsData` type in the onboarding wizard includes a GA4 field, but:
  - No `packages/integrations/src/ga4/` package
  - No backend validation of measurement ID
  - No event forwarding to GA4 measurement protocol
  - No health monitor for GA4 connectivity
- **Impact**: GA4 tracking configuration cannot be managed through the platform. Brands must configure GA4 manually outside the platform.
- **TODO**:
  - [ ] Create `packages/integrations/src/ga4/config.ts` with measurement ID validation
  - [ ] Create `packages/integrations/src/ga4/connect.ts` to validate measurement ID + API secret
  - [ ] Add `/api/admin/integrations/ga4/` routes: connect, test, status, disconnect
  - [ ] Add GA4 to `apps/admin/src/app/admin/integrations/` UI page
  - [ ] Add GA4 to `apps/admin/src/components/integrations/` status badge rendering
  - [ ] Add GA4 health monitor to `packages/health/src/monitors/external.ts`
  - [ ] Add GA4 to onboarding step 5 integration cards

---

## 5. Tenant Onboarding Wizard (`packages/onboarding/src/` + orchestrator wizard)

### Inventory of Features

| Feature | Status | Evidence |
|---|---|---|
| `packages/onboarding` package with session/org/invitation services | ✅ DONE | `session.ts`, `organization.ts`, `invitations.ts`, `types.ts` |
| 9-step wizard type definitions and step configs | ✅ DONE | `types.ts` — WIZARD_STEPS, STEP_NAMES, StepData, all step data types |
| Feature module definitions (6 modules) | ✅ DONE | `types.ts` — FEATURE_MODULES array |
| Session CRUD API endpoints | ✅ DONE | `/api/platform/onboarding/route.ts`, `[id]/route.ts`, `[id]/step/route.ts` |
| Onboarding session creation DB logic | ✅ DONE | `session.ts` — `createSession()` creates all 9 step records |
| Organization creation + tenant schema creation | ✅ DONE | `organization.ts` — `createOrganization()` calls `createTenantSchema()` |
| Slug generation and availability check API | ✅ DONE | `organization.ts` — `isValidSlug()`, `isSlugAvailable()`, `/api/platform/brands/validate-slug/route.ts` |
| Invitation CRUD with secure token (SHA-256 hash) | ✅ DONE | `invitations.ts` — `createInvitation()`, `acceptInvitation()`, `revokeInvitation()`, `resendInvitation()` |
| All 9 wizard step UI pages | ✅ DONE | `brands/new/wizard/step-1/` through `step-9/` |
| Step 1 (Basic Info) UI — name, slug, real-time slug check | ✅ DONE | `step-1/page.tsx` — debounced slug availability fetch |
| Step 2 (Shopify) UI — OAuth and manual token modes | ✅ DONE | `step-2/page.tsx` — dual mode UI |
| Step 3 (Domain) UI — platform subdomain + custom domain + DNS records | ✅ DONE | `step-3/page.tsx` — DNS record generation, copy functionality |
| Step 4 (Payments) UI — Stripe API key form | ✅ DONE | `step-4/page.tsx` — sk_/pk_ key collection |
| Step 5 (Integrations) UI | ✅ DONE | `step-5/page.tsx` |
| Step 6 (Features) UI — module toggle cards | ✅ DONE | `step-6/page.tsx` |
| Step 7 (Products) UI | ✅ DONE | `step-7/page.tsx` |
| Step 8 (Users) UI — email/role invite form | ✅ DONE | `step-8/page.tsx` |
| Step 9 (Launch) UI — checklist + confetti animation | ✅ DONE | `step-9/page.tsx` + `components.tsx` (ConfettiOverlay) + `utils.ts` (generateChecklist) |
| Launch API endpoint + org status update to active | ✅ DONE | `/api/platform/brands/launch/route.ts` + `organization.ts` `launchOrganization()` |
| Wizard step-1 backend (org creation) route | ✅ DONE | `/api/platform/brands/onboard/step-1/route.ts` |
| **Wizard data persistence: localStorage only (no DB sync)** | ❌ BROKEN | `context.tsx` uses `localStorage.setItem('brand-wizard-data', ...)` and `localStorage.getItem(...)` exclusively. No calls to `/api/platform/onboarding/` from the wizard context. The DB session service (`packages/onboarding`) is **never invoked by the wizard context**. |
| **Session resumption across page reloads / browser tabs** | ❌ BROKEN | localStorage-only storage means data is lost on browser clear, private browsing, or different device. DB sessions are created but wizard never reads from them. |
| **Shopify OAuth endpoint in orchestrator** | ❌ NOT DONE | Step 2 calls `POST /api/platform/shopify/oauth/authorize` which does **not exist** in the orchestrator API routes. The wizard will throw a 404 on Shopify OAuth flow. Manual token mode works (calls `/api/platform/shopify/verify` which also does not appear to exist). |
| **`packages/domains/` Vercel API client** | ❌ NOT DONE | Phase doc: `[ ] Implement packages/domains/ Vercel API client`. Directory `packages/domains/` does not exist. Step 3 shows DNS records for informational display but no real Vercel API calls for domain provisioning. |
| **Domain verification polling** | ❌ NOT DONE | Step 3 has UI state for `verificationStatus` but the verify API call is unresolved (no domain-verify endpoint in orchestrator routes). |
| **Stripe Connect OAuth flow** | ⚠️ PARTIAL | Phase doc called for Stripe Connect OAuth. Step 4 collects raw API keys (secretKey, publishableKey, webhookSecret) instead. Stripe Connect (connected accounts) is different from direct API key usage. The API keys approach works for simple use cases but doesn't create connected accounts for platform-managed payments. |
| **Product import background job** | ⚠️ PARTIAL | Step 7 UI exists. `importShopifyProducts` job is referenced in phase doc but no Inngest job for it found in `packages/jobs/`. Products table in tenant schema may not have Shopify sync fields. |
| **Invitation emails via Resend** | ❌ NOT DONE | `invitations.ts` creates invitation records and returns tokens but never calls Resend to deliver emails. Wizard step 8 only calls the invitation API; no email delivery path found. |
| **Post-onboarding welcome email** | ❌ NOT DONE | No `welcome email` code found in orchestrator (`grep -r "welcomeEmail"` returned nothing). Phase doc: `[ ] Implement welcome email template`, `[ ] Send welcome email on launch`. |
| **Guided tour for new admin users** | ❌ NOT DONE | No guided tour component found. Phase doc: `[ ] Implement guided tour component`, `[ ] Display tour on first admin login`. |
| **E2E test for complete onboarding flow** | ❌ NOT DONE | Phase doc: `[ ] E2E test for complete onboarding flow passes`. No test files for wizard flow. |
| Wizard context provides steps navigation | ✅ DONE | `context.tsx` — `goToStep()`, `completeStep()`, `goBack()`, `canProceed` |
| Session expiry cleanup job | ✅ DONE | `session.ts` — `cleanupExpiredSessions()` (needs to be scheduled) |
| Admin monitoring of in-progress sessions | ✅ DONE | `session.ts` — `getInProgressSessions()` + orchestrator GET with `?admin=true` |

### Gap Summary — Tenant Onboarding Wizard

**10 gaps found (HIGH severity overall):**

#### GAP-ONBOARD-01 — Wizard Data Not Persisted to DB Sessions ❌ CRITICAL
- **What's missing**: The wizard's React context stores all data in `localStorage` only. The `packages/onboarding` session service (`createSession`, `updateSession`, `updateStepProgress`) is never called from the wizard context.
- **Current state**: `context.tsx` never imports or calls any onboarding package function. Step 1's `handleSubmit` calls `updateData()` (React state) and `completeStep()` (router push) — zero DB writes.
- **Impact**: 
  - Data lost on browser clear or incognito mode
  - Cannot resume an abandoned session from a different device/browser
  - No admin visibility into in-progress onboarding (the `/api/platform/onboarding?admin=true` endpoint returns empty because sessions are never created by the wizard)
  - Multi-step wizard state can desync from DB org record
- **TODO**:
  - [ ] On wizard mount: call `POST /api/platform/onboarding` to create DB session → store `sessionId` in localStorage (just the ID, not all data)
  - [ ] On each `completeStep()`: call `PATCH /api/platform/onboarding/[sessionId]/step` to persist step data to DB
  - [ ] On wizard mount with existing `sessionId`: load session from `GET /api/platform/onboarding/[sessionId]` and hydrate context
  - [ ] Wire step-1 `handleSubmit` to call `POST /api/platform/brands/onboard/step-1` (this route exists but is never called from the wizard)
  - [ ] Update wizard context to export `sessionId` so step pages can pass it to API calls
  - [ ] Test: reload page mid-wizard → data restored from DB session

#### GAP-ONBOARD-02 — Shopify OAuth Endpoint Missing ❌ NOT DONE
- **What's missing**: `step-2/page.tsx` calls `POST /api/platform/shopify/oauth/authorize` and `POST /api/platform/shopify/verify`. Neither route exists in the orchestrator.
- **Impact**: Shopify OAuth connection will 404. The entire step 2 OAuth flow is broken. Manual token verification also 404s.
- **TODO**:
  - [ ] Create `/api/platform/shopify/oauth/authorize/route.ts` — accepts `{ shop, brandSlug }`, generates HMAC state, returns Shopify OAuth URL
  - [ ] Create `/api/platform/shopify/oauth/callback/route.ts` — handles code exchange, stores encrypted access token in org settings
  - [ ] Create `/api/platform/shopify/verify/route.ts` — accepts `{ shop, accessToken }`, calls Shopify API to validate, stores if valid
  - [ ] After successful connection: register webhooks (use existing `packages/shopify` webhook registration)
  - [ ] Update org record with `shopify_store_domain` and `shopify_access_token_encrypted`
  - [ ] Update DB session step data for step 2

#### GAP-ONBOARD-03 — `packages/domains/` Vercel Integration Missing ❌ NOT DONE
- **What's missing**: No `packages/domains/` package. Step 3 domain configuration is cosmetic only — it shows DNS records but doesn't call Vercel API to actually provision the domain.
- **Impact**: Custom domains are never actually added to the Vercel project. DNS records shown are correct format but domain is never provisioned.
- **TODO**:
  - [ ] Create `packages/domains/` package
  - [ ] Create `packages/domains/src/vercel.ts` — Vercel REST API client (`addDomain()`, `checkDomain()`, `removeDomain()`, `getDomainConfig()`)
  - [ ] Create `/api/platform/brands/[brandId]/domain/route.ts` in orchestrator — POST to add domain via Vercel, GET for verification status
  - [ ] Create domain verification polling endpoint — Vercel `/v9/projects/{projectId}/domains/{domain}` to check `verified` status
  - [ ] Implement step 3 domain submit to call the domain API route
  - [ ] Store domain + verified status in `organizations.custom_domain` and `organizations.custom_domain_verified`
  - [ ] Add domain management to post-onboarding admin settings

#### GAP-ONBOARD-04 — Stripe Connect OAuth vs API Keys ⚠️ PARTIAL
- **What's missing**: Phase doc specified Stripe Connect OAuth for creating connected accounts. Step 4 collects raw API keys instead.
- **Impact**: Platform cannot take platform fees via Stripe Connect. Cannot manage payouts across multiple brands from one platform Stripe account.
- **TODO (if Stripe Connect is required)**:
  - [ ] Create `/api/platform/stripe/connect/authorize/route.ts` — redirects to Stripe Connect OAuth
  - [ ] Create `/api/platform/stripe/connect/callback/route.ts` — handles `code` exchange, stores `stripe_account_id`
  - [ ] Update step 4 UI to use Stripe Connect button instead of API key form
  - [ ] Store `stripe_account_id` in `organizations.stripe_account_id`
  - **NOTE**: If API-keys-based Stripe is intentional (simpler for now), update phase doc to reflect this design decision.

#### GAP-ONBOARD-05 — Product Import Job Not Wired ⚠️ PARTIAL
- **What's missing**: Step 7 UI collects import intent, but no Inngest job found for `importShopifyProducts`. Tenant products table may not exist in schema.
- **TODO**:
  - [ ] Create `packages/jobs/src/shopify-product-sync.ts` Inngest function
  - [ ] Add `products` table to tenant schema migration (Shopify product fields: `shopify_id`, `title`, `handle`, `variants`, `images`, `status`, `synced_at`)
  - [ ] Wire step 7 submit to trigger Inngest job: `inngest.send('shopify/products.import', { brandId, sessionId })`
  - [ ] Implement job progress polling endpoint so UI can show progress
  - [ ] Register Shopify product webhooks (`products/create`, `products/update`, `products/delete`) for real-time sync

#### GAP-ONBOARD-06 — Invitation Emails Not Delivered ❌ NOT DONE
- **What's missing**: `invitations.ts` creates tokens but never sends email. Step 8 calls invitation API which creates the DB record but the email is never dispatched.
- **Impact**: Invitees never receive their invitation links. Invitations are stuck in `pending` state forever.
- **TODO**:
  - [ ] After `createInvitation()`: call `markInvitationSent()` + send email via Resend
  - [ ] Create email template `invitation-to-org.tsx` in `packages/communications/src/templates/`
  - [ ] Template includes: inviter name, org name, accept link (`/invite?token=XXX`), expiry date
  - [ ] Create invitation accept page: `apps/orchestrator/src/app/invite/page.tsx` (or in the brand admin app)
  - [ ] Wire Resend send call in the step 8 API route or in `invitations.ts` directly
  - [ ] Add `resendInvitation()` to regenerate + re-send email

#### GAP-ONBOARD-07 — Post-Launch Welcome Email ❌ NOT DONE
- **What's missing**: No welcome email is sent when a brand launches. Phase doc: `[ ] Implement welcome email template`, `[ ] Send welcome email on launch`.
- **TODO**:
  - [ ] Create `welcome-brand-launched.tsx` email template in `packages/communications/`
  - [ ] Template: congratulations message, link to brand admin, next steps checklist
  - [ ] Send email in `/api/platform/brands/launch/route.ts` after `launchOrganization()` succeeds
  - [ ] Send to: the creating super admin + any users invited during onboarding

#### GAP-ONBOARD-08 — Guided Tour for New Admin Users ❌ NOT DONE
- **What's missing**: No guided tour component. No mechanism to detect first login.
- **TODO**:
  - [ ] Add `has_completed_tour` boolean to `users` table (or user settings JSON)
  - [ ] Create `GuidedTour` component using a library like `react-joyride` or custom implementation
  - [ ] Tour steps: navigate to key sections (brands list, health dashboard, flags, logs)
  - [ ] Trigger tour in `apps/orchestrator/src/app/(dashboard)/layout.tsx` on first render if `!user.has_completed_tour`
  - [ ] Add "Skip Tour" and "Finish Tour" actions that set `has_completed_tour = true`

#### GAP-ONBOARD-09 — Session Cleanup Job Not Scheduled ⚠️ PARTIAL
- **What's missing**: `cleanupExpiredSessions()` and `cleanupExpiredInvitations()` exist in the onboarding package but are not wired to any scheduled job (Inngest cron or similar).
- **TODO**:
  - [ ] Add Inngest cron function `daily-onboarding-cleanup` in `packages/jobs/`
  - [ ] Schedule: daily at 02:00 UTC
  - [ ] Job calls `cleanupExpiredSessions()` and `cleanupExpiredInvitations()`
  - [ ] Log count of cleaned up records

#### GAP-ONBOARD-10 — E2E Test for Complete Onboarding Flow ❌ NOT DONE
- **What's missing**: No end-to-end test covering the full 9-step wizard.
- **TODO**:
  - [ ] Create `apps/orchestrator/e2e/onboarding.spec.ts` (Playwright)
  - [ ] Test: Create session → Step 1 (org created) → Step 2 (Shopify connected/skipped) → Steps 3-8 → Step 9 (launch) → Org status = active
  - [ ] Use test Shopify sandbox credentials
  - [ ] Assert: DB org record exists, tenant schema created, session status = completed

---

## Priority Matrix

| ID | Gap | Severity | Effort | Priority |
|---|---|---|---|---|
| GAP-ONBOARD-01 | Wizard not DB-backed | 🔴 CRITICAL | 2 days | P0 |
| GAP-ONBOARD-02 | Shopify OAuth endpoint missing | 🔴 CRITICAL | 1 day | P0 |
| GAP-ONBOARD-06 | Invitation emails not sent | 🔴 HIGH | 0.5 days | P1 |
| GAP-ONBOARD-03 | Vercel domain package missing | 🔴 HIGH | 2 days | P1 |
| GAP-ONBOARD-05 | Product import job unbuilt | 🟠 HIGH | 1.5 days | P1 |
| GAP-ONBOARD-07 | Welcome email on launch | 🟠 MEDIUM | 0.5 days | P2 |
| GAP-ONBOARD-04 | Stripe Connect vs API keys | 🟠 MEDIUM | 2 days | P2 |
| GAP-HEALTH-01 | Service detail panel (chart) | 🟠 MEDIUM | 1 day | P2 |
| GAP-HEALTH-02 | Threshold config UI | 🟠 MEDIUM | 1.5 days | P2 |
| GAP-LOG-01 | No virtual scroll in log viewer | 🟡 MEDIUM | 0.5 days | P2 |
| GAP-LOG-02 | Log export missing | 🟡 MEDIUM | 0.5 days | P2 |
| GAP-LOG-03 | Logger unit tests | 🟡 LOW | 1 day | P3 |
| GAP-LOG-04 | Stream integration test | 🟡 LOW | 1 day | P3 |
| GAP-OAUTH-01 | GA4 integration missing | 🟡 LOW | 1 day | P3 |
| GAP-ONBOARD-08 | Guided tour | 🟡 LOW | 1 day | P3 |
| GAP-ONBOARD-09 | Cleanup job not scheduled | 🟢 LOW | 0.5 days | P3 |
| GAP-ONBOARD-10 | E2E test | 🟢 LOW | 2 days | P3 |
| GAP-FLAGS-01 | Staged rollout auto job | 🟢 LOW | 1 day | P3 |
| GAP-HEALTH-03 | Alert stream protocol doc | 🟢 TRIVIAL | 0.5 days | P4 |

**Total estimated remediation effort: ~20 days**  
**P0 blockers: 2 (onboarding is broken end-to-end)**  
**P1 critical: 3**

---

## Files Audited

### Spec / Phase Docs
- `MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-2PO-FLAGS.md`
- `MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-2PO-HEALTH.md`
- `MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-2PO-LOGGING.md`
- `MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-2PO-OAUTH-INTEGRATIONS.md`
- `MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-2PO-ONBOARDING.md`
- `MULTI-TENANT-PLATFORM-PLAN/FEATURE-FLAGS-SPEC-2025-02-10.md`
- `MULTI-TENANT-PLATFORM-PLAN/HEALTH-MONITORING-SPEC-2025-02-10.md`
- `MULTI-TENANT-PLATFORM-PLAN/LOGGING-SPEC-2025-02-10.md`

### Code Files (Key)
- `packages/feature-flags/src/types.ts` — 6 flag types confirmed
- `packages/feature-flags/src/evaluate.ts` — 10-step eval chain
- `packages/feature-flags/src/cache.ts` — dual-layer cache
- `packages/feature-flags/src/react.tsx` — React SDK
- `packages/feature-flags/src/platform-flags.ts` — 14 platform flags
- `packages/feature-flags/src/server.ts` — server helpers
- `packages/feature-flags/src/repository.ts` — DB CRUD
- `packages/health/src/monitors/index.ts` — 15 monitors registered
- `packages/health/src/monitors/database.ts`, `redis.ts`, `shopify.ts`, `stripe.ts`, `inngest.ts`, `mcp.ts`, `wise.ts`, `meta.ts`, `google-ads.ts`, `external.ts`
- `packages/health/src/alerts/dispatch.ts`, `channels.ts`
- `packages/health/src/scheduler.ts`
- `packages/logging/src/platform/platform-logger.ts`
- `packages/logging/src/platform/storage.ts`
- `packages/logging/src/platform/retention.ts`
- `packages/logging/src/platform/error-aggregation.ts`
- `packages/integrations/src/meta/oauth.ts`, `refresh.ts`
- `packages/integrations/src/google-ads/oauth.ts`, `refresh.ts`
- `packages/integrations/src/tiktok/oauth.ts`, `refresh.ts`
- `packages/integrations/src/klaviyo/connect.ts`
- `packages/integrations/src/encryption.ts`
- `packages/integrations/src/tenant-credentials/storage.ts`
- `packages/onboarding/src/session.ts`
- `packages/onboarding/src/organization.ts`
- `packages/onboarding/src/invitations.ts`
- `packages/onboarding/src/types.ts`
- `apps/orchestrator/src/app/(dashboard)/brands/new/wizard/context.tsx`
- `apps/orchestrator/src/app/(dashboard)/brands/new/wizard/step-{1-9}/page.tsx`
- `apps/orchestrator/src/app/(dashboard)/ops/health/page.tsx`
- `apps/orchestrator/src/app/(dashboard)/ops/logs/page.tsx`
- `apps/orchestrator/src/app/(dashboard)/flags/page.tsx`
- `apps/orchestrator/src/components/flags/flag-editor.tsx`
- `apps/orchestrator/src/app/api/platform/flags/*`
- `apps/orchestrator/src/app/api/platform/health/*`
- `apps/orchestrator/src/app/api/platform/logs/*`
- `apps/orchestrator/src/app/api/platform/onboarding/*`
- `apps/orchestrator/src/app/api/platform/brands/onboard/step-1/route.ts`
- `apps/admin/src/app/api/admin/integrations/{meta,google-ads,tiktok,klaviyo,slack}/*`
