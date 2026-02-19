# App Deep-Dive Audit: Orchestrator
**Date:** 2026-02-19 | **App:** apps/orchestrator + packages/ai-agents

> **Scope:** `apps/orchestrator/src/` and `packages/ai-agents/src/` — every auth, permissions, provisioning, OAuth, database, wiring, and super admin dimension audited.

---

## Auth Audit

### Status: Middleware is solid; internal API auth is weak in places; inbound webhook auth is incomplete

The orchestrator middleware (`middleware.ts`) enforces JWT validation, super admin role check, session expiry (4h max, inactivity timeout), MFA re-verification on sensitive routes, IP allowlist, and rate limiting (100 req/min, 20 on sensitive). Requests carry forwarded auth headers (`x-user-id`, `x-is-super-admin`, `x-mfa-verified`).

**How it authenticates:**
- JWT from cookie, verified via `@cgk-platform/auth`
- `isSuperAdmin()` check for all protected routes
- Session validated by ID against DB
- Audit log written on every request

**External services called by orchestrator:**
- Slack API — via bot token stored encrypted in `tenant_slack_config`
- Twilio — via encrypted account SID + auth token in `tenant_sms_config`
- OpenAI — via `OPENAI_API_KEY` env var (for embeddings), optionally routed through LiteLLM proxy
- Google Calendar — per-agent OAuth tokens encrypted in `agent_google_oauth`
- Retell.ai — per-agent API key encrypted in voice credentials table
- Internal jobs API — via shared `PLATFORM_API_KEY` env var (secret, not per-service)

**Inbound webhook auth status:**
- Twilio: ✅ `X-Twilio-Signature` HMAC-SHA1 verified (in admin app)
- Retell.ai: ✅ `x-retell-signature` verified before processing
- Slack events: ❌ **No inbound Slack event webhook endpoint exists at all** (handler code is written but never exposed as an API route in any app)
- Google Calendar push: ❌ No inbound webhook endpoint found; `handleCalendarWebhook()` is written but not routed
- Email inbound: ❌ Resend inbound route exists (`/api/webhooks/resend/inbound`) but not connected to `@cgk-platform/ai-agents` email handler

#### Gaps:
- [ ] **Create inbound Slack events API route** (`/api/webhooks/slack/events/route.ts` in admin or orchestrator) that verifies `X-Slack-Signature` using the signing secret (HMAC-SHA256 with timestamp), then calls `handleSlackEvent(tenantId, event)` wrapped in `withTenant()`
- [ ] **Fix Slack connect route auth:** `/api/platform/slack/connect/route.ts` has `const userId = 'super-admin'` hardcoded — replace with actual auth via middleware headers (`request.headers.get('x-user-id')`)
- [ ] **Replace shared PLATFORM_API_KEY with per-service secrets or mTLS** for internal job status callbacks (POST/PATCH `/api/platform/jobs`); currently any service with the key can create or mutate any job
- [ ] **Create Google Calendar inbound webhook route** and verify the `X-Goog-Channel-Token` / channel ID before routing to `handleCalendarWebhook()`
- [ ] **Connect Resend inbound email route to ai-agents email handler:** call `handleAgentInboundEmail(tenantId, email)` wrapped in `withTenant()` after verifying Resend payload
- [ ] **Document all required env vars** for auth/encryption in a `.env.example`: `INTEGRATION_ENCRYPTION_KEY`, `OPENAI_API_KEY`, `PLATFORM_API_KEY`, `LITELLM_BASE_URL`

---

## Permissions Audit

### Status: Tenant isolation model is correct at the DB layer; callers don't consistently enforce it

The platform uses **PostgreSQL schema-per-tenant isolation**. `withTenant(slug, fn)` sets `search_path = tenant_{slug}, public` for the duration of the operation. All AI agent tables live in tenant schemas (no explicit `tenant_id` column — isolation is structural).

Jobs (`teams-jobs.ts`) correctly call `withTenant(tenantId, async () => {...})` for every background operation.

