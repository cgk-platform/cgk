# @cgk/db - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-10

---

## Purpose

Database client and tenant utilities for the multi-tenant platform. Provides schema isolation, query helpers, and the critical `withTenant()` wrapper for all tenant-scoped database operations.

---

## Quick Reference

```typescript
import { withTenant, sql } from '@cgk/db'

// ALWAYS use withTenant for tenant data
const orders = await withTenant('rawdog', async () => {
  return sql`SELECT * FROM orders LIMIT 10`
})
```

---

## Key Patterns

### Pattern 1: Tenant-Scoped Queries (MANDATORY)

**When to use**: ALWAYS when querying tenant data

```typescript
import { withTenant, sql } from '@cgk/db'

// DO this - queries run against tenant_rawdog schema
const orders = await withTenant('rawdog', async () => {
  return sql`SELECT * FROM orders WHERE status = 'pending'`
})

// DON'T do this - queries public schema, wrong data!
const orders = await sql`SELECT * FROM orders`
```

### Pattern 2: Parameterized Queries

**When to use**: ALWAYS for dynamic values

```typescript
// DO this - safe from SQL injection
const users = await sql`SELECT * FROM users WHERE email = ${email}`

// DON'T do this - SQL injection vulnerability
const users = await sql`SELECT * FROM users WHERE email = '${email}'`
```

### Pattern 3: Multiple Queries in Same Context

**When to use**: When you need multiple queries for same tenant

```typescript
const result = await withTenant('rawdog', async () => {
  const orders = await sql`SELECT * FROM orders LIMIT 10`
  const customers = await sql`SELECT * FROM customers LIMIT 10`
  return { orders, customers }
})
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | `withTenant`, `sql` |
| `client.ts` | Database connection | `sql` |
| `tenant.ts` | Tenant context | `withTenant`, `setTenantSchema` |
| `types.ts` | Type definitions | `QueryResult`, `QueryConfig` |

---

## Exports Reference

### Functions

```typescript
// Tenant context wrapper (REQUIRED for tenant data)
withTenant<T>(slug: string, fn: () => Promise<T>): Promise<T>

// Direct schema setting (prefer withTenant)
setTenantSchema(slug: string): Promise<void>

// SQL template tag
sql<T>(template: TemplateStringsArray, ...values: unknown[]): Promise<T[]>
```

---

## Common Gotchas

### 1. NEVER use db.connect() directly

```typescript
// WRONG - Breaks with Neon connection pooling
import { db } from '@vercel/postgres'
const client = await db.connect()

// CORRECT - Use sql template tag
import { sql } from '@cgk/db'
const result = await sql`SELECT * FROM users`
```

### 2. Transactions don't work with Neon pooling

```typescript
// WRONG - Transaction may span multiple connections
await sql`BEGIN`
await sql`INSERT INTO orders (...)`
await sql`INSERT INTO order_items (...)`
await sql`COMMIT`

// CORRECT - Use atomic operations with ON CONFLICT
await sql`
  INSERT INTO orders (...)
  ON CONFLICT (id) DO UPDATE SET ...
`
```

### 3. Always include tenant context

```typescript
// WRONG - Query runs in wrong schema
const orders = await sql`SELECT * FROM orders`

// CORRECT - Wrap in tenant context
const orders = await withTenant('rawdog', async () => {
  return sql`SELECT * FROM orders`
})
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@vercel/postgres` | PostgreSQL client for Vercel/Neon |
| `@cgk/core` | Shared types and utilities |

---

## Integration Points

### Used by:
- `@cgk/auth` - Session storage
- `@cgk/jobs` - Job state persistence
- All `apps/*` for data access

### Uses:
- `@vercel/postgres` - Database driver
- `@cgk/core` - Type definitions
