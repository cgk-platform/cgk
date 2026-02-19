# Gap Remediation Audit: Super Admin
**Agent:** 02 | **Date:** 2026-02-19 | **Pass:** 1

---

## Executive Summary

The Super Admin domain is **85–90% complete** and represents the most mature area of the CGK platform. The foundational security layer (Phase 2SA-ACCESS) is **fully implemented** with real production-quality code: TOTP MFA, immutable audit logging, IP allowlisting, rate limiting, 4-hour sessions with inactivity timeout, and Edge-compatible middleware. The dashboard, user management, and advanced operations features are all largely shipped.

**Four concrete gaps were found:**

1. **❌ Impersonation email notification** — Declared "REQUIRED" and "DONE" in the spec, but not a single line of email-sending code exists anywhere in the impersonation flow. This is a security/compliance gap.
2. **⚠️ Migration conflict: `impersonation_sessions.end_reason`** — Migration 008 creates the table without `end_reason`; migration 011's `CREATE TABLE IF NOT EXISTS` is a no-op. The column the code expects is missing from the deployed schema.
3. **⚠️ `/users/search` UI page missing** — The API route exists (`/api/platform/users/search`) but there is no dedicated search page under `/users/search`. Search functionality exists inline on the `/users` list page but the standalone route is unbuilt.
4. **⚠️ Health matrix lacks virtualization** — Spec requires graceful handling of 50+ tenants via virtualization; implementation is a standard table with horizontal scroll only.

Additionally, several cleanup items exist:
- Audit log 90-day retention has no scheduled enforcement mechanism
- MFA setup page reachability for new super admins is unclear (API exists, UI flow ambiguous)
- Integration tests for KPI aggregation deferred (noted explicitly in phase doc)

---

## Feature Status Matrix

