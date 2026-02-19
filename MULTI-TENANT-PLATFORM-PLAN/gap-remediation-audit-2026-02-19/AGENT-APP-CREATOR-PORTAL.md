# App Deep-Dive Audit: Creator Portal
**Date:** 2026-02-19 | **App:** apps/creator-portal

---

## Auth Audit

### Status: Partially implemented — JWT + session hybrid, multi-brand memberships in token, but critical production risks and missing Next.js middleware route protection.

**How it works:**
- JWT signed with `CREATOR_JWT_SECRET` (HS256, 7-day expiry via `jose` library)
- JWT payload: `sub` (creatorId), `sid` (sessionId), `email`, `name`, `memberships[]`
- Sessions stored in `public.creator_sessions` (token hashed SHA-256, 30-day expiry)
- On every API call: JWT verified → session validated in DB via `validateCreatorSessionById()`
- Auth cookie set by `getSetCookieHeader()`, read by `getTokenFromRequest()`
- Magic link support (24-hour expiry, purpose-filtered `magic_links` table)
- In-memory rate limiting on login and magic-link endpoints
- Brand membership embedded directly in JWT; `brandId`/`brandSlug`/`status` per membership
- Multi-brand access: creator can hold memberships in N brands simultaneously
- Login page: single generic login page — no per-tenant theming or configuration exists

#### Gaps:
- [ ] **P0 — No Next.js root `middleware.ts`**: There is no `src/middleware.ts` in the creator portal. The `(portal)` layout is a client component with zero server-side auth enforcement. Any unauthenticated user can load `/dashboard`, `/projects`, `/payments`, etc. — the UI renders and auth only fails when the page makes its first API call. Add a Next.js edge middleware that validates the auth cookie server-side and redirects to `/login` if missing/invalid.
- [ ] **P0 — `CREATOR_JWT_SECRET` falls back to hardcoded dev string**: `src/lib/auth/jwt.ts` line: `process.env.CREATOR_JWT_SECRET || process.env.JWT_SECRET || 'creator-development-secret'`. If neither env var is set in production, all JWTs are signed with a known public string. Add a startup check that throws if `CREATOR_JWT_SECRET` is unset in non-development environments.
- [ ] **P1 — JWT memberships stale for 7 days**: Brand memberships are embedded at login time and cached in the JWT for 7 days. If admin revokes/suspends/adds a brand membership, the creator's JWT still reflects the old state until expiry or re-login. Session validation only checks `revoked_at`, not membership freshness. Add a membership version hash to the JWT and validate it against DB on each request, or reduce JWT expiry to 1 hour with silent refresh.
- [ ] **P1 — Suspended creator status not re-checked at session validation**: `validateCreatorSessionById()` queries `creator_sessions` only (not `creators.status`). A suspended creator with a live session continues to access the portal until the session expires. Add `JOIN creators ON creators.id = creator_sessions.creator_id WHERE creators.status != 'suspended'` to the session validation query.
- [ ] **P2 — No per-tenant login page configuration**: The login page shows generic "Creator Portal" branding regardless of which tenant's creator portal the user is visiting. There is no mechanism to inject tenant-specific logo, colors, or custom welcome message on the login/onboarding pages. Add `tenant_onboarding_settings` data (logo, brand colors, welcome text) to the public login/apply page via `getTenantFromRequest()`.
- [ ] **P2 — Magic link email hardcoded from address**: `sendCreatorMagicLinkEmail()` uses `process.env.EMAIL_FROM || 'noreply@cgk.dev'` — not tenant-specific. A creator applying to Brand X gets an email from cgk.dev. Should use the tenant's configured sender address via `getTenantResendSenderConfig()`.
- [ ] **P3 — `inactive` creator status allows login**: `authenticateCreator()` blocks `suspended` and `inactive` but the magic-link verify route (`/api/creator/auth/verify`) only blocks `suspended`. An `inactive` creator can log in via magic link. Align both paths to block `inactive` as well.

---

## Permissions Audit

### Status: API routes individually guarded via `requireCreatorAuth()`, but no server-side page protection, no role system, and dangerous single-membership assumption in multi-brand routes.

