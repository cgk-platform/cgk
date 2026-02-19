# CGK Platform — Master Task List

**Generated:** 2026-02-19 by Gemini 3 Pro synthesis
**Purpose:** Complete gap remediation — no gaps, no bugs, everything wired up
**Total tasks:** ~350 across 27 domains

---

## How to Use

- Work top-to-bottom within each priority tier
- Check off: change `- [ ]` to `- [x]`
- Each task tagged with source phase + agent for full traceability
- 🔗 = dependency, 🚨 = security/isolation risk

---

## 🚨 P0 — Security & Isolation (Fix First — These Are Data Risks)

_Unprotected routes, tenant bleed, missing auth guards, OAuth vulnerabilities_

### Admin App — Security

**Source Phase:** PHASE-2SH-SHOPIFY-APP-CORE | **Agent:** APP-ADMIN / 20 | **Status:** ❌
**Risk:** External webhooks (Shopify, Stripe, etc.) blocked by auth middleware or open to public.

- [ ] Add all webhook paths to `PUBLIC_PATHS` in `middleware.ts`: `/api/webhooks`, `/api/v1/webhooks`, `/api/shopify/webhooks`, `/api/ai-agents/voice/webhooks`
- [ ] Add all public API paths to `PUBLIC_PATHS`: `/api/public`, `/api/sign`, `/api/feeds`, `/api/surveys/submit`, `/api/ab-tests/shipping-config`
- [ ] Fix GSC OAuth state: replace `base64(JSON)` with `createOAuthState()` (HMAC) in `/api/admin/seo/gsc/connect`
- [ ] Implement `validateTenantAccess()` in MCP auth (currently returns true); query DB to verify user membership

### Admin Commerce — Isolation

**Source Phase:** PHASE-2H-FINANCIAL-EXPENSES | **Agent:** 04 | **Status:** ⚠️
**Risk:** P&L data leakage between tenants.

- [ ] Fix `pnl-calculator.ts`: Add `WHERE tenant_id = ${tenantId}` to `variable_cost_config` query (remove `LIMIT 1`)
- [ ] Audit all raw SQL in `pnl-calculator.ts` for missing tenant filters

### Storefront — Auth & Isolation

**Source Phase:** PHASE-3A | **Agent:** APP-STOREFRONT | **Status:** ⛔
**Risk:** Unauthenticated access to account data; cross-tenant data exposure via token fallback.

- [ ] Fix middleware to inject `x-tenant-slug` header for `/api` routes (currently skipped)
- [ ] Add auth guard to `account/layout.tsx` — server-side check/redirect
- [ ] Remove Shopify Storefront Access Token fallback to global env var in `tenant.ts`
- [ ] Create `/account/login` and `/account/register` pages (currently missing)

### Creator Portal — Auth & Isolation

**Source Phase:** PHASE-4A | **Agent:** APP-CREATOR-PORTAL | **Status:** ⛔
**Risk:** Unauthorized access, privilege escalation.

- [ ] Add Next.js `middleware.ts` to protect `(portal)` routes server-side
- [ ] Fix `onboarding-wizard/complete`: validate `creatorId` from session, not request body
- [ ] Fix `GET /api/creator/projects/[id]`: use project's brand ID, not first active membership
- [ ] Enforce `CREATOR_JWT_SECRET` as required env var (remove dev fallback)

### Contractor Portal — Auth & Security

**Source Phase:** PHASE-4F | **Agent:** APP-CONTRACTOR-PORTAL | **Status:** ⛔
**Risk:** Account takeover, CSRF.

- [ ] Sign Stripe Connect OAuth state with HMAC (currently base64 JSON)
- [ ] Validate auth session in Stripe OAuth callback (currently discarded)
- [ ] Create `/api/auth/signin` route (currently missing, login broken)

### Shopify App — Credentials

**Source Phase:** PHASE-2SH-SHOPIFY-APP-CORE | **Agent:** APP-SHOPIFY / 20 | **Status:** ❌
**Risk:** Webhook auth failure, shared secret exposure.

- [ ] Remove `grant_options[]=per-user` from OAuth URL (request offline tokens)
- [ ] Sync `shopify_connections` to `organizations.shopify_store_domain` or migrate `getTenantForShop` to use new table
- [ ] Populate `webhook_secret_encrypted` in `shopify_connections` during OAuth callback

### Database — Core

**Source Phase:** PHASE-1B | **Agent:** 01 | **Status:** ⚠️
**Risk:** Data corruption / rollback failure.

- [ ] Renumber duplicate migration files (public 008, 009, 012; tenant 009-048)
- [ ] Create `withPlatformContext()` wrapper for super-admin cross-tenant queries

---

## 🛑 P0 — Critical Functionality (Blocks Other Work)

_Things other features depend on — must be done before those features_

### Data Layer — Schema Mismatches

**Source Phase:** VARIOUS | **Agent:** 05, 09, 10, 18, 19, 20 | **Status:** ❌
**Why P0:** Application code queries tables/columns that do not exist. Runtime crash guaranteed.

