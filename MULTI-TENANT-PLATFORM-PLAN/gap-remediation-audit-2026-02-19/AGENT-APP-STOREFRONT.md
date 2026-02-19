# App Deep-Dive Audit: Storefront App
**Date:** 2026-02-19 | **App:** apps/storefront

---

## Auth Audit

### Status: ⛔ BROKEN — No customer auth flow exists. Account pages render for unauthenticated users. API routes partially protected but middleware breaks tenant resolution for API calls.

#### Key Architecture
- Tenant detected via middleware: subdomain → `x-tenant-slug` header → `getTenantConfig()` DB lookup
- Customer session stored in `cgk_session_id` cookie → `customer_sessions` table (via `getCustomerSession()`)
- `withTenant(slug)` wraps all customer DB queries for schema isolation
- Middleware sets `x-tenant-slug` header for page/RSC requests — but **explicitly skips `/api` routes**

#### Critical Bugs
1. **Middleware skips API tenant header injection** (`middleware.ts` line ~120): `pathname.startsWith('/api')` → early return without setting `x-tenant-slug`. All API routes call `getTenantSlug()` → `headers().get('x-tenant-slug')` and get `null`, meaning every client-side API call returns `400 Tenant not found`. This would break all account data loading.

2. **No login/register/logout pages exist**: `customer_sessions` table + `getCustomerSession()` function exist, but there is no `/account/login`, `/account/register`, or `/account/logout` page or API endpoint in the storefront. Customers have nowhere to authenticate.

3. **No session creation endpoint**: No route to INSERT into `customer_sessions`. Password reset endpoint exists but just stores a token — no email delivery, no reset flow, no session creation after reset.

4. **Account layout has no auth gate** (`account/layout.tsx`): Renders unconditionally — no `getCustomerSession()`, no redirect. ALL account pages except `write/[productId]/page.tsx` render their shells to unauthenticated users. Data loads will silently fail/return 401.

#### Gaps:
- [ ] **P0** Fix middleware to set `x-tenant-slug` header for `/api` routes — either remove the `/api` early-return exception, or have API client send `X-Tenant-Slug` header on every request (read from a JS-accessible value set at page load)
- [ ] **P0** Build `/account/login` page with email/password form → calls a `POST /api/account/auth/login` that validates credentials and creates a `customer_sessions` row
- [ ] **P0** Build `/account/register` page with create-account form → `POST /api/account/auth/register` → create `customers` + `customer_sessions` rows per tenant
- [ ] **P0** Build `/api/account/auth/logout` route that deletes the session row and clears the `cgk_session_id` cookie; wire up the "Sign Out" link in `account/layout.tsx`
- [ ] **P0** Add auth guard to `account/layout.tsx` — call `getCustomerSession()`, redirect to `/account/login?next=/account/...` if no session
- [ ] **P1** Set `HttpOnly; Secure; SameSite=Lax` flags on `cgk_session_id` cookie when creating sessions (currently no cookie creation code exists at all)
- [ ] **P1** Implement actual session creation in `getCustomerSession()` flow — the DB table is referenced but nothing ever inserts into `customer_sessions`
- [ ] **P1** Replace password reset token generation (`rst_${Date.now()}_${Math.random()}`) with `crypto.randomBytes(32).toString('hex')` for cryptographic security
- [ ] **P1** Implement password reset email delivery — queue a job via `@cgk-platform/jobs` rather than silently swallowing the token
- [ ] **P1** Implement actual password reset completion page (`/account/reset-password?token=xxx`) that validates token, lets user set new password, creates a session
- [ ] **P2** Lock down `x-tenant-slug` header override: in production, reject requests that set this header unless they come from a trusted internal IP or have `INTERNAL_API_KEY` — currently any browser can spoof any tenant
- [ ] **P2** Add session expiry rotation — refresh session `expires_at` on each authenticated request to prevent stale sessions
- [ ] **P2** Add rate limiting to auth endpoints (login, register, password reset) to prevent brute force
- [ ] **P3** Add "Remember Me" option — session TTL configurable (7d vs 30d)
- [ ] **P3** Document customer auth flow in CLAUDE.md — currently undocumented

---

## Permissions Audit

### Status: ⚠️ PARTIAL — API routes are properly scoped by customer ownership, but page-level auth is absent and some endpoints skip auth entirely.

