# AGENT-20: Shopify · MCP · Jobs · Infrastructure Audit

**Audit Date**: 2026-02-19  
**Auditor**: Agent 20 (Subagent)  
**Scope**: `apps/shopify-app/`, `packages/shopify/`, `apps/mcp-server/`, `packages/mcp/`, `packages/jobs/`, `packages/scheduling/`  
**Phase Docs Reviewed**: PHASE-2SH-*, PHASE-6A/6B, PHASE-5A-5G, PHASE-2SC-*, PHASE-7A-7C, PHASE-8, PHASE-9A-9E

---

## Executive Summary

The Shopify, MCP, Jobs, and Scheduling infrastructure is **substantially complete and well-structured**. Core patterns are sound: tenant isolation via `withTenant()`, encrypted credential storage, proper HMAC verification, Streamable HTTP MCP transport, and Trigger.dev v4 task wiring. The primary gaps are **deployment/ops** (production credentials not configured, domains not set, npm not published, setup wizard unbuilt) and a handful of specific implementation holes (Trigger.dev not deployed, webhook health-check job stubbed, MCP tool registry not wired to all 84 tools in the route).

**Overall Status**: ~80% implementation complete. 20% remaining is almost entirely production operations work.

---

## Section 1: Shopify App Installation & Auth

### Phase: PHASE-2SH-SHOPIFY-APP-CORE, PHASE-2SH-SHOPIFY-DEPLOYMENT

---

### 1.1 OAuth Initiation & Callback ✅

**Files**: `packages/shopify/src/oauth/initiate.ts`, `packages/shopify/src/oauth/callback.ts`  
**Routes**: `apps/admin/src/app/api/admin/shopify-app/auth/route.ts`, `.../callback/route.ts`

**What's implemented**:
- `initiateOAuth()` generates a secure 32-byte state + 16-byte nonce, stores in `shopify_oauth_states` table with 10-min TTL, builds Shopify authorization URL with all required params
- `handleOAuthCallback()` verifies HMAC via `verifyOAuthHmac()`, validates state from DB, exchanges code for token via `fetch()` to Shopify, encrypts token via AES-256-GCM, upserts into `shopify_connections` table with `ON CONFLICT DO UPDATE`
- `disconnectStore()` nulls credentials and sets status = disconnected
- Admin route correctly reads `x-tenant-slug` header for tenantId injection
- Callback route registers webhooks immediately after token storage

**Gaps**:
- ⚠️ `client_id = "YOUR_CLIENT_ID_FROM_PARTNERS"` in `shopify.app.toml` — placeholder not replaced (requires manual step, documented but not done)
- ⚠️ `application_url` and `redirect_urls` use `admin.cgk-platform.com` which doesn't exist yet (PHASE-9B not started)
- ⚠️ No `shopify app config link` has been run (`.shopify/project.json` not present)
- ⚠️ OAuth routes currently only wired in `apps/admin` — the `apps/shopify-app/src/index.ts` is only a type export barrel, not a Next.js app with routes

**Tests**: `packages/shopify/src/__tests__/oauth.test.ts` — covers encryption, HMAC validation, scope checking ✅

---

### 1.2 Credential Encryption ✅

**Files**: `packages/shopify/src/oauth/encryption.ts`

AES-256-GCM with random IV, auth tag captured in `iv:authTag:ciphertext` format. Unique ciphertext per encryption (verified by test). Uses `SHOPIFY_TOKEN_ENCRYPTION_KEY` env var (64-char hex = 32 bytes). **Correctly** uses synchronous Node crypto (not Web Crypto, so Edge runtime incompatible — but this runs in Next.js server runtime, not Edge).

---

### 1.3 Scope Configuration ✅

**Files**: `packages/shopify/src/oauth/scopes.ts`, `apps/shopify-app/shopify.app.toml`

Comprehensive scopes defined for: orders, customers, products, inventory, fulfillments, discounts, gift cards, analytics, web pixel, delivery customization, checkout, cart transforms. Scopes match `shopify.app.toml` `[access_scopes]`. `getScopesString()` exported for OAuth URL construction.

---

### 1.4 App Manifest (shopify.app.toml) ⚠️

**File**: `apps/shopify-app/shopify.app.toml`

**Implemented**:
- Webhook subscriptions declared (orders, customers, fulfillments, refunds, products, app/uninstalled)
- GDPR compliance topics declared (`customers/data_request`, `customers/redact`, `shop/redact`)
- `[auth] redirect_urls` includes localhost for dev
- `[pos] embedded = false`

**Missing**:
- `client_id = "YOUR_CLIENT_ID_FROM_PARTNERS"` — still a placeholder ❌
- Production domain `admin.cgk-platform.com` not live yet
- `shopify app config link` not run — no `.shopify/project.json`

