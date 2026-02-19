# App Deep-Dive Audit: Shopify App
**Date:** 2026-02-19 | **App:** apps/shopify-app | **Auditor:** Automated Deep-Dive Agent

---

## Auth Audit

### Status: Partially Implemented — Core OAuth is solid; critical cross-system credential schism exists

The Shopify OAuth 2.0 flow is well-implemented in `packages/shopify/src/oauth/`. HMAC verification is correct and timing-safe (`verifyOAuthHmac` with `timingSafeEqual`). State/CSRF tokens are stored in `shopify_oauth_states` with 10-minute expiry. Shop domain normalization prevents `.myshopify.com` bypass.

**Critical finding**: Two parallel credential stores exist and are not synchronized:
1. **OLD system**: `organizations.shopify_store_domain` + `organizations.shopify_access_token_encrypted` (public schema)
2. **NEW system**: `shopify_connections.access_token_encrypted` (tenant schema, migration 021)

The new OAuth flow (`handleOAuthCallback`) writes ONLY to `shopify_connections`. But `getTenantForShop()` in `packages/shopify/src/webhooks/utils.ts` queries `organizations.shopify_store_domain` (old system). The health monitor (`packages/health/src/monitors/shopify.ts`) also reads from the old system. If a tenant connects via the new OAuth flow and `organizations.shopify_store_domain` is never set, **all webhooks silently fail** (returns 200 to Shopify with "Shop not registered").

**Additional gap**: `isValidOAuthTimestamp()` exists and is exported but is **never called** in `handleOAuthCallback`. Replay attacks are possible within the callback window since the timestamp is not validated against the current time.

**`grant_options[]=per-user`** is set in the OAuth URL — this means online (per-user session) tokens are requested rather than offline (persistent) tokens. This is inappropriate for a server-side app integration that needs long-lived access. Per-user tokens expire when the user session ends.

#### Gaps:
- [ ] **CRITICAL**: After successful OAuth callback, update `organizations.shopify_store_domain` to sync the new `shopify_connections` row with the legacy system, OR migrate `getTenantForShop()` to query `shopify_connections` directly (preferred)
- [ ] **CRITICAL**: Remove `grant_options[]=per-user` from `buildShopifyAuthUrl()` in `packages/shopify/src/oauth/initiate.ts` — server-side apps require offline (permanent) access tokens
- [ ] **HIGH**: Call `isValidOAuthTimestamp(timestamp)` inside `handleOAuthCallback()` before processing the callback to reject replayed requests
- [ ] **HIGH**: Migrate `packages/health/src/monitors/shopify.ts` to read from `shopify_connections` instead of `organizations.shopify_access_token_encrypted`
- [ ] **HIGH**: Migrate `packages/jobs/src/trigger/platform/health-check.ts` to read from `shopify_connections` (currently queries non-existent `shopify_access_token` column)
- [ ] **MEDIUM**: Add a migration to populate `shopify_connections` for any tenants that already have `organizations.shopify_access_token_encrypted` set (data migration for existing tenants)
- [ ] **MEDIUM**: Add `nonce` validation in `handleOAuthCallback` — the nonce is stored in `shopify_oauth_states` but never verified in the callback

---

## Permissions Audit

### Status: Overly broad scope set with no upgrade flow

The scope list in `packages/shopify/src/oauth/scopes.ts` and `shopify.app.toml` is extremely broad — 50+ scopes including `write_themes`, `write_markets`, `read_customer_payment_methods`, `read_own_subscription_contracts`, `write_cart_transforms`, and `write_gift_cards`. Many of these are not currently used by any handler or job.

`validateScopes()` only checks 4 critical scopes (`read_orders`, `read_products`, `read_customers`, `read_shop`) — a very low bar.

There is **no permissions upgrade flow** implemented. If a new scope needs to be added, there is no mechanism to detect that the existing token lacks it and prompt re-authorization.

The "limited permissions" UI hint in the admin page (`scopes.length < 10`) is a rough heuristic, not a proper scope comparison.

