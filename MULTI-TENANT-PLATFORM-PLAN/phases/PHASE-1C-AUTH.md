# PHASE-1C: Authentication System

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Duration**: 1 week (Week 3)
**Depends On**: PHASE-1B (needs sessions/magic_links tables)
**Parallel With**: None
**Blocks**: PHASE-2A (admin needs auth), PHASE-2SA (super admin needs auth)
**Status**: ✅ COMPLETE (2026-02-10)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Auth is the foundation of tenant isolation. Every authenticated request MUST carry tenant context.

---

## Goal

Build a custom authentication system to replace Clerk, implementing JWT tokens, session management, magic link authentication, and auth middleware that injects tenant context into requests.

---

## Multi-Tenant User Access Model

**CRITICAL**: Users can belong to MULTIPLE organizations/tenants.

This is required because:
- Creators work with multiple brands (PHASE-4A)
- Platform operators manage multiple tenants (Super Admin)
- Contractors may serve multiple brands

### User-Tenant Relationship

```typescript
interface User {
  id: string
  email: string
  name: string

  // User can have memberships in multiple orgs
  memberships: UserMembership[]
}

interface UserMembership {
  organizationId: string
  organizationSlug: string
  role: 'admin' | 'member' | 'creator' | 'contractor'
  permissions: string[]
  isDefault: boolean  // Which org to show by default
}
```

### JWT Claims

```typescript
interface JWTPayload {
  sub: string           // userId
  sid: string           // sessionId

  // Current tenant context (active session)
  org: string           // current organizationSlug
  orgId: string         // current organizationId
  role: string          // role in current org

  // All accessible tenants (for context switching)
  orgs: Array<{
    id: string
    slug: string
    role: string
  }>

  iat: number
  exp: number
}
```

### Context Switching

Users can switch between their accessible tenants:

```typescript
// POST /api/auth/switch-tenant
async function switchTenant(req: Request) {
  const { targetOrgSlug } = await req.json()
  const jwt = getJWTFromCookie(req)

  // Verify user has access to target org
  const hasAccess = jwt.orgs.some(o => o.slug === targetOrgSlug)
  if (!hasAccess) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Issue new JWT with updated current tenant context
  const newToken = await signJWT({
    ...jwt,
    org: targetOrgSlug,
    orgId: targetOrg.id,
    role: targetOrg.role,
  })

  // Set new cookie and return
  return setAuthCookie(newToken)
}
```

### Database Schema Addition

> Note: Phase 1B implemented this as `user_organizations` table (see 003_users.sql)

```sql
-- User memberships across organizations (implemented as user_organizations)
CREATE TABLE public.user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  role user_role NOT NULL DEFAULT 'member',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_user_organizations_user_id ON public.user_organizations(user_id);
CREATE INDEX idx_user_organizations_org_id ON public.user_organizations(organization_id);
```

---

## Success Criteria

- [x] JWT signing and verification working with jose library
- [x] Sessions stored in database with secure token hashing
- [x] Magic link flow sends email and authenticates user
- [x] Auth middleware validates requests and injects tenant context
- [x] Protected routes redirect unauthenticated users
- [x] All auth flows covered by unit tests

---

## Deliverables

### JWT System (`packages/auth/src/jwt.ts`) ✅
- [x] `signJWT(payload)` - Create signed JWT with expiration
- [x] `verifyJWT(token)` - Verify and decode JWT
- [x] `decodeJWT(token)` - Decode without verification (debugging)
- [x] JWT payload includes: userId, sessionId, orgSlug, role, orgs

### Session Management (`packages/auth/src/session.ts`) ✅
- [x] `createSession(userId, orgId, req)` - Create database session
- [x] `validateSession(token)` - Validate session token against database
- [x] `validateSessionById(sessionId)` - Validate by session ID
- [x] `revokeSession(sessionId)` - Invalidate a session
- [x] `revokeAllSessions(userId)` - Invalidate all user sessions
- [x] `getUserSessions(userId)` - Get all active sessions
- [x] `updateSessionOrganization(sessionId, orgId)` - Switch tenant context

### Magic Link System (`packages/auth/src/magic-link.ts`) ✅
- [x] `createMagicLink(email, purpose, orgId?, inviteRole?)` - Generate and store magic link
- [x] `verifyMagicLink(email, token)` - Validate and consume magic link
- [x] `sendMagicLinkEmail(email, token, purpose)` - Email delivery via Resend (with dev fallback)
- [x] `cleanupExpiredMagicLinks()` - Cleanup utility

### Auth Middleware (`packages/auth/src/middleware.ts`) ✅
- [x] `authMiddleware(req, NextResponse)` - Next.js middleware for protected routes
- [x] `hasRole(userRole, requiredRole)` - Role hierarchy check
- [x] `requireRole(role)` - Middleware factory for role requirements
- [x] `composeMiddleware(...middlewares)` - Combine multiple middlewares
- [x] Extracts JWT from cookie
- [x] Validates session in database
- [x] Injects headers: `x-tenant-id`, `x-tenant-slug`, `x-user-id`, `x-user-role`, `x-session-id`
- [x] Redirects to login on failure