**What exists:**
- All `/api/creator/*` routes call `requireCreatorAuth()` manually at the top
- Brand access checks: `hasBrandAccess()` / `requireBrandAccess()` in middleware helpers
- `getAccessibleBrandIds()` returns only active memberships
- No role differentiation — all creators have identical capabilities

#### Gaps:
- [ ] **P0 — Portal pages not server-side protected**: The `(portal)` group layout is a `'use client'` component. There is no server component or middleware guarding `/dashboard`, `/projects`, `/contracts`, etc. Unauthenticated users see the full portal shell until the API call fails. Implement either Next.js `middleware.ts` (preferred) or convert the layout to a server component that checks the auth cookie.
- [ ] **P0 — Onboarding completion not enforced as gate**: A creator with `onboarding_completed = false` can freely navigate to `/dashboard`, `/projects`, `/payments` — the flag is informational only. The portal should redirect to `/onboarding` if `onboardingCompleted` is false, enforced server-side.
- [ ] **P1 — Project and esign routes use "first active membership" instead of project's brand**: In `GET /api/creator/projects/[id]` and `GET /api/creator/esign`, the code does `context.memberships.find((m) => m.status === 'active')` — always picking the **first** active membership's `brandSlug` as the tenant context. For a creator in multiple brands, this can load the wrong tenant's projects or signing requests. Routes must either: (a) accept `brandId` as a query param and validate it against the creator's memberships, or (b) look up which brand owns the resource before selecting the tenant.
- [ ] **P1 — `pending` status creators can access the portal**: Only `suspended` and `inactive` creators are blocked at login. A creator with status `pending` (not yet approved) can log in and see the dashboard, projects, and payments routes. The `pending` status should also gate portal access until onboarding is complete.
- [ ] **P2 — No role/tier-based permissions**: Creator tier (`bronze`, `silver`, `gold`, `platinum`) exists in the admin schema but is not surfaced in the creator portal's JWT or permissions system. Premium features (early payment, higher commission visibility) have no permission enforcement layer.
- [ ] **P2 — Brand filter cookie not validated server-side for ownership**: `getBrandFilter()` reads the `cgk_creator_selected_brand` cookie and validates against JWT memberships (good), but if the JWT memberships are stale (see Auth gap), the cookie could pass a no-longer-valid brand through. Re-validate against DB on sensitive operations (payments, withdrawals).
- [ ] **P3 — No CSRF protection on mutation endpoints**: Auth relies on `HttpOnly` cookie, which is correct, but there's no CSRF token on `POST`/`PATCH`/`DELETE` API routes. For same-origin Next.js apps this is lower risk but should be documented.

---

## Tenant Provisioning Audit

### Status: BROKEN — The admin approval flow creates a creator record but does not create the brand membership row the creator portal depends on. Creators cannot log in after approval because no password/magic-link setup is triggered.

**Application flow (what currently exists):**
1. Creator submits application → `POST /api/creator/onboarding` → stored in tenant `creator_applications` table
2. Admin reviews via `/admin/creators/applications/` → calls `/api/admin/creators/applications/[id]/approve`
3. Approval route creates a `creators` record in the tenant schema and sends welcome email
4. No further automated provisioning occurs