#### Gaps:
- [ ] **HIGH**: Audit and trim scopes to only what is actually used by current handlers/jobs. Remove: `write_themes`, `write_markets`, `write_cart_transforms`, `read_customer_payment_methods`, `read_customer_merge`, `read_own_subscription_contracts`, `write_own_subscription_contracts`, `write_files`, `read_legal_policies` unless each has a concrete near-term use case
- [ ] **HIGH**: Implement a scope upgrade detection flow: on `status` API call, compare stored scopes against `PLATFORM_SCOPES` and return `scopesMissing: true` with upgrade URL if gap exists
- [ ] **MEDIUM**: Update `validateScopes()` to check all scopes actually required by currently-deployed features, not just 4
- [ ] **MEDIUM**: Replace the `scopes.length < 10` heuristic in the admin UI with a proper set-difference check against `PLATFORM_SCOPES`
- [ ] **LOW**: Document each scope group in `scopes.ts` with the specific feature/handler that requires it

---

## Tenant Provisioning Audit

### Status: Minimal — OAuth creates one DB record, no post-install setup

When a new Shopify store installs the app (OAuth completes), `handleOAuthCallback` does:
1. Verifies HMAC and state
2. Exchanges code for token
3. Encrypts token
4. Upserts a row in `shopify_connections`
5. Calls `registerWebhooks()` (the REST-based version from `oauth/webhooks.ts`)

**What is missing from the install flow:**
- No update to `organizations.shopify_store_domain` (see Auth section)
- No fetch of shop metadata (store name, email, currency, timezone) to populate `shopify_connections.store_name`, etc.
- No initial data sync (historical orders, customers, products)
- No web pixel activation/install via Shopify Admin API
- No creation/validation of tenant DB schema (assumes schema already exists)
- No Storefront API token creation
- No notification to the platform/orchestrator that a new store connected
- The `registerWebhooks()` called in callback uses the **old REST API version** (`oauth/webhooks.ts`), not the newer GraphQL version (`webhooks/register.ts`) — these are two different implementations and the newer one also stores `webhook_registrations` DB records

The `app/uninstalled` webhook handler in `handlers/app.ts` clears credentials but has a `// TODO: Trigger dedicated app-disconnect cleanup job once created` comment — no cleanup job exists.

There is no graceful re-install flow detection. The `ON CONFLICT DO UPDATE` in the callback handles re-connection but doesn't handle cases where the shop domain changed or was previously connected under a different tenant.

#### Gaps:
- [ ] **CRITICAL**: In `handleOAuthCallback`, after storing credentials, call Shopify Admin API to fetch shop metadata and populate `shopify_connections.store_name`, `store_email`, `store_currency`, `store_timezone`, `store_domain`
- [ ] **CRITICAL**: In `handleOAuthCallback`, also update `organizations.shopify_store_domain` to keep both systems in sync
- [ ] **HIGH**: Replace REST-based `registerWebhooks()` call in callback route with the GraphQL-based `registerWebhooks()` from `webhooks/register.ts` (which also persists `webhook_registrations` records)
- [ ] **HIGH**: Trigger a background job after OAuth for initial data sync: import recent orders (last 90 days), customers, and products from Shopify
- [ ] **HIGH**: Create and implement the `app-disconnect` cleanup job referenced in `handlers/app.ts` TODO — should clear orders cache, deactivate web pixel, cancel scheduled jobs for the tenant
- [ ] **HIGH**: Add web pixel activation call in the install flow: create the pixel subscription via Admin API and set `pixel_id` + `pixel_active = true` on `shopify_connections`
- [ ] **MEDIUM**: Detect re-installation scenario: if `shopify_connections` already has a row with `status = 'disconnected'` for this shop, trigger a re-install flow with fresh webhook registration instead of silent upsert
- [ ] **MEDIUM**: Add Storefront API token creation in the install flow and store as `storefront_api_token_encrypted`
- [ ] **LOW**: Add platform notification (e.g., Slack/internal alert) when a new store connects or disconnects

---

## OAuth & Token Management Audit

### Status: Strong encryption; no token refresh; dangerous per-user mode

**What's good:**
- AES-256-GCM encryption with random IV per token — correctly implemented in `encryption.ts`
- `SHOPIFY_TOKEN_ENCRYPTION_KEY` env var validated for 64-char hex (32 bytes)
- Auth tag verified on decryption (GCM provides authenticated encryption)
- Token format `iv:authTag:cipherText` is sound

