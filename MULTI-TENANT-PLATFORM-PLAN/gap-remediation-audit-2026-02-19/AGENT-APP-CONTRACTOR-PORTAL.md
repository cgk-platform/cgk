# App Deep-Dive Audit: Contractor Portal
**Date:** 2026-02-19 | **App:** apps/contractor-portal

---

## Auth Audit

### Status: Foundational architecture is solid, but the entire auth flow is non-functional — the `/api/auth/*` routes that the sign-in/forgot-password/reset-password pages call do not exist. No Next.js route middleware protects the portal pages at the server level. The auth library itself (JWT, sessions, cookies, rate limiting) is well-designed but disconnected from the UI.

#### What's working:
- JWT uses a separate `CONTRACTOR_JWT_EXPIRATION='7d'` and `issuer: 'cgk-contractor-portal'` — tokens from admin/creator portals cannot be accepted
- Cookie name `contractor_session` is distinct from admin/creator cookies
- `requireContractorAuth()` is called at the top of every API route handler
- Session validation on every request: checks `expires_at`, `revoked_at`
- Status gate at login: `suspended` / `inactive` / `pending` contractors are blocked
- All DB queries flow through `withTenant(tenantSlug, ...)` — tenant slug comes from the verified JWT, not from user input

#### Gaps:

- [ ] **[P0-AUTH-1] Create `/api/auth/signin` route.** The sign-in page (`app/(auth)/signin/page.tsx`) POSTs to `/api/auth/signin` which does not exist. Login is completely broken. Must accept `{email, password, tenantSlug?}`, call `authenticateContractor()`, create a session, sign a JWT, and set the `contractor_session` cookie.
- [ ] **[P0-AUTH-2] Create `/api/auth/forgot-password` route.** The forgot-password page calls `/api/auth/forgot-password`. Must call `createPasswordResetToken()` + `sendPasswordResetEmail()`.
- [ ] **[P0-AUTH-3] Create `/api/auth/reset-password` route.** The reset-password page calls `/api/auth/reset-password`. Must call `verifyPasswordResetToken()` + `updateContractorPassword()`.
- [ ] **[P0-AUTH-4] Create `/api/auth/signout` route.** Currently no signout mechanism exists. Must call `revokeContractorSession()` and clear the cookie.
- [ ] **[P0-AUTH-5] Create `/auth/verify` route for magic link verification.** `sendContractorMagicLinkEmail()` builds URL `/auth/verify?token=...&email=...&tenant=...` but this page/handler does not exist. Magic link auth is completely broken.
- [ ] **[P0-AUTH-6] Create Next.js `src/middleware.ts` to protect portal routes.** There is no `middleware.ts` file at the app root. The `(portal)/*` route group renders HTML to unauthenticated users (they get the shell, then a 401 triggers a client-side redirect to `/login`). The redirect URL is also wrong — it points to `/login` but the actual route is `/signin`. Add a Next.js edge middleware that validates the `contractor_session` cookie and redirects to `/signin` for any `(portal)/*` request without a valid session.
- [ ] **[P0-AUTH-7] Fix 401 redirect URL.** `DashboardPage` and other portal pages redirect to `window.location.href = '/login'` on 401. The actual sign-in route is `/signin`.
- [ ] **[P1-AUTH-8] Enforce `CONTRACTOR_JWT_SECRET` as a required env var.** The JWT module falls back to the shared `JWT_SECRET` (`process.env.CONTRACTOR_JWT_SECRET || process.env.JWT_SECRET`). If both portals share the same JWT secret, a compromised admin JWT can generate valid contractor tokens. Mark `CONTRACTOR_JWT_SECRET` as required in `env-validation.ts`.
- [ ] **[P1-AUTH-9] Replace in-memory rate limiter with Redis.** `rate-limit.ts` uses `new Map<string, {count, resetAt}>()` stored in the Node.js process. In multi-instance/serverless deployments, each instance has a separate map — rate limits are not enforced globally. Replace with Redis (already available via `@upstash/ratelimit` or direct Redis calls through `@cgk-platform/db`).
- [ ] **[P1-AUTH-10] Add CSRF protection to state-changing API routes.** POST/PATCH/DELETE routes have no CSRF token check. Since the portal uses `SameSite=Lax` cookies, cross-site form submission from a foreign origin can trigger requests. Add a `X-CSRF-Token` header check or use `SameSite=Strict`.
- [ ] **[P2-AUTH-11] Add tenant slug resolution to the sign-in flow.** The sign-in page has no field for tenant slug. Contractors cannot know their tenant slug. Options: (a) embed it in the invite URL and store in cookie/localStorage, (b) add a `?tenant=slug` query param to the portal domain, (c) use subdomain-based routing. The JWT is built with `tenantSlug` from the auth context — this value must come from somewhere at login time.
- [ ] **[P2-AUTH-12] Create `/signup` page and invitation redemption flow.** The sign-in page links to `/signup` but this page doesn't exist. Contractors are invited via admin → `contractor_invitations` table, but there is no route in the contractor portal to verify the token and complete registration. Create a signup page that validates the invitation token, sets a password, and activates the account.
- [ ] **[P3-AUTH-13] Upgrade cookie to `SameSite=Strict`.** Currently `SameSite=Lax`. For a portal where contractors only directly navigate (no OAuth redirects initiated from other origins), `Strict` provides stronger CSRF protection.