#### Gaps:
- [ ] **P0 — Admin approval creates creator in WRONG schema with WRONG columns**: The approve route (`apps/admin/src/app/api/admin/creators/applications/[id]/approve/route.ts`) inserts into `creators` using tenant context (`withTenant()`), but the `creators` table is in the **public** schema (migration `016_creators.sql`). Furthermore, it uses column names `first_name`, `last_name`, `commission_rate_pct`, `referral_code` that **do not exist** in the public schema migration — which has `name`, `commission_percent` (in memberships), `discount_code` (in memberships). This INSERT will fail at runtime. Fix: the approval route must insert into `public.creators` (no withTenant wrapper) using correct column names.
- [ ] **P0 — `creator_brand_memberships` row never created on approval**: The creator portal's auth, dashboard, projects, payments, and esign routes ALL depend on `creator_brand_memberships` to determine which brands a creator has access to. The approval route creates a creator record but never inserts a row into `creator_brand_memberships`. As a result, `loadBrandMemberships()` returns an empty array, JWT contains no memberships, and the creator effectively cannot access anything. Add `INSERT INTO creator_brand_memberships (creator_id, organization_id, status, commission_percent, discount_code)` immediately after creator creation in the approval route.
- [ ] **P0 — No account setup mechanism after approval**: The approval email links to `/login` but the creator has no password and no magic link. They cannot log in. The approval flow must either: (a) auto-generate and send a magic link in the approval email, or (b) link to a `/setup-account` page where the creator sets their password.
- [ ] **P1 — `onboarding-wizard/complete` accepts `creatorId` from request body**: The route reads `const creatorId = request.headers.get('x-creator-id') || wizardData.creatorId`. This is not validated against a JWT session — any party that knows a creator UUID can mark their onboarding complete and activate their account. This endpoint must call `requireCreatorAuth()` and use `context.creatorId`.
- [ ] **P1 — Application ↔ public creator record not linked by organization**: When an application is approved, the resulting `creators` record needs to reference which `organization_id` (brand) approved them. Currently there's no FK from `creators` to `organizations`. The link is only through `creator_brand_memberships.organization_id`, which isn't created (see above P0 gap).
- [ ] **P1 — Duplicate application check is tenant-scoped but creator account is global**: The onboarding route checks `SELECT id FROM creator_applications WHERE email = ...` within a tenant — a creator who applied to Brand A cannot apply to Brand A again (good), but can apply to Brand B even if already approved on Brand A. This may be intentional (multi-brand) but the duplicate check should also verify the creator isn't already in `public.creators` to avoid conflicting account creation.
- [ ] **P2 — Rejection/waitlist notifications use hardcoded sender**: Same as auth — rejection emails should use tenant-configured email sender, not `noreply@${tenantSlug}.com`.
- [ ] **P2 — No automated email verification step**: Creators are created with `email_verified = false` but there is no flow to send a verification email or block portal access until verified. The `email_verified` column is set but never enforced.
- [ ] **P3 — Application draft cleanup**: `DELETE FROM creator_application_drafts WHERE email = ...` happens after submit, but there's no TTL cleanup for orphaned drafts if the creator never submits.

---

## OAuth & Integrations Audit

### Status: Stripe Connect OAuth exists for payout setup only; no social login, no social verification OAuth. CSRF risk on Stripe OAuth callback unverified.

**What exists:**
- Stripe Connect OAuth: `GET /api/creator/payments/connect/oauth` generates OAuth URL; callback at `/api/creator/payments/connect/oauth/callback`
- Magic link (passwordless, via email)
- Password-based login

#### Gaps:
- [ ] **P1 — Stripe OAuth state parameter CSRF risk**: The OAuth state is `base64url(JSON({creatorId, methodId, country}))` — no HMAC signature or random nonce. A malicious actor could craft a state that associates a Stripe account with a different creator. The callback must: (a) validate the creator in state matches the authenticated session, and (b) include a server-side random nonce stored in the session to prevent CSRF.
- [ ] **P1 — No account setup / password-set flow**: Creators approved via admin have no password. There's a password reset mechanism (`creator_password_reset_tokens` table exists) but no "set initial password" flow for new accounts. The magic link is the only entry point but isn't automatically sent.
- [ ] **P2 — No social OAuth for login**: No Google/Apple/Instagram SSO. For a creator-facing app, social login dramatically reduces friction. The `Platform` type (`instagram`, `tiktok`, `youtube`, etc.) and `PlatformPreference` types exist in the type system but are entirely self-reported.
- [ ] **P2 — Social platform handles not verified via OAuth**: Creator profiles include `PlatformPreference[]` with `handle` and `followerCount`, but these are manually entered. There's no TikTok/Instagram/YouTube OAuth to verify ownership and pull real follower counts. This creates trust and fraud risk for commission tier assignment.
- [ ] **P2 — Brand OAuth connections (Shopify, etc.) not surfaced in creator portal**: The admin app has Shopify/Klaviyo/Stripe integrations, but creators have no way to see which integrations the brand uses or connect their own accounts.
- [ ] **P3 — Wise integration lacks OAuth**: Wise payout method setup uses direct recipient ID entry rather than Wise OAuth, creating manual validation burden.

---

## Database & Schema Audit

### Status: Schema design is sound for multi-brand creators (public schema global, tenant schema per-brand), but there are critical column name mismatches, missing migrations, and a balance ledger race condition.