**Critical gaps:**
- **`grant_options[]=per-user`**: As noted in Auth section, this requests short-lived online tokens. For a persistent integration app, this is wrong. The token will expire when the Shopify user session ends, breaking all API calls and webhooks.
- **No token refresh mechanism**: There is no `refresh_token` in Shopify's OAuth (tokens don't expire for offline access mode), but if using online mode, there is no handling for 401 responses on API calls and no re-auth trigger.
- **`webhook_secret_encrypted` is never populated**: `handleOAuthCallback` never sets `webhook_secret_encrypted` in `shopify_connections`. Shopify returns a `webhook_secret` when registering webhooks via the Admin API, but there's no code to store it. The webhook handler falls back to `SHOPIFY_CLIENT_SECRET` (the app-wide secret) for HMAC verification — this is a shared secret across all tenants instead of per-installation secrets.
- **Webhook sync route uses wrong column name**: `apps/admin/src/app/api/admin/integrations/shopify/webhooks/sync/route.ts` queries `SELECT shop, access_token, webhook_secret` but the column is `access_token_encrypted` — this query returns null/undefined for `access_token`, causing sync to pass an encrypted or null token to `syncWebhookRegistrations` and break authentication with Shopify API.
- **Credentials are cached in Redis for 60 seconds**: If a token is rotated/revoked and cache isn't cleared, stale tokens will be used for up to 60 seconds. `clearCredentialsCache` exists but not all revocation paths call it.

#### Gaps:
- [ ] **CRITICAL**: Remove `grant_options[]=per-user` from OAuth URL to request permanent offline access tokens
- [ ] **CRITICAL**: Fix `webhook sync route` — change `SELECT shop, access_token, webhook_secret` to `SELECT shop, access_token_encrypted, webhook_secret_encrypted` and decrypt before use
- [ ] **HIGH**: Populate `webhook_secret_encrypted` during OAuth callback — store the app client secret (or per-webhook secret from registration) encrypted; do not rely on `SHOPIFY_CLIENT_SECRET` as a fallback across all tenants
- [ ] **HIGH**: Add 401 detection in Shopify API calls that triggers credential re-validation and sets `shopify_connections.status = 'suspended'` to prevent repeated failed API calls
- [ ] **MEDIUM**: Add `clearCredentialsCache()` call in the `app/uninstalled` webhook handler to immediately invalidate cached tokens on uninstall
- [ ] **MEDIUM**: Audit all code paths that might invalidate a token (manual disconnect, status suspension) and ensure `clearCredentialsCache()` is called in each
- [ ] **LOW**: Document the expected token lifecycle: offline tokens don't expire (only revoked on uninstall), which makes the 60s cache reasonable — clarify this in code comments

---

## Database & Schema Audit

### Status: Tenant isolation architecture is correct but two credential systems are dangerously diverged

**Schema overview (relevant tables, all in tenant schema):**
- `shopify_connections` (migration 021): tenant-scoped, has `tenant_id` FK, `access_token_encrypted`, `webhook_secret_encrypted`, `status`, health tracking — **correct multi-tenant design**
- `shopify_oauth_states` (migration 021): tenant-scoped, 10-min expiry, `UNIQUE(state)` — correct
- `webhook_events` (migration 015): `tenant_id` column added via migration 021 ALTER, but `shop` field is the primary filter — records are correctly isolated via `withTenant()`
- `webhook_registrations` (migration 015): same pattern — `tenant_id` added via ALTER
- `shopify_rate_limits` (migration 021): tenant-scoped, compound unique on `(tenant_id, shop, endpoint)` — correct

**Critical schema gaps:**
- **`organizations` table (public schema)**: still has `shopify_store_domain` and `shopify_access_token_encrypted` columns that shadow the new `shopify_connections` table. Code in health checks and webhook routing still reads from the old system. This creates two sources of truth.
- **`webhook_events.tenant_id` is nullable**: Added via `DO $$ BEGIN IF NOT EXISTS... ALTER TABLE webhook_events ADD COLUMN tenant_id UUID` — no NOT NULL constraint, no FK constraint. Old webhook events have no tenant_id.
- **`webhook_registrations.tenant_id` is nullable**: Same issue.
- **Cross-tenant webhook query**: `getTenantForShop()` in `webhooks/utils.ts` queries `organizations.shopify_store_domain` without `withTenant()` — this is a public schema query which is fine, but the column may not be populated for new OAuth connections (see Auth section). If wrong, webhooks route to wrong tenant.
- **`getShopifyCredentials()` in `webhooks/utils.ts`** queries `shopify_connections` WITHOUT `withTenant()` and WITHOUT a schema prefix — this relies on the global `sql` connection. Depending on DB config, this could query across tenants. Should use `withTenant(tenantId)`.
- **Old migration 015 `shopify_connections`**: Migration 015 creates a `shopify_connections` table WITHOUT `tenant_id`, then migration 021 DROPS and RECREATES it with `tenant_id`. This cascade drop is dangerous if run on a populated DB with foreign key references.

