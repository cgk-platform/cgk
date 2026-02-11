# @cgk/auth - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2026-02-10

---

## Purpose

Authentication utilities for the CGK platform. Provides JWT handling, session management, magic link authentication, password utilities, and the critical `getTenantContext()` function for extracting tenant context from requests.

---

## Quick Reference

```typescript
import { getTenantContext, requireAuth, signJWT, verifyJWT } from '@cgk/auth'

// In API routes
export async function GET(req: Request) {
  const { tenantId, userId } = await getTenantContext(req)
  // Use tenantId with withTenant()
}

// Require authentication
export async function POST(req: Request) {
  const auth = await requireAuth(req)
  // auth.userId, auth.tenantId, auth.role, auth.orgs
}
```

---

## Key Patterns

### Pattern 1: Get Tenant Context (REQUIRED)

**When to use**: At the start of EVERY API route

```typescript
import { getTenantContext } from '@cgk/auth'
import { withTenant, sql } from '@cgk/db'

export async function GET(req: Request) {
  const { tenantId, userId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  return withTenant(tenantId, async () => {
    const data = await sql`SELECT * FROM orders`
    return Response.json({ data })
  })
}
```

### Pattern 2: Require Authentication

**When to use**: When route requires authenticated user

```typescript
import { requireAuth, AuthenticationError } from '@cgk/auth'

export async function POST(req: Request) {
  try {
    const { tenantId, userId, role, orgs, sessionId } = await requireAuth(req)
    // Full auth context available
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    throw error
  }
}
```

### Pattern 3: Magic Link Authentication

**When to use**: Passwordless login flow

```typescript
import { createMagicLink, sendMagicLinkEmail, verifyMagicLink } from '@cgk/auth'

// Request magic link
const token = await createMagicLink(email, 'login')
await sendMagicLinkEmail(email, token, 'login')

// Verify magic link
const { userId, purpose, orgId } = await verifyMagicLink(email, token)
```

### Pattern 4: Session Management

**When to use**: Creating and managing user sessions

```typescript
import { createSession, validateSession, revokeSession, signJWT } from '@cgk/auth'

// Create session after login
const { session, token } = await createSession(userId, orgId, request)

// Create JWT
const jwt = await signJWT({
  userId,
  sessionId: session.id,
  email: user.email,
  orgSlug,
  orgId,
  role,
  orgs,
})

// Validate session
const session = await validateSession(token)

// Revoke session (logout)
await revokeSession(sessionId)
```

### Pattern 5: Password Hashing

**When to use**: Password-based authentication

```typescript
import { hashPassword, verifyPassword } from '@cgk/auth'

// Hash password on registration
const hash = await hashPassword(password)

// Verify password on login
const isValid = await verifyPassword(password, hash)
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `types.ts` | Type definitions | `JWTPayload`, `Session`, `AuthContext`, `User`, `UserRole` |
| `jwt.ts` | JWT utilities | `signJWT`, `verifyJWT`, `decodeJWT` |
| `session.ts` | Session management | `createSession`, `validateSession`, `revokeSession`, `revokeAllSessions` |
| `magic-link.ts` | Magic link auth | `createMagicLink`, `verifyMagicLink`, `sendMagicLinkEmail` |
| `password.ts` | Password hashing | `hashPassword`, `verifyPassword` |
| `cookies.ts` | Cookie utilities | `setAuthCookie`, `getAuthCookie`, `clearAuthCookie` |
| `middleware.ts` | Auth middleware | `authMiddleware`, `hasRole`, `requireRole` |
| `context.ts` | Request context | `getTenantContext`, `requireAuth`, `getUserByEmail`, `createUser` |

---

## Type Reference

```typescript
// User roles
type UserRole = 'super_admin' | 'owner' | 'admin' | 'member'

// JWT Payload
interface JWTPayload {
  sub: string           // userId
  sid: string           // sessionId
  email: string
  org: string           // current orgSlug
  orgId: string         // current orgId
  role: UserRole
  orgs: OrgContext[]    // all accessible orgs
  iat: number
  exp: number
}

// Auth Context (from requireAuth)
interface AuthContext {
  userId: string
  email: string
  sessionId: string
  tenantId: string | null
  tenantSlug: string | null
  role: UserRole
  orgs: OrgContext[]
}
```

---

## Common Gotchas

### 1. Always check tenantId exists

```typescript
// WRONG - tenantId could be null
const { tenantId } = await getTenantContext(req)
await withTenant(tenantId, ...) // Error if null!

// CORRECT - Check first
const { tenantId } = await getTenantContext(req)
if (!tenantId) {
  return Response.json({ error: 'Tenant required' }, { status: 400 })
}
await withTenant(tenantId, ...)
```

### 2. Session tokens are hashed before storage

```typescript
// Token returned from createSession is the RAW token
const { session, token } = await createSession(userId, orgId)
// session.tokenHash is the SHA-256 hash stored in DB
// token is what gets sent to the client
```

### 3. Magic links are single-use

```typescript
// After verifyMagicLink succeeds, the link is marked as used
// Calling verifyMagicLink again with same token will fail
const result = await verifyMagicLink(email, token)
await verifyMagicLink(email, token) // Throws error!
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `jose` | Edge-compatible JWT signing and verification |
| `bcryptjs` | Password hashing |
| `nanoid` | Secure token generation |
| `@cgk/core` | Shared types |
| `@cgk/db` | Session and user storage |

---

## Testing

```bash
# Run tests
pnpm --filter @cgk/auth test

# Watch mode
pnpm --filter @cgk/auth test:watch
```