| Feature | Phase | Status | Notes |
|---|---|---|---|
| `super_admin_users` table | 2SA-ACCESS | ✅ DONE | Full schema with MFA fields, permissions, tracking |
| `super_admin_audit_log` table | 2SA-ACCESS | ✅ DONE | Immutable via PG triggers, 8 indexes |
| `impersonation_sessions` table | 2SA-ACCESS | ⚠️ PARTIAL | Schema exists; `end_reason` column missing due to migration conflict |
| `super_admin_sessions` table | 2SA-ACCESS | ✅ DONE | 4-hour sessions, inactivity timeout, single-session enforcement |
| `super_admin_rate_limits` table | 2SA-ACCESS | ✅ DONE | Bucketed rate limiting per user |
| `super_admin_ip_allowlist` table | 2SA-ACCESS | ✅ DONE | Empty = no restriction; INET type |
| `isSuperAdmin()` verification | 2SA-ACCESS | ✅ DONE | DB-backed, checks `is_active = TRUE` |
| Super admin role definition | 2SA-ACCESS | ✅ DONE | `canAccessAllTenants`, `canImpersonate`, `canManageSuperAdmins` |
| MFA TOTP challenge flow | 2SA-ACCESS | ✅ DONE | `/mfa-challenge` page + API, TOTP via DB |
| MFA TOTP setup (QR code) | 2SA-ACCESS | ✅ DONE | `/api/platform/auth/mfa` route handles full TOTP setup |
| Orchestrator middleware | 2SA-ACCESS | ✅ DONE | JWT verify → isSuperAdmin → session validate → rate limit → MFA check |
| Sensitive route detection | 2SA-ACCESS | ✅ DONE | MFA required for `/brands/new`, `/users/impersonate`, `/settings`, etc. |
| Rate limiting (100 req/min) | 2SA-ACCESS | ✅ DONE | Default + sensitive + login buckets |
| IP allowlist enforcement | 2SA-ACCESS | ✅ DONE | Middleware-enforced; DB-backed |
| Audit logging (all requests) | 2SA-ACCESS | ✅ DONE | Fires on every non-public request |
| Session cleanup job | 2SA-ACCESS | ⚠️ PARTIAL | `cleanupExpiredSessions()` exists but no scheduled invocation found |
| Unit tests for auth | 2SA-ACCESS | ✅ DONE | Vitest suite covering isSuperAdmin, rate limit, IP allowlist, session logic |
| Platform KPI cards | 2SA-DASHBOARD | ✅ DONE | GMV, MRR, brands, status, alerts, uptime |
| Brands grid with pagination | 2SA-DASHBOARD | ✅ DONE | 8 per page, health/status indicators, integration badges |
| Real-time alert feed | 2SA-DASHBOARD | ✅ DONE | SSE (not WebSocket; per spec, Edge doesn't support WS) |
| Orchestrator navigation | 2SA-DASHBOARD | ✅ DONE | 7 sections, responsive sidebar |
| Analytics page | 2SA-DASHBOARD | ✅ DONE | GMV trend, tenant revenue, customer metrics, date range picker |
| Impersonation core (`startImpersonation`) | 2SA-ADVANCED | ✅ DONE | Reason required, 1-hour JWT, audit log, DB session |
| Impersonation UI dialog | 2SA-ADVANCED | ✅ DONE | `ImpersonateDialog` with reason input |
| Impersonation banner in admin portal | 2SA-ADVANCED | ✅ DONE | `ImpersonationBanner` mounted in `admin-shell.tsx` |
| Impersonation API routes | 2SA-ADVANCED | ✅ DONE | POST/GET/DELETE `/api/platform/users/[id]/impersonate` |
| Impersonation email notification | 2SA-ADVANCED | ❌ NOT DONE | Code comment documents requirement; zero email-sending code exists |
| Impersonation session cleanup | 2SA-ADVANCED | ✅ DONE | `cleanupExpiredImpersonationSessions()` function exists |
| Error explorer (list + filters) | 2SA-ADVANCED | ✅ DONE | Tenant/severity/status filters, paginated |
| Error detail with stack trace | 2SA-ADVANCED | ✅ DONE | `/ops/errors` page built |
| Health matrix (service × tenant) | 2SA-ADVANCED | ⚠️ PARTIAL | Grid built; no virtualization for 50+ tenants |
| Job monitoring (cross-tenant) | 2SA-ADVANCED | ✅ DONE | Status, stats, retry for failed jobs |
| Webhook delivery monitoring | 2SA-ADVANCED | ✅ DONE | `/api/platform/webhooks` and redeliver endpoint |
| Platform user list (paginated) | 2SA-USERS | ✅ DONE | Filters for status, super-admin flag, tenant, search |
| User search (API) | 2SA-USERS | ✅ DONE | Full-text search via `search_vector` |
| User search UI page `/users/search` | 2SA-USERS | ⚠️ PARTIAL | API route built; no dedicated page route |
| User detail with memberships | 2SA-USERS | ✅ DONE | `/users/[id]` shows all tenant memberships |
| User activity log | 2SA-USERS | ✅ DONE | `/users/[id]/activity` page + API route |
| Disable/enable user | 2SA-USERS | ✅ DONE | Invalidates all sessions, guards last super admin |
| Grant super admin | 2SA-USERS | ✅ DONE | `canManageSuperAdmins` permission check |
| Revoke super admin | 2SA-USERS | ✅ DONE | Cannot self-revoke, cannot revoke last SA |
| Super admin registry page | 2SA-USERS | ✅ DONE | `/users/super-admins` with grant/revoke UI |
| User management unit tests | 2SA-USERS | ✅ DONE | `/packages/auth/src/__tests__/user-admin.test.ts` |
| Audit log 90-day retention enforcement | All | ⚠️ PARTIAL | Tables exist; no scheduled purge job or policy configured |

---

## Detailed Gaps

---

### 1. Impersonation Email Notification — ❌ NOT DONE

**Planned:**
> PHASE-2SA-ADVANCED: "Email notification to target user when impersonation starts" — Marked as `[x]` complete.
> Constraint: "Email notification to target user is REQUIRED (not optional)"
> Pattern: "Use Resend for impersonation notification email. Template: 'A platform administrator has started an impersonation session'"

**Found:**
The `startImpersonation()` function in `packages/auth/src/impersonation.ts` has this security comment in its JSDoc:
```
* - Email notification sent to target user
```
...but there is **zero email-sending code** anywhere in:
- `packages/auth/src/impersonation.ts`
- `apps/orchestrator/src/app/api/platform/users/[id]/impersonate/route.ts`
- No `sendEmail`, `Resend`, `resend.emails.send`, or equivalent call exists in the impersonation flow.

The Resend integration exists for tenant-level use (e.g., `/api/platform/brands/[brandId]/integrations/resend/route.ts`) but is not wired into the impersonation flow.

**Files checked:**
- `packages/auth/src/impersonation.ts` (full file)
- `apps/orchestrator/src/app/api/platform/users/[id]/impersonate/route.ts` (full file)
- grep: `sendEmail|notification|resend` across all orchestrator API routes — zero hits in impersonation context

**TODO List:**
- [ ] Create an email utility function (e.g., `packages/auth/src/emails/impersonation-notification.ts`) using Resend
- [ ] Email template: "A platform administrator has started an impersonation session on your account. If you did not expect this, contact support immediately. Session expires in 1 hour."
- [ ] Call the email function from `startImpersonation()` after the DB insert succeeds (fire-and-don't-await, with error logging)
- [ ] Include in email: impersonator email, reason given, expiry time, session ID
- [ ] Add `RESEND_API_KEY` to orchestrator env config and validate at startup
- [ ] Add `sendImpersonationNotification` to the auth package's public exports
- [ ] Consider: add a platform-level "from" email config in settings (e.g., `platform-notifications@cgk.com`)

---

### 2. Migration Conflict: `impersonation_sessions.end_reason` — ⚠️ PARTIAL

**Planned:**
Migration 011 (`011_impersonation_and_errors.sql`) defines `impersonation_sessions` with `end_reason TEXT` column.

**Found:**
Migration 008 (`008_super_admin.sql`) **also** creates `impersonation_sessions` (as a schema placeholder per PHASE-2SA-ACCESS spec: "Create `impersonation_sessions` table (schema only - logic in PHASE-2SA-ADVANCED)").

Migration 008's table definition:
```sql
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL REFERENCES users(id),
  target_user_id UUID NOT NULL REFERENCES users(id),
  target_tenant_id UUID NOT NULL REFERENCES organizations(id),
  reason TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- Not in 011
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  -- NO end_reason COLUMN HERE
  ip_address INET,                                  -- Type differs (INET vs TEXT in 011)
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,          -- Not in 011
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Migration 011's `CREATE TABLE IF NOT EXISTS impersonation_sessions` is therefore a **no-op** because the table already exists. The `end_reason` column **never gets added** to the actual database schema.

The application code uses `end_reason` in three UPDATE queries:
```typescript
// impersonation.ts:234
SET ended_at = NOW(), end_reason = 'new_session_started'
// impersonation.ts:336
SET ended_at = NOW(), end_reason = ${endReason}
// impersonation.ts:486
SET ended_at = NOW(), end_reason = 'expired'
```

These queries will **fail at runtime** when executed against a production database that ran migrations in order.

**Files checked:**
- `packages/db/src/migrations/public/008_super_admin.sql` (lines 150–197)
- `packages/db/src/migrations/public/011_impersonation_and_errors.sql` (lines 1–27)
- `packages/auth/src/impersonation.ts` (lines 234, 336, 486)

**TODO List:**
- [ ] **CRITICAL**: Remove `CREATE TABLE IF NOT EXISTS impersonation_sessions` from migration 008 entirely (it was premature; 011 is the authoritative version) OR add a separate `ALTER TABLE` migration
- [ ] Alternative: Create migration `012_fix_impersonation_schema.sql` with:
  ```sql
  ALTER TABLE impersonation_sessions ADD COLUMN IF NOT EXISTS end_reason TEXT;
  ALTER TABLE impersonation_sessions DROP COLUMN IF EXISTS is_active;
  -- id type: UUID vs TEXT discrepancy — evaluate if cast is needed
  ```
- [ ] Verify that `started_at` vs `created_at` field naming is consistent (008 has `started_at`; 011 uses `created_at`; the `mapRowToSession()` function reads `row.created_at`)
- [ ] Verify `ip_address` type: 008 uses `INET`, 011 uses `TEXT` — align to one type (INET preferred for PostgreSQL)
- [ ] Add a migration integration test that verifies all expected columns exist in `impersonation_sessions` after all migrations run

---

### 3. `/users/search` Dedicated UI Page — ⚠️ PARTIAL

**Planned:**
> PHASE-2SA-USERS: "Create `/users/search` page" listed in navigation structure and deliverables

**Found:**
The API route exists at `apps/orchestrator/src/app/api/platform/users/search/route.ts`. The `/users` page (`page.tsx`) includes an inline search bar component (`UserSearchBar`). However, there is **no** `apps/orchestrator/src/app/(dashboard)/users/search/page.tsx` route.

Directory listing of `/users/`:
```
[id]/
page.tsx
super-admins/
```
No `search/` directory.

The spec's navigation structure listed `/users/search` as a distinct route, likely for deep-linking to search results, bookmarking filtered searches, or sharing search URLs.

**Files checked:**
- `find /apps/orchestrator/src/app/(dashboard)/users/ -type d` — confirms absence
- `/apps/orchestrator/src/app/api/platform/users/search/route.ts` — API exists

**TODO List:**
- [ ] Determine product intent: is inline search sufficient, or is a dedicated `/users/search` page needed for URL-based search state?
- [ ] If a dedicated page is needed: create `apps/orchestrator/src/app/(dashboard)/users/search/page.tsx` that reads search query from URL params and renders search results
- [ ] Wire the `UserSearchBar` to push `?q=...` to the search URL (currently it may only manage local state)
- [ ] Add `link` from `/users` page header ("Advanced Search" → `/users/search`) if the dedicated page is created
- [ ] Ensure the `/users/search` page includes all filter options (status, super-admin flag, tenant, date range) that the main list supports

---

### 4. Health Matrix Lacks Virtualization — ⚠️ PARTIAL

**Planned:**
> PHASE-2SA-ADVANCED: "Horizontal scroll for many tenants" and "Health matrix MUST handle 50+ tenants gracefully (virtualization)"

**Found:**
The health matrix page (`apps/orchestrator/src/app/(dashboard)/ops/health/page.tsx`) renders a standard HTML `<table>` with `overflow-x-auto` on the container card. For 50+ tenants, this table will:
- Render all rows in the DOM simultaneously
- Cause significant layout thrash on re-render (60-second polling interval)
- Create horizontal scroll but no virtual rows

There is no TanStack Virtual, react-window, or any other virtualization library in the implementation.

**Files checked:**
- `apps/orchestrator/src/app/(dashboard)/ops/health/page.tsx` (full file)
- No import of virtual scrolling library found

**TODO List:**
- [ ] Evaluate actual tenant count: if platform has <20 tenants currently, virtualization can be deferred
- [ ] If virtualization is needed: install `@tanstack/react-virtual` (already in org dependencies likely)
- [ ] Implement row virtualization for the `tbody` rows (tenant rows)
- [ ] Consider column virtualization too if services count grows large (currently 7 services)
- [ ] Alternatively: add pagination to the health matrix (show 20 tenants per page) as a simpler mitigation
- [ ] Ensure the sticky header row and sticky tenant column (`sticky left-0`) still work correctly with virtualization

---

### 5. Audit Log 90-Day Retention Enforcement — ⚠️ PARTIAL

**Planned:**
> Spec: "90-day minimum retention for audit logs"

**Found:**
The `super_admin_audit_log` table has immutable triggers (prevents UPDATE/DELETE) and the table comment says "90-day minimum retention" — but there is **no scheduled deletion job** that enforces *maximum* retention or archives old logs. The `cleanupExpiredSessions()` function exists for sessions but nothing equivalent exists for audit log archival/purging.

Additionally, `cleanupExpiredSessions()` (for super admin sessions) and `cleanupExpiredImpersonationSessions()` are implemented as standalone functions but **no cron job, background worker, or scheduled invocation** is configured in the codebase.

**TODO List:**
- [ ] Create a scheduled job (Inngest cron or Vercel cron) that runs daily to call `cleanupExpiredSessions()` and `cleanupExpiredImpersonationSessions()`
- [ ] Define an archival strategy for `super_admin_audit_log` beyond 90 days (archive to S3/cold storage or delete — policy decision needed)
- [ ] Create a migration that adds a PostgreSQL `pg_partman` partition or a `pg_cron` job if DB-level scheduling is preferred
- [ ] Add a setting in the Platform Settings page → Security tab: "Audit Log Retention (days)" (currently the settings page has session timeout but not log retention)
- [ ] Document the retention policy in platform runbook

---

## Architectural Observations

### Strengths

1. **Security-first design throughout.** The middleware is robust: JWT verify → isSuperAdmin DB check → session validate → inactivity timeout → IP allowlist → rate limit → MFA check for sensitive routes. All running on Edge-compatible code.

2. **Immutable audit log is correctly enforced at the DB level.** PostgreSQL triggers that raise exceptions on UPDATE/DELETE are a bulletproof approach that survives any application-layer bugs.

3. **`impersonation.ts` has excellent type safety.** The `ImpersonationError` class with typed error codes, the `ImpersonationJWTPayload` interface with `impersonator` claim embedded, and the guard against impersonating another super admin are all production-quality.

4. **Migration conflict in `impersonation_sessions` is likely masked in development.** If developers always run migrations fresh (clean DB), the conflict only manifests in production with incremental migrations. This is the most dangerous type of bug.

5. **The super admin role model (granular permissions per user: `canImpersonate`, `canManageSuperAdmins`, `canAccessAllTenants`) is more flexible than the spec originally called for.**

6. **Rate limiting is DB-backed, not Redis-backed.** This is acceptable at low scale but will create write contention under high request volume. If the platform grows to multiple super admins making concurrent requests, consider migrating to Redis-based rate limiting (Upstash).

### Schema Inconsistencies

- `impersonation_sessions` has TWO conflicting migration definitions (008 and 011) — see Gap #2
- Migration 008's `impersonation_sessions` uses `INET` for `ip_address`; the application code stores it as a string; other tables in 011 use `TEXT` for IP — inconsistent
- The `users` table `search_vector` column referenced in `getAllUsers()` and `searchUsers()` is created in a different migration — verify it exists

### Unconfirmed Items (Need Runtime Verification)

- Whether `mfa_secret_encrypted` is actually encrypted (field name implies encryption but no encryption code was found in the MFA route — it appears to store the raw TOTP secret)
- Whether the `users.search_vector` tsvector column is being kept up-to-date via trigger
- Whether the Inngest webhook endpoint exists for the job monitoring data

---

## Priority Ranking

| # | Gap | Severity | Effort | Urgency |
|---|---|---|---|---|
| 1 | `impersonation_sessions.end_reason` migration conflict | 🔴 CRITICAL | Low (add ALTER TABLE migration) | Ship immediately — runtime failures on any impersonation end |
| 2 | Impersonation email notification | 🟠 HIGH | Medium (Resend integration ~4h) | Compliance/security requirement; deploy ASAP |
| 3 | Session/impersonation cleanup scheduler | 🟠 HIGH | Low (add cron job ~2h) | DB bloat risk; schedule before scale |
| 4 | `/users/search` dedicated UI page | 🟡 MEDIUM | Low (UI only ~3h) | Nice-to-have; inline search is functional |
| 5 | Audit log retention enforcement | 🟡 MEDIUM | Medium (policy + cron ~4h) | Compliance concern; can defer 30 days |
| 6 | Health matrix virtualization | 🟢 LOW | Medium (~6h) | Only matters at 50+ tenants; defer until needed |
| 7 | Integration tests for KPI queries | 🟢 LOW | High | Explicitly deferred to testing phase per spec |

---

## Files Audited

**Auth Package:**
- `packages/auth/src/super-admin.ts`
- `packages/auth/src/impersonation.ts`
- `packages/auth/src/user-admin.ts`
- `packages/auth/src/__tests__/super-admin.test.ts`
- `packages/auth/src/__tests__/user-admin.test.ts`

**Database Migrations:**
- `packages/db/src/migrations/public/008_super_admin.sql`
- `packages/db/src/migrations/public/009_user_management.sql`
- `packages/db/src/migrations/public/011_impersonation_and_errors.sql`

**Orchestrator App:**
- `apps/orchestrator/src/middleware.ts`
- `apps/orchestrator/src/app/(dashboard)/page.tsx`
- `apps/orchestrator/src/app/(dashboard)/analytics/page.tsx`
- `apps/orchestrator/src/app/(dashboard)/ops/health/page.tsx`
- `apps/orchestrator/src/app/(dashboard)/ops/jobs/page.tsx`
- `apps/orchestrator/src/app/(dashboard)/settings/page.tsx`
- `apps/orchestrator/src/app/(dashboard)/users/page.tsx` (existence confirmed)
- `apps/orchestrator/src/app/(dashboard)/users/[id]/page.tsx`
- `apps/orchestrator/src/app/(dashboard)/users/super-admins/` (existence confirmed)
- `apps/orchestrator/src/app/api/platform/users/[id]/impersonate/route.ts`
- `apps/orchestrator/src/app/api/platform/auth/mfa/route.ts` (grep)
- `apps/orchestrator/src/components/impersonation/impersonate-dialog.tsx` (existence confirmed)

**Admin App:**
- `apps/admin/src/components/impersonation-banner.tsx`
- `apps/admin/src/app/admin/admin-shell.tsx` (grep)