#### Gaps:
- [ ] **CRITICAL**: Migrate `getTenantForShop()` in `webhooks/utils.ts` to query `shopify_connections` (tenant schema) rather than `organizations.shopify_store_domain` — requires iterating active tenants or maintaining an index table
- [ ] **CRITICAL**: Fix `getShopifyCredentials()` in `webhooks/utils.ts` to wrap the query with `withTenant(tenantId)` to ensure proper schema isolation
- [ ] **HIGH**: Add `NOT NULL` and `FOREIGN KEY` constraints on `webhook_events.tenant_id` and `webhook_registrations.tenant_id` via a new migration (backfill from `shop` column via `shopify_connections` first)
- [ ] **HIGH**: Create a cross-tenant shop-to-tenant lookup table in the public schema (e.g., `public.shopify_shop_tenant_map`) that maps `shop domain → tenant_id` for O(1) webhook routing without needing `withTenant` context
- [ ] **HIGH**: Deprecation plan for `organizations.shopify_store_domain` and `organizations.shopify_access_token_encrypted` — migrate all code to use `shopify_connections` then remove old columns
- [ ] **MEDIUM**: Add a migration to backfill `webhook_events.tenant_id` and `webhook_registrations.tenant_id` from the `shopify_connections` table via shop domain match
- [ ] **LOW**: Add a guard in migration 021 DROP CASCADE to check for existing data before dropping `shopify_connections`, or rename rather than drop+recreate

---

## Webhook & Wiring Audit

### Status: Core webhooks functional; product/inventory/GDPR handlers missing; two duplicate webhook systems exist

**Registered topics in `shopify.app.toml`**: orders/create, orders/updated, orders/paid, orders/cancelled, fulfillments/create, fulfillments/update, refunds/create, products/create, products/update, products/delete, customers/create, customers/update, app/uninstalled + GDPR compliance topics

