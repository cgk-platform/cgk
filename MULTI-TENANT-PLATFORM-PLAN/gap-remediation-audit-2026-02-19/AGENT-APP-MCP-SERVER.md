# App Deep-Dive Audit: MCP Server
**Date:** 2026-02-19 | **App:** apps/mcp-server + packages/mcp

---

## Auth Audit

### Status: Partially implemented — three auth mechanisms exist, but a critical API key table mismatch means tenant-provisioned keys don't actually work for MCP auth

The MCP route (`/api/mcp`) calls `authenticateRequest()` on every request, which supports three methods:

1. **Bearer JWT** — validates via `@cgk-platform/auth`'s `verifyJWT`. JWT must have `sub` (userId) and `orgId` (tenantId) claims. Issued by the OAuth token endpoint with `type: 'mcp_access'`.
2. **API Key (`X-API-Key` header)** — format `cgk_{tenant_slug}_{uuid}_{secret}`. Hashed with SHA-256, looked up in **`public.api_keys`** table joined to `organizations`.
3. **Session Cookie** (`cgk-auth=...`) — re-uses JWT path.

**Critical disconnect:** The admin UI creates MCP API keys in the **tenant-schema `mcp_api_keys` table** (via `apps/admin/src/app/api/admin/mcp/keys/route.ts` using `withTenant()`), but `authenticateRequest()` queries **`public.api_keys`** — a completely different table. Keys created through the admin MCP panel are therefore **never validated** and silently rejected as "Invalid API key." Tenants who follow the documented provisioning path can't connect.

**OAuth JWT path is the only fully working auth method.** The in-process JWT default secret `development-secret-change-in-production` is a fallback risk if `JWT_SECRET` env var is not set — env validation (`ensureEnvValidated()`) is lazy and only catches this on first request.

`validateTenantAccess()` is a stub that always returns `true`. No cross-tenant membership check is performed after JWT decode.

#### Gaps:
- [ ] **P0 CRITICAL — Fix API key table mismatch**: `authenticateAPIKey()` queries `public.api_keys`; admin UI creates in tenant `mcp_api_keys`. Either: (a) migrate auth to query tenant `mcp_api_keys` via `withTenant(tenantSlug)`, or (b) have admin UI insert into `public.api_keys`. Decision needed, then implement consistently.
- [ ] **P0 — Implement `validateTenantAccess()`**: Currently a stub returning `true`. Must query `user_organizations` (or equivalent) to confirm the JWT's `orgId` actually corresponds to an organization the user belongs to. Without this, a stolen JWT from Tenant A can call Tenant B's tools if the attacker guesses the tenant slug.
- [ ] **P1 — Add `mcp_api_keys` scopes column to admin creation**: The admin `POST /api/admin/mcp/keys` route creates keys with no `permissions` column (it even re-creates the table without the `permissions` field from migration 053). Add scope support at creation time.
- [ ] **P1 — Enforce `JWT_SECRET` at startup**, not lazily: move `validateEnv()` to module load time for the mcp-server app (or fail hard in middleware on first request).
- [ ] **P2 — Add API key rate limiting per key**: The `api_keys` table has a `rate_limit_per_minute` column; it is never read or enforced during auth.
- [ ] **P2 — Log failed auth attempts** to `platform_logs` with tenant context for security monitoring.
- [ ] **P3 — Session cookie auth**: Only usable from browser; consider deprecating or documenting this is for the OAuth login flow only, not for AI clients.

---

## Permissions Audit

### Status: Tenant isolation is solid via `withTenant()`, but admin-only tools are NOT enforced at runtime — `requiresAdmin` annotations are metadata only

**Tenant isolation (GOOD):** `MCPHandler.callTool()` forcibly injects `_tenantId` and `_userId` from the authenticated session into tool args, overwriting any client-supplied values. All 84 tool handlers extract `args._tenantId` and pass it into `withTenant()`, which sets the Postgres `app.tenant_id` session var so RLS/schema routing applies. Cross-tenant data access is effectively blocked at the DB layer.

**Admin enforcement (MISSING):** `toolAnnotations` in `packages/mcp/src/tools/index.ts` marks 9 tools as `requiresAdmin: true`:
- `approve_creator`, `reject_creator` (Creator approval)
- `initiate_payout` (Financial: sends money to creators)
- `update_tenant_config`, `toggle_feature_flag` (Config changes)
- `update_user_role`, `invite_user` (IAM mutation)
- `clear_cache` (Ops)

