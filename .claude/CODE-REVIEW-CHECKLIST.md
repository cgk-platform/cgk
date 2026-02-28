# Code Review Checklist

> **Purpose**: Comprehensive checklist for manual code review and automated reviewer agent workflow
>
> **Last Updated**: 2026-02-27
> **Status**: Active
> **Related**: [reviewer.md](./agents/reviewer.md), [CONTEXT-MGMT.md](./CONTEXT-MGMT.md)

---

## Overview

This checklist provides systematic review criteria for all CGK platform code. Items are categorized as **BLOCKING** (must fix before merge) or **NON-BLOCKING** (should fix or track as tech debt).

**Integration**: The `reviewer` agent automatically references this checklist during all code reviews.

---

## Security Checks (BLOCKING)

All security issues are **BLOCKING** - code MUST NOT be merged until resolved.

### Tenant Isolation (CRITICAL)

- [ ] **No raw SQL** - All SQL queries wrapped in `withTenant()`
  ```typescript
  // ❌ BLOCKING VIOLATION
  const orders = await sql`SELECT * FROM orders`

  // ✅ CORRECT
  const orders = await withTenant(tenantId, () =>
    sql`SELECT * FROM orders`
  )
  ```

- [ ] **No raw cache** - All cache operations use `createTenantCache()`
  ```typescript
  // ❌ BLOCKING VIOLATION
  await redis.set('pricing-config', config)

  // ✅ CORRECT
  const cache = createTenantCache(tenantId)
  await cache.set('pricing-config', config)
  ```

- [ ] **Background jobs include tenantId**
  ```typescript
  // ❌ BLOCKING VIOLATION
  await jobs.send('order/created', { orderId })

  // ✅ CORRECT
  await jobs.send('order/created', { tenantId, orderId })
  ```

- [ ] **No cross-tenant data leaks** - Verify queries cannot access other tenants' data

### Authentication & Authorization

- [ ] **requireAuth() in protected routes**
  ```typescript
  // ❌ BLOCKING VIOLATION
  export async function GET(req: Request) {
    // No auth check!
    const data = await fetchData()
    return Response.json(data)
  }

  // ✅ CORRECT
  export async function GET(req: Request) {
    let auth: AuthContext
    try {
      auth = await requireAuth(req)
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Continue with authorized logic
  }
  ```

- [ ] **checkPermissionOrRespond() signature correct** (3 args)
  ```typescript
  // ❌ BLOCKING VIOLATION
  const denied = await checkPermissionOrRespond(
    request,           // Wrong!
    auth.tenantId,
    auth.userId,
    'permission.name'
  )

  // ✅ CORRECT (3 arguments)
  const denied = await checkPermissionOrRespond(
    auth.userId,       // 1. userId
    auth.tenantId,     // 2. tenantId
    'permission.name'  // 3. permission
  )
  ```

- [ ] **Permission naming convention** - Format: `resource.action` (e.g., `orders.view`, `analytics.edit`)

### Secrets & Credentials

- [ ] **No hardcoded secrets** - All credentials in environment variables
- [ ] **No secrets in logs** - Error messages don't expose API keys, tokens, passwords
- [ ] **Encryption keys tenant-specific** - Use `INTEGRATION_ENCRYPTION_KEY` for tenant credentials
- [ ] **OAuth tokens encrypted** - Use `SHOPIFY_TOKEN_ENCRYPTION_KEY` for Shopify tokens

### Input Validation

- [ ] **SQL injection prevention** - No string interpolation in SQL (use parameterized queries)
- [ ] **XSS prevention** - User input sanitized before rendering (React auto-escapes, but verify)
- [ ] **Path traversal prevention** - File paths validated (no `../` attacks)
- [ ] **Command injection prevention** - No unsanitized input to shell commands

### Data Exposure

- [ ] **No sensitive data in responses** - API responses don't expose secrets, internal IDs, or PII unnecessarily
- [ ] **Error messages safe** - Stack traces/internal errors only in development (not production)
- [ ] **Webhook signature verification** - All webhooks verify HMAC/signature before processing

---

## Type Safety (BLOCKING)

All type safety issues are **BLOCKING** - prevents runtime errors.

### Type Casting

