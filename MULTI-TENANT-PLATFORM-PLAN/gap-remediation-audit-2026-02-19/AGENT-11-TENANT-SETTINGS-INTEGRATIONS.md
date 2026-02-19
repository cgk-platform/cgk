# AGENT-11: Tenant Settings, Integrations & Surveys Audit

**Audit Date**: 2026-02-19  
**Auditor**: Agent-11 (Subagent)  
**Phases Covered**: PHASE-2TS, PHASE-2P, PHASE-2SV, PHASE-2O-COMMERCE-SURVEYS  
**Directories Audited**:
- `packages/integrations/src/`
- `apps/admin/src/` (settings, integrations, surveys, config)

---

## Executive Summary

All four phases are in an advanced state of completion. The core infrastructure — database schemas, API routes, UI pages, and background jobs — is solidly built. Phase statuses as marked in plan docs are broadly accurate. The main gaps are **deferred features** (tests, preview panels, pricing webhooks), a few **missing API routes** not listed as deferred, a **duplicate migration numbering** issue in surveys, and some **reusable component files** that were implemented inline in page files instead.

| Phase | Plan Status | Actual Status | Completion Est. |
|-------|------------|---------------|-----------------|
| PHASE-2TS Tenant Settings | ✅ COMPLETE | ⚠️ Partial | ~90% |
| PHASE-2P Integrations Admin | ✅ COMPLETE | ⚠️ Partial | ~92% |
| PHASE-2SV Surveys | ✅ COMPLETE | ⚠️ Partial | ~88% |
| PHASE-2O Commerce Surveys | ✅ COMPLETE | ⚠️ Partial | ~91% |
| **Combined Average** | | | **~90%** |

---

## Feature-by-Feature Classification

---

## 1. PHASE-2TS: Tenant Admin Settings

### 1.1 AI Settings (`/admin/settings/ai`)

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Page component | ✅ | `apps/admin/src/app/admin/settings/ai/page.tsx` |
| Form component | ✅ | `apps/admin/src/components/settings/ai-settings-form.tsx` (297 lines, real implementation) |
| GET route | ✅ | `apps/admin/src/app/api/admin/settings/ai/route.ts` |
| PATCH route | ✅ | `apps/admin/src/app/api/admin/settings/ai/route.ts` |
| Usage GET route | ✅ | `apps/admin/src/app/api/admin/settings/ai/usage/route.ts` |
| Reset usage route | ✅ | `apps/admin/src/app/api/admin/settings/ai/reset-usage/route.ts` |
| Database schema | ✅ | `packages/db/src/migrations/tenant/008_tenant_settings.sql` — `ai_settings` table |
| Audit logging | ✅ | `settings_audit_log` table in same migration |
| Feature toggles UI | ✅ | All 8 toggle fields implemented in form |
| Usage bar indicator | ✅ | `UsageBar` component in `form-elements.tsx` |

### 1.2 Payout Settings (`/admin/settings/payouts`)

**Classification: ⚠️ Partially Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Page component | ✅ | `apps/admin/src/app/admin/settings/payouts/page.tsx` |
| Form component | ✅ | `apps/admin/src/components/settings/payout-settings-form.tsx` |
| GET/PATCH routes | ✅ | `apps/admin/src/app/api/admin/settings/payouts/route.ts` |
| Payment methods GET | ✅ | `apps/admin/src/app/api/admin/settings/payouts/methods/route.ts` |
| Database schema | ✅ | `008_tenant_settings.sql` — `payout_settings` table |
| Test Stripe route | ❌ | **MISSING**: `POST /api/admin/settings/payouts/test-stripe` |
| Test Wise route | ❌ | **MISSING**: `POST /api/admin/settings/payouts/test-wise` |

### 1.3 Site Configuration (`/admin/config`)

**Classification: ⚠️ Partially Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Page component | ✅ | `apps/admin/src/app/admin/config/page.tsx` |
| Form component | ✅ | `apps/admin/src/components/settings/site-config-form.tsx` |
| GET/PATCH route | ✅ | `apps/admin/src/app/api/admin/config/route.ts` |
| Branding route | ✅ | `apps/admin/src/app/api/admin/config/branding/route.ts` |
| Pricing route | ✅ | `apps/admin/src/app/api/admin/config/pricing/route.ts` |
| Database schema | ✅ | `008_tenant_settings.sql` — `site_config` table |
| Preview route | ❌ | **MISSING**: `POST /api/admin/config/preview` |
| Publish/cache-invalidate route | ❌ | **MISSING**: `POST /api/admin/config/publish` |
| Preview panel UI | ⚠️ | Deferred in plan; not present |
| Pricing webhook on change | ⚠️ | Deferred in plan ("requires jobs package") |