---

## Permissions Audit

### Status: API-level contractor data isolation is enforced. No intra-contractor role system exists (every contractor is identical). Several settings/security API routes are missing entirely. One admin-only status transition is incorrectly callable by contractors.

#### What's working:
- All API routes gate on `requireContractorAuth()` before any data access
- All project/session queries enforce `WHERE contractor_id = ${auth.contractorId}` — no IDOR possible via project ID manipulation
- `updateProjectStatus()` blocks admin-only statuses: `approved`, `revision_requested`, `payout_approved`
- Payment methods, balance, withdrawals, and tax data all scoped by `auth.contractorId + auth.tenantSlug`

#### Gaps:

- [ ] **[P0-PERM-1] Create `/api/contractor/settings/password` (POST) route.** Security settings page POSTs to this route to change password — the route doesn't exist.
- [ ] **[P0-PERM-2] Create `/api/contractor/sessions` (GET + DELETE) routes.** Security page fetches real sessions and calls DELETE to sign out all sessions — these routes don't exist. Currently the page uses hardcoded `mockSessions` — live data is never shown.
- [ ] **[P0-PERM-3] Create `/api/contractor/sessions/[id]` (DELETE) route.** Security page calls DELETE per-session to revoke individual sessions — doesn't exist.
- [ ] **[P0-PERM-4] Create `/api/contractor/profile` (GET + PATCH) route.** Profile settings page calls this route to read and update contractor profile — doesn't exist.
- [ ] **[P0-PERM-5] Create `/api/contractor/settings/notifications` (GET + POST) route.** Notification settings page calls this route — doesn't exist.
- [ ] **[P1-PERM-6] Block contractor from self-setting `payout_ready` status.** In `STATUS_TRANSITIONS`, `approved → payout_ready` is marked "Admin action" in the comment but is NOT blocked by `adminOnlyStatuses` in `updateProjectStatus()`. A contractor at `approved` status can PATCH the project to `payout_ready`, bypassing admin approval of the payout amount. Add `payout_ready` to `adminOnlyStatuses`.
- [ ] **[P1-PERM-7] Create account deletion route or remove the dead link.** Settings index links to `/settings/delete-account` (doesn't exist). Security page has a "Delete Account" button with no handler. Either implement account deletion (which should set status to `inactive` and revoke all sessions) or remove the UI elements.
- [ ] **[P2-PERM-8] Add intra-contractor role support.** All contractors have identical permissions. There is no contractor "team" or "admin sub-role" concept. If future multi-contractor agency accounts are needed, add a `role` field to the contractor record (e.g., `individual | team_lead | agency_admin`).
- [ ] **[P2-PERM-9] Remove all hardcoded mock data from production pages.** `SecuritySettingsPage` uses `const mockSessions: Session[] = [...]` — hardcoded fake sessions displayed until the real API exists. This is a UI integrity issue.
- [ ] **[P3-PERM-10] Validate `amountCents` on withdrawal is ≤ available balance server-side.** The withdrawal route fetches balance and creates a withdrawal, but `createContractorWithdrawal()` in the payments package should enforce this constraint. Verify that it does — if not, add an explicit guard.

---

## Tenant Provisioning Audit

### Status: Contractor accounts are correctly scoped to tenant schemas via `withTenant()`. However, the complete provisioning flow (invite → accept → activate) is broken — admin sends invitation but contractor portal has no route to redeem it. Self-signup is also broken.

#### What's working:
- `authenticateContractor()` and all auth functions require `tenantSlug` parameter
- `withTenant()` ensures all queries run in the correct schema — cross-tenant data leakage via DB is impossible
- `contractors` table has a unique index on `(tenant_id, email)` — same email can exist in different tenants without conflict
- Admin portal creates contractors under `tenantId` and `tenantSlug` headers (from `x-tenant-slug` / `x-tenant-id`)

#### Gaps:

- [ ] **[P0-PROV-1] Create invitation redemption flow in contractor portal.** The admin portal creates records in `contractor_invitations` table (with `token`), but the contractor portal has no route to verify and accept the invitation. Need: `GET /api/auth/invite?token=X` to validate token + `POST /api/auth/invite` to complete registration. Without this, contractors can never join via invitation.
- [ ] **[P0-PROV-2] The admin invitation email job is commented out.** In `apps/admin/src/app/api/admin/contractors/invite/route.ts`, the line `// await jobs.send('contractor/invitation', {...})` is commented out. Invitation emails are never sent. Implement the job handler in `@cgk-platform/jobs` and wire it to `@cgk-platform/communications`.
- [ ] **[P1-PROV-3] Pass tenant slug to contractor portal via invitation URL.** Contractors arrive at the portal with no way to know their tenant slug — the JWT is built with it, so it must be present at login time. The invitation URL should encode it: `{CONTRACTOR_PORTAL_URL}/?tenant={slug}&invite={token}`. The sign-in and invite-accept pages must read this from query params and store it for the auth session.
- [ ] **[P1-PROV-4] Guard `createContractor()` against open self-registration.** `createContractor()` in `authenticate.ts` is a public function that inserts a contractor record with status `pending`. If an `/api/auth/signup` route is ever created without invitation validation, anyone could self-register to any tenant. Ensure any signup route validates a valid invitation token before calling `createContractor()`.
- [ ] **[P2-PROV-5] Add invitation expiry and one-time-use check in the portal.** The `contractor_invitations` table has `expires_at` and `accepted_at` columns. The portal redemption route must check both: reject expired invitations and reject already-accepted tokens.
- [ ] **[P2-PROV-6] Emit a lifecycle event when contractor status changes to `active`.** Currently, no event/job is triggered when an admin activates a contractor. Downstream systems (communications for welcome email, analytics for onboarding funnel) need this signal.
- [ ] **[P3-PROV-7] Add tenant-specific branding to contractor portal.** `CONTRACTOR_PORTAL_URL` is a single global URL. If tenants want white-labeled contractor portals (different logos/colors), consider subdomain routing (`{slug}.contractors.cgk.dev`) + dynamic theme config from `portal_theme_config` table.

---

## OAuth & Integrations Audit

### Status: Stripe Connect OAuth flow is implemented but has a critical security vulnerability — the OAuth state parameter is not signed, allowing attackers to forge state and potentially hijack the Connect account assignment. The self-hosted onboarding alternative is also present but uses deprecated Stripe OAuth.

#### What's working:
- Stripe Connect OAuth URL generation and callback handler both exist
- Self-hosted onboarding (4-step) is fully implemented
- Auth is checked before OAuth URL generation
- Callback redirects to payout methods page with success/error

#### Gaps:

- [ ] **[P0-OAUTH-1] Sign the Stripe Connect OAuth state parameter with HMAC.** The current state is `Buffer.from(JSON.stringify({payeeId, tenantSlug, timestamp})).toString('base64')`. This is base64 encoding, NOT signing — anyone can craft a valid state by base64-encoding arbitrary JSON. An attacker can forge a state with a victim's `payeeId` and connect the attacker's Stripe account to the victim's contractor profile. Fix: sign the state with HMAC-SHA256 using a server secret and verify the signature in the callback.
- [ ] **[P0-OAUTH-2] Validate auth session in the OAuth callback.** In `/api/contractor/payments/connect/oauth/callback/route.ts`, `getContractorAuthContext(req)` is called but its result is explicitly discarded with the comment "may not be available if session expired (not used but available for future logging)". The callback then proceeds using only the state parameter to identify the target payee. The session MUST be validated to confirm the currently authenticated user matches the `payeeId` in the state. Without this, a CSRF attack can connect any Stripe account to any contractor.
- [ ] **[P1-OAUTH-3] Bind OAuth state to the current contractor session.** Even with HMAC signing, include the session ID in the state payload and verify it in the callback. This prevents a signed state from one session being replayed in another session.
- [ ] **[P1-OAUTH-4] Deprecation: Stripe Connect OAuth (Standard Account) is deprecated.** Stripe deprecated `response_type=code` OAuth in 2024 in favor of Connect Account Sessions and the Stripe.js Connect Embedded Components. Plan migration to the new flow.
- [ ] **[P1-OAUTH-5] Add `CONTRACTOR_JWT_SECRET` and other auth secrets to required env vars.** Currently `CONTRACTOR_JWT_SECRET` is optional with fallback to `JWT_SECRET`. Add explicit validation.
- [ ] **[P2-OAUTH-6] Verify Stripe account ownership after OAuth callback.** After `handleStripeOAuthCallback()`, verify the returned Stripe account ID belongs to the expected payee. A Stripe account associated with the wrong tenant should be rejected.
- [ ] **[P3-OAUTH-7] Implement PKCE (Proof Key for Code Exchange) for OAuth flows.** While Stripe does not require PKCE for Connect OAuth, implementing it provides additional state binding and prevents code injection attacks.

---

## Database & Schema Audit

### Status: CRITICAL — Two core table schemas in the migrations diverge completely from what the code expects. Contractor payment tables are entirely missing. The portal is non-operational at the database level.

#### What's working:
- `contractors` table (027) schema matches `authenticate.ts` field mappings
- `contractor_invitations` table (049) matches admin invite flow
- `contractor_magic_links` table (050) matches `magic-link.ts`
- `contractor_password_reset_tokens` table (051) exists
- `tax_payees` / `tax_forms` tables (036) use `payee_id`/`payee_type` structure compatible with the payments package
- All data access is tenant-scoped via `withTenant()` — no cross-tenant DB leakage possible

#### Gaps:

- [ ] **[P0-DB-1] Rewrite `contractor_sessions` migration (052) to match code schema.** The existing migration has `token TEXT NOT NULL UNIQUE` but the code inserts `token_hash`. The migration lacks: `tenant_id`, `device_info`, `device_type`, `revoked_at`, `last_active_at` (migration has `last_activity_at`). Session creation and validation will fail with column-not-found errors. Write a new migration that aligns columns with `session.ts`.
- [ ] **[P0-DB-2] Rewrite `contractor_projects` migration (048) to match code schema.** The existing migration has: `budget_cents` (code uses `rate_cents`); status CHECK of `active/completed/cancelled/on_hold` (code uses 9-stage Kanban values: `pending_contractor`, `draft`, `in_progress`, `submitted`, `revision_requested`, `approved`, `payout_ready`, `withdrawal_requested`, `payout_approved`); no columns for `tenant_id`, `due_date`, `rate_type`, `submitted_work`, `revision_notes`, `submitted_at`, `approved_at`. All project API endpoints will fail.
- [ ] **[P0-DB-3] Create `payment_requests` table migration.** The payments package (`contractor/payment-request.ts`) queries `payment_requests` with columns: `payee_id`, `tenant_id`, `amount_cents`, `description`, `work_type`, `project_id`, `attachments`, `status`, `admin_notes`, `approved_amount_cents`, `rejection_reason`, `reviewed_at`, `paid_at`. This table does not exist in any migration. All payment request endpoints will fail.
- [ ] **[P0-DB-4] Create `withdrawal_requests` table migration.** The payments package (`contractor/withdrawal.ts`) queries `withdrawal_requests` with `payee_id`, `tenant_id`, `amount_cents`, `payout_method_id`, `status`, `processed_at`, `failure_reason`. This table does not exist. All withdrawal endpoints will fail.
- [ ] **[P0-DB-5] Create `payout_methods` table migration.** The payments package (`contractor/payout-methods.ts`) queries `payout_methods` with extensive Stripe Connect and alternative payment fields. This table does not exist. All payout method endpoints will fail.
- [ ] **[P0-DB-6] Create `stripe_onboarding_progress` table migration.** The stripe-connect package queries this table for multi-step onboarding state. Does not exist. All Stripe onboarding endpoints will fail.
- [ ] **[P0-DB-7] Create `balance_transactions` table with `payee_id` for contractor use.** Migration 005 defines `balance_transactions` with `creator_id NOT NULL REFERENCES creators(id)`. The payments package queries `balance_transactions WHERE payee_id = ${payeeId}`. Either add a new contractor-scoped `payee_id` to the existing table or create a new `contractor_balance_transactions` table. Currently all transaction history queries will fail.
- [ ] **[P0-DB-8] Create `payment_attachments` table migration.** `createPaymentAttachment()` inserts into a `payment_attachments` table that doesn't exist.
- [ ] **[P1-DB-9] Add `tenant_id` FK constraint to `contractor_projects` table.** The corrected migration should add `tenant_id UUID NOT NULL REFERENCES public.organizations(id)` for DB-level tenant scoping, not just application-level.
- [ ] **[P1-DB-10] Add `tenant_id` FK constraint to `contractor_sessions` table.** Same as above — the session should have a DB-level FK to `organizations.id`.
- [ ] **[P2-DB-11] Set Vercel Blob upload access to `private`.** Invoice attachments are uploaded with `access: 'public'` — any person with the blob URL can download the invoice. Tax/financial documents should be private. Change to `access: 'private'` and generate signed URLs for access via the API.
- [ ] **[P2-DB-12] Add DB-level unique constraint on contractor email per tenant.** `027_contractors.sql` has `CREATE UNIQUE INDEX IF NOT EXISTS idx_contractors_tenant_email ON contractors(tenant_id, email)` — this is correct but should be confirmed present in the corrected migration.
- [ ] **[P3-DB-13] Create a migration consolidation plan for contractor tables.** Migrations 048–052 all have breaking schema divergences from code. These should be replaced with new authoritative migrations (not incremental patches) since the portal is not yet in production.

---

## Package Wiring Audit

### Status: Payments package is wired. Core infrastructure (db, ui, core) is wired. Critical packages (esign, communications, jobs) are NOT wired. Invitation email flow is dead-commented.

#### What's working:
- `@cgk-platform/payments` — imported and used throughout payment routes
- `@cgk-platform/db` — `sql` and `withTenant` used correctly in all data access
- `@cgk-platform/ui` — components imported throughout
- `@cgk-platform/core` — env validation used at startup
- `@vercel/blob` — used for invoice attachment uploads (access mode bug noted in DB section)

#### Gaps:

- [ ] **[P0-WIRE-1] Wire `@cgk-platform/jobs` for invitation email sending.** In `apps/admin/src/app/api/admin/contractors/invite/route.ts`, the line `// await jobs.send('contractor/invitation', {...})` is commented out. No invitation emails are sent. Create a `contractor/invitation` job handler in `packages/jobs/src/handlers/` and uncomment the send call. Define the job to call the communications package with the invite token URL.
- [ ] **[P0-WIRE-2] Wire `@cgk-platform/communications` for contractor email delivery.** `sendContractorMagicLinkEmail()` in `magic-link.ts` makes direct bare `fetch()` calls to `https://api.resend.com/emails` using the platform-level `RESEND_API_KEY`. This bypasses: email queuing, retry logic, tenant-level from-address configuration, and bounce/complaint handling in the communications package. Replace with a communications package call. Same applies to password reset emails.
- [ ] **[P1-WIRE-3] Wire `@cgk-platform/esign` for contractor contract signing.** The `contractors` table has `contract_url`, `contract_type`, `contract_signed_at` columns. There is no UI or API route in the contractor portal for a contractor to sign their contract. The esign package has `signing-session.ts`, `send.ts`, and `signers.ts`. Add a `/api/contractor/contract` route to get signing status and a contractor-facing signing flow.
- [ ] **[P1-WIRE-4] Wire `@cgk-platform/communications` for in-portal contractor notifications.** There is no messaging or notification system for contractors. Contractors cannot receive messages from admins or get notified of project status changes. The communications package has conversation/message infrastructure. Add a minimal notification API (`GET /api/contractor/notifications`) and connect it to the communications package.
- [ ] **[P2-WIRE-5] Wire `@cgk-platform/analytics` for contractor activity tracking.** No analytics events are fired from the contractor portal. Project submissions, payment requests, login events, and Stripe onboarding completions should emit events for admin visibility.
- [ ] **[P2-WIRE-6] Remove `@cgk-platform/auth` from `package.json` or use it.** The package is listed as a dependency but is only used in `oauth/callback/route.ts` with the auth context result discarded. Either use the shared auth primitives or remove the dependency and avoid the false signal that the portal uses the shared auth package.
- [ ] **[P3-WIRE-7] Wire `@cgk-platform/jobs` for payout processing events.** When a withdrawal is created (`createContractorWithdrawal()`), no job is queued to actually process the payout. The `withdrawal_requests` table would have a `status: 'pending'` record but nothing triggers the payment. Wire a `contractor/process-withdrawal` job.

---

## Super Admin Audit

### Status: Super admin has zero visibility into contractor data. No contractor data surfaces in the orchestrator. Admin portal has tenant-scoped contractor management. No cross-tenant contractor audit capability exists.

#### What's working:
- Admin portal (tenant-scoped) has contractor management: list, create, invite, update status, view projects and payments
- Admin-only status transitions are blocked at the project data layer
- Contractor financial records use `tenant_id` for isolation — super admin reading raw DB can scope by tenant

#### Gaps:

- [ ] **[P1-SA-1] Add contractor activity to super admin orchestrator.** The orchestrator (`apps/orchestrator`) has no contractor-related routes. A super admin cannot see: contractor sign-up rates, active contractor counts per tenant, pending payment request volumes, or contractor portal errors — without logging into each tenant's admin panel separately. Add cross-tenant contractor stats to orchestrator.
- [ ] **[P1-SA-2] Add contractor portal audit logging.** No audit events are written when contractors: sign in, change passwords, submit work, request payments, or complete Stripe onboarding. The `@cgk-platform/auth` package has an audit log infrastructure for super admin actions — extend it or create a `contractor_audit_log` table in each tenant schema to capture key contractor actions.
- [ ] **[P1-SA-3] Enable super admin to view contractor sessions and revoke them.** If a contractor account is compromised, there is no way for a super admin to force-revoke all contractor sessions across tenants. Add a super admin API to list and revoke contractor sessions by tenant.
- [ ] **[P2-SA-4] Super admin contractor impersonation is not implemented.** The impersonation system in `@cgk-platform/auth/src/impersonation.ts` targets regular platform users, not contractors. Super admins cannot view the contractor portal as a specific contractor for debugging. Add contractor impersonation: generate a short-lived contractor JWT for a specified contractor ID, scoped to their tenant.
- [ ] **[P2-SA-5] Add cross-tenant contractor payment monitoring.** Super admin cannot see aggregate payment request volumes, withdrawal totals, or W-9 submission rates across all tenants. This data matters for platform-level risk/compliance. Add to orchestrator reporting.
- [ ] **[P2-SA-6] Add failed contractor authentication monitoring.** Rate limit violations, login failures, and blocked-status login attempts are not surfaced anywhere. In-memory rate limiter means this data is ephemeral. Move rate limit events to Redis and expose a super admin view of auth anomalies.
- [ ] **[P3-SA-7] Add contractor portal health check to platform health monitoring.** The platform has a `health` package and health check history table. The contractor portal does not register a health check endpoint. Add a `GET /api/health` route that checks: DB connectivity (withTenant), payments package availability, and environment variable completeness.

---

## Priority Summary

### P0 Critical: (App is non-functional without these)
1. **[P0-AUTH-1]** Create `/api/auth/signin` route — login is broken
2. **[P0-AUTH-2]** Create `/api/auth/forgot-password` route — password reset broken
3. **[P0-AUTH-3]** Create `/api/auth/reset-password` route — password reset broken
4. **[P0-AUTH-4]** Create `/api/auth/signout` route — no signout mechanism
5. **[P0-AUTH-5]** Create `/auth/verify` magic link page/handler — magic link auth broken
6. **[P0-AUTH-6]** Create Next.js `src/middleware.ts` — portal pages unprotected at route level
7. **[P0-AUTH-7]** Fix 401 redirect to `/signin` not `/login`
8. **[P0-OAUTH-1]** Sign OAuth state with HMAC — critical Stripe account takeover vector
9. **[P0-OAUTH-2]** Validate auth session in OAuth callback — CSRF attack on Stripe connect
10. **[P0-PERM-1]** Create `/api/contractor/settings/password` — password change broken
11. **[P0-PERM-2/3]** Create session management API routes — security page non-functional
12. **[P0-PERM-4]** Create `/api/contractor/profile` — profile settings broken
13. **[P0-PERM-5]** Create `/api/contractor/settings/notifications` — notifications settings broken
14. **[P0-PROV-1]** Create invitation redemption flow — contractors cannot onboard
15. **[P0-WIRE-1]** Fix contractor invitation email job (commented out) — invites never sent
16. **[P0-DB-1]** Rewrite `contractor_sessions` migration — schema mismatch, auth broken at DB
17. **[P0-DB-2]** Rewrite `contractor_projects` migration — schema mismatch, all project routes fail
18. **[P0-DB-3]** Create `payment_requests` migration — payment request endpoints all fail
19. **[P0-DB-4]** Create `withdrawal_requests` migration — withdrawal endpoints all fail
20. **[P0-DB-5]** Create `payout_methods` migration — payout method endpoints all fail
21. **[P0-DB-6]** Create `stripe_onboarding_progress` migration — Stripe onboarding fails
22. **[P0-DB-7]** Fix/create `balance_transactions` with `payee_id` — transaction history broken
23. **[P0-DB-8]** Create `payment_attachments` migration — invoice upload fails

### P1 High: (Security or core functionality)
- **[P1-AUTH-8]** Enforce `CONTRACTOR_JWT_SECRET` isolation
- **[P1-AUTH-9]** Redis-backed rate limiter for multi-instance safety
- **[P1-AUTH-10]** CSRF token protection on POST/PATCH/DELETE routes
- **[P1-PERM-6]** Block contractor from self-setting `payout_ready` status
- **[P1-PERM-7]** Implement or remove account deletion
- **[P1-PROV-3]** Tenant slug passed via invitation URL
- **[P1-PROV-4]** Guard against open self-registration
- **[P1-OAUTH-3]** Bind OAuth state to session ID
- **[P1-OAUTH-4]** Plan migration away from deprecated Stripe Connect OAuth
- **[P1-WIRE-3]** Wire esign package for contractor contract signing
- **[P1-WIRE-4]** Wire communications for contractor notifications
- **[P1-DB-9/10]** Add tenant_id FK to contractor_projects and contractor_sessions
- **[P1-SA-1]** Add contractor stats to super admin orchestrator
- **[P1-SA-2]** Contractor portal audit logging
- **[P1-SA-3]** Super admin contractor session revocation

### P2 Medium: (Functionality gaps, architectural improvements)
- **[P2-AUTH-11]** Tenant slug resolution at sign-in
- **[P2-AUTH-12]** `/signup` page with invitation redemption
- **[P2-PERM-8]** Intra-contractor role support
- **[P2-PERM-9]** Remove mock session data
- **[P2-PERM-10]** Server-side balance check before withdrawal
- **[P2-PROV-5/6]** Invitation expiry enforcement, contractor activation events
- **[P2-OAUTH-6]** Verify Stripe account ownership post-callback
- **[P2-DB-11]** Make blob uploads private, serve via signed URLs
- **[P2-WIRE-5]** Analytics events from contractor portal
- **[P2-WIRE-6]** Remove or use `@cgk-platform/auth` dependency
- **[P2-WIRE-7]** Queue payout processing jobs
- **[P2-SA-4]** Super admin contractor impersonation
- **[P2-SA-5]** Cross-tenant contractor payment monitoring
- **[P2-SA-6]** Failed auth monitoring

### P3 Low: (Polish, future-proofing)
- **[P3-AUTH-13]** Upgrade to `SameSite=Strict`
- **[P3-PROV-7]** Tenant-branded contractor portal (subdomain routing)
- **[P3-OAUTH-7]** PKCE for OAuth flows
- **[P3-DB-12]** Verify unique email constraint in corrected migration
- **[P3-DB-13]** Migration consolidation plan
- **[P3-WIRE-1b]** Job handler for `contractor/invitation` in jobs package
- **[P3-SA-7]** Contractor portal health check endpoint
