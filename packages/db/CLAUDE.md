# @cgk/db - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-10

---

## Purpose

Database client and tenant utilities for the multi-tenant platform. Provides schema isolation, query helpers, migration system, and the critical `withTenant()` wrapper for all tenant-scoped database operations.

---

## Quick Reference

```typescript
import { withTenant, sql, createTenantCache } from '@cgk/db'

// ALWAYS use withTenant for tenant data
const orders = await withTenant('rawdog', async () => {
  return sql`SELECT * FROM orders LIMIT 10`
})

// ALWAYS use createTenantCache for tenant-isolated caching
const cache = createTenantCache('rawdog')
await cache.set('key', value, { ttl: 3600 })
```

---

## Entry Points

| Import Path | Runtime | Purpose |
|-------------|---------|---------|
| `@cgk/db` | Edge + Node.js | Core utilities: `sql`, `withTenant`, cache |
| `@cgk/db/migrations` | Node.js ONLY | Migration utilities (uses fs/path) |

**CRITICAL: Never import from `@cgk/db/migrations` in middleware or Edge Runtime code.**

```typescript
// Middleware (Edge Runtime) - OK
import { sql, withTenant } from '@cgk/db'

// CLI/Scripts (Node.js) - OK
import { runPublicMigrations, createTenantSchema } from '@cgk/db/migrations'

// Middleware - BREAKS (fs/path not available)
import { runPublicMigrations } from '@cgk/db/migrations'  // ❌ NEVER
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

### Pattern 2: Extract Tenant from Request

**When to use**: In API routes to get tenant context

```typescript
import { getTenantFromRequest, requireTenant, withTenant } from '@cgk/db'

// Option 1: Returns null if no tenant
const tenant = await getTenantFromRequest(request)
if (tenant) {
  await withTenant(tenant.slug, async () => { ... })
}

// Option 2: Throws TenantRequiredError if no tenant
const tenant = await requireTenant(request)
await withTenant(tenant.slug, async () => { ... })
```

### Pattern 3: Tenant-Isolated Cache

**When to use**: ALWAYS for tenant-specific caching

```typescript
import { createTenantCache } from '@cgk/db'

const cache = createTenantCache('rawdog')

// Stored as: tenant:rawdog:pricing-config
await cache.set('pricing-config', { freeShipping: 5000 }, { ttl: 3600 })

// Retrieved from: tenant:rawdog:pricing-config
const config = await cache.get<{ freeShipping: number }>('pricing-config')
```

### Pattern 4: Parameterized Queries

**When to use**: ALWAYS for dynamic values

```typescript
// DO this - safe from SQL injection
const users = await sql`SELECT * FROM users WHERE email = ${email}`

// DON'T do this - SQL injection vulnerability
const users = await sql`SELECT * FROM users WHERE email = '${email}'`
```

### Pattern 5: Running Migrations

**When to use**: Setup and tenant creation (Node.js only, NOT in middleware)

```typescript
// Import from @cgk/db/migrations (NOT @cgk/db)
import { runPublicMigrations, createTenantSchema } from '@cgk/db/migrations'

// Run public schema migrations
await runPublicMigrations()

// Create a new tenant with all migrations
await createTenantSchema('new_brand')
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Edge-safe exports | `sql`, `withTenant`, cache utilities |
| `migrations.ts` | Node.js-only entry | Migration utilities (uses fs/path) |
| `client.ts` | Database connection | `sql` |
| `tenant.ts` | Tenant context | `withTenant`, `setTenantSchema`, `validateTenantSlug` |
| `request.ts` | Request helpers | `getTenantFromRequest`, `requireTenant` |
| `cache.ts` | Redis cache isolation | `createTenantCache`, `createGlobalCache` |
| `migrations/` | Migration system | `runPublicMigrations`, `createTenantSchema` |
| `migrations/public/` | Public schema SQL | 7 migration files |
| `migrations/tenant/` | Tenant schema SQL | 7 migration files |

---

## Exports Reference

### Database Client

```typescript
// SQL template tag
sql<T>(template: TemplateStringsArray, ...values: unknown[]): Promise<QueryResult<T>>
```

### Tenant Context

```typescript
// Tenant context wrapper (REQUIRED for tenant data)
withTenant<T>(slug: string, fn: () => Promise<T>): Promise<T>

// Direct schema setting (prefer withTenant)
setTenantSchema(slug: string): Promise<void>

// Reset to public schema
resetToPublicSchema(): Promise<void>

// Validate tenant slug format
validateTenantSlug(slug: string): void
isValidTenantSlug(slug: string): boolean
getTenantSchemaName(slug: string): string
```

### Request Helpers

```typescript
// Extract tenant from request (returns null if not found)
getTenantFromRequest(request: Request): Promise<TenantContext | null>

// Extract tenant or throw TenantRequiredError
requireTenant(request: Request): Promise<TenantContext>

// Create JSON response for missing tenant
tenantNotFoundResponse(): Response

// Error class
class TenantRequiredError extends Error
```

### Cache