- [ ] **No direct double casts** - MUST use `as unknown as Type`
  ```typescript
  // ❌ BLOCKING VIOLATION
  const data = result.rows[0] as MyType

  // ✅ CORRECT
  const row = result.rows[0]
  if (!row) throw new Error('Not found')
  return row as unknown as MyType
  ```

- [ ] **Database rows null-checked** - Always check `result.rows[0]` before access
  ```typescript
  // ❌ BLOCKING VIOLATION
  return toCamelCase(result.rows[0]) as MyType

  // ✅ CORRECT
  const row = result.rows[0]
  if (!row) return null  // or throw
  return toCamelCase(row as Record<string, unknown>) as unknown as MyType
  ```

- [ ] **Config objects cast through unknown**
  ```typescript
  // ❌ BLOCKING VIOLATION
  const config = action.config as ScheduleFollowupConfig

  // ✅ CORRECT
  const config = action.config as unknown as ScheduleFollowupConfig
  ```

### Array & Undefined Access

- [ ] **No undefined array access** - Check array length before accessing by index
  ```typescript
  // ❌ BLOCKING VIOLATION
  const firstItem = items[0]  // May be undefined!

  // ✅ CORRECT
  const firstItem = items[0]
  if (!firstItem) return null
  ```

### SQL Patterns (@vercel/postgres)

- [ ] **Arrays use PostgreSQL array literals**
  ```typescript
  // ❌ BLOCKING VIOLATION
  sql`SELECT * FROM items WHERE id = ANY(${ids})`

  // ✅ CORRECT
  sql`SELECT * FROM items WHERE id = ANY(${`{${ids.join(',')}}`}::text[])`
  ```

- [ ] **Dates converted to ISO strings**
  ```typescript
  // ❌ BLOCKING VIOLATION
  sql`UPDATE items SET expires_at = ${someDate}`

  // ✅ CORRECT
  sql`UPDATE items SET expires_at = ${someDate.toISOString()}`
  ```

- [ ] **No sql.unsafe() usage** - Doesn't exist, use if/else branches instead
  ```typescript
  // ❌ BLOCKING VIOLATION
  const whereClause = status ? `AND status = '${status}'` : ''
  await sql`SELECT * FROM items WHERE active = true ${sql.unsafe(whereClause)}`

  // ✅ CORRECT
  const result = status
    ? await sql`SELECT * FROM items WHERE active = true AND status = ${status}`
    : await sql`SELECT * FROM items WHERE active = true`
  ```

- [ ] **Dynamic table names use switch/case**
  ```typescript
  // ❌ BLOCKING VIOLATION
  sql`UPDATE ${sql(tableName)} SET status = ${status}`

  // ✅ CORRECT
  switch (entityType) {
    case 'project':
      return sql`UPDATE projects SET status = ${status} WHERE id = ${id}`
    case 'task':
      return sql`UPDATE tasks SET status = ${status} WHERE id = ${id}`
    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
  ```

---

## Tenant Isolation (BLOCKING)