**Topics in `webhooks/register.ts` REQUIRED_TOPICS**: orders/create, orders/updated, orders/paid, orders/cancelled, orders/fulfilled, refunds/create, fulfillments/create, fulfillments/update, customers/create, customers/update, app/uninstalled — notably **missing products/** and **missing GDPR compliance topics**

**Handlers registered in `webhooks/router.ts`**:
- ✅ orders/create, orders/updated, orders/paid, orders/cancelled, orders/fulfilled → orders.ts
- ✅ refunds/create → refunds.ts
- ✅ fulfillments/create, fulfillments/update → fulfillments.ts
- ✅ customers/create, customers/update → customers.ts
- ✅ app/uninstalled → app.ts
- ❌ **products/create, products/update, products/delete** — topics registered in `shopify.app.toml` but **NO handler registered in router**. Webhooks arrive, pass HMAC check, route to `routeToHandler()`, get logged to DB, then silently dropped with "No handler registered for topic: products/create"
- ❌ **customers/delete** — in WEBHOOK_TOPICS list but no handler, silently dropped
- ❌ **inventory_levels/update** — in WEBHOOK_TOPICS list but no handler
- ❌ **GDPR compliance topics** (customers/data_request, customers/redact, shop/redact) — declared in `shopify.app.toml` as `compliance_topics` but no handler code exists anywhere. Shopify requires GDPR compliance webhooks to return 200 quickly — currently no route exists for these at all.

**Two webhook registration systems (dangerous duplication):**
1. `packages/shopify/src/oauth/webhooks.ts` — REST API, used by OAuth callback route
2. `packages/shopify/src/webhooks/register.ts` — GraphQL API, used by sync route. Stores `webhook_registrations` DB records.

These can produce duplicate webhook subscriptions in Shopify if both are called, or can leave orphaned registrations if only one is used. The sync/health APIs work with the GraphQL system but the install flow uses the REST system.

**Two webhook handler systems:**
1. `packages/shopify/src/oauth/webhooks.ts` `handleWebhook()` — older, simpler, no idempotency, no DB logging
2. `packages/shopify/src/webhooks/handler.ts` `handleShopifyWebhook()` — newer, has idempotency, DB logging, retry support

The admin app has TWO webhook endpoints: `/api/shopify/webhooks/route.ts` and `/api/webhooks/shopify/route.ts` — both call `handleShopifyWebhook()` (newer system). The old handler from `oauth/webhooks.ts` is not wired to any route, but `registerWebhooks()` from the REST system registers webhook URLs pointing to `/api/shopify/webhooks/${topic.replace('/', '-')}` (per-topic URLs that don't exist as routes).

**Extension wiring:**
- Session-stitching pixel: well-implemented, handles checkout events and sends GA4/Meta CAPI events. Extension settings (GA4 measurement ID, API secret, Meta pixel ID, CAPI token) must be manually configured per-store via Shopify Partners — no programmatic config flow from the CGK admin UI.
- Delivery customization (Rust function): correctly reads `cart.shipping_variant` attribute and hides/shows shipping options. Solid implementation.
- Post-purchase survey: exists as an extension entry point but survey config must come from `surveyConfigUrl` — no backend survey collection endpoint documented or implemented.

**Data flow gaps:**
- No product catalog sync handler — `products/` webhooks arrive but are silently discarded. No `products` table updates happen via webhook.
- `orders/create` triggers `commerce-order-attribution`, `commerce-order-commission`, and `commerce-handle-order-created` Trigger.dev jobs — this is correct but `sessionId` is always `null` in the attribution payload (comment says "should be extracted from note attributes").
- `customers/delete` not handled — deleted customers remain in the local `customers` table indefinitely.
- No `inventory_levels/update` handler — inventory changes are not reflected in the platform.

#### Gaps:
- [ ] **CRITICAL**: Implement GDPR compliance webhook handlers for `customers/data_request`, `customers/redact`, and `shop/redact` — create an API route at the expected path and respond 200 quickly, then async-process the data deletion/export request. Shopify will suspend the app if these return non-200.
- [ ] **CRITICAL**: Create `handlers/products.ts` with `handleProductCreate`, `handleProductUpdate`, `handleProductDelete` functions and register them in `router.ts`. Write synced data to a `products` table or call existing product sync job.
- [ ] **CRITICAL**: Consolidate the two webhook registration systems — deprecate REST-based `oauth/webhooks.ts`'s `registerWebhooks` and update the OAuth callback route to call the GraphQL-based `webhooks/register.ts` version
- [ ] **HIGH**: Fix `registerWebhooks()` in `oauth/webhooks.ts` — it constructs per-topic URLs like `/api/shopify/webhooks/orders-create` that don't exist as routes. All webhooks should point to the single endpoint `/api/webhooks/shopify`.
- [ ] **HIGH**: Implement `customers/delete` handler — delete or anonymize the customer record from the local DB
- [ ] **HIGH**: Implement `inventory_levels/update` handler — update product inventory counts in platform
- [ ] **HIGH**: Add post-purchase survey submission endpoint and DB table to collect survey responses from the extension
- [ ] **HIGH**: Add programmatic pixel configuration endpoint — allow merchants to configure session-stitching pixel settings (GA4 ID, Meta pixel ID) from CGK admin UI via Shopify Admin API `webPixelCreate` mutation, not just manual Partners setup
- [ ] **MEDIUM**: Extract `sessionId` from Shopify order `note_attributes` in `handleOrderCreate` — the cart/checkout pixel should be writing session IDs to note attributes; order attribution will be wrong without it
- [ ] **MEDIUM**: Remove duplicate webhook endpoint `/api/shopify/webhooks/route.ts` — keep only `/api/webhooks/shopify/route.ts` and update all Shopify webhook registrations to point there
- [ ] **LOW**: Add `subscribe_to_cart_events` to REQUIRED_TOPICS for abandoned cart tracking (currently in OPTIONAL_TOPICS but not registered on install)

---

## Super Admin Audit

### Status: Basic Shopify visibility exists in orchestrator; no dedicated Shopify admin tools; health hardcoded

**What exists:**
- `apps/orchestrator/src/app/api/platform/overview/brands/route.ts`: Super admin can see all brands with `shopifyConnected: !!(org.shopify_store_domain)` — but this is based on the old `organizations.shopify_store_domain` field, not the actual `shopify_connections` table
- `apps/admin` webhook health dashboard (`/admin/integrations/shopify-app/webhooks`): Per-tenant webhook health, failed event list, manual retry, webhook sync — good tooling, but only visible to the tenant's own admin, not to super admin
- `apps/orchestrator/src/app/api/platform/health/route.ts` legacy format: hardcodes `shopify: 'healthy'` regardless of actual connection state — misleading
- `apps/orchestrator/src/app/(dashboard)/brands/[id]/page.tsx`: Shows `ShopifyConnected: true/false` — but based on stale `shopify_store_domain` field

**What's missing:**
- No cross-tenant Shopify connection status dashboard in orchestrator (which tenants have active connections, which are broken/suspended)
- No super admin ability to see which stores have `status = 'suspended'` or `last_webhook_at` more than N hours ago
- No super admin webhook failure rate dashboard across all tenants
- No super admin "force re-sync" capability (orchestrator has no Shopify-scoped trigger endpoints)
- The orchestrator health matrix (`/api/platform/health/matrix`) includes 'shopify' as a service but doesn't use `shopify_connections` to check per-tenant auth health
- No alert rule for "webhook not received in 6+ hours" across tenants

#### Gaps:
- [ ] **HIGH**: Fix `shopifyConnected` in orchestrator brands API — query `shopify_connections` table per-tenant instead of relying on `organizations.shopify_store_domain`. Show `status` (active/suspended/disconnected), `last_webhook_at`, `token_valid` (from health check)
- [ ] **HIGH**: Fix `shopify: 'healthy' as const` hardcode in `platform/health/route.ts` — replace with actual aggregated health from `shopify_connections.status` across all tenants
- [ ] **HIGH**: Build a super admin Shopify integrations page in orchestrator at `/integrations/shopify` showing: all connected stores, connection status, last webhook received, failed webhook count (24h), token validity. Scope to super admin only.
- [ ] **HIGH**: Add Shopify monitor to the health matrix — run `checkConnectionHealth()` per-tenant as part of the health check scheduled job, cache result, expose in `/api/platform/health/matrix`
- [ ] **MEDIUM**: Add super admin endpoint `POST /api/platform/brands/[id]/shopify/force-sync` that triggers a full order/customer sync job for a specific tenant
- [ ] **MEDIUM**: Add super admin endpoint `GET /api/platform/shopify/broken-auths` that returns tenants where `shopify_connections.status != 'active'` or token health check fails
- [ ] **MEDIUM**: Create alert rule: if `webhook_events` has 0 `completed` rows and >0 `failed` rows in last 4 hours for a tenant, fire platform alert
- [ ] **LOW**: Add "Re-register webhooks" action to the super admin brand detail page, scoped to super admins with admin-impersonation token

---

## Priority Summary

### P0 Critical (Data integrity / security breach risk / app rejection):
- GDPR compliance webhooks (`customers/data_request`, `customers/redact`, `shop/redact`) have no handlers — Shopify will suspend app for non-compliance
- `grant_options[]=per-user` requesting online tokens for a persistent integration — tokens expire and break all API calls
- Webhook HMAC verification falls back to `SHOPIFY_CLIENT_SECRET` (shared secret) when `webhook_secret_encrypted` is NULL — all tenants share the same secret, meaning any tenant's webhook secret exposure breaks all tenants
- `getTenantForShop()` queries old `organizations` table that is never populated by new OAuth flow — all webhooks from new installs silently fail

### P1 High (Broken functionality / data loss):
- `access_token` column reference in webhook sync route (should be `access_token_encrypted`) — webhook re-registration fails silently
- Products webhook topics registered in `shopify.app.toml` but no handler — product catalog never syncs
- Two webhook registration systems (REST vs GraphQL) creating potential duplicate subscriptions or orphaned registrations
- `isValidOAuthTimestamp()` implemented but never called — replay attack window exists
- Initial install flow doesn't fetch store metadata, trigger historical sync, or activate web pixel
- `getShopifyCredentials()` in `webhooks/utils.ts` queries outside of `withTenant()` — potential cross-schema query

### P2 Medium (Missing features / degraded monitoring):
- No `customers/delete` handler — GDPR data persistence risk
- No `inventory_levels/update` handler — inventory data stale
- `sessionId` always null in order attribution — attribution accuracy degraded
- Super admin orchestrator `shopifyConnected` based on stale field — shows wrong connection state
- Platform health hardcodes shopify as 'healthy' regardless of actual state
- `webhook_events.tenant_id` and `webhook_registrations.tenant_id` are nullable — no FK enforcement

### P3 Low (Tech debt / minor improvements):
- Two webhook endpoint routes in admin app (`/api/shopify/webhooks` and `/api/webhooks/shopify`) — cleanup needed
- 50+ scopes requested; many unused — violates Shopify's least-privilege recommendation
- No scope upgrade flow for new permissions
- Post-purchase survey has no backend collection endpoint
- Extension pixel settings not configurable via CGK admin UI (manual Partners setup only)
- No alert rule for webhook failure rate degradation