```typescript
// Create tenant-isolated cache
createTenantCache(tenantSlug: string): TenantCache

// Create global (platform-wide) cache
createGlobalCache(): TenantCache

interface TenantCache {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void>
  delete(key: string): Promise<boolean>
  exists(key: string): Promise<boolean>
  clear(): Promise<void>
}
```

### Migrations

```typescript
// Run public schema migrations
runPublicMigrations(options?: MigrationOptions): Promise<MigrationResult[]>

// Run tenant schema migrations
runTenantMigrations(tenantSlug: string, options?: MigrationOptions): Promise<MigrationResult[]>

// Create new tenant schema and run migrations
createTenantSchema(slug: string, options?: MigrationOptions): Promise<MigrationResult[]>

// Check if tenant schema exists
tenantSchemaExists(slug: string): Promise<boolean>

// Get migration status
getMigrationStatus(schema: string): Promise<{ applied: MigrationRecord[], pending: Migration[] }>
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

### 4. Always use tenant-prefixed cache

```typescript
// WRONG - Data leak between tenants
await redis.set('pricing-config', config)

// CORRECT - Use createTenantCache
const cache = createTenantCache('rawdog')
await cache.set('pricing-config', config)
```

### 5. Validate tenant slugs

```typescript
// Tenant slugs must match: ^[a-z0-9_]+$
// Valid: rawdog, my_brand, brand_2024
// Invalid: My-Brand, Brand Name, RAWDOG

import { isValidTenantSlug, validateTenantSlug } from '@cgk/db'

if (!isValidTenantSlug(slug)) {
  throw new Error('Invalid slug')
}
// or
validateTenantSlug(slug) // throws if invalid
```

### 6. Edge Runtime Compatibility

```typescript
// WRONG - Importing migrations in middleware breaks Edge Runtime
import { sql, runPublicMigrations } from '@cgk/db'  // ❌ Even partial import fails

// CORRECT - Use separate entry points
import { sql } from '@cgk/db'  // Edge-safe
import { runPublicMigrations } from '@cgk/db/migrations'  // Node.js only (in API routes)
```

---

## Migration Writing Guidelines

### Critical Rules for New Migrations

1. **Always use IF NOT EXISTS / IF EXISTS**
   ```sql
   CREATE TABLE IF NOT EXISTS my_table (...)
   CREATE INDEX IF NOT EXISTS idx_name ON my_table(column);
   DROP TRIGGER IF EXISTS my_trigger ON my_table;
   ```

2. **Wrap enum creation in DO blocks**
   ```sql
   DO $$ BEGIN
     CREATE TYPE my_enum AS ENUM ('a', 'b', 'c');
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$;
   ```

3. **Use fully qualified function names in tenant schemas**
   ```sql
   -- WRONG - function not found in tenant schema
   EXECUTE FUNCTION update_updated_at_column();

   -- CORRECT - reference public schema
   EXECUTE FUNCTION public.update_updated_at_column();
   ```

4. **Use public.vector for pgvector types in tenant schemas**
   ```sql
   -- WRONG - vector type not in tenant search_path
   embedding vector(1536)

   -- CORRECT - use public schema qualifier
   embedding public.vector(1536)
   CREATE INDEX ... USING hnsw (embedding public.vector_cosine_ops)
   ```

5. **Match foreign key types exactly**
   ```sql
   -- Check actual table types before referencing
   -- public.users.id is UUID
   -- tenant creators.id is TEXT
   -- tenant ai_agents.id is TEXT
   -- tenant videos.id is TEXT
   -- tenant projects.id is UUID

   -- WRONG - type mismatch
   user_id TEXT REFERENCES public.users(id)  -- users.id is UUID!

   -- CORRECT - match types
   user_id UUID REFERENCES public.users(id)
   ```

6. **Verify enum values exist before using in WHERE clauses**
   ```sql
   -- Check existing enum values first:
   -- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'my_enum'::regtype;

   -- WRONG - 'onboarding' doesn't exist in creator_status
   WHERE status IN ('approved', 'onboarding')

   -- CORRECT - use actual enum values
   WHERE status IN ('approved', 'pending')
   ```

7. **Match column names with existing schema**
   ```sql
   -- Check actual columns first:
   -- \d table_name

   -- WRONG - column doesn't exist
   SELECT o.email, o.total_price_cents FROM orders o

   -- CORRECT - use actual column names
   SELECT o.customer_email, o.total_cents FROM orders o
   ```

### Common Type Mismatches (Tenant Schema)

| Table | ID Type | Notes |
|-------|---------|-------|
| `public.users` | UUID | All user_id FKs must be UUID |
| `public.organizations` | UUID | All org FKs must be UUID |
| `creators` | TEXT | Tenant-scoped, text IDs |
| `ai_agents` | TEXT | Tenant-scoped, text IDs |
| `videos` | TEXT | Tenant-scoped, text IDs |
| `projects` | UUID | Tenant-scoped, UUID IDs |
| `orders` | TEXT | Tenant-scoped, text IDs |

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
- `@cgk/cli` - Database setup and tenant management
- All `apps/*` for data access

### Uses:
- `@vercel/postgres` - Database driver
- `@cgk/core` - Type definitions
- Upstash Redis (optional) - For cache (falls back to in-memory)