**Key tables:**
- `public.creators` — global creator identity
- `public.creator_brand_memberships` — M:M link to organizations with per-brand commission/balance
- `public.creator_sessions` — session store
- `public.creator_balance_transactions` — unified earnings ledger
- `public.creator_payment_methods` — Stripe/Wise payout configs
- `public.withdrawal_requests` — payout requests
- `public.creator_conversations` / `creator_messages` — messaging
- `tenant.creator_applications` — per-brand applications
- `tenant.creator_application_drafts` — in-progress applications
- `tenant.commissions` — per-brand commission records

#### Gaps:
- [ ] **P0 — `creator_memberships` vs `creator_brand_memberships` table name mismatch**: `GET /api/creator/brands` queries `FROM creator_memberships` but the migration creates the table as `creator_brand_memberships`. This API route will throw a "relation does not exist" error at runtime. Align the query to match the migration name.
- [ ] **P0 — `creator_balance_transactions.brand_id` is TEXT not UUID FK**: Column is `brand_id TEXT` with no foreign key constraint to `organizations.id`. Incorrect brand IDs (wrong format, non-existent organizations) can be silently inserted. Change to `brand_id UUID REFERENCES organizations(id)` with a nullable constraint.
- [ ] **P0 — Missing `first_login_at` column in `creators` migration**: `markFirstLogin()` and dashboard route query `first_login_at` on the `creators` table, but `016_creators.sql` does not define this column. Runtime errors on first-login tracking. Add the column to the migration.
- [ ] **P0 — Missing `creator_onboarding_wizard_progress` migration**: The onboarding wizard complete route updates this table (`UPDATE creator_onboarding_wizard_progress SET wizard_data = ...`) but no migration for this table exists in the public migrations directory. Create the migration.
- [ ] **P0 — Missing `creator_agreement_signatures` migration**: The onboarding wizard complete route inserts into `creator_agreement_signatures` but no migration exists. Create the migration.
- [ ] **P1 — Balance ledger race condition in `recordBalanceTransaction()`**: The function reads current balance, computes `balance_after_cents`, then inserts — no transaction lock. Two concurrent payouts or commission credits can read the same `current_balance` and both write incorrect `balance_after_cents`. Wrap in a PostgreSQL advisory lock or use `SELECT ... FOR UPDATE` on the creator's balance row.
- [ ] **P1 — `withdrawal_requests.payment_method_id` is TEXT not UUID FK**: `payment_method_id TEXT` should reference `creator_payment_methods.id` to maintain referential integrity. A withdrawal can reference a deleted payment method with no constraint error.
- [ ] **P1 — No `creator_brand_preferences` migration visible**: The `BrandPreferences` type and routes reference `creator_brand_preferences` table but this migration wasn't present in the audited files. Verify the migration exists and includes the `notification_overrides`, `sample_address` JSONB columns.
- [ ] **P2 — `tax_form_status` in `creators` is TEXT not an enum**: Migration uses `TEXT DEFAULT 'pending'` rather than a proper enum, allowing invalid statuses to be stored. Create a `tax_form_status` enum type.
- [ ] **P2 — No index on `creator_balance_transactions(creator_id, type, available_at)`**: The `maturePendingCommissions()` function scans for `type = 'commission_pending' AND available_at <= NOW()` across all creators. For large datasets this is a full table scan. Add a composite index.
- [ ] **P3 — `creator_brand_memberships` balance columns not updated transactionally**: `balance_cents` and `pending_cents` on the membership row appear to be denormalized caches, but there's no trigger or application logic keeping them in sync with `creator_balance_transactions`. Implement a DB trigger or explicit sync function.

---

## Package Wiring Audit

### Status: Payments package is well-structured, but the admin → creator portal data pipeline is broken at multiple points: commission approval doesn't credit creator balance, esign completion doesn't update contract status, and the activity log is entirely unimplemented.

**What's connected:**
- `@cgk-platform/payments` used in creator portal for balance queries, withdrawal processing, Stripe Connect
- `@cgk-platform/db` used everywhere with `withTenant()` for tenant isolation
- Admin app reads tenant `creator_applications`, `commissions` — correctly tenant-scoped
- Messages: `creator_conversations` / `creator_messages` in public schema, admin reads via `/api/admin/creators/[id]/conversations`