**Critical finding:** The `packages/ai-agents/src/integrations/db/queries.ts` functions (`getSlackConfig`, `getSMSConfig`, `queueIntegrationEvent`, `getOrCreateSlackConversation`, `checkAndIncrementRateLimit`, etc.) call `sql` directly. They document "All queries expect to be run within a tenant context via withTenant()" in a comment, but the primary callers **do not wrap them**:

- `handleSlackEvent()` calls `getSlackConfig()`, `getOrCreateSlackConversation()`, etc. — **no withTenant() call in the chain**
- `SMSIntegration.handleInboundSMS()` calls `getSMSConfig()`, `getOrCreateSMSConversation()` — **no withTenant() call**
- `autonomy/check.ts` calls `getAutonomySettings()`, `countActionsToday()` — **no withTenant() call**
- `agents/registry.ts` `getPrimaryAgent()`, `listAgents()` etc. — **no withTenant() call**

If the event router calls handlers on a shared connection pool (Neon's pooler), `search_path` may be `public` schema, meaning queries land in the wrong schema. This is a **cross-tenant data leak risk**.

**Approval interaction auth:** `handleSlackInteraction()` processes approve/reject actions by Slack user ID but does not verify the Slack user belongs to the same tenant as the approval request.

#### Gaps:
- [ ] **Wrap all integration event handler calls in `withTenant()`** — `routeSlackEvent()`, `routeCalendarEvent()`, `routeEmailEvent()`, `routeSMSEvent()` should each resolve tenant from event context and call `withTenant(tenantSlug, ...)` before calling any DB function
- [ ] **Wrap `SMSIntegration.handleInboundSMS()` in `withTenant()`** — the tenant must be resolved from the destination phone number before calling `getSMSConfig()` and related queries
- [ ] **Wrap `autonomy/check.ts` functions in `withTenant()`** — `checkAutonomy()` and `checkAutonomyWithApproval()` must receive and enforce tenant context
- [ ] **Add tenantId parameter to all public ai-agents registry functions** (`getAgent`, `getPrimaryAgent`, `listAgents`, etc.) or wrap call sites in `withTenant()`
- [ ] **Verify Slack user is authorized in `handleSlackInteraction()`** — before allowing approve/reject of agent actions, verify the Slack user is a platform user in the same tenant
- [ ] **Add tenant guard to approval requests** — `getRequest()` and `approve()`/`reject()` should verify approval request's `agent_id` resolves to an agent in the current tenant schema
- [ ] **Integration test:** write a test that verifies calling `getSlackConfig()` without `withTenant()` throws or returns nothing (to enforce the contract)

---

## Tenant Provisioning Audit

### Status: Schema provisioned on org creation; AI agents NOT auto-provisioned; no AI quotas

Tenant provisioning: Step 1 of onboarding creates the org and runs tenant schema migrations. The 9-step onboarding includes a "Features" step (step 6) with selectable modules. `MCP Integration` is listed as a feature module. No "AI Agents" / "BRII" module exists in the feature list.

**What's provisioned automatically:** DB schema with all AI tables. No agents, no configs.

**What's NOT provisioned:**
- No default AI agent created on tenant launch
- No default autonomy settings bootstrapped
- No Slack, SMS, or email integration configured
- No LLM API key per tenant (single global key via env var)
- No per-tenant AI usage quota or budget

The `agent_autonomy_settings.max_cost_per_day` field exists (default $50/day) but is **not enforced** — there's no token counting or actual API cost tracking. It's a config field with no runtime enforcement.

#### Gaps:
- [ ] **Add "AI Agents (BRII)" as an onboarding feature module** in `FEATURE_MODULES` in `packages/onboarding/src/types.ts` — gate AI provisioning behind an explicit opt-in
- [ ] **Provision default AI agent during tenant launch** (step 9 / `launchOrganization()`): call `createAgent()` with sensible defaults within `withTenant(tenantSlug, ...)` when the AI feature is enabled
- [ ] **Add per-tenant AI quota table** (`tenant_ai_quotas`) in the tenant schema with: `max_llm_tokens_per_day`, `max_llm_cost_per_month`, `current_token_usage`, `current_cost`, `reset_at` — enforce limits before each LLM call
- [ ] **Create AI usage tracking table** (`ai_usage_log`) with: `agent_id`, `model`, `input_tokens`, `output_tokens`, `estimated_cost_usd`, `action_type`, `created_at` — populate on every LLM call
- [ ] **Enforce `max_cost_per_day` at runtime** — before making an LLM call, check accumulated `ai_usage_log` costs for the agent and block if over limit
- [ ] **Add a tenant AI onboarding step** in the admin portal: configure the primary agent name, role, capabilities, and channel integrations (Slack workspace ID, etc.)
- [ ] **Fix `max_actions_per_hour` enforcement:** current implementation approximates hourly rate as `totalActionsToday / 24` — this allows bursts. Track actual hourly windows with a sliding timestamp or Redis counter

---

## OAuth & Integrations Audit

### Status: Encryption solid; Google token refresh not automated; no key rotation mechanism

**Encryption:** AES-256-GCM with random IV per encryption, 32-byte key from `INTEGRATION_ENCRYPTION_KEY` env var. `safeDecrypt()` handles failures gracefully. Implementation is correct.

**Slack:** Bot tokens don't expire. OAuth flow stores encrypted bot token, signing secret, client secret. Token revocation via `revokeSlackTokens()` exists.

**Google Calendar:** Short-lived access tokens with refresh tokens. `updateAgentGoogleOAuthTokens()` exists but **there is no scheduled job that checks for expiring tokens and refreshes them**. `getExpiringCalendarWatches()` exists but is not called by any cron. Watch channels (for push notifications) expire after 7 days max.

**Twilio/SMS:** Account SID and auth token encrypted. No rotation mechanism.

**Retell.ai:** API key encrypted per-agent in voice credentials table. No refresh needed (API keys).

**LiteLLM:** Optional proxy via `LITELLM_BASE_URL` env var for cost tracking — but not enforced or documented as required.

#### Gaps:
- [ ] **Implement Google OAuth token auto-refresh:** create a job `ai-agents/refresh-google-tokens` that runs hourly, calls `getExpiringCalendarWatches()`, refreshes via Google token endpoint, calls `updateAgentGoogleOAuthTokens()`
- [ ] **Implement Google Calendar watch renewal:** create a job `ai-agents/renew-calendar-watches` that renews watch channels before they expire (call Google Calendar `channels.watch` API, update `watch_expiration`)
- [ ] **Implement encryption key rotation:** version-stamp encrypted values (`v1:base64encrypted`), support decrypting with old key and re-encrypting with new key during rotation
- [ ] **Verify `connected_accounts` JSONB on `ai_agents` table:** this field may store OAuth tokens — ensure any tokens stored here are encrypted, not plain text
- [ ] **Add scope validation on OAuth token storage:** when storing Google OAuth tokens, verify granted scopes include all required scopes (`calendar.readonly`, `calendar.events`, etc.) and warn/fail if missing
- [ ] **Make LiteLLM proxy required for production:** document and enforce that `LITELLM_BASE_URL` must be set in production for cost tracking; add a startup check

---

## Database & Schema Audit

### Status: Schema-per-tenant is correctly structured; no AI cost tracking; no cross-tenant AI log view

**Tables used by orchestrator/ai-agents (all in tenant schema, no tenant_id columns):**

| Table | Purpose | Tenant Scoped? |
|-------|---------|----------------|
| `ai_agents` | Agent config, model settings, capabilities | ✅ via schema |
| `agent_personality` | Trait sliders, templates, forbidden topics | ✅ via schema |
| `agent_autonomy_settings` | Global limits: max_actions/hour, max_cost/day | ✅ via schema |
| `agent_action_autonomy` | Per-action autonomy levels, daily limits | ✅ via schema |
| `agent_action_log` | Full audit trail of agent actions | ✅ via schema |
| `agent_approval_requests` | Pending human approvals | ✅ via schema |
| `agent_memories` | RAG memory store with vector embeddings | ✅ via schema |
| `tenant_slack_config` | Encrypted Slack tokens, team ID | ✅ via schema |
| `agent_slack_apps` | Per-agent Slack app configs | ✅ via schema |
| `slack_conversations` | Conversation tracking | ✅ via schema |
| `slack_user_associations` | Slack user → platform user mapping | ✅ via schema |
| `agent_google_oauth` | Google OAuth tokens (encrypted) | ✅ via schema |
| `agent_calendar_events` | Synced calendar events | ✅ via schema |
| `agent_email_config` | Email sender config, rate limits | ✅ via schema |
| `agent_email_conversations` | Email thread tracking | ✅ via schema |
| `tenant_sms_config` | Encrypted Twilio credentials | ✅ via schema |
| `agent_sms_conversations` | SMS conversation tracking | ✅ via schema |
| `agent_sms_messages` | SMS message history | ✅ via schema |
| `integration_event_queue` | Inbound event queue (Slack, SMS, etc.) | ✅ via schema |
| `channel_rate_limits` | Per-agent per-channel rate limiting | ✅ via schema |
| `platform_jobs` | Cross-tenant job tracking | ✅ via `tenant_id` column in public schema |

**Missing tables:**
- No `ai_usage_log` (token counts, model costs per invocation)
- No `tenant_ai_quotas` (per-tenant budget/quota limits)
- No `agent_conversations` storing actual LLM message history (only metadata in `slack_conversations`)
- No `agent_training_sessions` visible in migrations (referenced in types but schema file not located)

**Cross-tenant super admin queries:** `agent_action_log` is in tenant schema. To query across tenants, you must switch schemas. There is no cross-tenant view or materialized table for super admin.

#### Gaps:
- [ ] **Create `ai_usage_log` table** in tenant schema: `id`, `agent_id`, `model`, `provider`, `input_tokens`, `output_tokens`, `estimated_cost_usd`, `action_id`, `action_type`, `duration_ms`, `created_at` — write to it on every LLM call
- [ ] **Create `tenant_ai_quotas` table** in tenant schema: `agent_id`, `daily_token_budget`, `monthly_cost_budget_usd`, `current_daily_tokens`, `current_monthly_cost_usd`, `reset_at`, `hard_limit` (bool)
- [ ] **Create `agent_conversations` table** in tenant schema to store LLM message history: `id`, `agent_id`, `channel`, `conversation_ref`, `messages` (JSONB), `token_count`, `created_at` — required for conversation context and audit
- [ ] **Locate and verify `015_ai_memory.sql`** migration exists and is correctly applied — the code references `agent_memories` with vector embeddings but this migration wasn't in the audited files
- [ ] **Add a public schema materialized view `cross_tenant_ai_summary`** that super admin can query: joins `organizations` with per-tenant `ai_usage_log` stats (requires a cross-schema aggregation job or pg_fdw setup)
- [ ] **Add index on `agent_action_log(created_at, action_category)`** if not already present — approval and rate limit queries filter by this frequently
- [ ] **Add `tenant_id` metadata to `platform_jobs.payload`** for AI jobs so super admin can correlate job failures with tenant AI activity without schema-switching

---

## Package Wiring Audit

### Status: Handler code is written but critical wiring is missing; LLM not connected; no job scheduler

**What triggers orchestrator tasks today:**
1. ✅ Super admin API calls (job retry, status updates) — via orchestrator UI + API
2. ✅ Background jobs triggered externally with `tenantId` parameter (syncOrgChart, decayFamiliarity, cleanupHandoffs)
3. ❌ **Slack events** — `handleSlackEvent()` exists but no HTTP endpoint receives Slack webhooks
4. ❌ **SMS inbound** — `SMSIntegration.handleInboundSMS()` exists, admin has Twilio route but uses different package (`@cgk-platform/communications`, not `@cgk-platform/ai-agents`)
5. ❌ **Google Calendar push** — `handleCalendarWebhook()` written but no HTTP endpoint
6. ❌ **Email inbound** — `handleAgentInboundEmail()` written but not connected to Resend inbound route
7. ❌ **MCP calls** — listed as a feature, no server implementation found
8. ❌ **Integration event queue** — `processEventQueue()` exists but no scheduled worker calls it

**LLM wiring:**
- `setMessageProcessor()` / `messageProcessor` in `event-handler.ts` allows injecting an LLM call handler
- Default is a no-op: `'Agent processing is not configured.'`
- No implementation of this processor found anywhere in the codebase
- No Anthropic/OpenAI client for chat completions (only OpenAI is present for embeddings via `openai` package)
- No RAG context builder invocation in any message handler (context-builder.ts exists but is not called)

**What connects back to admin/portals for results:**
- ✅ `agent_action_log` is written on every action — portal can query it
- ✅ `agent_approval_requests` can be queried and responded to via Slack buttons
- ❌ No real-time push of AI results back to creator portal or admin portal
- ❌ No webhook delivery for AI-generated events

#### Gaps:
- [ ] **CRITICAL: Wire the LLM.** Implement `messageProcessor` using the Anthropic Claude SDK (or Vercel AI SDK): build context with RAG (`buildRAGContext()` from `rag/context-builder.ts`), call Claude API, log usage to `ai_usage_log`, return response
- [ ] **CRITICAL: Create Slack events webhook API route** — add `apps/admin/src/app/api/webhooks/slack/events/route.ts` (or orchestrator): verify `X-Slack-Signature`, resolve tenantId from team_id via DB lookup, call `withTenant(slug, () => handleSlackEvent(tenantId, event))`
- [ ] **CRITICAL: Connect integration event queue worker** — create a background job `ai-agents/process-event-queue` that calls `processEventQueue({ tenantId })` every 30 seconds for each active tenant
- [ ] **Connect Twilio inbound SMS to ai-agents handler:** in `apps/admin/src/app/api/webhooks/twilio/incoming/route.ts`, after existing opt-out handling, resolve agent via phone number and call `smsIntegration.handleInboundSMS(webhook)` within `withTenant()`
- [ ] **Create Google Calendar push webhook route** and connect to `handleCalendarWebhook(channelId, resourceId)`
- [ ] **Connect Resend inbound email to `handleAgentInboundEmail()`** within `withTenant()` in the Resend inbound webhook route
- [ ] **Implement MCP server** using `@modelcontextprotocol/sdk` — expose tenant-scoped AI agent tools via MCP protocol for the tenants who have the MCP feature enabled
- [ ] **Register and schedule `teamsJobDefinitions`** via `@cgk-platform/jobs` — none of the job definitions in `jobs/teams-jobs.ts` are currently registered with a scheduler
- [ ] **Add RAG context injection** to the message processor — call `buildRAGContext({ agentId, query, ... })` before each LLM call to inject relevant memories into the system prompt
- [ ] **Wire approval notification to Slack** — call `sendApprovalRequestToSlack()` when `checkAutonomyWithApproval()` creates an approval request (currently no notification is sent)

---

## Super Admin Audit

### Status: Job monitoring exists; AI-specific monitoring does not; no cost visibility; no kill switch

**What super admin CAN do today:**
- ✅ View `platform_jobs` cross-tenant with filters (tenant, status, job type) — `/api/platform/jobs`
- ✅ View failed jobs by tenant and job type — `/api/platform/jobs/failed`
- ✅ Retry a failed job — `/api/platform/jobs/[id]/retry`
- ✅ Set a job to cancelled status via PATCH — `/api/platform/jobs/[id]`
- ✅ View job detail including error stack — `/api/platform/jobs/[id]` GET
- ✅ All actions are audit-logged
- ✅ Jobs dashboard with 30-second auto-refresh

**What's missing:**
- ❌ **No cross-tenant AI agent action log viewer** — `agent_action_log` is in tenant schemas; super admin has no aggregate view
- ❌ **No per-tenant AI cost dashboard** — no cost tracking at all; can't see which tenant is burning the most LLM tokens
- ❌ **No running job kill** — PATCH to "cancelled" sets a DB flag but doesn't terminate an in-flight AI LLM call
- ❌ **No runaway job detection** — no timeout enforcement, no loop detection, no token ceiling per single invocation
- ❌ **No cross-tenant agent listing** — can't see all agents across all tenants from orchestrator
- ❌ **No emergency AI disable toggle** — no way to disable AI for a specific tenant without deleting their agents
- ❌ **No approval request monitoring** — can't see pending agent approval requests across all tenants
- ❌ **No real-time AI activity stream** — the admin alert stream exists but doesn't surface AI agent activity

#### Gaps:
- [ ] **Build cross-tenant AI activity API** — `GET /api/platform/ai/activity` — iterate tenant schemas (or use a materialized log) to show recent agent actions, costs, and errors across all tenants
- [ ] **Build per-tenant AI cost breakdown** — after implementing `ai_usage_log`, add `GET /api/platform/ai/costs?tenantId=&period=month` endpoint with token usage and estimated USD cost
- [ ] **Add AI agent emergency disable** — add `enabled` boolean to `ai_agents` table; add super admin endpoint `POST /api/platform/ai/agents/{tenantId}/disable` that sets all agents in tenant to disabled, blocking all messageProcessor invocations
- [ ] **Add per-job LLM timeout enforcement** — wrap LLM calls in `Promise.race()` with a configurable timeout; log and fail the job if exceeded; report to super admin
- [ ] **Add runaway detection job** — a cron that queries `platform_jobs WHERE status='running' AND started_at < NOW() - INTERVAL '10 minutes'` and alerts super admin / auto-cancels
- [ ] **Build cross-tenant agent dashboard in orchestrator** — page showing tenant → agents → last active → actions today → cost today; query by iterating tenant schemas via a platform-level aggregation job
- [ ] **Add pending approvals monitor** — aggregate pending `agent_approval_requests` across tenant schemas; show count per tenant in ops dashboard with link to Slack thread
- [ ] **Add AI cost alerting** — when a tenant's estimated daily cost exceeds a threshold (e.g., $20), alert super admin via the existing alert system

---

## Priority Summary

### P0 Critical (Blocks all AI functionality / active security risk):
- `[ ] Create Slack events inbound webhook API route with signature verification` — without this, Slack integration is a dead letter; agents cannot receive messages
- `[ ] Wire the LLM message processor` — without this, the AI system returns "Agent processing is not configured." to all messages
- `[ ] Wrap all integration DB calls in withTenant()` — without this, tenant isolation is broken for all AI queries; cross-tenant data leak risk
- `[ ] Fix Slack connect route hardcoded userId` — active security gap; any authenticated user can initiate platform Slack OAuth as "super-admin"

### P1 High (AI unusable or insecure without these):
- `[ ] Connect integration event queue worker (scheduled job)` — `integration_event_queue` fills but is never processed
- `[ ] Create AI usage tracking table (ai_usage_log)` — no observability, no cost control possible without this
- `[ ] Implement Google OAuth token auto-refresh` — Google Calendar integration will silently fail after ~1 hour for all agents
- `[ ] Add per-tenant AI quota/budget system` — no cost ceiling means a misconfigured agent can run up unlimited API bills
- `[ ] Connect Twilio SMS to ai-agents handler` — two parallel SMS systems with no bridge; inbound SMS never reaches AI agents
- `[ ] Add emergency AI disable for tenants (super admin)` — no way to stop a runaway AI tenant without direct DB intervention

### P2 Medium (Important for production quality):
- `[ ] Register teamsJobDefinitions with job scheduler` — org chart sync and familiarity decay never run
- `[ ] Create Google Calendar inbound webhook route` — Calendar integration one-way (sync only, no push)
- `[ ] Connect Resend inbound email to ai-agents email handler`
- `[ ] Implement MCP server` — listed as a sellable feature but not built
- `[ ] Wire approval notifications to Slack` — approval requests created but approvers are never notified
- `[ ] Build cross-tenant AI cost dashboard for super admin`
- `[ ] Add runaway job detection/auto-cancel`
- `[ ] Implement encryption key rotation mechanism with version stamps`

### P3 Low (Quality improvements and hardening):
- `[ ] Add LiteLLM proxy as required for production (cost tracking)`
- `[ ] Verify connected_accounts JSONB doesn't store plain-text tokens`
- `[ ] Add OAuth scope validation on token storage`
- `[ ] Add integration test enforcing withTenant() contract`
- `[ ] Build cross-tenant AI agent listing in orchestrator`
- `[ ] Add pending approvals monitor in ops dashboard`
- `[ ] Add AI cost alerting (notify super admin at threshold)`
- `[ ] Build agent_conversations table for LLM message history`
- `[ ] Add RAG context injection to message processor`
- `[ ] Document all required env vars in .env.example`