### 1.4 Permissions Settings (`/admin/settings/permissions`)

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Page component | ✅ | `apps/admin/src/app/admin/settings/permissions/page.tsx` |
| Client component | ✅ | `apps/admin/src/app/admin/settings/permissions/permissions-page-client.tsx` |
| (RBAC detail from PHASE-2F) | ✅ | Documented as delegating to PHASE-2F-RBAC |

### 1.5 Supporting Infrastructure

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Settings lib types | ✅ | `apps/admin/src/lib/settings/types.ts` |
| Settings lib db | ✅ | `apps/admin/src/lib/settings/db.ts` |
| Settings lib index | ✅ | `apps/admin/src/lib/settings/index.ts` |
| Costs settings page | ✅ | `apps/admin/src/app/admin/settings/costs/page.tsx` (bonus) |
| General settings page | ✅ | `apps/admin/src/app/admin/settings/general/page.tsx` (bonus) |
| Form element components | ✅ | `apps/admin/src/components/settings/form-elements.tsx` |
| Tests | ⚠️ | Deferred — plan marks as "requires test setup" |

---

## 2. PHASE-2P: Integrations Admin

### 2.1 Integration Hub (`/admin/integrations`)

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Hub page | ✅ | `apps/admin/src/app/admin/integrations/page.tsx` |
| Layout/nav | ✅ | `apps/admin/src/app/admin/integrations/layout.tsx` |
| Status dashboard | ✅ | Parallel status fetching from `/api/admin/integrations/status` |
| Category sections | ✅ | commerce, advertising, communications, marketing, platform |
| IntegrationCard component | ✅ | `apps/admin/src/components/integrations/integration-card.tsx` |
| ConnectionStatusBadge | ✅ | `apps/admin/src/components/integrations/connection-status-badge.tsx` |
| OAuthConnectButton | ✅ | `apps/admin/src/components/integrations/oauth-connect-button.tsx` |
| SecureApiKeyInput | ✅ | `apps/admin/src/components/integrations/secure-api-key-input.tsx` |
| TestConnectionResult | ✅ | `apps/admin/src/components/integrations/test-connection-result.tsx` |
| Integration types | ✅ | `apps/admin/src/lib/integrations/types.ts` |
| Overall status API | ✅ | `apps/admin/src/app/api/admin/integrations/status/route.ts` |
| Main integrations API | ✅ | `apps/admin/src/app/api/admin/integrations/route.ts` |

### 2.2 Shopify App Integration

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Integration page | ✅ | `apps/admin/src/app/admin/integrations/shopify-app/page.tsx` |
| Extensions sub-page | ✅ | `apps/admin/src/app/admin/integrations/shopify-app/extensions/page.tsx` |
| **Webhooks management page** | ✅ | `apps/admin/src/app/admin/integrations/shopify-app/webhooks/page.tsx` |
| Auth/OAuth route | ✅ | `apps/admin/src/app/api/admin/shopify-app/auth/route.ts` |
| OAuth callback | ✅ | `apps/admin/src/app/api/admin/shopify-app/callback/route.ts` |
| Disconnect route | ✅ | `apps/admin/src/app/api/admin/shopify-app/disconnect/route.ts` |
| Status route | ✅ | `apps/admin/src/app/api/admin/shopify-app/status/route.ts` |
| Test route | ✅ | `apps/admin/src/app/api/admin/shopify-app/test/route.ts` |
| Refresh route | ✅ | `apps/admin/src/app/api/admin/shopify-app/refresh/route.ts` |
| Extensions list route | ✅ | `apps/admin/src/app/api/admin/shopify-app/extensions/route.ts` |
| Webhook events API | ✅ | `apps/admin/src/app/api/admin/integrations/shopify/webhooks/events/route.ts` |
| Webhook health API | ✅ | `apps/admin/src/app/api/admin/integrations/shopify/webhooks/health/route.ts` |
| Webhook retry API | ✅ | `apps/admin/src/app/api/admin/integrations/shopify/webhooks/retry/[eventId]/route.ts` |
| Webhook sync API | ✅ | `apps/admin/src/app/api/admin/integrations/shopify/webhooks/sync/route.ts` |

