# App Deep-Dive Audit: Admin App
**Date:** 2026-02-19 | **App:** apps/admin | **Auditor:** Subagent APP-ADMIN

---

## Auth Audit

### Status: Custom JWT + cookie auth with solid middleware baseline — but PUBLIC_PATHS critically incomplete, leaving webhooks/public routes blocked for external callers

**How it works:**
- Custom JWT auth via `@cgk-platform/auth` package. No NextAuth or Clerk.
- JWT stored in HTTP-only, secure, SameSite=lax cookie (`AUTH_COOKIE_NAME`).
- Middleware (`src/middleware.ts`) validates every request against the matcher `/((?!_next/static|...).*)`
- On valid JWT: middleware sets downstream headers — `x-user-id`, `x-user-role`, `x-session-id`, `x-tenant-id`, `x-tenant-slug`
- API route handlers read these forwarded headers (not the JWT directly) to get auth context
- `tenantId` carried in JWT as `orgId` claim; `orgSlug` as `org` claim
- Tenant also resolved from Host header: custom domain → subdomain → JWT fallback
- Impersonation JWT is a distinct token type (`isImpersonationToken`), validated separately via `validateImpersonationSession`
- Auth failure: redirect to `/login?redirect=<pathname>` (all non-public paths)

**`PUBLIC_PATHS` (currently):** `/login`, `/join`, `/auth/verify`, `/api/auth`

**Critical: The following routes are NOT in PUBLIC_PATHS but receive unauthenticated external requests:**
- `/api/webhooks/shopify` — called by Shopify
- `/api/webhooks/twilio/incoming`, `/api/webhooks/twilio/status` — called by Twilio
- `/api/webhooks/mux` — called by Mux
- `/api/webhooks/resend/inbound`, `/api/webhooks/resend/treasury` — called by Resend
- `/api/v1/webhooks/assemblyai` — called by AssemblyAI
- `/api/ai-agents/voice/webhooks/retell` — called by Retell.ai
- `/api/shopify/webhooks` — called by Shopify
- `/api/public/surveys/*` — public surveys for external users
- `/api/public/scheduling/*` — public booking for external users
- `/api/public/gallery/submit` — public gallery
- `/api/feeds/google/[token]/*` — polled by Google Merchant Center
- `/api/sign/[token]` — accessed by external signers (no account)
- `/api/surveys/submit` — called from Shopify checkout extension
- `/api/ab-tests/shipping-config` — called from storefront

Middleware would return 302 → `/login` for all of these external callers, breaking their functionality.

#### Gaps:
- [ ] **P0** Add all webhook paths to `PUBLIC_PATHS`: `/api/webhooks`, `/api/v1/webhooks`, `/api/shopify/webhooks`, `/api/ai-agents/voice/webhooks`
- [ ] **P0** Add all public API paths to `PUBLIC_PATHS`: `/api/public`, `/api/sign`, `/api/feeds`, `/api/surveys/submit`, `/api/ab-tests/shipping-config`
- [ ] **P1** GSC OAuth state (`/api/admin/seo/gsc/connect`) uses bare `base64(JSON{tenantSlug, timestamp})` — no HMAC signature. Replace with `createOAuthState()` from `@cgk-platform/integrations/oauth-state` (which uses HMAC + Redis nonce). The `/api/admin/seo/gsc/callback` must then call `verifyOAuthState()`.
- [ ] **P1** `/api/auth/impersonation/end` validates impersonation by trusting the `x-is-impersonation` header set by middleware — this is correct, but there is no verification that `x-impersonator-id` matches the acting user before calling `endImpersonation`. Add explicit caller check.
- [ ] **P2** `accept-invite` route sends notification email with an inline `fetch('https://api.resend.com/...')` call instead of going through `@cgk-platform/communications`. Centralizing this ensures API key management and error handling are consistent.
- [ ] **P2** Middleware calls `resolveTenantFromHost` → `sql` query on EVERY request (including static asset-excluded paths that still match). Add Redis caching for the domain → tenant lookup to avoid DB hit on every request.

---

## Permissions Audit