The main route handler (`apps/mcp-server/src/app/api/mcp/route.ts`) calls `checkRateLimit()` but **never calls `getToolAnnotations()` or `checkMCPPermission()`**. `checkMCPPermission()` is implemented in `lib/auth.ts` but never called. Any authenticated user — including one with a read-only scope — can currently call `initiate_payout` or `update_user_role`.

**Scope enforcement (MISSING):** OAuth tokens carry `scope` claims (e.g., `read write admin analytics creators system`), and the token endpoint validates scope downgrade on refresh. But the MCP route handler **never checks the scope against the requested tool** before execution. A token with only `read` scope can freely call `cancel_order` or `update_inventory`.

**`getToolsForTenant()` (EXISTS but unused):** `packages/mcp/src/tools/index.ts` has a full `getToolsForTenant(tenantConfig)` filter function that checks feature flags (Shopify, Stripe, creators enabled). This is not wired into the MCP handler's tool registration — all 84 tools are registered unconditionally.

#### Gaps:
- [ ] **P0 CRITICAL — Enforce `requiresAdmin` at tool dispatch**: In `MCPHandler.callTool()` (or the route handler), call `getToolAnnotations(name)` and if `requiresAdmin: true`, verify the user's role from the JWT/DB before executing.
- [ ] **P0 CRITICAL — Enforce OAuth scopes at tool dispatch**: Map each tool to required scopes (`write` for mutations, `admin` for admin tools, etc.). Check `auth.scopes` (from JWT) against required scope before executing the tool. Return `PERMISSION_DENIED` JSON-RPC error if scope mismatch.
- [ ] **P1 — Wire `getToolsForTenant()` into handler registration**: At handler init time, fetch tenant config and call `getToolsForTenant(tenantConfig)` to filter tools. Don't expose tools for disabled features (e.g., Stripe/payout tools if Stripe not enabled).
- [ ] **P1 — Scope-filtered tool listing**: `MCPHandler.listTools()` should return only the tools the authenticated token's scope allows, not all registered tools.
- [ ] **P2 — Per-tool permission audit log**: Write to an audit table every time a `requiresAdmin` or `destructive` tool is called, even if allowed.
- [ ] **P2 — Content tools permission check**: `delete_brand_document`, `delete_creative_idea` are destructive but not marked `requiresAdmin` — decide if they should be member-accessible or require write scope.

---

## Tenant Provisioning Audit

### Status: Schema and UI exist but the provisioning path is broken due to the API key table mismatch

**What exists:**
- `public.oauth_clients` table with `organization_id` FK — tenants can register OAuth clients (for Claude Connector)
- Tenant `mcp_api_keys` table (migration 053) with name/hash/prefix/permissions/rate_limit
- Admin UI (`apps/admin`) has MCP integration page with API key creation UI
- `getToolsForTenant()` function for capability gating per tenant
- Redis rate limit config (`mcp:ratelimit:config:{tenantId}`) settable per tenant

**What's broken / missing:**
- API key creation in admin UI inserts into tenant schema, but auth reads from `public.api_keys` → keys don't work (see Auth audit)
- No admin UI for OAuth client registration — tenants can't self-service register OAuth clients for Claude Connector
- No provisioning wizard that walks through: create OAuth client → set allowed_redirect_uris → test connection
- `mcp_api_keys.permissions` JSONB column exists in migration 053 but the admin `POST /keys` route creates a simplified table without this column, and the auth code never reads permissions
- No webhook/callback after MCP access is enabled in the onboarding wizard (step-6 has `ai.mcp_enabled` flag but no downstream provisioning)

#### Gaps:
- [ ] **P0 — Fix provisioning path**: Make admin key creation write to the right table (see Auth gap). Then end-to-end test: create key → use in Claude Desktop → tools execute.
- [ ] **P1 — Admin UI for OAuth client registration**: Build UI to create `oauth_clients` record with `client_id`, allowed `redirect_uris`, and `allowed_scopes`. Needed for Claude Connector integration.
- [ ] **P1 — Scope selection at provisioning time**: When creating an API key or OAuth client, let admin select which scopes/tool categories to grant. Store in `mcp_api_keys.permissions` or `oauth_clients.allowed_scopes`.
- [ ] **P2 — MCP onboarding step**: The brand wizard step-6 enables `ai.mcp_enabled` flag but doesn't auto-provision an OAuth client or API key. Add provisioning trigger.
- [ ] **P2 — Connection tester in admin UI**: Add a "Test MCP Connection" button that calls the MCP `ping` endpoint with the tenant's key to verify end-to-end.
- [ ] **P3 — Expiry and rotation policy**: API keys have `expires_at` but no enforced rotation policy or expiry reminder notifications.