### 2.3 Meta Ads Integration

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Integration page | ✅ | `apps/admin/src/app/admin/integrations/meta-ads/page.tsx` |
| OAuth start | ✅ | `apps/admin/src/app/api/admin/integrations/meta/oauth/route.ts` |
| OAuth callback | ✅ | `apps/admin/src/app/api/admin/integrations/meta/callback/route.ts` |
| Account selection | ✅ | `apps/admin/src/app/api/admin/integrations/meta/accounts/route.ts` |
| Account update | ✅ | `apps/admin/src/app/api/admin/integrations/meta/accounts/[id]/route.ts` |
| Status | ✅ | `apps/admin/src/app/api/admin/integrations/meta/status/route.ts` |
| Disconnect | ✅ | `apps/admin/src/app/api/admin/integrations/meta/disconnect/route.ts` |
| Package module | ✅ | `packages/integrations/src/meta/` (config, oauth, refresh, index) |
| DB migration | ✅ | `018_integrations.sql` — `meta_ad_connections` table |

### 2.4 Google Ads Integration

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Integration page | ✅ | `apps/admin/src/app/admin/integrations/google-ads/page.tsx` |
| OAuth start | ✅ | `apps/admin/src/app/api/admin/integrations/google-ads/oauth/route.ts` |
| OAuth callback | ✅ | `apps/admin/src/app/api/admin/integrations/google-ads/callback/route.ts` |
| Customer list | ✅ | `apps/admin/src/app/api/admin/integrations/google-ads/customers/route.ts` |
| Customer select | ✅ | `apps/admin/src/app/api/admin/integrations/google-ads/customers/[id]/route.ts` |
| Status | ✅ | `apps/admin/src/app/api/admin/integrations/google-ads/status/route.ts` |
| Disconnect | ✅ | `apps/admin/src/app/api/admin/integrations/google-ads/disconnect/route.ts` |
| Script config | ✅ | `apps/admin/src/app/api/admin/google-ads/script-config/route.ts` (legacy path) |
| Package module | ✅ | `packages/integrations/src/google-ads/` (config, oauth, refresh, index) |
| DB migration | ✅ | `018_integrations.sql` — `google_ads_connections` table |

### 2.5 TikTok Ads Integration

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Integration page | ✅ | `apps/admin/src/app/admin/integrations/tiktok-ads/page.tsx` |
| OAuth start | ✅ | `apps/admin/src/app/api/admin/integrations/tiktok/oauth/route.ts` |
| OAuth callback | ✅ | `apps/admin/src/app/api/admin/integrations/tiktok/callback/route.ts` |
| Advertiser list | ✅ | `apps/admin/src/app/api/admin/integrations/tiktok/advertisers/route.ts` |
| Advertiser select | ✅ | `apps/admin/src/app/api/admin/integrations/tiktok/advertisers/[id]/route.ts` |
| Status | ✅ | `apps/admin/src/app/api/admin/integrations/tiktok/status/route.ts` |
| Disconnect | ✅ | `apps/admin/src/app/api/admin/integrations/tiktok/disconnect/route.ts` |
| Pixel config | ✅ | `apps/admin/src/app/api/admin/tiktok-ads/pixel-config/route.ts` (legacy path) |
| Package module | ✅ | `packages/integrations/src/tiktok/` (config, oauth, refresh, index) |
| DB migration | ✅ | `018_integrations.sql` — `tiktok_ad_connections` table (expected) |

### 2.6 Klaviyo Integration

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Integration page | ✅ | `apps/admin/src/app/admin/integrations/klaviyo/page.tsx` |
| Connect | ✅ | `apps/admin/src/app/api/admin/integrations/klaviyo/connect/route.ts` |
| Disconnect | ✅ | `apps/admin/src/app/api/admin/integrations/klaviyo/disconnect/route.ts` |
| Status | ✅ | `apps/admin/src/app/api/admin/integrations/klaviyo/status/route.ts` |
| Test | ✅ | `apps/admin/src/app/api/admin/integrations/klaviyo/test/route.ts` |
| Config | ✅ | `apps/admin/src/app/api/admin/integrations/klaviyo/config/route.ts` |
| Lists | ✅ | `apps/admin/src/app/api/admin/integrations/klaviyo/lists/route.ts` |
| Sync | ✅ | `apps/admin/src/app/api/admin/integrations/klaviyo/sync/route.ts` |
| Package module | ✅ | `packages/integrations/src/klaviyo/` (config, connect, index) |

### 2.7 Yotpo Integration