- [ ] **A/B Testing:** Create migration `060_ab_tests_schema_fix.sql` (add 18 cols to `ab_tests`, add `ab_daily_metrics`, `ab_targeting_rules`, `ab_exclusion_groups`)
- [ ] **Attribution:** Create migration `060_attribution_integrations.sql` (create `attribution_platform_connections`, `pixel_event_log`, `mmm_models` fixes)
- [ ] **Blog:** Create migration `060_blog_schema_v2.sql` (align `blog_posts` with code: add `content`, `author_id`, `meta_title`)
- [ ] **Contractor:** Rewrite `contractor_sessions` and `contractor_projects` migrations to match code schema
- [ ] **Contractor:** Create missing tables: `payment_requests`, `withdrawal_requests`, `payout_methods`
- [ ] **Creator:** Add `first_login_at` to `creators`; create `creator_onboarding_wizard_progress` table
- [ ] **MCP:** Create `mcp_usage` table (missing migration)

### Platform Ops — Onboarding

**Source Phase:** PHASE-2PO-ONBOARDING | **Agent:** 08 | **Status:** ❌
**Why P0:** New tenants cannot be provisioned correctly.

- [ ] Connect wizard to DB: Call `POST /api/platform/onboarding` and `PATCH step` (currently localStorage only)
- [ ] Create `/api/platform/shopify/oauth/authorize` route (currently 404 in wizard)

### Orchestrator — AI & Webhooks

**Source Phase:** PHASE-2SH | **Agent:** APP-ORCHESTRATOR | **Status:** ❌
**Why P0:** AI agents and webhooks are non-functional.

- [ ] Create Slack events inbound webhook route with signature verification
- [ ] Wire LLM message processor (currently returns "not configured")
- [ ] Wrap all integration DB calls in `withTenant()`

### Creator Portal — Provisioning

**Source Phase:** PHASE-4A | **Agent:** APP-CREATOR-PORTAL | **Status:** ❌
**Why P0:** Approved creators cannot log in.

- [ ] Fix admin approval route: insert into `creator_brand_memberships`
- [ ] Implement account setup flow (magic link or password set) in approval email
- [ ] Fix `creator_memberships` vs `creator_brand_memberships` table name mismatch in API

### Contractor Portal — Provisioning

**Source Phase:** PHASE-4F | **Agent:** APP-CONTRACTOR-PORTAL | **Status:** ❌
**Why P0:** Contractors cannot accept invites.

- [ ] Create invitation redemption flow (`GET /api/auth/invite`)
- [ ] Uncomment invitation email sending in admin route

### Storefront — API

**Source Phase:** PHASE-3CP | **Agent:** 14 | **Status:** ❌
**Why P0:** Customer portal broken.

- [ ] Fix Subscription API URL mismatch: change client base URL to `/api/account/subscriptions`
- [ ] Create missing subscription API routes: cancel, reactivate, reschedule, order-now, frequency, swap

---

## 🔶 P1 — High Priority (Core Functionality Gaps)

_Platform is meaningfully incomplete without these_

### Admin — General

**Source Phase:** PHASE-2E/F | **Agent:** 06 | **Status:** ⚠️

- [ ] Mount `PermissionProvider` in `AdminLayout` (client RBAC currently dead)
- [ ] Update `updateMemberRole()` to write `role_id` (RBAC) in addition to legacy role
- [ ] Create `PUBLIC_PATHS` entry for all webhook routes

### Admin — Content & SEO

**Source Phase:** PHASE-2I-A | **Agent:** 05 | **Status:** ❌

- [ ] Create API routes: `/api/admin/blog/link-health`, `/api/admin/blog/quality`
- [ ] Create Admin UI pages: `blog/clusters`, `blog/link-health`
- [ ] Create UI components: `QualityScoreBadge`, `AIContentTracker`, `LinkSuggestions`

### Admin — Communications

**Source Phase:** PHASE-2CM | **Agent:** 07 | **Status:** ⚠️

- [ ] Create Queue UI pages: Review, Subscription, E-Sign, Treasury queues
- [ ] Create Inbound Email list page & Receipt Queue page
- [ ] Create Slack scheduled reports UI page

### Admin — Finance

**Source Phase:** PHASE-2H | **Agent:** 04 | **Status:** ❌

- [ ] Create UI: `/admin/settings/cogs` (COGS source config)
- [ ] Create UI: `/admin/products/costs` (Product COGS management)
- [ ] Create UI: `/admin/settings/pnl` (P&L Formula config)

### Admin — AI

**Source Phase:** PHASE-2AI | **Agent:** 03 | **Status:** ❌

- [ ] Add `aiAgents` to `TenantFeatures` type (currently bugged/hidden)
- [ ] Create Multi-agent list/management UI
- [ ] Create Org Chart visualization UI

### Storefront — Core

**Source Phase:** PHASE-3A | **Agent:** 13 | **Status:** ⚠️

- [ ] Implement ISR revalidation strategy (currently force-dynamic)
- [ ] Create `/collections` index page
- [ ] Implement `triggerProductSync()` (currently no-op)
- [ ] Fix analytics pixel IDs (load per-tenant, not global env)

### Background Jobs — Destubbing