---

## OAuth & Integrations Audit

### Status: Well-implemented OAuth 2.0 + PKCE flow. Scopes defined but not enforced. Missing client self-service UI.

**What's built (solid):**
- `GET /api/mcp/oauth/authorize` — validates request, stores auth code, redirects to `/auth/oauth/login`
- `POST /api/mcp/oauth/authorize` — login page calls this after auth to complete flow
- `POST /api/mcp/oauth/token` — exchanges auth code (with PKCE S256 verification) for JWT access token + refresh token
- Refresh token rotation on every refresh (old token revoked, new one issued)
- Replay attack protection (auth codes marked `used_at`, revoke all tokens if reused)
- Scope downgrade validated on refresh (`requested ⊆ original`)
- `GET /api/mcp/manifest` — returns server manifest with OAuth endpoints for Claude Connector discovery, unauthenticated (intentionally public)

**Concerns:**
- `oauth_clients` is in `public` schema — a client belongs to one org via `organization_id` but there is no check that the OAuth token returned after auth is scoped to the org that owns the client. The `tenant_id` in the auth code comes from the client lookup (`client.tenant_slug`), which is correct, but the POST handler also accepts a `tenant_id` parameter from the login page — could be tampered with.
- Wildcard redirect URI support (`https://*.claude.ai/callback`) — the wildcard regex is simple `[^/]+` which is broad; could permit `https://evil.claude.ai.attacker.com/callback` if not anchored properly.
- OAuth tokens use HS256 with a symmetric `JWT_SECRET` — no key rotation mechanism.
- No token introspection endpoint (`/api/mcp/oauth/introspect`) for resource server validation.
- No token revocation endpoint (`/api/mcp/oauth/revoke`) — users can't invalidate active tokens.
- No MCP-specific `/.well-known/openid-configuration` or `/.well-known/oauth-authorization-server` endpoint for automated discovery.

#### Gaps:
- [ ] **P0 — Fix redirect URI wildcard regex**: Change `pattern.replace(/\*/g, '[^/]+')` to `'^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^./]+') + '$'` to prevent subdomain takeover attacks.
- [ ] **P0 — Validate `tenant_id` in auth POST handler**: When the login page POSTs to complete auth, do NOT trust the `tenant_id` body param to override the one stored in `oauth_authorization_codes`. Only update `user_id`, not `tenant_id`.
- [ ] **P1 — Add OAuth token revocation endpoint** (`POST /api/mcp/oauth/revoke`, RFC 7009): Allow users to revoke refresh tokens when disconnecting Claude Connector.
- [ ] **P1 — Add `/.well-known/oauth-authorization-server` discovery endpoint** for Claude MCP spec compliance.
- [ ] **P2 — Add token introspection** (`POST /api/mcp/oauth/introspect`, RFC 7662) for future resource server use.
- [ ] **P2 — JWT key rotation**: Move from HS256 symmetric to RS256 asymmetric, or add a key rotation mechanism for `JWT_SECRET`.
- [ ] **P2 — Cleanup job for expired OAuth codes/tokens**: `oauth_authorization_codes` with `expires_at` in the past accumulate indefinitely. Add a cron to purge them.
- [ ] **P3 — Consent screen**: The current flow redirects to a generic login page. Add an explicit OAuth consent/permissions screen showing what scopes are being granted.

---

## Database & Schema Audit

### Status: Core tool tables are properly tenant-scoped via `withTenant()`. OAuth tables are in `public` schema (correct). One critical missing table: `mcp_usage`.

**Tables queried by MCP tools:**