**Classification: ⚠️ Partially Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Integration page | ✅ | `apps/admin/src/app/admin/integrations/yotpo/page.tsx` |
| Connect | ✅ | `apps/admin/src/app/api/admin/yotpo/connect/route.ts` |
| Disconnect | ✅ | `apps/admin/src/app/api/admin/yotpo/disconnect/route.ts` |
| Status | ✅ | `apps/admin/src/app/api/admin/yotpo/status/route.ts` |
| Test | ✅ | `apps/admin/src/app/api/admin/yotpo/test/route.ts` |
| **Package module in integrations** | ⚠️ | **NOT in `packages/integrations/src/`** — only admin-level API routes; no shared Yotpo client package |
| Product mappings | ⚠️ | Mentioned in plan but no dedicated route for product mapping config |

### 2.8 SMS / Voice Integration

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Main SMS page | ✅ | `apps/admin/src/app/admin/integrations/sms/page.tsx` |
| Audit log page | ✅ | `apps/admin/src/app/admin/integrations/sms/audit-log/page.tsx` |
| Notifications page | ✅ | `apps/admin/src/app/admin/integrations/sms/notifications/page.tsx` |
| Connect route | ✅ | `apps/admin/src/app/api/admin/sms/connect/route.ts` |
| Status route | ✅ | `apps/admin/src/app/api/admin/sms/status/route.ts` |
| Audit log API | ✅ | `apps/admin/src/app/api/admin/sms/audit-log/route.ts` |
| Audit log export | ✅ | `apps/admin/src/app/api/admin/sms/audit-log/export/route.ts` |
| Test route | ✅ | `apps/admin/src/app/api/admin/sms/test/route.ts` |
| Settings route | ✅ | `apps/admin/src/app/api/admin/sms/settings/route.ts` |
| Opt-outs management | ✅ | `apps/admin/src/app/api/admin/sms/opt-outs/route.ts` |
| Queue management | ✅ | `apps/admin/src/app/api/admin/sms/queue/route.ts` |
| Templates | ✅ | `apps/admin/src/app/api/admin/sms/templates/route.ts` |
| Setup & verify | ✅ | `apps/admin/src/app/api/admin/sms/setup/route.ts` + `/verify/route.ts` |

### 2.9 Slack Integration

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Integration page | ✅ | `apps/admin/src/app/admin/integrations/slack/page.tsx` |
| Connect | ✅ | `apps/admin/src/app/api/admin/integrations/slack/connect/route.ts` |
| Disconnect | ✅ | `apps/admin/src/app/api/admin/integrations/slack/disconnect/route.ts` |
| Test | ✅ | `apps/admin/src/app/api/admin/integrations/slack/test/route.ts` |
| DB migration | ✅ | `023_slack_integration.sql` |

### 2.10 MCP Server Integration

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| MCP dashboard | ✅ | `apps/admin/src/app/admin/integrations/mcp/page.tsx` |
| MCP analytics page | ✅ | `apps/admin/src/app/admin/integrations/mcp/analytics/page.tsx` |
| Status route | ✅ | `apps/admin/src/app/api/admin/mcp/status/route.ts` |
| Keys create | ✅ | `apps/admin/src/app/api/admin/mcp/keys/route.ts` |
| Key revoke | ✅ | `apps/admin/src/app/api/admin/mcp/keys/[id]/route.ts` |
| Analytics route | ✅ | `apps/admin/src/app/api/admin/mcp/analytics/route.ts` |
| DB migration | ✅ | `053_mcp_api_keys.sql` |

### 2.11 Credential Management

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Credentials settings page | ✅ | `apps/admin/src/app/admin/settings/integrations/credentials/page.tsx` |
| Integrations settings page | ✅ | `apps/admin/src/app/admin/settings/integrations/page.tsx` |
| Credentials CRUD API | ✅ | `apps/admin/src/app/api/admin/integrations/credentials/route.ts` |
| Credential by service | ✅ | `apps/admin/src/app/api/admin/integrations/credentials/[service]/route.ts` |
| Credential verify | ✅ | `apps/admin/src/app/api/admin/integrations/credentials/[service]/verify/route.ts` |
| Tenant credentials package | ✅ | `packages/integrations/src/tenant-credentials/` (Stripe, Resend, Wise, generic) |

### 2.12 Core Integration Package

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Encryption (AES-256-GCM) | ✅ | `packages/integrations/src/encryption.ts` |
| OAuth state / CSRF | ✅ | `packages/integrations/src/oauth-state.ts` |
| Status utilities | ✅ | `packages/integrations/src/status.ts` |
| Token refresh job | ✅ | `packages/integrations/src/jobs/token-refresh.ts` |
| DB migration (connections) | ✅ | `018_integrations.sql` |
| DB migration (AI integrations) | ✅ | `025_ai_integrations.sql` |
| DB migration (tenant config) | ✅ | `038_tenant_integration_config.sql` |
| Tests | ✅ | `packages/integrations/src/__tests__/encryption.test.ts` |
| Integration tests (full E2E) | ⚠️ | Noted in plan; not fully implemented |