#### What works:
- All `/api/account/*` routes call `getCustomerSession()` and return `401` if no session
- Resource ownership enforced in DB queries: `AND customer_id = ${session.customerId}` in orders, subscriptions, wishlists, addresses, etc.
- Reviews: purchase-verified — `WriteReviewPage` checks that the customer actually bought the product before showing the form
- `withTenant()` ensures queries only touch the correct tenant schema

#### What's broken:
- `GET /api/account/features` — **no session check** — returns feature flag config to any unauthenticated request with valid tenant context
- `GET /api/portal/theme` — **no customer session check** — any visitor can read portal theme config (PUT/DELETE do check `x-user-id` but this appears to be an admin concept, not a customer session)
- All account pages render their shell to unauthenticated users (see Auth Audit)
- `account/orders/[id]/page.tsx`, `account/subscriptions/[id]/page.tsx`, etc. — no server-side auth gate, data rendered client-side (meaning the page HTML is public, only the data fetch is gated)

#### Gaps:
- [ ] **P0** Add session guard to every account page — server-side redirect to `/account/login` before rendering any account RSC
- [ ] **P1** Add auth check to `GET /api/account/features` — at minimum require a valid session; feature flags expose tenant product configuration that shouldn't be freely enumerable
- [ ] **P1** Clarify who can call `PUT /api/portal/theme` — currently protected by `x-user-id` header (merchant/admin concept), but this endpoint lives in the storefront app; ensure it cannot be called by customer sessions
- [ ] **P2** Add CSRF protection to all mutating account API routes (`POST`, `PATCH`, `DELETE`) — no CSRF tokens are present
- [ ] **P2** Add "guest checkout" concept — explicit guest vs authenticated-customer distinction for cart/checkout flows
- [ ] **P3** Add account deletion endpoint (`DELETE /api/account/profile`) — GDPR/CCPA compliance

---

## Tenant Provisioning Audit

### Status: ⚠️ PARTIAL — Routing infrastructure is solid but there is no automated provisioning pipeline to onboard a new storefront tenant, no DNS setup, and no domain verification.

#### What exists:
- Subdomain routing: `rawdog.cgk.com` → slug=`rawdog` ✅
- Custom domain routing: `www.mybrand.com` → DB lookup → slug ✅ (lookup via `/api/internal/domain-lookup`)
- In-memory domain cache (5-min TTL) in middleware — works for single instance ✅
- Reserved subdomains list prevents collisions ✅
- `PLATFORM_DOMAINS` constant defines `cgk.dev`, `cgk.com`, `commercegrowthkit.com`, `localhost` ✅
- Tenant validation regex (`/^[a-z0-9_]+$/`) prevents slug injection ✅
- Feature flags per tenant via `organizations.settings.features` JSONB ✅
- Development fallback: `DEFAULT_TENANT_SLUG=demo` env var ✅

#### What's missing:
- No automated storefront provisioning wizard — no process to set up subdomain DNS, create Shopify store, sync initial product catalog, configure payment gateway
- No custom domain DNS verification workflow (e.g., TXT record check before activation)
- No `www.` redirect handling — `www.cgk.com` would not match subdomain routing correctly
- Domain cache is in-memory (per process) — in multi-instance or serverless deployments, cache is not shared; invalidation on domain change won't propagate
- No domain lookup cache invalidation API — changing `custom_domain` in DB doesn't clear middleware's in-memory cache
- Next.js is a single shared deployment; Vercel subdomain rewriting or reverse-proxy config needed for `*.cgk.com`
- No tenant "active" status enforcement in middleware — middleware only checks slug format, not tenant active status (DB query in `getTenantConfig()` does filter `status = 'active'`, but middleware lets through any valid slug)
- No storefront-specific schema migration automation — when provisioning a new tenant, no automated DB migration to create their schema