### Password Utilities (`packages/auth/src/password.ts`) ✅
- [x] `hashPassword(password)` - bcrypt hashing (12 salt rounds)
- [x] `verifyPassword(password, hash)` - bcrypt comparison

### Cookie Utilities (`packages/auth/src/cookies.ts`) ✅
- [x] `setAuthCookie(response, token)` - Set HTTP-only auth cookie
- [x] `getAuthCookie(request)` - Extract token from cookie
- [x] `clearAuthCookie(response)` - Clear auth cookie
- [x] `AUTH_COOKIE_NAME` - Constant: `cgk-auth-token`
- [x] `cookieOptions` - Secure cookie configuration

### Context Utilities (`packages/auth/src/context.ts`) ✅
- [x] `getTenantContext(req)` - Extract tenant/user from request
- [x] `requireAuth(req)` - Require auth and return full context
- [x] `getUserByEmail(email)` - Lookup user by email
- [x] `getUserById(userId)` - Lookup user by ID
- [x] `getUserOrganizations(userId)` - Get user's org memberships
- [x] `createUser(data)` - Create new user
- [x] `addUserToOrganization(userId, orgId, role)` - Add user to org
- [x] `updateUserLastLogin(userId)` - Update login timestamp
- [x] `AuthenticationError` - Error class for auth failures

### Auth Types (`packages/auth/src/types.ts`) ✅
- [x] `JWTPayload` interface
- [x] `Session` interface
- [x] `User` interface
- [x] `AuthContext` interface
- [x] `OrgContext` interface
- [x] `MagicLink` interface
- [x] `MagicLinkVerifyResult` interface
- [x] `SessionCreateResult` interface
- [x] `UserRole` type
- [x] `UserStatus` type
- [x] `MagicLinkPurpose` type

---

## Constraints ✅

- [x] MUST use `jose` library for JWT (not jsonwebtoken - better Edge compatibility)
- [x] MUST use `bcryptjs` for password hashing
- [x] MUST use `nanoid` for token generation
- [x] Session tokens MUST be hashed before storage (never store plaintext) - SHA-256
- [x] JWT expiration: 7 days (configurable)
- [x] Session expiration: 30 days (configurable)
- [x] Magic link expiration: 24 hours
- [x] MUST support cookie-based auth (not just Authorization header)
- [x] Cookies MUST be httpOnly, secure (in production), sameSite: lax

---

## Pattern References

**Skills to invoke:**
- Context7 MCP: "jose JWT signing Next.js" - for JWT implementation
- Context7 MCP: "Next.js middleware authentication" - for middleware patterns

**MCPs to consult:**
- Context7 MCP: Search "JWT authentication Edge runtime"
- Context7 MCP: Search "magic link authentication implementation"

**RAWDOG code to reference:**
- `/src/lib/auth/debug.ts` - `getAuthUserId()` pattern for auth context
- `/src/middleware.ts` - Current middleware structure
- `/src/app/api/contractor/` - API route auth patterns

**Spec documents:**
- `ARCHITECTURE.md` - Authentication strategy section

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. JWT refresh token strategy (silent refresh vs explicit) - **Decision: JWT contains all context, refresh on switch-tenant**
2. Cookie configuration (domain, path settings) - **Decision: path=/, sameSite=lax**
3. Rate limiting for magic link requests - **Decision: Deferred to Phase 2+**
4. Whether to support both cookie and header-based auth - **Decision: Cookie-based with header injection by middleware**
5. Session cleanup strategy (cron vs lazy deletion) - **Decision: `cleanupExpiredMagicLinks()` utility provided, cron deferred**
6. Email provider integration (Resend recommended) - **Decision: Resend with console fallback for dev**

---

## Tasks

### [PARALLEL] JWT Implementation ✅
- [x] Install `jose` package
- [x] Implement `signJWT()` with HS256 algorithm
- [x] Implement `verifyJWT()` with expiration check
- [x] Define `JWTPayload` type with user/session/org fields
- [x] Add JWT secret from environment variable

### [PARALLEL] Password Utilities ✅
- [x] Install `bcryptjs` package
- [x] Implement `hashPassword()` with salt rounds
- [x] Implement `verifyPassword()` for comparison

### [PARALLEL] Session Management ✅
- [x] Install `nanoid` package
- [x] Implement `createSession()` with token hashing
- [x] Implement `validateSession()` with token comparison
- [x] Implement `revokeSession()` for logout
- [x] Implement `revokeAllSessions()` for security events

### [SEQUENTIAL after JWT + Sessions] Magic Link System ✅
- [x] Implement `createMagicLink()` with token generation
- [x] Implement `verifyMagicLink()` with one-time use
- [x] Implement `sendMagicLinkEmail()` with Resend
- [x] Handle magic link purpose: login, signup, invite, password_reset

