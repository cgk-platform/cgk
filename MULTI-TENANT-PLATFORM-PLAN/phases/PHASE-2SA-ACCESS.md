# PHASE-2SA-ACCESS: Super Admin Access Control

**Duration**: 1 week (Week 5)
**Depends On**: Phase 1D (Packages complete)
**Parallel With**: PHASE-2A-ADMIN-SHELL
**Blocks**: PHASE-2SA-DASHBOARD, PHASE-2SA-ADVANCED

---

## Goal

Establish the foundational security layer for the Orchestrator (Super Admin Dashboard), including user registry, MFA enforcement, middleware protection, and comprehensive audit logging. All subsequent super admin features depend on this access control foundation.

---

## Success Criteria

- [ ] Super admin login works with MFA enforcement
- [ ] All orchestrator routes protected by super admin middleware
- [ ] Audit logging captures all super admin actions with before/after state
- [ ] Sensitive operations require MFA re-verification
- [ ] Session management enforces 4-hour limit and single session per user

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
1. MFA provider choice (TOTP, WebAuthn, or both)
2. Session storage mechanism (JWT cookies vs server sessions in Redis)
3. IP allowlist implementation (environment variable vs database table)
4. Rate limiting implementation (Redis-based vs Vercel edge)

---

## Tasks

### [PARALLEL] Database & Auth Foundation
- [ ] Create `super_admin_users` table with MFA fields
- [ ] Create `super_admin_audit_log` table with all indexes
- [ ] Create `impersonation_sessions` table schema
- [ ] Define super admin role in `packages/auth/src/roles.ts`
- [ ] Implement `isSuperAdmin()` verification function

### [PARALLEL] Middleware & Security
- [ ] Create `apps/orchestrator/src/middleware.ts`
- [ ] Implement sensitive route detection
- [ ] Implement MFA challenge redirect
- [ ] Add audit logging for all requests
- [ ] Configure rate limiting for orchestrator routes

### [SEQUENTIAL after Database & Auth Foundation] Session Management
- [ ] Implement 4-hour session lifetime enforcement
- [ ] Implement single session per user constraint
- [ ] Add automatic logout on inactivity (30 min)
- [ ] Create session cleanup job (for expired sessions)

### [SEQUENTIAL after Middleware] MFA Flow
- [ ] Create `/mfa-challenge` page
- [ ] Implement MFA verification endpoint
- [ ] Update JWT claims with `mfaVerified` flag
- [ ] Add MFA re-verification for sensitive operations

---

## API Routes

```
/api/platform/auth/
  login/route.ts          # POST super admin login
  mfa/route.ts            # POST MFA verification
  logout/route.ts         # POST logout
  session/route.ts        # GET current session

/api/platform/users/
  super-admins/route.ts   # GET list, POST add super admin
```

---

## Definition of Done

- [ ] Super admin can log in and MFA is enforced
- [ ] Unauthenticated requests to orchestrator routes return 401/redirect
- [ ] Non-super-admin users cannot access orchestrator
- [ ] All actions logged in `super_admin_audit_log` with IP, user agent, timestamp
- [ ] Sensitive routes require MFA re-verification
- [ ] Rate limiting prevents abuse (100 req/min)
- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests for `isSuperAdmin()` and middleware logic