#### Gaps:
- [ ] **P0** Create storefront provisioning automation — when a new tenant is activated in the orchestrator, auto-trigger: (1) create DNS CNAME for `{slug}.cgk.com`, (2) set Shopify credentials, (3) trigger initial product sync, (4) verify payment gateway
- [ ] **P0** Implement Vercel/infrastructure wildcard subdomain routing (`*.cgk.com` → storefront app with hostname passed through)
- [ ] **P1** Build custom domain verification flow: tenant inputs domain → platform generates DNS TXT record → polling job verifies → marks domain as `verified` before activating routing
- [ ] **P1** Replace in-memory middleware domain cache with Redis/KV cache for multi-instance correctness; add cache invalidation webhook when `organizations.custom_domain` changes
- [ ] **P1** Add `www.` stripping in subdomain detection — `www.cgk.com` should not be treated as tenant slug `www`
- [ ] **P2** Add tenant "suspended/inactive" enforcement in middleware — 404 or redirect if tenant `status != 'active'`
- [ ] **P2** Document required DNS records for custom domains in operator docs and onboarding wizard
- [ ] **P2** Create storefront provisioning checklist page in orchestrator — shows status of each provisioning step (DNS, Shopify, products, payment)
- [ ] **P3** Support tenant-specific Next.js caching policies (ISR revalidation intervals) configured per tenant

---

## OAuth & Token Management Audit

### Status: ⛔ MISSING — No OAuth or social login flows exist anywhere in the storefront. No Shopify Customer Account API integration. No per-tenant OAuth app support.

#### What exists:
- Password reset token generation (insecure, no email delivery, no completion flow)
- `INTERNAL_API_KEY` header for internal API auth ✅
- Shopify webhook HMAC verification (per-tenant `shopify_webhook_secret`) ✅
- Stripe PaymentIntent with per-tenant Stripe credentials via `getTenantStripeClient()` ✅

#### What's missing:
- No Google/Facebook/Apple social login on storefront
- No Shopify Customer Accounts API (new) or Shopify Multipass SSO integration
- No "Login with Shopify" customer account flow — checkout happens via Shopify Storefront API carts, but customer identity is not linked
- No OAuth2 authorization code flow for customer accounts
- No per-tenant OAuth app configuration (each tenant might want different social login providers)
- No PKCE implementation for public-client OAuth flows
- No refresh token rotation for any token type
- No token revocation endpoint

#### Gaps:
- [ ] **P0** Implement Shopify Multipass SSO — when customer is authenticated in the storefront, generate a Multipass token to pass to Shopify checkout so customer's Shopify account is linked (required for order history to sync from Shopify)
- [ ] **P1** Implement Google OAuth login for customers (`/api/account/auth/google` → OAuth2 authorization code flow → create/link `customers` row)
- [ ] **P1** Add per-tenant OAuth configuration in `organizations.settings` — enable/disable social providers, store OAuth client IDs per tenant
- [ ] **P1** Implement Shopify Customer Account API integration (new Shopify customer accounts headless API) as primary auth method if tenant uses Shopify for customer management
- [ ] **P2** Implement Facebook/Meta Login for customers
- [ ] **P2** Add "Link Accounts" flow — allow customers who logged in via email to link Google/Facebook accounts
- [ ] **P2** Implement proper PKCE for any public-client OAuth (mobile/SPA)
- [ ] **P3** Add Apple Sign In support
- [ ] **P3** Implement token revocation endpoint (`/api/account/auth/revoke`)

---

## Database & Schema Audit

### Status: ⚠️ MODERATE — Multi-tenant scoping with `withTenant()` is consistently applied. Several data model issues and potential cross-tenant leaks exist.

#### What's correct:
- All customer data queries use `withTenant(tenantSlug, ...)` which scopes to the correct schema ✅
- Subscription ownership: `WHERE id = ${id} AND customer_id = ${session.customerId}` ✅
- Order ownership: `WHERE customer_id = ${session.customerId}` ✅
- Review eligibility: purchase verified via join on `orders` + `order_line_items` ✅
- `getTenantConfig()` uses React `cache()` for request-level deduplication ✅
- Feature flags look up both tenant-level and platform-level settings ✅

#### Bugs / Risks:
1. **Shopify Storefront Access Token falls back to shared env var** (`tenant.ts` line ~70): If `org.shopify_config?.storefrontAccessToken` is null, falls back to `process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN`. This is a global/shared token that would expose one tenant's Shopify store to another tenant's configuration. **Cross-tenant data exposure risk.**

2. **`withTenant(tenantId)` vs `withTenant(tenantSlug)` inconsistency** (`portal-theme/loader.ts`): `loadPortalTheme(tenantId)` uses the UUID, but most code passes slug. If schemas are keyed by slug and `withTenant` is schema-switching, using UUID vs slug could hit wrong schema or fail.