| Table | Schema | Tenant-scoped? | Tools |
|---|---|---|---|
| `orders` | tenant | ✅ via `withTenant()` | list_orders, get_order, search_orders, update_order_status, cancel_order |
| `customers` | tenant | ✅ via `withTenant()` | list/get/search_customers, get_customer_orders |
| `products` | tenant | ✅ via `withTenant()` | list/get/update_product, sync_product, get/update_inventory |
| `public.api_keys` | public | ✅ (joins to `organizations` to validate tenant) | auth only |
| `public.organizations` | public | ✅ (join) | auth only |
| `public.oauth_clients` | public | ✅ (by `organization_id`) | OAuth flow |
| `public.oauth_authorization_codes` | public | ✅ (by code lookup) | OAuth flow |
| `public.oauth_refresh_tokens` | public | ✅ (by token hash) | OAuth flow |
| `mcp_api_keys` | tenant | ✅ via `withTenant()` | admin UI (but not auth!) |
| `mcp_usage` | tenant | ❌ **TABLE DOES NOT EXIST** | analytics route |

**`mcp_usage` is entirely missing from migrations.** The admin analytics route checks `information_schema.tables` for `mcp_usage` and gracefully returns zeros if absent, but the table is never created. MCP tool call logging never writes to it. This means usage tracking/analytics are non-functional.

**System tools** (analytics.ts, content.ts, creators.ts, system.ts) also query tables like `ab_tests`, `creators`, `projects`, `payouts`, `brand_documents`, `creative_ideas`, `notifications`, `users`, `audit_logs`, `feature_flags`, `tenant_config` — all accessed via `withTenant()`. These appear tenant-scoped but should be individually verified to ensure no `JOIN` to a global table leaks cross-tenant data.

**In-memory usage log** (`packages/mcp/src/session.ts` `tokenUsageLog` Map): This stores up to 1000 entries per tenant in-process memory. On Edge/serverless, this is per-isolate and non-persistent — no durability, not observable by super admin, lost on restart.

