# @cgk/auth - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-10

---

## Purpose

Authentication utilities for the CGK platform. Provides JWT handling, session management, and the critical `getTenantContext()` function for extracting tenant context from requests.

---

## Quick Reference

```typescript
import { getTenantContext, requireAuth, signJWT, verifyJWT } from '@cgk/auth'

// In API routes
export async function GET(req: Request) {
  const { tenantId, userId } = await getTenantContext(req)
  // Use tenantId with withTenant()
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
import { requireAuth } from '@cgk/auth'

export async function POST(req: Request) {
  const { tenantId, userId, role } = await requireAuth(req)
  // Throws if not authenticated
}
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `context.ts` | Request context | `getTenantContext`, `requireAuth` |
| `jwt.ts` | JWT utilities | `signJWT`, `verifyJWT` |
| `session.ts` | Session management | `validateSession`, `createSession` |
| `magic-link.ts` | Magic link auth | `sendMagicLink`, `verifyMagicLink` |
| `types.ts` | Type definitions | `JWTPayload`, `Session`, `AuthContext` |

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

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `jose` | JWT signing and verification |
| `@cgk/core` | Shared types |
| `@cgk/db` | Session storage |