3. **`SELECT *` in products queries** (`products-db.ts`): Over-fetches all columns including large JSONB fields on every product list call.

4. **N+1 query in `getProductsByHandles()`** (`products-db.ts` lines ~390-410): Fetches products one-by-one in a loop. A single `WHERE handle = ANY(${handles})` query would be far more efficient.

5. **`gift_card_transactions` as store credit** (`store-credit/route.ts`): Using gift card transactions to back store credit account is a schema smell that will cause trouble — no unified `store_credit_accounts` table with a running balance.

6. **`subscription_orders` have no line items** (`subscriptions/[id]/route.ts` line ~`mapRowToSubscriptionOrder`): Returns `items: []` always — order line items for subscription orders are never populated.

7. **Webhook handler queries `public.organizations` schema directly** (`webhooks/shopify/checkouts/route.ts`): Raw `sql` query without `withTenant()` — intentional for cross-tenant lookup but should be documented as a known exception.

8. **No database migration runner** for new tenant provisioning: When a new tenant is provisioned, their schema tables must be created; this process is not automated from the storefront.

9. **`feature_flag_overrides` queries with `tenant_id = ${config.slug}`**: Feature flag overrides compare `tenant_id` (probably a UUID FK) to `config.slug` (string). This could be a type mismatch.

#### Gaps:
- [ ] **P0** Fix Shopify Storefront Access Token fallback — NEVER fall back to a global env var; if tenant has no token configured, return an error, not another tenant's credentials
- [ ] **P1** Audit `withTenant()` calls — ensure all use tenant slug consistently, not a mix of slug/ID; document the convention in CLAUDE.md
- [ ] **P1** Fix `feature_flag_overrides` tenant_id comparison — verify column is string slug or UUID and match accordingly
- [ ] **P1** Create `store_credit_accounts` table with balance field; stop reading gift card transactions as store credit proxy
- [ ] **P1** Fix `subscription_orders` mapping to actually populate `items` from a related `subscription_order_items` table (or JSONB column)
- [ ] **P2** Replace `SELECT *` in `getProductsFromLocalDB` with explicit column list
- [ ] **P2** Fix N+1 in `getProductsByHandles` — use `WHERE handle = ANY(${sql.array(handles)})` single query
- [ ] **P2** Add database indexes audit — verify `customer_sessions(session_token)`, `products(handle, status)`, `orders(customer_id)`, `subscriptions(customer_id)` are indexed
- [ ] **P3** Document all direct `sql` queries that bypass `withTenant()` (webhook handler, etc.) with comments explaining why

---

## Webhook & Wiring Audit

### Status: ⚠️ PARTIAL — Product data flow is solid. Analytics is hardcoded to global env vars (not per-tenant). Product sync trigger is a no-op. Cart/Stripe checkout flow exists but is disconnected from Shopify order creation.

#### What works:
- Product data: local PostgreSQL DB (synced from Shopify) → storefront, with Shopify API fallback ✅
- Cart operations: Shopify Storefront API (GraphQL mutations via `@cgk-platform/commerce`) ✅
- Checkout: custom Stripe PaymentIntent flow with per-tenant Stripe credentials ✅
- Webhook: `checkouts/create` and `checkouts/update` handled with HMAC verification ✅
- A/B testing: deterministic hash → variant assignment → persisted in DB ✅
- Attribution tracking: UTM params + click IDs → `attribution_touchpoints` table (per-tenant) ✅
- Analytics: GA4 + Meta Pixel + TikTok Pixel orchestration ✅

#### What's broken / missing:
1. **`triggerProductSync()` is a no-op** (`commerce.ts` line ~114): Logs "Would sync product X" but never dispatches a job. Product catalog can become stale after new products are added in Shopify.

2. **Analytics pixels are hardcoded to env vars** (`analytics/ga4.ts`, `analytics/meta.ts`, `analytics/tiktok.ts`): `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID` are single global values. A multi-tenant deployment needs per-tenant pixel IDs loaded from `organizations.settings`.

3. **Stripe checkout is disconnected from Shopify order creation**: The custom checkout flow creates a Stripe PaymentIntent and stores to `carts` table, but there's no `/api/checkout/confirm-order` → Shopify order creation wiring visible. Checking the `confirm-order` route exists, but it's unclear if it creates a Shopify order or only a local DB order.