#### Gaps:
- [ ] **P0 — Create `mcp_usage` migration**: Add `packages/db/src/migrations/tenant/060_mcp_usage.sql` with columns: `id`, `session_id`, `tool_name`, `category`, `status` (success/error), `duration_ms`, `tokens_used`, `error_message`, `created_at`. Ensure `mcp_usage` is written after every tool call in `MCPHandler.callTool()`.
- [ ] **P1 — Write tool call events to `mcp_usage`**: Modify `startUsageTracking()` (or the route handler) to persist completed events to `mcp_usage` in addition to in-memory log.
- [ ] **P1 — Verify system/analytics/creators tools for cross-tenant JOIN risk**: Audit each of the 20 system tools and 19 analytics tools to confirm no raw `sql` call without `withTenant()`.
- [ ] **P2 — Add DB-level indices on `mcp_usage`**: Index on `created_at`, `tool_name`, `status` for analytics queries.
- [ ] **P2 — Persist rate limit config to DB**: Currently rate limit config lives in Redis only. Add a `mcp_rate_limit_config` tenant column or table so it survives Redis flushes and is visible/editable in the admin UI.
- [ ] **P3 — Add cleanup cron for `oauth_authorization_codes`** older than 24h (10-min TTL codes accumulate; just checking `used_at IS NOT NULL` or `expires_at < NOW()` periodically).
- [ ] **P3 — Add index on `oauth_authorization_codes(expires_at)`** to speed up cleanup queries (already exists in migration — verify it's applied).

---

## Package Wiring Audit

### Status: Core tool packages are registered and functional. Several integrations are stubs. AI-agents, content-generation, and MMM packages are NOT wired to MCP tools.

**Connected (working):**
- `@cgk-platform/db` — `withTenant()`, `sql` — used by all tool files ✅
- `@cgk-platform/auth` — `verifyJWT` — used in auth.ts ✅
- `@cgk-platform/mcp` — handler, types, streaming, tools, rate-limit ✅
- `jose` — JWT signing in OAuth token endpoint ✅
- Upstash/KV Redis — rate limiter + SSE bridge ✅

**Partially wired / stub behavior:**
- `syncProductTool` — does NOT actually call Shopify API; returns "sync will be processed in background" with no job dispatch. Needs `@cgk-platform/shopify` or Inngest job trigger.
- `schedule_reminder` (creators) — likely stub; no Inngest/queue integration visible.
- `send_creator_email` / `send_notification` — need to verify these call `@cgk-platform/email` or equivalent, not just log intent.
- Analytics tools (`recalculate_attribution`, `export_analytics`) — marked `rateLimitTier: high`, streaming — but need verification they're not calling expensive compute synchronously.

**NOT wired to MCP at all:**
- `@cgk-platform/ai-agents` — AI agent orchestration, agent memory, task execution — no MCP tools for managing AI agents (start agent run, check status, view agent history)
- `@cgk-platform/mmm` (Marketing Mix Modeling) — no MCP tool to trigger MMM runs or read results
- `@cgk-platform/analytics` (attribution, channel metrics) — analytics tools exist but it's unclear if they use the analytics package or query raw DB tables directly
- Content generation / AI image tools — no MCP tools
- Shopify webhooks — no MCP tool to view/manage webhook subscriptions
- Stripe — no MCP tools for subscription management, invoice queries

**Tool count discrepancy:** Manifest claims 69 tools across 4 categories (analytics 16, commerce 15, creators 18, system 20). The `tools/index.ts` comments say 84 total and includes `content` tools (12), which are NOT listed in the manifest's `TOOL_CATEGORIES`. Content tools exist in `packages/mcp/src/tools/content.ts` but are absent from the discovery manifest.

#### Gaps:
- [ ] **P0 — Add content tools to manifest**: `apps/mcp-server/src/app/api/mcp/manifest/route.ts` `TOOL_CATEGORIES` is missing the content category entirely (12 tools). Add it; also verify content tools are registered in the route handler.
- [ ] **P1 — Wire `syncProductTool` to Inngest**: Replace stub response with actual `inngest.send({ name: 'shopify/product.sync', data: { tenantId, productId } })` call.
- [ ] **P1 — Add AI agent tools**: Create `packages/mcp/src/tools/agents.ts` with tools like `list_agent_runs`, `get_agent_run`, `trigger_agent_run`, `cancel_agent_run` — connecting to `@cgk-platform/ai-agents`.
- [ ] **P1 — Verify analytics tools use analytics package or direct DB**: If tools query raw DB tables (attribution, metrics), they should use the analytics package functions to avoid query logic drift.
- [ ] **P2 — Add MMM tools**: `get_mmm_model_status`, `trigger_mmm_run`, `get_mmm_results` — connect to `@cgk-platform/mmm`.
- [ ] **P2 — Add Shopify tools**: `list_shopify_webhooks`, `get_shopify_sync_status` — expose integration health to AI clients.
- [ ] **P2 — Verify email/notification tools make real API calls**: Check `send_creator_email` and `send_notification` call actual delivery services, not just write to a log.
- [ ] **P3 — Add Stripe tools**: `get_subscription_status`, `list_invoices` — for billing-aware AI workflows.
- [ ] **P3 — Tool manifest sync**: The static manifest in `route.ts` and the dynamic `toolAnnotations`/`toolCategories` in the package can drift. Consider generating the manifest from the same source of truth.

---

## Super Admin Audit

### Status: Per-tenant admin UI exists (limited). Zero cross-tenant visibility in orchestrator. No platform-wide MCP dashboard.

**What super admin can see today:**
- `apps/admin` MCP analytics page: tool call counts, error rates, recent activity — but only if `mcp_usage` table exists (it doesn't — see DB audit) → currently returns zeros
- `apps/admin` API key list/create/revoke for current tenant
- `apps/orchestrator` platform logs can filter by service `mcp-server` — logs are infrastructure-level, not structured tool-call events
- `apps/orchestrator` brand wizard step-6 can toggle `ai.mcp_enabled` feature flag per brand

**What super admin CANNOT see:**
- No cross-tenant MCP dashboard (which tenants are most active, total tool calls across all tenants today)
- No ability to view or modify per-tenant rate limit config from orchestrator
- No visibility into active OAuth clients per tenant (which AI tools are connected)
- No ability to revoke all tokens for a tenant (emergency kill switch)
- No alert if a tenant exceeds rate limits or has a spike in error rate
- In-memory usage log (in `session.ts`) is non-observable and ephemeral

**Rate limiting:** The `RateLimiter.setConfig()` interface exists and writes to Redis. No super admin UI to read or set this. Default is 100 req/60s global — same for all tenants. No tier-based limits (free vs paid tenants).

#### Gaps:
- [ ] **P0 — Build `mcp_usage` table + write events** (see DB audit P0) — without this, all admin analytics pages return zeros.
- [ ] **P1 — Cross-tenant MCP dashboard in orchestrator**: Add `/dashboard/mcp` page showing: total API calls by tenant (last 7/30 days), error rate by tenant, top tools by tenant, active OAuth connections.
- [ ] **P1 — Per-tenant rate limit management UI**: In orchestrator, allow setting `maxRequests`, `windowSeconds`, `maxTokensPerMinute` per tenant. Reads/writes to Redis `mcp:ratelimit:config:{tenantId}`.
- [ ] **P1 — Emergency token revocation**: Add a super admin action to revoke all OAuth tokens and API keys for a specific tenant (e.g., on security incident). Should set `revoked_at` on all `oauth_refresh_tokens` for the tenant.
- [ ] **P1 — OAuth client visibility**: Orchestrator should list all registered `oauth_clients` per organization — name, client_id, last_used, active connections.
- [ ] **P2 — Rate limit alerting**: Alert (Slack/email) if a tenant hits rate limits more than N times in an hour, or error rate exceeds 20%.
- [ ] **P2 — Tier-based rate limits**: Assign rate limit tiers in tenant config (free: 30/min, pro: 100/min, enterprise: 500/min). Read tier from subscription/plan at provisioning time.
- [ ] **P2 — Persist in-memory usage log to DB**: Replace/supplement `tokenUsageLog` Map with DB writes to `mcp_usage` — makes usage data durable and visible to admin.
- [ ] **P3 — MCP health status widget in orchestrator brand view**: Show each brand's MCP connection status (connected/disconnected, last tool call, key expiry) in the brand detail view.

---

## Priority Summary

### P0 Critical:
1. **API key table mismatch**: Auth reads `public.api_keys`, admin UI writes to tenant `mcp_api_keys` — MCP API key auth is entirely broken. Fix before any tenant can use API key auth.
2. **`requiresAdmin` tools not enforced**: `initiate_payout`, `update_user_role`, `update_tenant_config`, `toggle_feature_flag`, etc. are callable by any authenticated user. No role check at tool dispatch.
3. **OAuth scope not enforced**: Token scopes (`read`, `write`, `admin`) are stored in JWT but never checked against tool requirements. A `read`-only token can cancel orders or update inventory.
4. **`validateTenantAccess()` is a stub**: Any valid JWT can target any tenant by guessing the `orgId` slug. Must verify user ↔ org membership from DB.
5. **`mcp_usage` table missing**: No migration exists; analytics API gracefully returns zeros; no tool call persistence. Usage tracking is dead.

### P1 High:
6. **Fix redirect URI wildcard regex** — security flaw, possible open redirect/phishing via subdomain tricks.
7. **Fix `tenant_id` override in OAuth POST handler** — login page's `tenant_id` param should not override the one stored in the auth code.
8. **Add `mcp_usage` migration + write events** — persistence needed for analytics, debugging, billing.
9. **Wire `getToolsForTenant()` into handler** — don't register tools for disabled integrations (prevents accidental Shopify/Stripe tool calls on tenants without those integrations).
10. **Add content tools to manifest** — 12 content tools exist in code but are absent from the discovery manifest.
11. **Cross-tenant MCP dashboard in orchestrator** — super admin has zero visibility into MCP usage across tenants.
12. **Emergency token revocation** — no kill switch for compromised tenant credentials.
13. **OAuth client self-service UI** — tenants have no way to register OAuth clients for Claude Connector.

### P2 Medium:
14. Persist rate limit config to DB (not Redis-only)
15. Add token revocation endpoint (RFC 7009)
16. Add `/.well-known/oauth-authorization-server` discovery endpoint
17. Per-tenant rate limit UI in orchestrator
18. Verify system/analytics tools for cross-tenant JOIN risk
19. Wire `syncProductTool` to Inngest (currently returns stub response)
20. Add AI agent MCP tools (`@cgk-platform/ai-agents` not exposed via MCP)
21. Add MMM MCP tools
22. Scope-filtered tool listing in `listTools()`
23. Tier-based rate limits (free/pro/enterprise)
24. Add API key rate limiting per key (column exists, never enforced)

### P3 Low:
25. Cleanup cron for expired `oauth_authorization_codes`
26. OAuth consent/permissions screen
27. JWT key rotation (move HS256 → RS256)
28. Static manifest / dynamic tool registry sync mechanism
29. Add Stripe tools
30. MCP health widget in orchestrator brand view