#### Gaps:
- [ ] **P0 — Admin commission approval does NOT credit creator balance**: When admin calls `POST /api/admin/commissions/approve`, it updates `commissions.status = 'approved'` in the tenant schema. There is no call to `recordBalanceTransaction()` or any update to `creator_balance_transactions` or `creator_brand_memberships.balance_cents`. Creator balances are never populated by commission approvals. Wire the commission approve route to call `recordPendingCommission()` from `@cgk-platform/payments`.
- [ ] **P0 — Commission maturation not automated**: `maturePendingCommissions()` in `packages/payments/src/balance/index.ts` converts `commission_pending` to `commission_available` after the 30-day hold. No cron job, webhook, or background worker calls this function. Pending commissions will never become available for withdrawal. Set up a daily cron or Vercel cron job to run this.
- [ ] **P0 — Esign document signing does not update `contract_signed` flag**: When a creator signs a document via the esign flow, there is no code path that sets `creator_brand_memberships.contract_signed = true`. The dashboard shows `unsignedContractsCount` but it will never decrement. Add a post-signing webhook or callback that updates the membership record.
- [ ] **P1 — Withdrawal processing not automated**: `withdrawal_requests` are created but there is no cron job or Stripe/Wise webhook handler that processes `pending` withdrawals into actual payouts. The `withdrawal` module in `packages/payments/src/` defines the types but processing logic isn't wired to any scheduler.
- [ ] **P1 — Dashboard `recentActivity` permanently empty**: `GET /api/creator/dashboard` returns `recentActivity: []` with a comment `// Get recent activity (placeholder - would query from activity log)`. This is a shipped stub. Implement activity log queries against `creator_balance_transactions`, `creator_conversations`, and project status changes.
- [ ] **P1 — Admin actions on creator (suspend, note, status change) not reflected in creator portal in real-time**: If admin suspends a creator, the creator's active session continues to work (see Auth gap), and there's no notification surfaced in the portal. Add a server-sent event or polling endpoint for admin alerts that affect the creator's account.
- [ ] **P2 — No webhook from admin payment approvals to creator portal**: The creator portal's balance data is read from `public.creator_balance_transactions` but admin payment approvals write to the tenant `commissions` table. These two schemas are not wired together.
- [ ] **P2 — `active_projects_count` / `completed_projects_count` on memberships not updated**: These denormalized counters on `creator_brand_memberships` exist but there's no trigger or application code keeping them in sync when projects are created/completed.
- [ ] **P3 — Messages have no real-time delivery**: The creator inbox uses polling (`/api/creator/messages/[id]/poll`). No WebSocket or Server-Sent Events. Admin messages to creators are only seen on the next poll cycle. For high-traffic brands, this creates poor UX.
- [ ] **P3 — Tax document status (`tax_form_status`) updated manually**: There's no integration with a tax form provider (HelloSign, DocuSign) to automatically flip `tax_form_status = 'submitted'` when a creator completes their W-9. Dashboard shows the alert permanently.

---

## Super Admin Audit

### Status: No cross-tenant creator visibility exists in the orchestrator. Super admin cannot see, search, manage, or suspend creators across brands. Creator data is entirely siloed to individual brand admin apps.

**What exists:**
- Orchestrator manages brand provisioning (organizations table)
- Admin app has per-tenant creator management (applications, directory, inbox)
- No orchestrator pages or APIs for creators