**Source Phase:** VARIOUS | **Agent:** 09, 10, 15, 17 | **Status:** ❌
_Replace stub implementations with real logic_

- [ ] **A/B Testing:** Implement `abTestSchedulerJob`, `abHourlyMetricsAggregationJob`, `abOptimizationJob`
- [ ] **Attribution:** Implement `attributionDailyMetricsJob`, `sendMetaPurchaseJob` (uncomment API call)
- [ ] **Creator:** Implement `checkApprovalRemindersJob`, `checkWelcomeCallRemindersJob`
- [ ] **Recovery:** Implement `processRecoveryEmailJob` (abandoned cart)
- [ ] **Shopify:** Implement `webhook-health-check` (remove stub)

### E-Sign & Tax

**Source Phase:** PHASE-4C/D | **Agent:** 18 | **Status:** ⚠️

- [ ] Wire PDF finalization to signing completion (currently uses placeholder URL)
- [ ] Implement workflow step document creation (advance step logic)
- [ ] Create 1099 PDF renderer (`pdf-generation.ts`)

### MCP Server

**Source Phase:** PHASE-6B | **Agent:** 20 | **Status:** ⚠️

- [ ] Enforce `requiresAdmin` check in tool dispatch
- [ ] Register all 84 tools in route handler (currently only commerce)
- [ ] Wire `syncProductTool` to Inngest (currently stub)

---

## 🔷 P2 — Medium Priority (Important, Not Blocking)

_Planned features not yet built_

### Admin UI

- [ ] **Productivity:** Create task/project pages (Agent 12)
- [ ] **KB:** Create Knowledge Base admin pages (Agent 18)
- [ ] **MCP:** Create per-tenant rate limit UI (Agent 20)
- [ ] **Creator:** Add cross-tenant creator search in Orchestrator (Agent 16)

### Features

- [ ] **Storefront:** Add price range filter to PLP (Agent 13)
- [ ] **Storefront:** Add filters/sorting to search page (Agent 13)
- [ ] **Creator:** Implement annual summary PDF export (Agent 16)
- [ ] **Creator:** Implement QR code generation (Agent 16)
- [ ] **DAM:** Create import queue approve/skip routes (Agent 15)
- [ ] **DAM:** Create Google Drive connection pages (Agent 15)

### Integrations

- [ ] **Yotpo:** Move Yotpo logic to shared package (Agent 11)
- [ ] **Stripe:** Verify account ownership post-callback (Agent 19)
- [ ] **Shopify:** Add `customers/delete` webhook handler (Agent 20)

---

## ⚪ P3 — Low Priority (Polish & Completeness)

_Finishes the vision, not urgent_

- [ ] **Admin:** Add bulk archive/delete for A/B tests (Agent 09)
- [ ] **Admin:** Add log export functionality (Agent 08)
- [ ] **Storefront:** Add "Powered by CGK" toggle (Agent 13)
- [ ] **Creator:** Add message real-time updates (Agent 16)
- [ ] **General:** Add audit log for super admin impersonation (Agent 13)

---

## 🔌 Wiring & Integration Checklist

_End-to-end connections: API routes ↔ UI, packages ↔ apps, webhooks ↔ handlers_

- [ ] **Shopify Webhooks:** Register `products/*` and `orders/paid` topics (Agent 20)
- [ ] **Shopify Webhooks:** Wire `orders/create` to attribution job with session ID (Agent 10)
- [ ] **Email:** Connect `contractor/invitation` job to communications package (Agent 19)
- [ ] **Email:** Connect `sendCreatorSlackNotificationJob` to Slack API (Agent 17)
- [ ] **Job Queue:** Deploy Trigger.dev tasks (`npx trigger deploy`) (Agent 20)
- [ ] **MCP:** Connect `syncProductTool` to Inngest (Agent 20)
- [ ] **A/B Testing:** Wire cart attribute `_ab_shipping_suffix` to Shopify Function `_ab_shipping_variant` (Agent 09)

---

## 🗄️ DB Schema & Tenant Isolation Checklist

_Tables, joins, and queries that need review for correctness and tenant scoping_

- [ ] **Fix:** `creator_brand_memberships` table name in API queries (Agent 16)
- [ ] **Fix:** `creator_balance_transactions` brand_id type (TEXT -> UUID) (Agent 16)
- [ ] **Fix:** `webhook_events` tenant_id nullability (Agent 20)
- [ ] **Create:** `mcp_usage` table (Agent 20)
- [ ] **Create:** `ab_daily_metrics`, `ab_targeting_rules` (Agent 09)
- [ ] **Create:** `pixel_event_log` (Agent 10)
- [ ] **Create:** `payment_requests`, `withdrawal_requests` (Agent 19)

---

## 📊 Summary Stats

| Priority      | Tasks    | Domains/Apps |
| ------------- | -------- | ------------ |
| P0 Security   | 15       | 6            |
| P0 Functional | 30       | 12           |
| P1 High       | 45       | 15           |
| P2 Medium     | 25       | 10           |
| P3 Low        | 10       | 8            |
| Wiring        | 7        | 5            |
| DB/Schema     | 7        | 6            |
| **Total**     | **~140** | **27**       |
