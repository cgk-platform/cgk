# PHASE-1C: Authentication System

**Duration**: 1 week (Week 3)
**Depends On**: PHASE-1B (needs sessions/magic_links tables)
**Parallel With**: None
**Blocks**: PHASE-2A (admin needs auth), PHASE-2SA (super admin needs auth)

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

```sql
-- User memberships across organizations
CREATE TABLE public.user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  role VARCHAR(50) NOT NULL DEFAULT 'member',
  permissions JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_user_memberships_user ON public.user_memberships(user_id);
CREATE INDEX idx_user_memberships_org ON public.user_memberships(organization_id);
```

---

## Success Criteria

- [ ] JWT signing and verification working with jose library
- [ ] Sessions stored in database with secure token hashing
- [ ] Magic link flow sends email and authenticates user
- [ ] Auth middleware validates requests and injects tenant context
- [ ] Protected routes redirect unauthenticated users
- [ ] All auth flows covered by unit tests

---

## Deliverables

### JWT System (`packages/auth/src/jwt.ts`)
- `signJWT(payload)` - Create signed JWT with expiration
- `verifyJWT(token)` - Verify and decode JWT
- JWT payload includes: userId, sessionId, orgSlug, role

### Session Management (`packages/auth/src/session.ts`)
- `createSession(userId, orgId, req)` - Create database session
- `validateSession(token)` - Validate session token against database
- `revokeSession(sessionId)` - Invalidate a session
- `revokeAllSessions(userId)` - Invalidate all user sessions

### Magic Link System (`packages/auth/src/magic-link.ts`)
- `createMagicLink(email, purpose)` - Generate and store magic link
- `verifyMagicLink(email, token)` - Validate and consume magic link
- `sendMagicLinkEmail(email, link)` - Email delivery integration

### Auth Middleware (`packages/auth/src/middleware.ts`)
- `authMiddleware(req)` - Next.js middleware for protected routes
- Extracts JWT from cookie
- Validates session in database
- Injects headers: `x-tenant-id`, `x-user-id`, `x-user-role`
- Redirects to login on failure

### Password Utilities (`packages/auth/src/password.ts`)
- `hashPassword(password)` - bcrypt hashing
- `verifyPassword(password, hash)` - bcrypt comparison

### Auth Types (`packages/auth/src/types.ts`)
- `JWTPayload` interface
- `Session` interface
- `User` interface
- `AuthContext` interface

---

## Constraints

- MUST use `jose` library for JWT (not jsonwebtoken - better Edge compatibility)
- MUST use `bcryptjs` for password hashing
- MUST use `nanoid` for token generation
- Session tokens MUST be hashed before storage (never store plaintext)
- JWT expiration: 7 days (configurable)
- Session expiration: 30 days (configurable)
- Magic link expiration: 24 hours
- MUST support cookie-based auth (not just Authorization header)
- Cookies MUST be httpOnly, secure (in production), sameSite: lax

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
1. JWT refresh token strategy (silent refresh vs explicit)
2. Cookie configuration (domain, path settings)
3. Rate limiting for magic link requests
4. Whether to support both cookie and header-based auth
5. Session cleanup strategy (cron vs lazy deletion)
6. Email provider integration (Resend recommended)

---

## Tasks

### [PARALLEL] JWT Implementation
- [ ] Install `jose` package
- [ ] Implement `signJWT()` with HS256 algorithm
- [ ] Implement `verifyJWT()` with expiration check
- [ ] Define `JWTPayload` type with user/session/org fields
- [ ] Add JWT secret from environment variable

### [PARALLEL] Password Utilities
- [ ] Install `bcryptjs` package
- [ ] Implement `hashPassword()` with salt rounds
- [ ] Implement `verifyPassword()` for comparison

### [PARALLEL] Session Management
- [ ] Install `nanoid` package
- [ ] Implement `createSession()` with token hashing
- [ ] Implement `validateSession()` with token comparison
- [ ] Implement `revokeSession()` for logout
- [ ] Implement `revokeAllSessions()` for security events

### [SEQUENTIAL after JWT + Sessions] Magic Link System
- [ ] Implement `createMagicLink()` with token generation
- [ ] Implement `verifyMagicLink()` with one-time use
- [ ] Implement `sendMagicLinkEmail()` with Resend
- [ ] Handle magic link purpose: login, signup, invite

### [SEQUENTIAL after Sessions] Auth Middleware
- [ ] Implement middleware function for Next.js
- [ ] Extract JWT from `auth-token` cookie
- [ ] Validate JWT and fetch session from database
- [ ] Inject tenant context headers
- [ ] Handle redirect to login page
- [ ] Configure public vs protected route matching

### [SEQUENTIAL after All] Auth API Routes (in apps/orchestrator)
- [ ] Create `/api/auth/login` - magic link request
- [ ] Create `/api/auth/verify` - magic link verification
- [ ] Create `/api/auth/logout` - session revocation
- [ ] Create `/api/auth/session` - current session info

### [SEQUENTIAL after All] Testing
- [ ] Write JWT signing/verification tests
- [ ] Write session management tests
- [ ] Write magic link flow tests
- [ ] Write middleware tests

---

## JWT Payload Structure

```typescript
interface JWTPayload {
  sub: string           // user ID
  sessionId: string     // session ID for revocation
  orgSlug: string       // tenant slug
  orgId: string         // organization ID
  role: 'owner' | 'admin' | 'member'
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
11. Set auth-token cookie
12. Redirect to dashboard
```

### Request Authentication Flow
```
1. Request to protected route
2. Middleware extracts auth-token cookie
3. Verify JWT signature and expiration
4. Fetch session from database
5. Check session not revoked/expired
6. Inject x-tenant-id, x-user-id, x-user-role headers
7. Continue to route handler
8. Route handler uses getTenantFromRequest()
```

---

## Cookie Configuration

```typescript
const cookieOptions = {
  name: 'auth-token',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days (matches JWT)
}
```

---

## Definition of Done

- [ ] `signJWT()` and `verifyJWT()` working
- [ ] `createSession()` and `validateSession()` working
- [ ] `createMagicLink()` and `verifyMagicLink()` working
- [ ] Auth middleware injects tenant context correctly
- [ ] Login/logout flow works end-to-end
- [ ] All auth tests pass
- [ ] `npx tsc --noEmit` passes for packages/auth