### Status: Two-tier RBAC — good for ~35% of routes (use `requireAuth` or `checkPermission`), but 395 of 647 API routes have zero role enforcement beyond "is authenticated"

**How it works:**
- Role set: `member`, `admin`, `owner`, `super_admin`
- Routes using `requireAuth()` then role check: `['owner', 'admin', 'super_admin'].includes(auth.role)` — ~130 routes
- Routes using `checkPermissionOrRespond(userId, tenantId, 'permission.name')` — ~39 routes (fine-grained)
- Routes using `getTenantContext()` — returns tenantId only, no role — ~107 routes
- Routes using only `headers().get('x-tenant-slug')` — ~395 routes — **NO role enforcement whatsoever**

**Role check examples (good):**
- `/api/admin/commissions` — requires `owner/admin/super_admin`
- `/api/platform/logs` — requires `owner/admin/super_admin`
- `/api/platform/logs/aggregates` — requires `owner/admin/super_admin`
- `/api/admin/roles` — uses `checkPermissionOrRespond(userId, tenantId, 'team.roles.manage')`

**Missing role enforcement (bad):**
- `/api/platform/logs/stream` — calls `requireAuth()` but does NOT check role (unlike the non-stream logs endpoint). Any authenticated user can stream all logs.
- `/api/admin/ab-tests` — no role check; any member can create/list A/B tests
- `/api/admin/settings/*` (email domains, templates, routing, payouts) — no role check on ~20 routes
- `/api/admin/seo/*` — no role check; any member can connect/disconnect GSC
- `/api/admin/selling-plans/*` — no role check
- `/api/admin/bri/creative-ideas/*` — no role check
- `/api/admin/permissions` — checks `tenantId && userId` only; any member can read all permissions