---

## 3. PHASE-2SV: Surveys & Post-Purchase Attribution

### 3.1 Database Schema

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| `surveys` table | ✅ | `packages/db/src/migrations/tenant/016_surveys.sql` |
| `survey_questions` table | ✅ | `016_surveys.sql` |
| `attribution_options` table | ✅ | `016_surveys.sql` |
| `survey_responses` table | ✅ | `016_surveys.sql` |
| `survey_answers` table | ✅ | `016_surveys.sql` |
| `survey_slack_config` table | ✅ | `016_surveys.sql` |
| Default attribution options seeded | ✅ | (in db.ts seeding logic) |
| **Duplicate migration file** | ⚠️ | Both `015_surveys.sql` AND `016_surveys.sql` exist — potential migration ordering conflict |

### 3.2 Core Survey Services

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Survey lib db operations | ✅ | `apps/admin/src/lib/surveys/db.ts` (1,242 lines) |
| Survey types | ✅ | `apps/admin/src/lib/surveys/types.ts` |
| Survey lib exports | ✅ | `apps/admin/src/lib/surveys/index.ts` |
| CRUD: getSurveys, createSurvey | ✅ | Confirmed in db.ts |
| CRUD: questions | ✅ | Confirmed in db.ts |
| Duplicate prevention | ✅ | Check logic in public submit API |
| Conditional logic evaluator | ✅ | Referenced in question data model |
| Attribution extraction | ✅ | `attribution_source` field on responses |

### 3.3 Analytics Services

