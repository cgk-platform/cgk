# ADR-002: Custom JWT Authentication over Clerk

**Date**: 2026-02-27
**Status**: Accepted
**Deciders**: Platform Architect Team
**Context**: CGK platform authentication strategy

---

## Context and Problem Statement

The CGK platform requires user authentication and session management across multiple white-labeled tenants. Should we use a third-party service (Clerk) or implement custom JWT-based authentication?

---

## Decision Drivers

* **Cost**: Clerk pricing scales with monthly active users ($0.02/MAU after 10k free)
* **Control**: Need complete control over auth flow for white-labeling
* **Multi-tenancy**: Must support tenant-specific branding and domains
* **Edge Runtime**: Middleware must run on Vercel Edge (limited Node.js APIs)
* **Customization**: Magic links, OAuth providers, tenant-specific login pages
* **Vendor lock-in**: Avoid dependency on third-party service for critical feature

---

## Considered Options

1. **Custom JWT + Sessions** (session table + JWT tokens)
2. **Clerk** (third-party auth SaaS)
3. **NextAuth.js** (open-source auth library)

---

## Decision Outcome

**Chosen option**: "Custom JWT + Sessions", because it provides full control, zero per-user cost, and Edge Runtime compatibility.

### Positive Consequences

* ✅ **Zero per-user cost**: No monthly fees scaling with MAU
* ✅ **Full control**: Custom magic link flow, tenant branding, OAuth providers
* ✅ **Edge compatible**: Web Crypto API works in Edge Runtime
* ✅ **Multi-tenant native**: Session table has `tenant_id`, supports tenant-specific auth
* ✅ **No vendor lock-in**: Own the auth system completely

### Negative Consequences

* ❌ **Implementation burden**: Must build and maintain auth system
* ❌ **Security responsibility**: Own security audits and compliance
* ❌ **Feature development**: Must implement 2FA, OAuth, etc. ourselves

---

## Pros and Cons of the Options

### Custom JWT + Sessions ✅ (Chosen)

**Pros**:
* ✅ Zero ongoing cost (vs $200-2,000/month for Clerk at scale)
* ✅ Edge Runtime compatible (Web Crypto API)
* ✅ Complete customization (tenant branding, custom flows)
* ✅ Multi-tenant native (tenant_id in session table)

**Cons**:
* ❌ Must implement security ourselves (OWASP Top 10 compliance)
* ❌ Must build features (2FA, OAuth, magic links)

### Clerk

**Pros**:
* ✅ Turnkey solution (no implementation needed)
* ✅ Built-in features (2FA, OAuth, magic links)

**Cons**:
* ❌ **Cost**: $0.02/MAU → $2,000/month at 100k MAU
* ❌ **Limited customization**: Clerk branding, limited white-labeling
* ❌ **Vendor lock-in**: Migration away is expensive
* ❌ **Multi-tenant complexity**: Separate Clerk org per tenant or complex tenant mapping

### NextAuth.js

**Pros**:
* ✅ Open-source, no cost
* ✅ Built-in OAuth providers

**Cons**:
* ❌ **Session architecture**: Cookie-based, not ideal for multi-tenant
* ❌ **Customization limits**: Opinionated structure
* ❌ **Maintenance**: Library updates, breaking changes

---

## Implementation

```typescript
// packages/auth/src/jwt.ts
import { SignJWT, jwtVerify } from 'jose'

export async function createJWT(payload: { userId: string; sessionId: string }) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyJWT(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  const { payload } = await jwtVerify(token, secret)
  return payload as { userId: string; sessionId: string }
}
```

---

## Links

* [CLAUDE.md#Authentication](../../CLAUDE.md#authentication)
* [packages/auth/](../../packages/auth/)