#### Gaps:
- [ ] **P0** Add role check to `/api/platform/logs/stream`: require `['owner', 'admin', 'super_admin']` (match the non-streaming logs endpoint)
- [ ] **P1** Audit all 395 header-only routes and apply minimum role enforcement: define which should be `member`, `admin`, or `owner`-only. Suggest defaulting to `admin`+ for any write operations in `/api/admin/settings/*`
- [ ] **P1** `/api/admin/permissions` should require at minimum `admin` role to read all platform permissions
- [ ] **P1** Create a `withRole(role[])` middleware wrapper that can be applied consistently instead of ad-hoc `auth.role` checks per route
- [ ] **P1** Define a permission matrix document mapping all 647 routes to their required role — enforce it in code
- [ ] **P2** Settings routes (email domains/templates, GSC connect, selling plans) should require `owner` or `admin` to prevent member-level users from changing configuration
- [ ] **P2** Check if `createCustomRole` in `/api/admin/roles` properly prevents privilege escalation — ensure no custom role can be created with permissions exceeding the caller's own permissions (currently only blocks `*` wildcard but not specific over-grants)
- [ ] **P3** Add UI-level permission gates in admin shell to match API-level enforcement (currently some UI elements may show to members that they can't act on)

---

## Tenant Provisioning Audit

### Status: CLI-only provisioning — no in-app wizard, no default data seeding, no automated post-provisioning setup

**How it works:**
- `cgk tenant:create <slug>` (from `@cgk-platform/cli`) is the only provisioning mechanism
- Creates: Postgres schema `tenant_<slug>`, runs migrations, inserts row in `public.organizations`
- No seeding: no default email templates, no default feature flags, no initial owner user, no analytics settings row, no default roles
- In-app onboarding APIs exist (`/api/admin/onboarding/email/complete`) but they configure an already-provisioned tenant, not create one
- After CLI provisioning, tenant is immediately `status: 'active'` — no `onboarding` phase enforced
- No setup wizard UI in the admin app

**What the CLI creates:**
```sql
INSERT INTO public.organizations (slug, name, status)
VALUES ($slug, $displayName, 'active')
```
That's it. No owner user, no settings, no default config.

**Post-provision manual steps (not automated):**
- Connect Shopify (OAuth)
- Connect Stripe (API key)
- Configure email domain + sender
- Set feature flags
- Invite first user/owner

#### Gaps:
- [ ] **P0** No UI for super admin to provision new tenants — must use CLI. Build `/api/platform/admin/tenants` POST endpoint (super_admin only) that wraps `createTenantSchema` + org record creation
- [ ] **P0** No default seeding after schema creation: add a `seedTenantDefaults(slug)` function called after migrations that creates: default email templates, default analytics_settings row, default feature flags, default roles
- [ ] **P1** New tenant status should start as `'onboarding'` not `'active'` — only flip to `'active'` after setup wizard completes
- [ ] **P1** No first-owner user creation during provisioning. CLI's "Next steps" are just a printed message. Automate: after `tenant:create`, prompt for owner email and create their user + membership automatically
- [ ] **P1** No setup wizard in the admin app — build an onboarding flow that guides through: Shopify connect → email domain → Stripe → feature flags → first invite
- [ ] **P2** No tenant health check after provisioning — add a `checkTenantHealth(slug)` that verifies schema migrations are current, required settings exist, integrations are configured
- [ ] **P2** Add `tenant:seed` CLI command to separately run seeding against an existing tenant
- [ ] **P2** No test to validate that after provisioning all API routes work correctly for the new tenant
- [ ] **P3** Add tenant deletion / suspension capability to CLI (`tenant:suspend`, `tenant:delete --dry-run`)

---

## OAuth & Integrations Audit

### Status: Core OAuth infrastructure is solid (HMAC-signed state, Redis nonce, encrypted tokens) — but GSC bypasses it, no refresh automation, GA4/Stripe/YouTube/Pinterest missing

**What's implemented:**

| Integration | OAuth Start | Callback | Token Storage | Refresh | Notes |
|---|---|---|---|---|---|
| Meta Ads | ✅ | ✅ | ✅ encrypted (integrations pkg) | ❓ unknown | Uses proper HMAC state |
| TikTok Ads | ✅ | ✅ | ✅ encrypted (integrations pkg) | ❓ unknown | Uses proper HMAC state |
| Google Ads | ✅ | ✅ | ✅ encrypted (integrations pkg) | ❓ unknown | Uses proper HMAC state |
| Shopify | ✅ | ✅ | ✅ encrypted (shopify pkg) | N/A | Best-in-class, HMAC verify |
| Google Search Console | ✅ | ✅ | ✅ AES-256-GCM (inline) | ✅ implemented | **Insecure state — no HMAC** |
| Google Drive (DAM) | ✅ | ✅ | ❓ | ❓ | Via DAM package |
| Klaviyo | API key | — | ❓ | N/A | Key-based only |
| Stripe | API key | — | ❓ | N/A | No OAuth flow |
| Slack (workspace) | ✅ | ✅ | ❓ | ❓ | Slack pkg |
| Retell.ai | Webhook only | — | ✅ encrypted | N/A | Signature verified |
| GA4 | ❌ | ❌ | — | — | **Not implemented** |
| YouTube | ❌ | ❌ | — | — | Not implemented |
| Pinterest | ❌ | ❌ | — | — | Not implemented |
| Stripe OAuth | ❌ | ❌ | — | — | Uses API keys only |

**GSC OAuth security issue (confirmed):**
```ts
// /api/admin/seo/gsc/connect — INSECURE
const state = Buffer.from(JSON.stringify({ tenantSlug, timestamp: Date.now() })).toString('base64')
```
vs. the correct approach used by Meta/TikTok/Google Ads:
```ts
// @cgk-platform/integrations/oauth-state — SECURE
createOAuthState(tenantId, returnUrl, secret) // HMAC + Redis nonce
```

**GSC callback also:**
```ts
// Only checks timestamp age (1 hour window) — no signature verification
stateData = JSON.parse(Buffer.from(state, 'base64').toString())
if (Date.now() - stateData.timestamp > maxAge) { redirect to error }
```
An attacker can forge a GSC OAuth state for any `tenantSlug` and complete the OAuth flow, linking their Google account to an arbitrary tenant.

**Token refresh — GSC has it, others unknown:**
- GSC: `refreshAccessToken()` implemented in `lib/seo/google-search-console.ts` — but it's not clear where it's called automatically
- Meta/TikTok/Google Ads: refresh is inside `@cgk-platform/integrations` — needs verification that token refresh is automatic before expiry

#### Gaps:
- [ ] **P0** Fix GSC OAuth state: replace `base64(JSON{tenantSlug,timestamp})` with `createOAuthState()` from `@cgk-platform/integrations/oauth-state`; update callback to call `verifyOAuthState()` — eliminates CSRF/tenant-hijack vulnerability
- [ ] **P0** GSC callback uses `placeholder.com` as a temporary site URL then immediately tries to overwrite it: `storeGSCCredentials({siteUrl: 'https://placeholder.com', ...})` then `getGSCSites()` then re-stores. If `getGSCSites()` fails, credentials are stored with the placeholder. Add site selection step before storing final credentials.
- [ ] **P1** Move GSC OAuth logic from `apps/admin/src/lib/seo/` into `@cgk-platform/integrations` package to match Meta/TikTok/Google Ads pattern — get HMAC state management for free
- [ ] **P1** Implement automatic token refresh for Meta, TikTok, Google Ads before expiry — add background job or middleware-layer refresh check in `@cgk-platform/integrations`
- [ ] **P1** Implement GA4 OAuth flow — analytics settings schema has `ga4_connected`, `ga4_property_id` fields but there is no connect flow
- [ ] **P1** Implement Stripe Connect OAuth as an alternative to API keys (for multi-tenant Stripe marketplace model)
- [ ] **P2** Verify that token refresh is automatic for GSC: `refreshAccessToken()` exists but it's not called on expiry anywhere in the observed routes
- [ ] **P2** Add YouTube + Pinterest OAuth (schema has `analytics_settings` fields referencing them — confirm what fields exist)
- [ ] **P3** Add per-tenant OAuth token expiry dashboard so super admin can see which integrations have expired tokens

---

## Database & Schema Audit

### Status: Good tenant isolation via `withTenant()` in lib/ layers — two critical N+1 cross-tenant scans, raw SQL for dynamic queries in a few places

**Core patterns:**
- `withTenant(slug, fn)` or `getTenantContext(req)` → sets `search_path = tenant_<slug>, public`
- Schema-per-tenant isolation — queries inside `withTenant` automatically scope to tenant schema
- `@cgk-platform/db` `sql` tagged template for safe parameterized queries throughout

**N+1 issues found:**

1. **Google Feed endpoint** (`/api/feeds/google/[token]/products.json`):
```ts
// Iterates ALL organizations, switches schema for each, queries for matching feed_token
const orgsResult = await sql`SELECT slug FROM public.organizations WHERE is_active = true`
for (const org of orgsResult.rows) {
  await setTenantSchema(slug)  // DB call per tenant
  const settingsResult = await sql`SELECT ... FROM google_feed_settings WHERE feed_token = ${token}`
  if (settingsResult.rows.length > 0) { break }
}
```
**Fix:** Add `feed_token` to `public.organizations` or create a `public.google_feed_tokens(token, tenant_slug)` index table. Single lookup.

2. **eSign public signing** (`/api/sign/[token]`):
```ts
// Queries pg_catalog.pg_tables for every tenant to find which schema has the signer
const result = await sql`SELECT t.slug FROM public.tenants t WHERE EXISTS (SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'tenant_' || t.slug AND tablename = 'esign_signers')`
for (const row of result.rows) {
  const signer = await getSignerByToken(tenantSlug, token)  // DB call per tenant
  if (signer) return tenantSlug
}
```
**Fix:** Add a `public.esign_tokens(token, tenant_slug, expires_at)` routing table. Populated when tokens are created.

**Dynamic SQL with parameterized queries (acceptable, not injection risk):**
```ts
// /lib/expenses/db/expenses.ts — builds WHERE clause dynamically but uses $1, $2 parameters
await sql.query(`SELECT ... FROM operating_expenses ${whereClause} ...`, values)
```
This is safe (parameterized) but less readable than tagged template SQL. Low priority.

**Raw `set_config` in feed route:**
```ts
await sql`SELECT set_config('search_path', ${`tenant_${tenantSlug}, public`}, true)`
```
This manually sets search_path instead of using `withTenant()`. Should use the standard wrapper.

**Analytics queries use tenantId but some analytics lib functions may accept `tenantSlug` then look up `tenantId` internally.** Consistent use of either slug or id throughout the analytics lib needs verification.

**Missing: `public.tenants` vs `public.organizations`** — the eSign route queries `public.tenants` but the CLI and most code references `public.organizations`. Verify these are the same table or consolidate.

#### Gaps:
- [ ] **P0** Fix Google Feed N+1: Create `public.google_feed_tokens (token VARCHAR, tenant_slug VARCHAR, created_at TIMESTAMP)` table. Index on `token`. Populate on feed settings save. Replace the cross-tenant scan with single lookup.
- [ ] **P0** Fix eSign token N+1: Create `public.esign_signing_tokens (token VARCHAR, tenant_slug VARCHAR, expires_at TIMESTAMP)` routing table. Index on `token`. Populate in `createSigner()`. Replace the `pg_tables` scan in `/api/sign/[token]`.
- [ ] **P1** Replace raw `set_config('search_path', ...)` in feed route with `withTenant(tenantSlug, fn)` wrapper
- [ ] **P1** Clarify `public.tenants` vs `public.organizations` — eSign route and CLI use different table names. Add migration or alias.
- [ ] **P2** Add database-level index audit: check `google_feed_settings.feed_token`, `esign_signers.token`, `sessions.id`, `team_invitations.token` all have unique indexes
- [ ] **P2** Analytics lib functions: verify all accept and pass through `tenantId` (UUID), not just `tenantSlug` (string) — mixing these causes implicit lookups
- [ ] **P3** Replace dynamic SQL string construction in `lib/expenses/db/expenses.ts` with tagged template SQL using conditional fragments (cleaner, less error-prone)
- [ ] **P3** Add query timing metrics for slow queries — the cross-tenant scans may not be the only performance bottlenecks

---

## Package Wiring Audit

### Status: Strong package usage across auth, db, integrations, commerce, comms — several inline reimplementations that should live in packages

**Packages correctly wired:**
- `@cgk-platform/auth` — JWT, sessions, permissions, roles, impersonation
- `@cgk-platform/db` — `withTenant`, `sql`, `createTenantCache`
- `@cgk-platform/integrations` — Meta, TikTok, Google Ads OAuth + token management
- `@cgk-platform/shopify` — full Shopify OAuth, webhooks, product sync
- `@cgk-platform/communications` — email templates, SMS, treasury receipts
- `@cgk-platform/support` — tickets, agents, KB, chat sessions
- `@cgk-platform/esign` — signing templates, signers, signatures
- `@cgk-platform/dam` — digital asset management, Google Drive OAuth
- `@cgk-platform/logging` — structured logs, SSE stream
- `@cgk-platform/ai-agents` — voice/Retell, person types
- `@cgk-platform/admin-core` — workflow engine, thread management, draft generation
- `@cgk-platform/scheduling` — bookings, blocked dates
- `@cgk-platform/payments` — payouts, Wise
- `@cgk-platform/slack` — Slack notifications, blocks
- `@cgk-platform/video` — video management
- `@cgk-platform/jobs` — job queue events
- `@cgk-platform/mcp` — MCP tools
- `@cgk-platform/commerce` — product feeds, selling plans

**Inline reimplementations (should be extracted to packages):**

| Area | Location | Issue |
|---|---|---|
| GSC OAuth | `apps/admin/src/lib/seo/google-search-console.ts` | Full OAuth + AES-256 encryption inline; should be `@cgk-platform/integrations` |
| Analytics DB | `apps/admin/src/lib/analytics/` | Large analytics module (reports, KPIs, P&L) not in a package |
| A/B Testing | `apps/admin/src/lib/ab-tests/` | Full A/B test engine (variants, stats, scheduling) inline |
| Expenses/P&L | `apps/admin/src/lib/expenses/` | Financial data model inline |
| SEO | `apps/admin/src/lib/seo/` | Keyword tracking, GSC sync inline |
| Creator Ops | `apps/admin/src/lib/creators-admin-ops.ts` | Commission logic inline |
| Tenant config | `apps/admin/src/lib/tenant.ts` | Tenant config cache is useful cross-app — belongs in `@cgk-platform/db` or `@cgk-platform/auth` |

**Broken wiring:**

- `accept-invite/route.ts` sends invitation accepted email via raw `fetch('https://api.resend.com/emails', ...)` instead of `@cgk-platform/communications`. Bypasses email template system, tenant sender address, and error tracking.
- SEO keyword sync calls Google APIs inline without going through `@cgk-platform/integrations` token management — if tokens expire, there's no automatic refresh triggered through the standard path.

#### Gaps:
- [ ] **P1** Move `lib/seo/google-search-console.ts` OAuth + token management into `@cgk-platform/integrations` (creates `startGSCOAuth`, `completeGSCOAuth`, `disconnectGSC` matching Meta/TikTok/Google Ads pattern)
- [ ] **P1** Replace inline Resend API call in `accept-invite/route.ts` with `@cgk-platform/communications` email send function
- [ ] **P2** Extract `lib/ab-tests/` into `@cgk-platform/ab-testing` package — A/B test engine is used in admin routes and will likely be needed in other apps (portal, storefront)
- [ ] **P2** Extract `lib/analytics/` into `@cgk-platform/analytics` package — analytics data model is referenced in multiple places
- [ ] **P2** Move `lib/tenant.ts` `getTenantConfig()` into `@cgk-platform/auth` or `@cgk-platform/db` — tenant feature flags will be needed cross-app
- [ ] **P3** Extract `lib/expenses/` into `@cgk-platform/finance` package when building financial reporting cross-app
- [ ] **P3** Extract `lib/seo/` keyword tracking into `@cgk-platform/seo` package

---

## Super Admin Audit

### Status: Impersonation infrastructure exists in middleware and JWT; end-impersonation endpoint exists — but NO super admin UI, NO tenant provisioning UI, NO impersonation start endpoint, NO tenant health monitoring

**What exists:**
- Middleware: detects impersonation JWT type, validates `validateImpersonationSession`, sets `x-is-impersonation`, `x-impersonator-id`, `x-impersonator-email` headers
- `AdminShell` component shows impersonation banner when `impersonationInfo` is populated
- `/api/auth/impersonation/end` — ends impersonation session, clears cookie
- `/api/auth/context/switch` — switches between tenants the current user has membership in (uses `switchTenantContext` which validates membership via `TenantAccessError`)
- `/api/auth/context/tenants` — returns all tenants a user has access to
- `/api/platform/logs`, `/api/platform/logs/aggregates`, `/api/platform/logs/stream` — cross-tenant log access with role check

**What's missing:**
- No `/api/auth/impersonation/start` endpoint in the admin app — impersonation can be ended but there's nowhere to initiate it. Super admin cannot enter impersonation mode from the admin UI.
- No super admin tenant list page (`/admin/platform/tenants`)
- No in-app tenant provisioning (super_admin cannot create a new tenant without CLI)
- No tenant health monitoring dashboard (schema migration status, integration health, active users, etc.)
- No user lookup across tenants (super admin cannot search for a user across all orgs)
- Tenant switching (`/api/auth/context/switch`) only works for tenants the user has MEMBERSHIP in — a super admin cannot switch to a tenant they haven't been explicitly added to

#### Gaps:
- [ ] **P0** Implement `/api/auth/impersonation/start` endpoint: super_admin POSTs `{targetUserId, tenantId, reason}`, system creates impersonation JWT + session, returns it. Without this, impersonation infrastructure is inoperable from the UI.
- [ ] **P0** Build super admin tenant list: `GET /api/platform/admin/tenants` — lists all orgs with status, creation date, last activity, integration health. Requires `super_admin` role. Add `/admin/platform/tenants` page.
- [ ] **P0** Allow `super_admin` to switch to any tenant regardless of membership: modify `switchTenantContext` or create a parallel `superAdminSwitchTenant` that bypasses the membership check, with audit logging.
- [ ] **P1** Build super admin user impersonation UI: search user by email → select tenant context → click "Impersonate" → issues impersonation JWT → enters their admin session with banner shown
- [ ] **P1** Build tenant provisioning UI for super admin: form with slug, name, owner email → calls tenant create API → seeds defaults → sends owner invite
- [ ] **P1** Build tenant health dashboard: per-tenant checklist (schema migrations current?, Shopify connected?, email configured?, Stripe configured?, feature flags set?) with red/yellow/green status
- [ ] **P2** Add cross-tenant user lookup: `GET /api/platform/admin/users?email=<email>` returns user + all their tenant memberships — for support and debugging
- [ ] **P2** Add impersonation audit log UI: show history of all impersonation sessions (who impersonated whom, when, duration) per tenant
- [ ] **P3** Add tenant usage metrics (API call volume, storage, active users) visible from super admin view
- [ ] **P3** Add tenant suspension endpoint from super admin UI: `POST /api/platform/admin/tenants/[id]/suspend` with reason field

---

## Priority Summary

### P0 Critical (blocking functionality or security):
1. **`PUBLIC_PATHS` missing all external routes** — webhooks (Shopify, Twilio, Mux, Resend, AssemblyAI, Retell), public APIs (`/api/public/*`), feeds, sign, surveys/submit are being intercepted by middleware and returning 302 to external callers. Webhooks are broken in production.
2. **GSC OAuth CSRF vulnerability** — state parameter is base64(JSON) with no HMAC signature, allowing tenant-hijack OAuth attack. Fix: use `createOAuthState()` from integrations package.
3. **No impersonation start endpoint** — impersonation infrastructure is built (middleware, JWT, end endpoint) but there's no way to initiate impersonation from the app.
4. **No super admin tenant provisioning UI** — tenants can only be created via CLI; super admin cannot provision from the app.
5. **Google Feed N+1** — loops all tenant schemas on every product feed poll (called by Google Merchant Center continuously).
6. **eSign token N+1** — scans all tenant schemas via `pg_tables` on every signing page load (called by external signers).

### P1 High (security gaps, missing critical features):
1. **`/api/platform/logs/stream` role check missing** — any authenticated user can stream platform logs; should require `owner/admin/super_admin`.
2. **~395 admin API routes have no role enforcement** — any member-role user can call settings, SEO, A/B test, and financial routes.
3. **Super admin cannot switch to tenants without membership** — `switchTenantContext` blocks access; needs super_admin bypass path.
4. **No tenant health monitoring** — no way to verify a newly provisioned tenant has correct config.
5. **No default seeding** — new tenants have empty schema, no email templates, no default settings.
6. **GSC callback placeholder site URL bug** — stores `https://placeholder.com` before fetching real sites; failure leaves garbage credentials.
7. **Move GSC OAuth into integrations package** — eliminate insecure inline state management.
8. **GA4 OAuth not implemented** — schema expects GA4 connection but no flow exists.
9. **Token refresh not confirmed for Meta/TikTok/Google Ads** — unclear if automatic refresh is wired.
10. **Inline Resend email in accept-invite** — bypasses `@cgk-platform/communications`.

### P2 Medium (code quality, missing features, performance):
1. Middleware domain resolution hits DB on every request — add Redis cache.
2. Custom role creation doesn't prevent granting permissions the caller doesn't hold (privilege escalation via custom roles).
3. No setup wizard for newly provisioned tenants.
4. `lib/seo/`, `lib/ab-tests/`, `lib/analytics/`, `lib/expenses/` should be extracted to packages.
5. Cross-tenant user lookup missing for super admin support.
6. `lib/tenant.ts` `getTenantConfig()` belongs in a shared package.
7. Replace dynamic SQL in expenses with tagged template SQL.
8. Verify index coverage on `feed_token`, `esign_signers.token`, `team_invitations.token`.

### P3 Low (polish, nice-to-have):
1. Super admin tenant suspension endpoint in UI.
2. Super admin impersonation audit log.
3. Tenant usage metrics dashboard.
4. `tenant:seed` CLI command for existing tenants.
5. `tenant:delete --dry-run` CLI command.
6. UI-level permission gates to match API enforcement.
7. Query timing metrics for DB performance monitoring.