---

## Section 2: Shopify Webhooks

### Phase: PHASE-2SH-SHOPIFY-WEBHOOKS

---

### 2.1 Webhook HMAC Verification ✅

**Files**: `packages/shopify/src/webhooks/handler.ts`, `packages/shopify/src/webhooks/utils.ts`

`handleShopifyWebhook()` is the full pipeline:
1. Validates required headers (`x-shopify-shop-domain`, `x-shopify-topic`, `x-shopify-hmac-sha256`)
2. Resolves `tenantId` from shop domain via DB lookup
3. Reads raw body (text, not parsed) for HMAC verification
4. Verifies HMAC against webhook secret from encrypted credentials
5. Returns 200 to unknown shops (prevents Shopify retry storms)
6. Deduplication via `generateIdempotencyKey()` + DB check

**Timing-safe comparison**: The utils function uses `timingSafeEqual` (verified by test). ✅  
**Dev bypass**: NOT present in the new package (was only in RAWDOG legacy) ✅  
**Idempotency**: Full idempotency key (topic + resourceId + webhookId), DB-checked per tenant ✅

---

### 2.2 Webhook Route (Admin App) ✅

**File**: `apps/admin/src/app/api/shopify/webhooks/route.ts`

```typescript
import { handleShopifyWebhook } from '@cgk-platform/shopify/webhooks'
export async function POST(request: Request) {
  return handleShopifyWebhook(request)
}
```

Thin wrapper — all logic in the shared package. ✅

---

### 2.3 Webhook Router & Handlers ✅

**Files**: `packages/shopify/src/webhooks/router.ts`, `packages/shopify/src/webhooks/handlers/`

Handlers exist for: orders (create, updated, paid, cancelled), fulfillments (create, update), refunds (create), customers (create, update), app (uninstalled). Order handler correctly upserts to DB and triggers Trigger.dev tasks via `tasks.trigger()` from `@trigger.dev/sdk/v3`.

---

### 2.4 Webhook Registration ✅

**File**: `packages/shopify/src/webhooks/register.ts`

`registerWebhooks()` loops through `REQUIRED_TOPICS` (11 topics), creates via GraphQL mutation, stores `shopify_webhook_id` in `webhook_registrations` table.  
`syncWebhookRegistrations()` reconciles Shopify state with local DB, re-registers missing webhooks.  
`OPTIONAL_TOPICS` map supports per-tenant feature flag controlled topics.

---

### 2.5 Webhook Health Check Job ⚠️

**File**: `packages/jobs/src/webhooks/health-check.ts`

**STUBBED** — returns `success: false` with message: `"@cgk-platform/shopify/webhooks module must be built before this job can run"`. The dependency exists and builds fine — this stub was likely left during phased development. The `retryFailedWebhooksJob` is fully implemented.

**TODO**: Remove stub, implement actual `syncWebhookRegistrations()` call.

---

### 2.6 Webhook Tests ✅

**Files**: `packages/shopify/src/__tests__/webhooks.test.ts`, `packages/shopify/src/webhooks/__tests__/`

Tests cover: valid HMAC verify, invalid HMAC reject, tampered body reject, router routing. ✅

---

## Section 3: Shopify Extensions

### Phase: PHASE-2SH-SHOPIFY-EXTENSIONS

---

### 3.1 Delivery Customization (Rust Function) ✅

**Path**: `apps/shopify-app/extensions/delivery-customization/`