#### Gaps:
- [ ] **P1 — No cross-tenant creator search**: Super admin (orchestrator) has no way to find a creator by email across all brands. If a creator is causing problems across multiple brands, there's no single view. Add a `GET /api/platform/creators?email=...` endpoint in the orchestrator that queries `public.creators` directly (bypassing tenant isolation, with super admin auth).
- [ ] **P1 — No global creator suspension**: Super admin cannot globally suspend a creator across all brands simultaneously. Currently they'd need to log into each brand's admin and suspend individually. Add a super admin action that sets `creators.status = 'suspended'` in the public schema and revokes all sessions via `revokeAllCreatorSessions()`.
- [ ] **P1 — No cross-tenant creator activity dashboard**: Super admin cannot see how many creators are active across all brands, total platform earnings flowing to creators, or creator churn rates. Add an orchestrator analytics page querying `public.creator_brand_memberships` and `public.creator_balance_transactions` (aggregated, no per-brand detail).
- [ ] **P2 — No platform-level audit log for creator actions**: There is no audit trail accessible to super admin for creator actions (logins, withdrawals, project submissions). The admin app has per-tenant views, but no platform-wide log. Consider adding `platform_audit_log` table in public schema or a structured logging pipeline.
- [ ] **P2 — No super admin impersonation of creator accounts**: For support purposes, super admin has no way to view the creator portal as a specific creator (impersonation). This means debugging creator-reported issues requires manual DB inspection. Add a super admin "view as creator" that generates a time-limited impersonation token.
- [ ] **P2 — Orchestrator brand provisioning wizard does not configure creator portal**: The orchestrator brand onboarding wizard (steps 1-9) provisions the admin app and tenant schema but does not configure `tenant_onboarding_settings` or the creator portal appearance for that brand. Add a creator portal setup step to the brand onboarding wizard.
- [ ] **P3 — No cross-brand creator deduplication**: A creator can theoretically create separate accounts per brand (different emails). No platform-level deduplication or identity resolution exists. Implement optional email+phone cross-reference at application time.

---

## Priority Summary

### P0 Critical (system-breaking / security):
1. No Next.js root `middleware.ts` — portal pages are publicly accessible to unauthenticated users
2. `CREATOR_JWT_SECRET` falls back to hardcoded dev string — catastrophic if unset in production
3. Admin approval route uses wrong schema + wrong column names — `INSERT INTO creators` will fail at runtime
4. `creator_brand_memberships` never created on approval — creator portal is inaccessible after approval
5. No account setup mechanism after approval — creator has no way to log in
6. `creator_memberships` vs `creator_brand_memberships` table name mismatch — brands API route crashes at runtime
7. `brand_id` in balance transactions is untyped TEXT — no referential integrity on ledger entries
8. Missing `first_login_at`, `creator_onboarding_wizard_progress`, `creator_agreement_signatures` in migrations
9. Admin commission approval does not credit creator balance — earnings never flow to creators
10. Commission maturation not automated — pending commissions never become available

### P1 High (functional gaps / security risks):
1. JWT memberships stale for 7 days — revoked brand access not enforced
2. Suspended creator status not re-checked at session validation
3. Portal pages and onboarding gate not enforced server-side
4. `pending` status creators can access portal
5. Project/esign routes use wrong tenant (first active membership, not project's brand)
6. `onboarding-wizard/complete` accepts `creatorId` from request body — auth bypass
7. Stripe OAuth state has no CSRF nonce
8. Balance ledger race condition — concurrent transactions corrupt `balance_after_cents`
9. Esign signing does not update `contract_signed` flag
10. Withdrawal processing not automated
11. Dashboard `recentActivity` permanently empty (shipped stub)
12. No cross-tenant creator search in orchestrator
13. No global creator suspension in super admin

### P2 Medium (UX, data integrity, completeness):
1. No per-tenant login page configuration
2. Magic link and rejection emails use hardcoded sender instead of tenant sender
3. Social platform handles not verified via OAuth
4. Stripe OAuth state lacks HMAC signature
5. No email verification enforcement
6. No role/tier-based permissions
7. `tax_form_status` is untyped TEXT not enum
8. Missing composite index on `creator_balance_transactions`
9. No automated sync of `balance_cents` / `pending_cents` on membership
10. Admin actions (suspend, notes) not real-time surfaced in creator portal
11. No platform-level audit log accessible to super admin
12. No super admin creator impersonation
13. Orchestrator brand wizard doesn't configure creator portal

### P3 Low (polish, nice-to-have):
1. `inactive` creator status inconsistency between login and magic-link paths
2. Application draft TTL cleanup missing
3. Wise integration lacks OAuth
4. Messages polling-only (no WebSockets)
5. Tax form status not integrated with e-sign provider
6. Cross-brand creator deduplication
7. `withdrawal_requests.payment_method_id` is TEXT not UUID FK
8. `active_projects_count` / `completed_projects_count` not auto-synced