**Classification: ⚠️ Partially Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Survey stats | ✅ | `apps/admin/src/app/api/admin/surveys/[id]/analytics/route.ts` |
| Attribution breakdown | ✅ | `apps/admin/src/app/api/admin/surveys/[id]/analytics/route.ts` |
| CSV/Excel export | ✅ | `apps/admin/src/app/api/admin/surveys/[id]/responses/route.ts` |
| NPS trend over time | ⚠️ | Analytics page (190 lines) shows basic stats; full NPS trend chart limited |
| Quick stats endpoint | ❌ | **MISSING**: `GET /api/admin/surveys/[id]/stats` (spec'd as separate endpoint) |

### 3.4 API Routes

**Classification: ⚠️ Partially Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Survey list/create | ✅ | `apps/admin/src/app/api/admin/surveys/route.ts` |
| Survey get/update/delete | ✅ | `apps/admin/src/app/api/admin/surveys/[id]/route.ts` |
| Survey duplicate | ✅ | `apps/admin/src/app/api/admin/surveys/[id]/duplicate/route.ts` |
| Questions CRUD | ✅ | `apps/admin/src/app/api/admin/surveys/[id]/questions/route.ts` |
| Individual question | ✅ | `apps/admin/src/app/api/admin/surveys/questions/[id]/route.ts` |
| **Questions reorder** | ❌ | **MISSING**: `POST /api/admin/surveys/[id]/questions/reorder/route.ts` |
| Responses list | ✅ | `apps/admin/src/app/api/admin/surveys/[id]/responses/route.ts` |
| Analytics | ✅ | `apps/admin/src/app/api/admin/surveys/[id]/analytics/route.ts` |
| Attribution options CRUD | ✅ | `apps/admin/src/app/api/admin/surveys/attribution-options/route.ts` |
| Attribution option delete | ✅ | `apps/admin/src/app/api/admin/surveys/attribution-options/[id]/route.ts` |
| Slack config | ✅ | `apps/admin/src/app/api/admin/surveys/slack/route.ts` |
| Slack test | ✅ | `apps/admin/src/app/api/admin/surveys/slack/test/route.ts` |
| Public: get survey | ✅ | `apps/admin/src/app/api/public/surveys/[tenant]/[slug]/route.ts` |
| Public: submit response | ✅ | `apps/admin/src/app/api/public/surveys/[tenant]/responses/route.ts` |
| Public: check completion | ✅ | `apps/admin/src/app/api/public/surveys/[tenant]/check/route.ts` |

### 3.5 UI Components

**Classification: ⚠️ Partially Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| SurveyStatsCards | ✅ | `apps/admin/src/components/surveys/survey-stats-cards.tsx` |
| AttributionBreakdownChart | ✅ | `apps/admin/src/components/surveys/attribution-breakdown-chart.tsx` |
| RecentResponsesList | ✅ | `apps/admin/src/components/surveys/recent-responses-list.tsx` |
| SlackConfigForm | ✅ | `apps/admin/src/components/surveys/slack-config-form.tsx` |
| SurveyEditor (reusable) | ⚠️ | Implemented inline within `[id]/page.tsx` (700 lines) |
| QuestionEditor (reusable) | ⚠️ | Implemented inline within `[id]/questions/page.tsx` (684 lines) |
| ConditionBuilder | ⚠️ | Logic embedded in questions page; no standalone component |
| AttributionOptionsManager | ⚠️ | In `surveys/attribution/page.tsx`, not a reusable component |
| SurveyPreview | ❌ | **NOT FOUND** — no live preview in survey builder |
| BrandingEditor | ⚠️ | Basic fields in [id]/page.tsx tabs; no visual editor |
| ResponseDetail modal | ⚠️ | Inline in responses page |
| AnswerDistributionChart | ⚠️ | Basic display in analytics page (190 lines) — no dedicated chart component |
| NpsGaugeChart | ⚠️ | NPS data available but no gauge-style visualization |
| TrendLineChart | ⚠️ | Not found; analytics shows basic stats only |

### 3.6 Admin Pages

**Classification: ⚠️ Partially Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| `/admin/surveys` | ✅ | `apps/admin/src/app/admin/surveys/page.tsx` |
| `/admin/surveys/new` | ✅ | `apps/admin/src/app/admin/surveys/new/page.tsx` |
| `/admin/surveys/[id]` | ✅ | `apps/admin/src/app/admin/surveys/[id]/page.tsx` (includes settings/targeting/branding tabs) |
| `/admin/surveys/[id]/questions` | ✅ | `apps/admin/src/app/admin/surveys/[id]/questions/page.tsx` |
| `/admin/surveys/[id]/responses` | ✅ | `apps/admin/src/app/admin/surveys/[id]/responses/page.tsx` |
| `/admin/surveys/[id]/analytics` | ✅ | `apps/admin/src/app/admin/surveys/[id]/analytics/page.tsx` |
| `/admin/surveys/[id]/settings` | ⚠️ | **No separate page** — settings tab embedded in `[id]/page.tsx` (acceptable) |
| `/admin/surveys/attribution` | ✅ | `apps/admin/src/app/admin/surveys/attribution/page.tsx` |
| `/admin/surveys/slack` | ✅ | `apps/admin/src/app/admin/surveys/slack/page.tsx` |

### 3.7 Shopify Extension

**Classification: ✅ Substantially Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Extension scaffolded | ✅ | `apps/shopify-app/extensions/post-purchase-survey/` |
| Entry point | ✅ | `src/index.tsx` + `src/Checkout.tsx` |
| Extension toml config | ✅ | `shopify.extension.toml` |
| Survey component | ✅ | Full `Checkout.tsx` renders survey with choice list |
| Question renderers | ✅ | ChoiceList, TextField present in Checkout.tsx |
| Response submission hook | ✅ | Submission logic in Checkout.tsx |
| Both extension targets | ✅ | `purchase.thank-you.block.render` and `customer-account.order-status.block.render` |
| Types | ✅ | `src/types.ts` |
| **Tested on dev store** | ❌ | Marked as "[ ] Test on dev store" — not yet deployed/tested |

### 3.8 Background Jobs

**Classification: ✅ Fully Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Process survey response job | ✅ | `packages/jobs/src/handlers/survey-process.ts` |
| Slack notification job | ✅ | `packages/jobs/src/handlers/survey-slack.ts` |
| Low NPS alert job | ✅ | `surveyLowNpsAlertJob` in survey-slack.ts |
| Daily digest job | ✅ | `surveySlackDigestJob` (frequency: 'daily') |
| Weekly digest job | ✅ | `surveySlackDigestJob` (frequency: 'weekly') |

---

## 4. PHASE-2O: Commerce Surveys

**Note**: PHASE-2O is largely a subset specification that was superseded by the more comprehensive PHASE-2SV implementation. All files listed in the PHASE-2O Implementation Summary have been confirmed to exist.

**Classification: ✅ Substantially Implemented**

| Item | Status | Evidence |
|------|--------|----------|
| Survey dashboard | ✅ | `/admin/surveys/page.tsx` covers this |
| Attribution breakdown charts | ✅ | `attribution-breakdown-chart.tsx` component |
| Response list with filters/export | ✅ | `/admin/surveys/[id]/responses/page.tsx` |
| Survey question customization | ✅ | `/admin/surveys/[id]/questions/page.tsx` |
| Slack integration | ✅ | `/admin/surveys/slack/page.tsx` |
| Real-time notifications | ✅ | Job handler in survey-slack.ts |
| Digest notifications | ✅ | Job handler in survey-slack.ts |
| Shopify extension | ✅ | `apps/shopify-app/extensions/post-purchase-survey/` |
| Integration with attribution system | ✅ | Attribution source captured and stored |
| **Slack OAuth flow** | ⚠️ | Implemented as webhook URL (simpler); no OAuth flow for Slack in surveys |
| `survey_config` table (PHASE-2O spec) | ⚠️ | PHASE-2SV schema used instead (more comprehensive) |
| Survey-specific Shopify webhook | ⚠️ | `/api/webhooks/shopify/` directory exists but survey-specific handler not verified |
| Global survey stats route | ❌ | `GET /api/admin/surveys/stats` (global, not per-survey) not found |
| Global attribution route | ❌ | `GET /api/admin/surveys/attribution` (global) not found; per-survey analytics exist |

---

## TODO Lists for Gaps

### 🔴 PHASE-2TS: Tenant Settings — Missing Routes

```
TODO: Create POST /api/admin/settings/payouts/test-stripe
  - Validate Stripe Connect credentials
  - Return connection status with account name
  - File: apps/admin/src/app/api/admin/settings/payouts/test-stripe/route.ts

TODO: Create POST /api/admin/settings/payouts/test-wise
  - Validate Wise API credentials
  - Return profile info on success
  - File: apps/admin/src/app/api/admin/settings/payouts/test-wise/route.ts

TODO: Create POST /api/admin/config/preview
  - Accept partial site config changes
  - Return preview URL or rendered diff
  - File: apps/admin/src/app/api/admin/config/preview/route.ts

TODO: Create POST /api/admin/config/publish
  - Trigger cache invalidation for CDN
  - Broadcast pricing change events
  - File: apps/admin/src/app/api/admin/config/publish/route.ts
```

### 🟡 PHASE-2TS: Deferred Features (Low Priority)

```
TODO: Implement site config live preview panel
  - Right-side preview in SiteConfigForm
  - Real-time updates as settings change

TODO: Implement pricing change webhook
  - Fire event when pricing_config changes in PATCH
  - Requires jobs package integration
  - Probably handled by existing cache invalidation flow

TODO: Add integration and unit tests for settings
  - Permission check tests
  - Settings persistence tests
  - Audit log verification tests
```

### 🔴 PHASE-2P: Integrations — Yotpo Package Gap

```
TODO: Add Yotpo module to packages/integrations/src/
  - Create packages/integrations/src/yotpo/config.ts
  - Create packages/integrations/src/yotpo/connect.ts
  - Create packages/integrations/src/yotpo/index.ts
  - Export from packages/integrations/src/index.ts
  - Move API key handling logic from admin routes into package
  - This enables other packages to use Yotpo functionality

TODO: Add product mapping configuration for Yotpo
  - Add route: GET/POST /api/admin/yotpo/product-mappings
  - Allow mapping CGK products to Yotpo product IDs
```

### 🟡 PHASE-2P: Integrations — Technical Debt

```
TODO: Clean up dual API path pattern
  - /api/admin/shopify-app/ AND /api/admin/integrations/shopify/ both exist
  - /api/admin/tiktok-ads/ AND /api/admin/integrations/tiktok/ both exist
  - /api/admin/google-ads/ AND /api/admin/integrations/google-ads/ both exist
  - Audit which paths are used by the frontend pages
  - Deprecate/redirect legacy paths or document the intentional split
```

### 🔴 PHASE-2SV: Surveys — Missing API Routes

```
TODO: Create POST /api/admin/surveys/[id]/questions/reorder
  - Accept ordered array of question IDs
  - Update display_order in bulk
  - File: apps/admin/src/app/api/admin/surveys/[id]/questions/reorder/route.ts
  - This is needed for drag-and-drop question ordering in the builder

TODO: Create GET /api/admin/surveys/[id]/stats  
  - Quick stats endpoint (separate from full analytics)
  - Response count, completion rate, last response timestamp
  - File: apps/admin/src/app/api/admin/surveys/[id]/stats/route.ts
```

### 🔴 PHASE-2SV: Surveys — Duplicate Migration Files

```
TODO: Resolve duplicate migration numbering
  - Both 015_surveys.sql AND 016_surveys.sql exist
  - 015_surveys.sql appears to be an earlier draft with enum types
  - 016_surveys.sql is the canonical implementation (without enum types)
  - Action: Rename 015_surveys.sql to something non-conflicting
    (e.g., delete it or rename to 015z_surveys_draft.sql.bak)
  - Verify migration runner doesn't pick up both files
  - Risk: HIGH — duplicate migration can break DB setup for new tenants
```

### 🟡 PHASE-2SV: Surveys — Missing UI Components

```
TODO: Extract SurveyPreview component
  - Currently no live preview in survey builder
  - Should render survey as customer would see it (mobile-first)
  - File: apps/admin/src/components/surveys/survey-preview.tsx

TODO: Improve analytics visualization
  - Add NpsGaugeChart component for NPS score display
    File: apps/admin/src/components/surveys/nps-gauge-chart.tsx
  - Add TrendLineChart component for responses over time
    File: apps/admin/src/components/surveys/trend-line-chart.tsx
  - Add AnswerDistributionChart for per-question pie/bar charts
    File: apps/admin/src/components/surveys/answer-distribution-chart.tsx

TODO: Extract QuestionEditor as standalone reusable component
  - Currently 684-line inline implementation in questions/page.tsx
  - Refactor to apps/admin/src/components/surveys/question-editor.tsx
  - Enables reuse and unit testing
```

### 🟡 PHASE-2SV: Surveys — Extension Testing

```
TODO: Test Shopify extension on dev store
  - Deploy post-purchase-survey extension to Shopify dev store
  - Verify display on purchase.thank-you.block.render target
  - Verify display on customer-account.order-status.block.render target
  - Test response submission to public API
  - Test already-completed check
  - Test with tenant branding
```

### 🟡 PHASE-2O: Commerce Surveys — Minor Gaps

```
TODO: Add global survey stats route (if needed)
  - GET /api/admin/surveys/stats — aggregate stats across all surveys
  - Currently only per-survey analytics available
  - May not be needed if dashboard uses per-survey breakdown

TODO: Verify Shopify survey-response webhook handler
  - Confirm /api/webhooks/shopify/ handles survey response webhook events
  - Document the webhook topic and payload format

TODO: Consider Slack OAuth for survey notifications
  - Currently uses webhook URL (simpler)
  - If OAuth is needed for better UX, implement:
    GET /api/admin/surveys/slack/oauth
    GET /api/admin/surveys/slack/oauth/callback
```

---

## Overall Completion Percentage Estimate

| Phase | Estimate | Key Missing |
|-------|----------|-------------|
| PHASE-2TS Tenant Settings | **90%** | 4 missing API routes, preview panel, tests |
| PHASE-2P Integrations Admin | **92%** | Yotpo package, dual-path cleanup, tests |
| PHASE-2SV Surveys | **88%** | Reorder endpoint, migration conflict, visualization components, extension not tested |
| PHASE-2O Commerce Surveys | **91%** | Global stats routes, Slack OAuth option |
| **Combined** | **~90%** | |

---

## Positive Highlights

1. **Encryption is properly implemented** — AES-256-GCM in `packages/integrations/src/encryption.ts` with salt + IV + auth tag pattern. This is production-quality.

2. **Tenant isolation is consistently applied** — `withTenant()` wrapper used throughout survey db.ts (1,242 lines of isolated queries).

3. **Background jobs are fully implemented** — Both `survey-process.ts` and `survey-slack.ts` exist in `/packages/jobs/`.

4. **Shopify extension targets both surfaces** — `purchase.thank-you.block.render` AND `customer-account.order-status.block.render` registered.

5. **Settings audit logging is in place** — `settings_audit_log` table exists with proper indexes.

6. **Token refresh jobs implemented** — `packages/integrations/src/jobs/token-refresh.ts` handles OAuth token expiry proactively.

7. **The integrations package is well-architected** — Clean separation between Meta, Google, TikTok, Klaviyo modules, each with config/oauth/refresh/index pattern.

---

## Risk Items

| Risk | Severity | Description |
|------|----------|-------------|
| Duplicate migration `015_surveys.sql` + `016_surveys.sql` | 🔴 HIGH | Could break new tenant schema creation if migration runner processes both. Needs immediate cleanup. |
| Yotpo not in integrations package | 🟡 MEDIUM | All Yotpo logic lives in admin routes only — can't be shared across packages |
| Missing `test-stripe` / `test-wise` routes | 🟡 MEDIUM | UI buttons may be broken or point to non-existent endpoints |
| Extension not tested on dev store | 🟡 MEDIUM | Core post-purchase survey flow unverified end-to-end |
| Dual API paths for ad integrations | 🟢 LOW | Technical debt; both paths seem intentional; monitor for confusion |

---

*Report generated by Agent-11 on 2026-02-19*