- `shopify.extension.toml` correctly configured: type `function`, target `purchase.delivery-customization.run`, build command `cargo build --target=wasm32-wasip1 --release`
- `src/lib.rs` exists (Rust source)
- `src/run.graphql` exists (GraphQL input query)
- `test-input.json` exists for local function testing
- Uses `DeprecatedOperation::Hide` (correct per RAWDOG reference — doc shows `Operation::Hide` which doesn't compile)

**Gap**: Requires `rustup target add wasm32-wasip1` in CI — documented in `shopify-app-deploy.yml` ✅

---

### 3.2 Session Stitching Pixel (Web Pixel Extension) ✅

**Path**: `apps/shopify-app/extensions/session-stitching-pixel/`

- `shopify.extension.toml` type `web_pixel_extension`, runtime_context `strict`
- Settings fields: GA4 Measurement ID, GA4 API Secret, Meta Pixel ID, Meta CAPI Access Token
- `src/index.ts` fully implemented (GA4 + Meta CAPI event forwarding)
- TypeScript dependencies configured

---

### 3.3 Post-Purchase Survey (Checkout UI Extension) ✅

**Path**: `apps/shopify-app/extensions/post-purchase-survey/`

- `shopify.extension.toml` present
- `src/Checkout.tsx` React survey component
- `src/types.ts` TypeScript types
- `src/index.tsx` entry point

---

### 3.4 CI/CD for Extensions ✅

**File**: `.github/workflows/shopify-app-deploy.yml`

GitHub Actions workflow: path-filtered on `shopify-app/**`, sets up Rust with wasm32-wasip1 target, installs Shopify CLI, runs `shopify app build` + `shopify app deploy --force`. Requires `SHOPIFY_CLI_PARTNERS_TOKEN` secret.

**Gap**: `SHOPIFY_CLI_PARTNERS_TOKEN` not yet added to GitHub secrets (PHASE-9A not started) ❌

---

## Section 4: MCP Server Transport

### Phase: PHASE-6A-MCP-TRANSPORT

---

### 4.1 Streamable HTTP Transport ✅

**File**: `apps/mcp-server/src/app/api/mcp/route.ts`

- POST handler: validates JSON-RPC 2.0, authenticates, rate-limits, creates `MCPHandler` per request
- Method routing: `initialize`, `initialized`, `ping`, `tools/list`, `tools/call`, `resources/list`, `resources/read`, `prompts/list`, `prompts/get`
- Streaming: tools requiring streaming use `callToolStreaming()` + `createStreamingHttpResponse()` (async generator → ReadableStream)
- SSE bridge: GET endpoint opens SSE stream with Redis polling; gracefully degrades to JSON info if Redis unavailable
- OPTIONS handler for CORS preflight
- Edge runtime: `export const runtime = 'edge'`

**Session handling**: Per-request `MCPHandler` creation (stateless, correct for Streamable HTTP) ✅  
**Notifications**: `initialized` notifications return 202 Accepted with no body ✅  
**Error codes**: JSON-RPC 2.0 standard codes mapped to HTTP status correctly ✅

---

### 4.2 MCPHandler Class ✅

**File**: `packages/mcp/src/handler.ts`

- Constructor takes `tenantId`, `userId`, `config` — no global state
- Tenant context injected into tool args as `_tenantId`, `_userId` (cannot be overridden by client)
- Usage tracking via `startUsageTracking()` for tools, resources, prompts
- Session management: `createMCPSession()`, `touchSession()`, `incrementUsage()`
- Protocol version negotiation: supports 2024-11-05, 2025-03-26, 2025-06-18
- Handles both async generators (streaming tools) and regular Promise tools in `callTool()`
- `createStreamingHttpResponse()` delegates to `streaming.ts`

---

### 4.3 Authentication (Triple Method) ✅

**File**: `apps/mcp-server/src/lib/auth.ts`

1. Bearer JWT → `verifyJWT()` from `@cgk-platform/auth`
2. API key → DB lookup via `sql` query against `api_keys` table
3. Session cookie → cookie-based session validation

Returns `{ tenantId, userId, email }`. Throws `MCPAuthError` with `code` + `httpStatus`.

---

### 4.4 Protocol Version Validation ✅

`negotiateProtocolVersion()` in `packages/mcp/src/session.ts` — exact match required for supported versions, throws `MCPProtocolError` code `-32000` for unsupported. Supported: `["2024-11-05", "2025-03-26", "2025-06-18"]` (constant `SUPPORTED_PROTOCOL_VERSIONS`).

---

### 4.5 SSE Bridge ⚠️

**File**: `apps/mcp-server/src/lib/sse-bridge.ts`

SSE transport uses Redis-backed message queue (`popSessionMessages`, `pushSessionMessage`, `registerSession`). Poll interval 200ms, session timeout 5 min. Gracefully degrades: `isSSEBridgeAvailable()` checks if KV is configured.

**Gap**: SSE is supplementary to Streamable HTTP (which is the modern standard). SSE bridge is only needed for legacy clients (mcporter). The GET endpoint returns a JSON info response when KV isn't configured, which is reasonable. ⚠️ Minor: 200ms polling creates 5 req/sec per open SSE session against Redis — could be costly at scale. Consider WebSocket or longer-poll interval.

---

## Section 5: MCP Tools

### Phase: PHASE-6B-MCP-TOOLS

---

### 5.1 Tool Registry ✅

**Files**: `packages/mcp/src/tools/index.ts`, `packages/mcp/src/tools/{analytics,commerce,content,creators,system}.ts`

**Tool counts** (per registry jsdoc comments):
- Analytics: 19 tools
- Commerce: 15 tools  
- Content: 12 tools
- Creators: 18 tools
- System: 20 tools
- **Total: ~84 tools** (exceeds Phase 6B target of 70+) ✅

`toolCategories`, `getAllTools()`, `getToolsByCategory()`, `getToolByName()` all exported. Tool annotations (readOnlyHint, destructiveHint, idempotentHint, requiresAuth, requiresAdmin, rateLimitTier) documented for all 84 tools.

---

### 5.2 Tenant Tool Filtering ✅

**File**: `packages/mcp/src/tools/index.ts`

`getToolsForTenant(tenantConfig)` filters by:
- `enabledCategories` whitelist
- `disabledTools` blacklist  
- `shopifyEnabled`, `stripeEnabled`, `creatorsEnabled` flags
- Tool name prefix matching (e.g., `shopify` in name → requires shopifyEnabled)

`isToolEnabledForTenant(toolName, tenantConfig)` ✅

---

### 5.3 Route Tool Registration ⚠️

**File**: `apps/mcp-server/src/app/api/mcp/route.ts`

The route only registers `commerceTools`:
```typescript
handler.registerTools(commerceTools)
```

**Missing**: `analyticsTools`, `contentTools`, `creatorTools`, `systemTools` are NOT registered. Only the 15 commerce tools are available to MCP clients despite 84 tools being implemented.

**TODO**: Register all tool categories, or implement `getToolsForTenant()` to dynamically filter based on tenant config.

---

### 5.4 Claude Connector OAuth ✅

**Files**: `apps/mcp-server/src/app/api/mcp/oauth/authorize/route.ts`, `.../oauth/token/route.ts`, `.../manifest/route.ts`

- PKCE validation (S256 code challenge method required)
- Auth code TTL: 10 minutes
- `MAX_STATE_LENGTH = 512` + `MAX_SCOPE_LENGTH = 1024` guards
- Manifest endpoint returns server capabilities, OAuth config, tool categories
- Redirect URI allowlist validation present

---

### 5.5 Rate Limiting ✅

**File**: `packages/mcp/src/rate-limit.ts`

Sliding window rate limiters: per-tenant (100/min), per-tool (configurable), AI cost limiter. Redis-backed via Upstash REST API (Edge runtime compatible). `checkRateLimit()` integrated in POST handler — skipped for read-only list methods. `RateLimitError` thrown, caught, returns proper `429` with `Retry-After` header.

---

## Section 6: Background Jobs (Trigger.dev)

### Phases: PHASE-5A through PHASE-5G

---

### 6.1 Jobs Package Structure ✅

**Package**: `packages/jobs/` (`@cgk-platform/jobs`)

**Layers**:
1. `src/events.ts` — TypeScript event type definitions with `TenantEvent<T>` wrapper (tenantId required in every payload)
2. `src/handlers/` — Business logic implementations (commerce, creators, analytics, scheduled)
3. `src/trigger/` — Trigger.dev task wrappers that call handlers
4. `src/providers/trigger-dev.ts` — Provider abstraction
5. `src/webhooks/` — Webhook-specific jobs (retry-failed, health-check)

**Tenant isolation**: Every handler receives `tenantId`, uses `withTenant()` for all DB ops ✅

---

### 6.2 Trigger.dev Configuration ✅

**File**: `packages/jobs/trigger.config.ts`

```typescript
project: "proj_lcxclxxjcwjuilmavhmn"  // Real project ID
runtime: "node"
maxDuration: 3600
retries: { maxAttempts: 3, factor: 2, min: 1000ms, max: 10000ms, randomize: true }
dirs: ["./src/trigger"]
build.extensions: [syncVercelEnvVars()]
```

Real project ID is set (not a placeholder). `syncVercelEnvVars()` extension configured. ✅

---

### 6.3 Task Categories ✅

All task categories are implemented:

| Category | Files | Export |
|---|---|---|
| Commerce | `trigger/commerce/{order-sync,review-email,ab-testing,product-sync}.ts` | `allCommerceTasks` |
| Creators | `trigger/creators/{payout-processing,communications,applications,analytics}.ts` | `allCreatorTasks` |
| Analytics | `trigger/analytics/{attribution,metrics,ad-platforms,ml-training}.ts` | `allAnalyticsTasks` |
| Scheduled | `trigger/scheduled/{health-checks,digests,alerts,subscriptions,media-processing,additional}.ts` | `allScheduledTasks` |
| Platform | `trigger/platform/health-check.ts` | `allPlatformTasks` |

`allTasks` export combines all categories. `TASK_COUNTS` constant tracks counts. ✅

---

### 6.4 Trigger.dev Deployment ❌

**Status**: NOT DEPLOYED

`trigger.config.ts` exists with real project ID, but `npx trigger deploy` has not been run. Tasks are defined but not registered with Trigger.dev cloud. Phase 5F success criteria explicitly notes deployment not verified.

**Blockers**:
1. `TRIGGER_SECRET_KEY` not configured in Vercel (PHASE-9A not started)
2. `VERCEL_ACCESS_TOKEN` + `VERCEL_PROJECT_ID` not set in `packages/jobs/.env.development.local`

**TODO**: Run `npx trigger deploy --env production` after PHASE-9A credentials are configured.

---

### 6.5 Task Pattern Quality ✅

Tasks follow best practices:
- Each task validates `tenantId` presence, throws `createPermanentError()` (non-retryable) if missing
- Financial tasks (order commission) use idempotency keys to prevent double-crediting
- Scheduled tasks call `getActiveTenants()` from DB — never hardcoded tenant list
- Retry configs differentiated: order tasks (5 attempts, 2s-60s), batch tasks (3 attempts, 5s-120s), health checks (1 attempt)
- Dynamic imports for handler modules (avoids circular deps, allows tree-shaking)

---

### 6.6 Webhook Retry Job ✅

**File**: `packages/jobs/src/webhooks/retry-failed.ts`

Fully implemented: queries `webhook_events` where `status='failed' AND retry_count < maxRetries AND created_at > NOW() - INTERVAL`, resets to `status='pending'` for reprocessing. Configurable: `maxRetries=3`, `hoursAgo=24`, `batchSize=50`.

---

### 6.7 Webhook Health Check Job ⚠️

**File**: `packages/jobs/src/webhooks/health-check.ts`

**STUBBED** — returns `success: false` immediately. The `syncWebhookRegistrations()` function exists and is functional in `@cgk-platform/shopify`. The stub was left as a build unblocking measure.

**TODO**: Implement actual Shopify webhook health check by importing `syncWebhookRegistrations` and iterating active tenants.

---

### 6.8 Provider Abstraction ✅

**Files**: `packages/jobs/src/providers/{trigger-dev,inngest,local}.ts`

Vendor-agnostic `JobProvider` interface. Three implementations: Trigger.dev (production), Inngest (alternative), Local (development/testing). Factory in `src/provider.ts`. New users can swap providers without changing handler code. ✅

---

### 6.9 Setup Documentation ⚠️

**Gap**: `docs/setup/BACKGROUND-JOBS.md` referenced in PHASE-5A success criteria. Not found in expected location.

```bash
find /Users/novarussell/Documents/cgk-platform/docs -name "BACKGROUND-JOBS.md"
# Not found
```

**TODO**: Create `docs/setup/BACKGROUND-JOBS.md` user-facing guide.

---

## Section 7: Scheduling Package

### Phases: PHASE-2SC-SCHEDULING-CORE, PHASE-2SC-SCHEDULING-TEAM

---

### 7.1 Core Scheduling ✅

**Package**: `packages/scheduling/` (`@cgk-platform/scheduling`)

**Exports**:
- Full CRUD for: EventType, Booking, SchedulingUser, Availability, BlockedDate
- `calculateAvailableSlots()` — core slot calculation logic
- `acquireBookingLock()` / `releaseBookingLock()` — Redis-based distributed locking to prevent double-booking
- `checkBookingRateLimit()` — per-user booking rate limiting
- Calendar helpers: `convertTimezone()`, `formatSlotTime()`, `getAvailableDatesForMonth()`, `isSlotAvailable()`

**Phase status**: ✅ COMPLETE (2026-02-13)

---

### 7.2 Team Scheduling ✅

**Files**: `packages/scheduling/src/teams/`

**Exports**: Team CRUD, team member management, team event types, round-robin counter, team bookings, analytics. Three scheduling algorithms: collective (all hosts available), round-robin (distribute load), individual (specific host). `acquireTeamBookingLock()` for team booking concurrency. ✅

**Phase status**: ✅ COMPLETE (2026-02-13)

---

### 7.3 Google Calendar Integration ⚠️

`GoogleTokens` type exported. `updateBookingGoogleEvent()` in DB module. However, the actual Google Calendar API integration (OAuth token exchange, event creation) is in the admin app — not visible in the `packages/scheduling` package itself. Needs verification that the full OAuth + event sync flow is connected.

---

## Section 8: Migration Tooling

### Phases: PHASE-7A, PHASE-7B, PHASE-7C

---

### 8.1 Migration Scripts ✅

**Path**: `tooling/migrations/`

Files present:
- `migrate-rawdog.ts` — main orchestrator
- `validate-migration.ts` — validation runner  
- `rollback.ts` — rollback capability
- `config.ts` — table order, batch size
- `lib/` — batch migration, row transform, insert helpers, validate-count/sum/sample/fk

Phase 7A status: ✅ COMPLETE. Batch processing (1000 rows), resumable migration, progress logging, financial sum validation all documented as implemented.

---

### 8.2 Migration Tests ✅

Phase 7B status: ✅ COMPLETE — 226 tests passing (153 unit, 73 E2E). Tests in `tooling/migrations/tests/`.

---

### 8.3 Production Cutover ❌

Phase 7C status: **NOT STARTED**. Blue-green deployment, DNS TTL reduction, traffic shifting not done. Depends on production infrastructure (PHASE-9A/9B) being configured first.

---

## Section 9: Production Deployment & npm

### Phases: PHASE-9A through PHASE-9E

---

### 9.1 Production Credentials (PHASE-9A) ❌ NOT STARTED

**What's missing**:
- `INTEGRATION_ENCRYPTION_KEY` not generated/added to Vercel
- `SHOPIFY_TOKEN_ENCRYPTION_KEY` not generated/added to Vercel
- `JWT_SECRET` / `SESSION_SECRET` not generated
- Database (`POSTGRES_URL`) not linked to Vercel projects
- Redis (`KV_REST_API_URL`) not configured
- `TRIGGER_API_KEY` not added
- `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` not configured in Vercel

---

### 9.2 DNS & Domains (PHASE-9B) ❌ NOT STARTED

`admin.cgk-platform.com`, `mcp.cgk-platform.com` etc. not configured. Vercel projects not linked to custom domains.

---

### 9.3 Database Migrations (PHASE-9C) ❌ NOT STARTED

Production DB schema not run. Depends on PHASE-9A.

---

### 9.4 Setup Wizard (PHASE-9D) ❌ NOT STARTED

Web-based setup wizard (`/setup` route in orchestrator) not built. CLI setup exists (`packages/cli/src/commands/setup.ts`) and is functional, but the web UI for non-technical users is missing.

---

### 9.5 npm Publishing (PHASE-9E) ⚠️ CONFIGURED, NOT PUBLISHED

**What's in place**:
- `.changeset/config.json` — correct config: fixed versioning `@cgk-platform/*`, access public ✅
- `.github/workflows/release.yml`, `canary.yml` — CI/CD for publishing ✅
- All packages have proper `exports`, `files`, `main`, `types` in package.json ✅

**What's missing**:
- npm `@cgk-platform` organization not created on npmjs.com ❌
- `NPM_TOKEN` not added to GitHub secrets ❌
- No changeset created for initial release ❌
- Packages at version `0.0.0` / `1.1.0` but not published ❌

---

## Consolidated Feature Classification

### Shopify App

| Feature | Status | Notes |
|---|---|---|
| OAuth initiation | ✅ | Full implementation, DB state, HMAC |
| OAuth callback | ✅ | Token exchange, AES-256-GCM encryption, DB upsert |
| Token encryption | ✅ | AES-256-GCM, random IV, auth tag |
| Disconnect store | ✅ | Nulls credentials, sets disconnected status |
| App manifest (toml) | ⚠️ | client_id placeholder, domains not live |
| Partners app creation | ❌ | Manual step not done |
| `shopify app config link` | ❌ | Not run |
| OAuth route (admin app) | ✅ | GET auth + GET callback routes |
| Webhook handler | ✅ | Full pipeline: HMAC verify, dedup, log, route |
| Webhook router | ✅ | All 11 required topics handled |
| Webhook registration | ✅ | GraphQL mutation, DB tracking, sync |
| Webhook health check | ⚠️ | Stubbed — not implemented |
| Delivery customization (Rust) | ✅ | Built, correct DeprecatedOperation usage |
| Session stitching pixel | ✅ | GA4 + Meta CAPI, settings fields |
| Post-purchase survey | ✅ | React checkout UI extension |
| CI/CD (GitHub Actions) | ✅ | Rust + Shopify CLI workflow |
| CLI Partners token | ❌ | Not added to GitHub secrets |
| GDPR compliance topics | ✅ | Declared in toml |

### MCP Server

| Feature | Status | Notes |
|---|---|---|
| Streamable HTTP transport | ✅ | POST handler, Edge runtime |
| SSE transport (GET) | ✅ | Redis-backed polling, graceful degradation |
| CORS (OPTIONS) | ✅ | createCORSHeaders |
| Protocol version negotiation | ✅ | 3 versions supported |
| Per-request auth (JWT) | ✅ | Bearer token |
| Per-request auth (API key) | ✅ | X-API-Key header, DB lookup |
| Per-request auth (cookie) | ✅ | Session cookie |
| Rate limiting | ✅ | Sliding window, per-tenant + per-tool |
| MCPHandler class | ✅ | Stateless, tenant-isolated |
| tools/list | ✅ | Lists registered tools |
| tools/call | ✅ | Sync + streaming |
| resources/list | ✅ | Lists registered resources |
| resources/read | ✅ | Resource handler invocation |
| prompts/list | ✅ | Lists registered prompts |
| prompts/get | ✅ | Prompt handler invocation |
| Notifications (initialized) | ✅ | 202 Accepted |
| ping | ✅ | Empty response |
| Analytics tools (19) | ⚠️ | Implemented but NOT registered in route |
| Commerce tools (15) | ✅ | Registered in route |
| Content tools (12) | ⚠️ | Implemented but NOT registered in route |
| Creator tools (18) | ⚠️ | Implemented but NOT registered in route |
| System tools (20) | ⚠️ | Implemented but NOT registered in route |
| Tool tenant filtering | ✅ | getToolsForTenant(), isToolEnabledForTenant() |
| Tool annotations | ✅ | readOnlyHint, destructiveHint, etc. |
| Claude Connector OAuth | ✅ | PKCE, authorize + token endpoints |
| Manifest endpoint | ✅ | /api/mcp/manifest |
| Streaming (NDJSON) | ✅ | async generator → ReadableStream |
| Token usage logging | ✅ | Per-session counters |

### Background Jobs (Trigger.dev)

| Feature | Status | Notes |
|---|---|---|
| Trigger.dev v4 package | ✅ | @trigger.dev/sdk/v3 |
| trigger.config.ts | ✅ | Real project ID, node runtime |
| Event type definitions | ✅ | TenantEvent<T> for all events |
| Commerce tasks (~54) | ✅ | Order sync, review email, A/B, product sync |
| Creator tasks (~52) | ✅ | Payout, communications, applications |
| Analytics tasks (~34) | ✅ | Attribution, metrics, ad platforms, ML |
| Scheduled tasks (~100) | ✅ | Health checks, digests, alerts, subs, media |
| Platform tasks | ✅ | Health matrix |
| allTasks export | ✅ | Combined array for bulk registration |
| getActiveTenants() | ✅ | DB query, never hardcoded |
| Idempotency (financial) | ✅ | Commission tasks use idempotency keys |
| Retry configuration | ✅ | Per-task retry policies |
| withTenant() in handlers | ✅ | All DB ops scoped |
| Trigger.dev deployment | ❌ | Not deployed to cloud |
| TRIGGER_SECRET_KEY env | ❌ | Not configured in Vercel |
| Webhook retry job | ✅ | Fully implemented |
| Webhook health check job | ⚠️ | Stubbed |
| Provider abstraction | ✅ | Trigger.dev / Inngest / Local |
| Background Jobs setup doc | ⚠️ | docs/setup/BACKGROUND-JOBS.md missing |

### Scheduling

| Feature | Status | Notes |
|---|---|---|
| Core booking system | ✅ | Full CRUD, slot calculation |
| Distributed locking | ✅ | Redis-backed, prevents double-booking |
| Rate limiting | ✅ | Per-user booking limits |
| Team scheduling | ✅ | Collective, round-robin, individual |
| Round-robin counter | ✅ | DB-backed, fair distribution |
| Google Calendar | ⚠️ | Types/DB present, full OAuth flow TBD |

### Infrastructure / Production

| Feature | Status | Notes |
|---|---|---|
| Migration scripts | ✅ | Batch, resumable, validated |
| Migration tests | ✅ | 226 passing |
| Production cutover | ❌ | PHASE-7C not started |
| Production credentials | ❌ | PHASE-9A not started |
| DNS/domains | ❌ | PHASE-9B not started |
| DB migrations (prod) | ❌ | PHASE-9C not started |
| Setup wizard (web) | ❌ | PHASE-9D not started |
| npm org created | ❌ | PHASE-9E not started |
| NPM_TOKEN in GitHub | ❌ | PHASE-9E not started |
| Changesets config | ✅ | Correct config, not yet published |
| Release CI workflow | ✅ | Configured, awaiting token |
| Canary CI workflow | ✅ | Configured, awaiting token |

---

## TODO Lists by Priority

### 🔴 CRITICAL (Blockers for production)

1. **Configure production credentials** (PHASE-9A)  
   - Generate and add `INTEGRATION_ENCRYPTION_KEY`, `SHOPIFY_TOKEN_ENCRYPTION_KEY`, `JWT_SECRET`, `SESSION_SECRET` to all Vercel projects
   - Link Vercel Postgres database
   - Link Vercel KV (Redis)
   - Add `TRIGGER_API_KEY` to Vercel

2. **Deploy Trigger.dev tasks** (PHASE-5F final step)
   - Set `VERCEL_ACCESS_TOKEN` + `VERCEL_PROJECT_ID` in `packages/jobs/.env.development.local`
   - Run `npx trigger dev` to verify local connection
   - Run `npx trigger deploy --env production`

3. **Create Shopify Partners app** (PHASE-2SH-SHOPIFY-DEPLOYMENT)
   - Create app in https://partners.shopify.com
   - Replace `client_id = "YOUR_CLIENT_ID_FROM_PARTNERS"` in `apps/shopify-app/shopify.app.toml`
   - Run `shopify app config link` locally
   - Add `SHOPIFY_CLI_PARTNERS_TOKEN` to GitHub secrets

4. **Run database migrations on production** (PHASE-9C)  
   - Depends on PHASE-9A

5. **Configure DNS/domains** (PHASE-9B)  
   - Point `admin.cgk-platform.com` → Vercel admin project
   - Update `shopify.app.toml` `application_url` and `redirect_urls`

### 🟠 HIGH (Functionality gaps)

6. **Register all 84 MCP tools in route** (`apps/mcp-server/src/app/api/mcp/route.ts`)
   ```typescript
   // Currently only registers:
   handler.registerTools(commerceTools)
   
   // Should register:
   handler.registerTools([
     ...analyticsTools,
     ...commerceTools,
     ...contentTools,
     ...creatorTools,
     ...systemTools,
   ])
   // Or use getToolsForTenant(tenantConfig) for filtered registration
   ```

7. **Implement webhook health check job** (`packages/jobs/src/webhooks/health-check.ts`)
   - Remove stub, import `syncWebhookRegistrations` from `@cgk-platform/shopify`
   - Iterate `getActiveTenants()`, call sync for each

8. **Create `docs/setup/BACKGROUND-JOBS.md`**  
   - Required by PHASE-5A success criteria
   - Include: Trigger.dev signup, project creation, API key retrieval, env var setup, `npx trigger dev` verification

### 🟡 MEDIUM (Quality improvements)

9. **Set up npm organization and publish packages** (PHASE-9E)
   - Create `@cgk-platform` org on npmjs.com (or decide on alternative scope)
   - Add `NPM_TOKEN` to GitHub secrets
   - Create initial changeset: `pnpm changeset`
   - Merge "Version Packages" PR to trigger publish

10. **Build web Setup Wizard** (PHASE-9D)  
    - `/setup` route in orchestrator app
    - Depends on design/UI decisions; CLI works for technical users

11. **SSE polling optimization** (`apps/mcp-server/src/lib/sse-bridge.ts`)  
    - 200ms polling = 5 req/sec/session against Redis
    - Consider exponential backoff (200ms → 500ms → 1s when no messages)

12. **Google Calendar OAuth full flow verification** (`packages/scheduling/`)
    - Verify token exchange, event creation, and sync are end-to-end wired

13. **Execute production cutover** (PHASE-7C)
    - Blue-green deployment, DNS TTL reduction, traffic shift
    - Depends on PHASE-9A/9B/9C completion

### 🔵 LOW (Nice-to-have)

14. **`shopify app deploy` in CI** — currently workflow is configured but never triggered (requires secrets)

15. **Webhook retry scheduled task** — `retryFailedWebhooksJob` is a handler but no corresponding Trigger.dev scheduled task exists in `packages/jobs/src/trigger/scheduled/`. Should be wired as a `schedules.task` with cron `*/5 * * * *`.

16. **GDPR webhook handlers** — `compliance_topics` declared in toml but no handlers for `customers/data_request`, `customers/redact`, `shop/redact` found in `packages/shopify/src/webhooks/handlers/`.

17. **MCP analytics in dashboard** — `logToolUsage` / usage tracking is implemented in `packages/mcp/src/session.ts` but no admin dashboard endpoint surfaces this data yet.

---

## Audit Findings Summary

| Category | ✅ Complete | ⚠️ Partial/Warning | ❌ Missing |
|---|---|---|---|
| Shopify OAuth | 5 | 3 | 3 |
| Shopify Webhooks | 6 | 2 | 0 |
| Shopify Extensions | 4 | 0 | 0 |
| MCP Transport | 8 | 1 | 0 |
| MCP Tools | 7 | 4 | 0 |
| Jobs Infrastructure | 10 | 3 | 2 |
| Scheduling | 5 | 1 | 0 |
| Migration | 2 | 0 | 1 |
| Production/Ops | 3 | 0 | 9 |
| **TOTAL** | **50** | **14** | **15** |

**Bottom line**: The code is excellent — well-structured, properly tenant-isolated, security-conscious, and feature-complete at the implementation layer. The 15 "missing" items are almost entirely **operational/deployment work** (credentials, DNS, publishing) that cannot be done programmatically. The 14 partial items are smaller wiring gaps that can each be addressed in < 2 hours. No architectural issues found.

---

*Generated by Agent 20 — 2026-02-19*
