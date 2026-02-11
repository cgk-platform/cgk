# PHASE-2SA-ACCESS: Super Admin Access Control

**Duration**: 1 week (Week 5)
**Depends On**: Phase 1D (Packages complete)
**Parallel With**: PHASE-2A-ADMIN-SHELL
**Blocks**: PHASE-2SA-DASHBOARD, PHASE-2SA-ADVANCED
**Status**: COMPLETE

---

## Goal

Establish the foundational security layer for the Orchestrator (Super Admin Dashboard), including user registry, MFA enforcement, middleware protection, and comprehensive audit logging. All subsequent super admin features depend on this access control foundation.

---

## Success Criteria

- [x] Super admin login works with MFA enforcement
- [x] All orchestrator routes protected by super admin middleware
- [x] Audit logging captures all super admin actions with before/after state
- [x] Sensitive operations require MFA re-verification
- [x] Session management enforces 4-hour limit and single session per user

---

## Deliverables

### Database Schema
- `super_admin_users` table with MFA tracking
- `super_admin_audit_log` table with indexes for user, tenant, action, time
- `impersonation_sessions` table (schema only - logic in PHASE-2SA-ADVANCED)

### Authentication
- Super admin role definition with `canAccessAllTenants`, `canImpersonate` permissions
- Super admin verification function (`isSuperAdmin`)
- MFA verification flow for sensitive operations
- JWT claims for super admin sessions

### Middleware
- `apps/orchestrator/src/middleware.ts` - Route protection
- Sensitive route detection (`/brands/new`, `/users/impersonate`, `/settings`)
- MFA challenge redirect for sensitive routes
- All-request audit logging at middleware level

### Security Configuration
- IP allowlist option (environment-based)
- Rate limiting: 100 req/min per super admin
- Stricter limits on sensitive endpoints
- Session security: 4-hour lifetime, single session per user

---

## Constraints

- Super admin registry is SEPARATE from regular user roles (dedicated table)
- MFA is REQUIRED for sensitive operations, not optional
- Audit log must be immutable (no DELETE, no UPDATE)
- 90-day minimum retention for audit logs
- All routes under orchestrator MUST go through super admin middleware

---

## Pattern References

**RAWDOG code to reference:**
- `src/middleware.ts` - Existing middleware patterns for auth checks
- `src/lib/auth/debug.ts` - Pattern for auth abstraction (`getAuthUserId`)
- `src/app/admin/layout.tsx` - Admin protection patterns

**Spec documents:**
- `SUPER-ADMIN-ARCHITECTURE-2025-02-10.md` - Full access control schema and middleware code
- `PHASE-1C-AUTH.md` - JWT and session patterns to extend

**Database patterns:**
- Schema-per-tenant from Phase 1B
- Public schema for cross-tenant tables (super_admin_* tables go in public schema)

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. MFA provider choice (TOTP, WebAuthn, or both) - **CHOSEN: TOTP**
2. Session storage mechanism (JWT cookies vs server sessions in Redis) - **CHOSEN: JWT cookies + DB session tracking**
3. IP allowlist implementation (environment variable vs database table) - **CHOSEN: Database table**
4. Rate limiting implementation (Redis-based vs Vercel edge) - **CHOSEN: Database-based**

---

## Tasks

### [PARALLEL] Database & Auth Foundation
- [x] Create `super_admin_users` table with MFA fields
- [x] Create `super_admin_audit_log` table with all indexes
- [x] Create `impersonation_sessions` table schema
- [x] Define super admin role in `packages/auth/src/super-admin.ts`
- [x] Implement `isSuperAdmin()` verification function

### [PARALLEL] Middleware & Security
- [x] Create `apps/orchestrator/src/middleware.ts`
- [x] Implement sensitive route detection
- [x] Implement MFA challenge redirect
- [x] Add audit logging for all requests
- [x] Configure rate limiting for orchestrator routes

### [SEQUENTIAL after Database & Auth Foundation] Session Management
- [x] Implement 4-hour session lifetime enforcement
- [x] Implement single session per user constraint
- [x] Add automatic logout on inactivity (30 min)
- [x] Create session cleanup job (for expired sessions) - `cleanupExpiredSessions()` function

### [SEQUENTIAL after Middleware] MFA Flow
- [x] Create `/mfa-challenge` page
- [x] Implement MFA verification endpoint
- [x] Update JWT claims with `mfaVerified` flag
- [x] Add MFA re-verification for sensitive operations

---

## API Routes

```
/api/platform/auth/
  login/route.ts          # POST super admin login
  mfa/route.ts            # POST MFA verification, GET MFA status
  logout/route.ts         # POST logout
  session/route.ts        # GET current session, DELETE revoke all

/api/platform/users/
  super-admins/route.ts   # GET list, POST add, PATCH update super admin
```

---

## Definition of Done

- [x] Super admin can log in and MFA is enforced
- [x] Unauthenticated requests to orchestrator routes return 401/redirect
- [x] Non-super-admin users cannot access orchestrator
- [x] All actions logged in `super_admin_audit_log` with IP, user agent, timestamp
- [x] Sensitive routes require MFA re-verification
- [x] Rate limiting prevents abuse (100 req/min)
- [x] `npx tsc --noEmit` passes
- [x] Unit tests for `isSuperAdmin()` and middleware logic

---

## Implementation Summary

### Files Created/Modified

**Database Migration:**
- `/packages/db/src/migrations/public/008_super_admin.sql` - Creates all super admin tables

**Auth Package:**
- `/packages/auth/src/super-admin.ts` - Core super admin functions
- `/packages/auth/src/index.ts` - Exports super admin functions

**Orchestrator Middleware:**
- `/apps/orchestrator/src/middleware.ts` - Complete rewrite with super admin protection

**API Routes:**
- `/apps/orchestrator/src/app/api/platform/auth/login/route.ts`
- `/apps/orchestrator/src/app/api/platform/auth/logout/route.ts`
- `/apps/orchestrator/src/app/api/platform/auth/session/route.ts`
- `/apps/orchestrator/src/app/api/platform/auth/mfa/route.ts`
- `/apps/orchestrator/src/app/api/platform/users/super-admins/route.ts`

**UI Pages:**
- `/apps/orchestrator/src/app/(auth)/login/page.tsx`
- `/apps/orchestrator/src/app/(auth)/mfa-challenge/page.tsx`
- `/apps/orchestrator/src/app/(auth)/unauthorized/page.tsx`
- `/apps/orchestrator/src/app/(auth)/layout.tsx`

**Tests:**
- `/packages/auth/src/__tests__/super-admin.test.ts`

### Key Decisions

1. **MFA**: Implemented TOTP (RFC 6238) for compatibility with Google Authenticator, Authy, etc.
2. **Session Storage**: JWT in cookies with server-side session tracking in `super_admin_sessions` table
3. **IP Allowlist**: Stored in `super_admin_ip_allowlist` table (empty = no restriction)
4. **Rate Limiting**: Database-based tracking in `super_admin_rate_limits` table
5. **Audit Log**: Immutable via PostgreSQL triggers that prevent UPDATE/DELETE