4. **Cart ID is not tied to tenant**: `cgk_cart_id` cookie stores a Shopify cart ID, but the Shopify cart belongs to a specific Shopify store. If a user visits multiple tenants, the cart ID from tenant A could be presented to tenant B's Shopify store (which would fail, but silently creates a new cart).

5. **Webhook `INTERNAL_API_KEY` not validated in development**: `validateInternalKey()` allows all requests when `INTERNAL_API_KEY` env var is not set, which means in dev anyone can call the domain-lookup API and discover tenant slugs by trying domains.

6. **No product webhook handlers**: There's only a `checkouts/` webhook. No `products/create`, `products/update`, `products/delete` webhooks — meaning local product DB only updates when a fallback lookup triggers `triggerProductSync()` (which is a no-op).

7. **No Shopify orders webhook**: Without a `orders/paid` webhook, order history in local DB relies on manual sync or checkout confirmation flow.

8. **A/B test results not linked to orders**: `trackConversion()` exists but there's no wiring between order confirmation and conversion tracking.

9. **`/d/[code]` discount link handler** exists but it's unclear if it validates the promo code against the correct tenant — could expose discount codes from one tenant to another if code is shared across tenants.

#### Gaps:
- [ ] **P0** Implement `triggerProductSync()` — dispatch actual background job via `sendJob('products.sync', { tenantSlug, handle })` instead of logging
- [ ] **P0** Register Shopify webhooks for `products/create`, `products/update`, `products/delete` per tenant and build handlers
- [ ] **P0** Register `orders/paid` webhook and build handler to write order to local DB + trigger post-purchase flows (loyalty points, referral credits)
- [ ] **P0** Fix analytics pixel IDs — load per-tenant pixel IDs from `organizations.settings` and inject into `<head>` via layout; use `NEXT_PUBLIC_` prefixed vars only as fallback for single-tenant deployments
- [ ] **P1** Audit `/api/checkout/confirm-order` — verify it creates a Shopify order (not just a local record), confirm payment intent is captured, confirm inventory is decremented
- [ ] **P1** Scope cart IDs to tenants — store `cgk_cart_id_{tenantSlug}` (or clear cart on tenant switch) to prevent cross-tenant cart ID collisions
- [ ] **P1** Wire order confirmation to A/B test conversion tracking — after successful payment, call `trackConversion()` for any active tests the visitor was in
- [ ] **P1** Validate discount codes in `/d/[code]` are scoped to the correct tenant before applying
- [ ] **P2** Add Shopify `app/uninstalled` webhook handler to deactivate tenant Shopify connection gracefully
- [ ] **P2** Build revalidation endpoint for ISR — when product data changes (via webhook), call `revalidateTag('products')` or similar to bust Next.js cache
- [ ] **P3** Implement server-sent events or WebSocket for real-time inventory status on PDP

---

## Super Admin Audit

### Status: ⛔ MISSING — Super admin storefront capabilities are essentially absent. The "Open Storefront" button in the orchestrator is broken. No preview mode, no cache flush, no cross-tenant configuration UI.

#### What exists:
- Orchestrator's brand detail page (`/brands/[id]/page.tsx`) has an "Open Storefront" button that opens `${NEXT_PUBLIC_STOREFRONT_URL}?tenant={brand.slug}` in a new tab
- Orchestrator has "View Logs" and "View Errors" buttons for per-tenant log inspection

#### What's broken:
1. **"Open Storefront" button is broken**: URL constructed as `?tenant={slug}` query param, but middleware does NOT read query params for tenant detection — only subdomain, `x-tenant-slug` header, or custom domain. The button opens the storefront with no tenant context (null → falls back to demo tenant in dev, or fails in production).

2. **No super admin preview mode**: No way for super admins to preview a tenant's storefront as a specific customer or as the tenant owner without setting up DNS/subdomain.

3. **No cache invalidation API**: No endpoint in the storefront to flush Next.js page cache (ISR tags) for a specific tenant when settings change.

4. **No storefront health endpoint**: No `/api/health` or `/api/status` that super admins can poll to verify a tenant's storefront is responding and properly configured.

5. **No cross-tenant settings UI**: Super admin cannot configure storefront settings (theme colors, feature flags, analytics pixels) from the orchestrator — must be done via direct DB manipulation.