### [SEQUENTIAL after Sessions] Auth Middleware ✅
- [x] Implement middleware function for Next.js
- [x] Extract JWT from `cgk-auth-token` cookie
- [x] Validate JWT and fetch session from database
- [x] Inject tenant context headers
- [x] Handle redirect to login page
- [x] Configure public vs protected route matching

### [SEQUENTIAL after All] Auth API Routes (in apps/orchestrator) ✅
- [x] Create `/api/auth/login` - magic link request
- [x] Create `/api/auth/verify` - magic link verification
- [x] Create `/api/auth/logout` - session revocation
- [x] Create `/api/auth/session` - current session info (GET) and revoke all (DELETE)
- [x] Create `/api/auth/switch-tenant` - switch active tenant

### [SEQUENTIAL after All] Testing ✅
- [x] Write JWT signing/verification tests (jwt.test.ts - 8 tests)
- [x] Write session management tests (session.test.ts - 8 tests)
- [x] Write magic link flow tests (magic-link.test.ts - 10 tests)
- [x] Write middleware tests (middleware.test.ts - 4 tests)
- [x] Write password tests (password.test.ts - 5 tests)
- [x] Write cookie tests (cookies.test.ts - 7 tests)
- **Total: 42 tests passing**

---

## JWT Payload Structure

```typescript
interface JWTPayload {
  sub: string           // user ID
  sid: string           // session ID for revocation
  email: string         // user email
  org: string           // tenant slug
  orgId: string         // organization ID
  role: 'super_admin' | 'owner' | 'admin' | 'member'
  orgs: OrgContext[]    // all accessible orgs
  iat: number           // issued at
  exp: number           // expiration
}
```

---

## Auth Flow Diagrams

### Magic Link Login Flow
```
1. User enters email on /login
2. POST /api/auth/login { email }
3. Create magic_link record with hashed token
4. Send email with verification link
5. User clicks link -> /auth/verify?token=xxx&email=xxx
6. POST /api/auth/verify { email, token }
7. Verify token hash matches
8. Create user if new (signup) or fetch existing
9. Create session in database
10. Sign JWT with session info
11. Set cgk-auth-token cookie
12. Redirect to dashboard
```

### Request Authentication Flow
```
1. Request to protected route
2. Middleware extracts cgk-auth-token cookie
3. Verify JWT signature and expiration
4. Fetch session from database by session ID
5. Check session not revoked/expired
6. Inject x-tenant-id, x-tenant-slug, x-user-id, x-user-role, x-session-id headers
7. Continue to route handler
8. Route handler uses getTenantContext()
```

---

## Cookie Configuration

```typescript
const cookieOptions = {
  name: 'cgk-auth-token',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days (matches JWT)
}
```

---

## Definition of Done ✅

- [x] `signJWT()` and `verifyJWT()` working
- [x] `createSession()` and `validateSession()` working
- [x] `createMagicLink()` and `verifyMagicLink()` working
- [x] Auth middleware injects tenant context correctly
- [x] Login/logout flow works end-to-end
- [x] All auth tests pass (42 tests)
- [x] `npx tsc --noEmit` passes for packages/auth
- [x] `pnpm turbo typecheck --filter=@cgk-platform/auth` passes

---

## Files Created/Modified

### packages/auth/src/
| File | Status | Description |
|------|--------|-------------|
| `index.ts` | Modified | Updated exports |
| `types.ts` | Modified | Full type definitions |
| `jwt.ts` | Modified | JWT with sessionId support |
| `session.ts` | Replaced | Full session management |
| `magic-link.ts` | Replaced | Full magic link system |
| `password.ts` | Created | Password hashing |
| `cookies.ts` | Created | Cookie utilities |
| `middleware.ts` | Created | Auth middleware |
| `context.ts` | Modified | Full context utilities |

### packages/auth/src/__tests__/
| File | Tests | Description |
|------|-------|-------------|
| `password.test.ts` | 5 | Password hashing tests |
| `jwt.test.ts` | 8 | JWT signing/verification tests |
| `cookies.test.ts` | 7 | Cookie handling tests |
| `session.test.ts` | 8 | Session management tests |
| `magic-link.test.ts` | 10 | Magic link system tests |
| `middleware.test.ts` | 4 | Middleware utility tests |

### apps/orchestrator/src/
| File | Status | Description |
|------|--------|-------------|
| `middleware.ts` | Created | Route protection |
| `app/api/auth/login/route.ts` | Created | Magic link request |
| `app/api/auth/verify/route.ts` | Created | Magic link verification |
| `app/api/auth/logout/route.ts` | Created | Session revocation |
| `app/api/auth/session/route.ts` | Created | Session info / revoke all |
| `app/api/auth/switch-tenant/route.ts` | Created | Tenant switching |

---

## Verification Commands

```bash
# Type check

> **STATUS**: ✅ COMPLETE (2026-02-13)
pnpm turbo typecheck --filter=@cgk-platform/auth

# Run tests
pnpm --filter @cgk-platform/auth test

# Build
pnpm turbo build --filter=@cgk-platform/auth
```