These checks verify **MANDATORY** tenant isolation patterns (see [CLAUDE.md#Rule-2](../CLAUDE.md)).

### Database Queries

- [ ] **All queries scoped to tenant schema** - Use `withTenant()` wrapper
- [ ] **Foreign keys validated** - UUID vs TEXT type matching (public vs tenant schemas)
- [ ] **No cross-tenant joins** - Queries cannot access other tenants' data

### Caching

- [ ] **Cache keys tenant-prefixed** - Use `createTenantCache()` factory
- [ ] **No global cache pollution** - Each tenant has isolated cache namespace

### Background Jobs

- [ ] **Jobs include tenantId** - All job payloads have `{ tenantId }`
- [ ] **Job handlers validate tenant** - Re-verify tenantId before processing

### Integrations

- [ ] **Tenant-owned credentials** - Service clients use `getTenant*Client()` factories
  ```typescript
  // ❌ BLOCKING VIOLATION
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  // ✅ CORRECT
  const stripe = await getTenantStripeClient(tenantId)
  if (!stripe) return Response.json({ error: 'Stripe not configured' }, { status: 400 })
  ```

---

## Quality (NON-BLOCKING)

These should be fixed but won't block merge. Track as technical debt if not immediately addressed.

### Code Clarity

- [ ] **Console.* converted to logger.\*** - Use structured logging
  ```typescript
  // ⚠️ NON-BLOCKING (should fix)
  console.log('Order created:', orderId)

  // ✅ PREFERRED
  logger.info('Order created', { orderId, tenantId })
  ```

- [ ] **TODOs categorized by severity** - Use CRITICAL, FIXME, TODO, NOTE keywords
  ```typescript
  // ⚠️ NON-BLOCKING (should fix)
  // TODO: Fix this later

  // ✅ PREFERRED
  // CRITICAL: Security vulnerability - sanitize user input before storage
  // FIXME: N+1 query - batch load related data
  // TODO: Add caching for this expensive operation
  ```

- [ ] **Unused imports removed** - No dead code
- [ ] **Commented code removed** - Use git history instead

### Environment Variables

- [ ] **All env vars documented** - Added to .env.example with comments
  ```bash
  # ⚠️ NON-BLOCKING (should fix)
  # Missing from .env.example

  # ✅ PREFERRED
  # OAuth Configuration
  # From Google Cloud Console -> Credentials -> OAuth 2.0 Client IDs
  GOOGLE_CLIENT_ID=your-client-id-here
  GOOGLE_CLIENT_SECRET=your-secret-here
  ```

- [ ] **Vercel variables synced** - Production vars exist in Vercel for all environments

### Error Handling

- [ ] **Errors logged with context** - Include tenantId, userId, requestId
- [ ] **User-facing errors safe** - No stack traces or internal details exposed
- [ ] **Error boundaries present** - React error boundaries for UI components

---

## Correctness (BLOCKING)

### Logic & Edge Cases

- [ ] **Null/undefined checks** - All nullable values checked before use
- [ ] **Empty array/string checks** - Handle empty collections gracefully
- [ ] **Boundary value tests** - Min/max values, zero, negative numbers tested
- [ ] **Race condition prevention** - Async operations properly sequenced/locked

### Return Types

- [ ] **Return types match signatures** - Functions return what they promise
- [ ] **Exhaustive type handling** - All union type branches covered
- [ ] **Error cases return consistent types** - Don't mix `null`, `undefined`, `throw`

---

## Performance (NON-BLOCKING)

### Queries & Data Fetching

- [ ] **No N+1 queries** - Use batch loading or joins
  ```typescript
  // ⚠️ NON-BLOCKING (should fix)
  for (const order of orders) {
    const customer = await sql`SELECT * FROM customers WHERE id = ${order.customer_id}`
  }

  // ✅ PREFERRED
  const customerIds = orders.map(o => o.customer_id)
  const customers = await sql`SELECT * FROM customers WHERE id = ANY(${`{${customerIds.join(',')}}`}::uuid[])`
  ```

- [ ] **Pagination present** - Large datasets use LIMIT/OFFSET or cursor pagination
- [ ] **Missing indexes flagged** - Queried columns have indexes
- [ ] **Database rows counted efficiently** - Use `COUNT(*)` not `SELECT * then count`

### Algorithm Complexity

- [ ] **No O(n²) or worse** - Linear or log-linear algorithms preferred
- [ ] **Memory leaks prevented** - Event listeners, subscriptions, timers cleaned up
  ```typescript
  // ⚠️ NON-BLOCKING (should fix)
  useEffect(() => {
    const interval = setInterval(fetchData, 5000)
    // Missing cleanup!
  }, [])

  // ✅ PREFERRED
  useEffect(() => {
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])
  ```

---

## Maintainability (NON-BLOCKING)

### Code Patterns

- [ ] **Follows existing patterns** - Matches codebase conventions
- [ ] **Abstractions appropriate** - Not over-engineered or under-abstracted
- [ ] **File size reasonable** - <650 lines (hard limit), <400 preferred
- [ ] **Functions focused** - Single responsibility, clear purpose

### Naming

- [ ] **Names precise** - Variables/functions named for their actual purpose
- [ ] **Naming conventions followed** - camelCase, PascalCase, SCREAMING_SNAKE_CASE used correctly
- [ ] **No abbreviations** - Prefer `customer` over `cust`, `order` over `ord`

---

## Convention Adherence (NON-BLOCKING)

### Import Organization

- [ ] **Import order correct** - React, Next, external, internal, relative
  ```typescript
  // ✅ CORRECT ORDER
  import { useState } from 'react'            // React
  import { useRouter } from 'next/navigation' // Next.js
  import { z } from 'zod'                     // External
  import { Button } from '@cgk-platform/ui'   // Internal packages
  import { formatDate } from '../lib/utils'   // Relative
  ```

### TypeScript

- [ ] **No `any` types** - Use specific types or `unknown`
- [ ] **Generics used appropriately** - Type parameters when reusable
- [ ] **Strict mode compatible** - No `@ts-ignore` or `@ts-expect-error` without comment

### File Organization

- [ ] **Server/client boundary clear** - `'use client'` only on interactive components
- [ ] **API route patterns followed** - `export const dynamic = 'force-dynamic'`
- [ ] **Component colocation** - Related files grouped together

---

## Integration with Reviewer Agent

The `reviewer` agent (Opus 4.5) automatically uses this checklist during code reviews:

**Workflow**:
1. Read full diff or modified files
2. Walk through checklist systematically
3. Categorize findings (Critical Issues, Warnings, Suggestions, Security)
4. Provide specific file:line references
5. Suggest concrete fixes

**Invocation**:
```typescript
// After implementation complete
Task({
  subagent_type: 'reviewer',
  description: 'Review OAuth implementation',
  prompt: 'Review OAuth callback handler implementation for security and tenant isolation'
})
```

**Output Format** (from reviewer agent):
```markdown
## Review Summary
Overall assessment, risk level, recommendation

## Critical Issues (must fix before merge)
### [C1] Missing tenant isolation - apps/admin/api/orders/route.ts:45
Description, impact, fix

## Warnings (should fix)
### [W1] Console.log used - apps/admin/lib/analytics.ts:22
Description, fix

## Security Findings
### [SEC-1] Severity: HIGH - Missing auth check
Finding, impact, remediation
```

---

## Escalation Rules

**Security Issues**: ALWAYS escalate to security-auditor agent (Opus 4.5)
```typescript
Task({
  subagent_type: 'security-auditor',
  description: 'Security audit OAuth flow',
  prompt: 'Audit OAuth implementation for OWASP Top 10 vulnerabilities'
})
```

**Tenant Isolation Issues**: BLOCKING - cannot merge until fixed
- Run `/tenant-isolation-validator --fix` to auto-fix simple violations
- Manual review required for complex violations

**Type Safety Issues**: BLOCKING - run `pnpm turbo typecheck` to verify fix

---

## Pre-Merge Validation Commands

Before merging any PR, run:

```bash
# Type checking (REQUIRED)
pnpm turbo typecheck --filter=[app-name]

# Linting (REQUIRED)
pnpm turbo lint --filter=[app-name]

# Tenant isolation (REQUIRED)
pnpm validate:tenant-isolation --path apps/[app-name]

# Migration validation (if migrations changed)
bash scripts/validate-migration.sh

# Environment variables (if .env.example changed)
bash scripts/verify-env-vars.sh

# Tests (REQUIRED)
pnpm test --filter=[app-name]
```

All commands must pass (exit code 0) before merge.

---

## Quick Reference

| Category | Blocking? | Fix Required? | Validation |
|----------|-----------|---------------|------------|
| **Security** | ✅ Yes | Immediate | Pre-commit hook |
| **Type Safety** | ✅ Yes | Immediate | `pnpm turbo typecheck` |
| **Tenant Isolation** | ✅ Yes | Immediate | `pnpm validate:tenant-isolation` |
| **Performance** | ❌ No | Track as debt | Manual review |
| **Maintainability** | ❌ No | Track as debt | Manual review |
| **Convention** | ❌ No | Track as debt | `pnpm turbo lint` |

---

## Related Documentation

- [reviewer.md](./agents/reviewer.md) - Reviewer agent definition
- [security-auditor.md](./agents/security-auditor.md) - Security audit agent
- [CLAUDE.md](../CLAUDE.md) - Platform instructions
- [TENANT-ISOLATION.md](../MULTI-TENANT-PLATFORM-PLAN/TENANT-ISOLATION.md) - Tenant isolation rules

---

## Changelog

- **2026-02-27**: Initial checklist created based on existing validation scripts and best practices

---

**End of Checklist**

_Reviewers: Use this checklist systematically. Don't skip categories. Prioritize blocking issues over non-blocking._