6. **"Powered by CGK" footer is hardcoded** (`layout.tsx`): White-label tenants cannot remove this branding. No `settings.whiteLabel` check.

7. **No tenant impersonation**: No mechanism for super admin to load the storefront "as" a specific tenant for debugging without actual DNS setup.

#### Gaps:
- [ ] **P0** Fix "Open Storefront" button — use actual subdomain URL (`https://{slug}.cgk.com`) or pass `x-tenant-slug` header via a proxy/redirect flow rather than query param
- [ ] **P1** Build super admin preview mode — a URL like `https://storefront-admin.cgk.com/preview/{tenantSlug}` that sets a signed admin-preview cookie, then renders the storefront with correct tenant context; OR use Next.js preview mode
- [ ] **P1** Build cache invalidation API (`POST /api/admin/cache/revalidate`) protected by `INTERNAL_API_KEY`, called by orchestrator when tenant settings change
- [ ] **P1** Add storefront health check endpoint (`GET /api/health`) returning tenant DB connectivity, Shopify API connectivity, Stripe config status
- [ ] **P2** Build storefront settings panel in orchestrator — allow super admin to set per-tenant: GA4 ID, Meta Pixel ID, TikTok Pixel ID, feature flags, theme overrides
- [ ] **P2** Make "Powered by CGK" footer conditional on `tenant.settings.whiteLabel` flag — hide for white-label tenants
- [ ] **P2** Add storefront metrics dashboard per tenant in orchestrator — page load times, API error rates, checkout conversion rate
- [ ] **P3** Implement tenant impersonation URL with signed JWT — `GET /api/admin/impersonate/{tenantSlug}?token={signedToken}` that returns a session cookie scoped to that tenant for debug inspection
- [ ] **P3** Add audit log entries when super admin opens or previews a tenant's storefront

---

## Priority Summary

### P0 Critical:
1. **Fix middleware to inject `x-tenant-slug` header for `/api` routes** — currently all client-side account API calls return "Tenant not found"
2. **Build customer login/register/logout pages and endpoints** — no authentication flow exists at all
3. **Add auth guard to `account/layout.tsx`** — all account pages render to unauthenticated users
4. **Fix Shopify Storefront Access Token fallback to shared env var** — cross-tenant data exposure risk
5. **Register `products/*` and `orders/paid` Shopify webhooks + handlers** — product catalog and order DB are stale
6. **Implement `triggerProductSync()`** — currently a no-op, product cache never refreshes
7. **Fix analytics pixel IDs to be per-tenant** — all tenants share same GA4/Meta/TikTok IDs
8. **Fix "Open Storefront" button** — currently sends query param that middleware ignores

### P1 High:
1. Add session cookie security flags (HttpOnly, Secure, SameSite)
2. Implement Shopify Multipass SSO for checkout customer linking
3. Build custom domain DNS verification workflow
4. Add cache invalidation API for orchestrator to call on settings changes
5. Build cache invalidation Redis layer for middleware domain cache
6. Fix `feature_flag_overrides` tenant_id type comparison bug
7. Add `GET /api/account/features` auth check
8. Build super admin storefront preview mode
9. Add storefront health check endpoint
10. Replace in-memory domain cache with distributed cache

### P2 Medium:
1. Implement Google OAuth customer login
2. Add CSRF protection to mutating account API routes
3. Add rate limiting to auth endpoints
4. Create `store_credit_accounts` table (stop using gift card transactions as proxy)
5. Fix subscription orders to populate line items
6. Scope cart IDs per tenant to prevent collisions
7. Wire order confirmation to A/B test conversion tracking
8. Build storefront settings management panel in orchestrator
9. Make "Powered by CGK" footer conditional (white-label support)
10. Add tenant "suspended" status enforcement in middleware
11. Build storefront provisioning automation pipeline

### P3 Low:
1. Add account deletion endpoint (GDPR)
2. Replace `SELECT *` with explicit column lists in product queries
3. Fix N+1 query in `getProductsByHandles`
4. Implement Apple Sign In
5. Add "Remember Me" option for sessions
6. Build per-tenant A/B test result reporting in orchestrator
7. Document customer auth flow in CLAUDE.md
8. Add super admin audit log for tenant preview/impersonation
