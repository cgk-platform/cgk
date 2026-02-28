# ADR-001: Schema-Per-Tenant Multi-Tenancy

**Date**: 2026-02-27
**Status**: Accepted
**Deciders**: Platform Architect Team
**Context**: Foundation architecture decision for CGK platform

---

## Context and Problem Statement

The CGK platform needs to support multiple white-labeled e-commerce businesses (tenants) within a single application infrastructure. How should we isolate tenant data in PostgreSQL to ensure security, performance, and maintainability?

**Key Requirements**:
- **Security**: Prevent data leakage between tenants
- **Performance**: Maintain fast query performance as platform scales
- **Isolation**: Each tenant's data must be completely isolated
- **Cost**: Optimize infrastructure costs by sharing resources
- **Maintainability**: Simple migration and backup processes

---

## Decision Drivers

* **Security-first**: Data leakage is unacceptable (regulatory compliance, brand reputation)
* **Query Performance**: Sub-200ms p95 latency for tenant queries
* **Development Ergonomics**: Easy to use patterns that prevent mistakes
* **Horizontal Scalability**: Support 100+ tenants without degradation
* **Migration Management**: Schema changes must apply to all tenants automatically
* **Backup/Restore**: Per-tenant backup/restore capability
* **Cost Efficiency**: Avoid per-tenant database overhead

---

## Considered Options

### Option 1: Schema-Per-Tenant (PostgreSQL Schemas)

**Architecture**:
```
public schema (shared):
├── organizations (tenant registry)
├── users (all users across tenants)
└── platform_* (platform-wide tables)

tenant_rawdog schema (per-tenant):
├── orders, customers, products
├── creators, projects, reviews
└── ... all tenant-specific data

tenant_meliusly schema (per-tenant):
├── orders, customers, products
└── ... (same structure, isolated data)
```

**Data Access**:
```typescript
// Set search_path to tenant schema
await withTenant('rawdog', async () => {
  return sql`SELECT * FROM orders` // Queries tenant_rawdog.orders
})
```

### Option 2: Row-Level Security (RLS)

**Architecture**:
```
public schema:
├── organizations
├── users
├── orders (with organization_id column)
├── customers (with organization_id column)
└── ... all tables have organization_id
```

**Data Access**:
```sql
-- RLS policy on orders table
CREATE POLICY tenant_isolation ON orders
  USING (organization_id = current_setting('app.current_tenant')::uuid);

-- Set tenant context
SET app.current_tenant = 'uuid-of-tenant';
SELECT * FROM orders; -- Only returns rows for current tenant
```

### Option 3: Database-Per-Tenant

**Architecture**:
```
rawdog_db:
  ├── orders
  ├── customers
  └── products

meliusly_db:
  ├── orders
  ├── customers
  └── products
```

**Data Access**: Separate connection pool per database.

---

## Decision Outcome

**Chosen option**: "Schema-Per-Tenant", because it provides the best balance of security, performance, and maintainability for our use case.

### Positive Consequences

* **Strong isolation**: `search_path` provides schema-level isolation (no WHERE clause bugs)
* **Simple queries**: No `organization_id` in every WHERE clause
* **Performance**: PostgreSQL optimizes within schemas, no cross-tenant table scans
* **Backup/Restore**: `pg_dump --schema=tenant_rawdog` for per-tenant backups
* **Migration simplicity**: Apply schema to template, create new tenant schemas from template
* **Query visibility**: Clear which schema is being queried (debugging, monitoring)
* **Cost efficient**: Single database, connection pooling, shared infrastructure

### Negative Consequences

* **Migration complexity**: Must apply migrations to ALL tenant schemas (scripted solution)
* **Schema count**: PostgreSQL limit ~10,000 schemas (acceptable for 1,000+ tenants)
* **Search path management**: Must wrap queries in `withTenant()` (developer discipline)
* **Cross-tenant queries**: Require explicit schema qualification (rare in our use case)

---

## Pros and Cons of the Options

### Schema-Per-Tenant ✅ (Chosen)

**Pros**:
* ✅ **Strong isolation**: Impossible to accidentally query wrong tenant (no WHERE clause bugs)
* ✅ **Performance**: PostgreSQL query planner optimizes per-schema, no tenant filtering overhead
* ✅ **Simple queries**: `SELECT * FROM orders` instead of `SELECT * FROM orders WHERE org_id = ?`
* ✅ **Backup/Restore**: Per-tenant backup with `pg_dump --schema=tenant_name`
* ✅ **Migration management**: Apply to template schema, replicate to tenants
* ✅ **Developer ergonomics**: `withTenant()` wrapper is simple and explicit
* ✅ **Cost efficient**: Single database, shared connection pool

**Cons**:
* ❌ **Migration complexity**: Must apply to all schemas (mitigated by scripted migrations)
* ❌ **Schema limit**: PostgreSQL max ~10,000 schemas (acceptable for our scale)
* ❌ **Developer discipline**: Must remember to use `withTenant()` (mitigated by pre-commit hooks)
* ❌ **Cross-tenant analytics**: Requires UNION across schemas (rare need)

---

### Row-Level Security (RLS)

**Pros**:
* ✅ **Single schema**: No schema proliferation
* ✅ **Cross-tenant queries**: Easy to query across tenants for analytics
* ✅ **PostgreSQL native**: Built-in RLS support

**Cons**:
* ❌ **WHERE clause bugs**: Forgetting `WHERE organization_id = ?` causes data leak
* ❌ **Performance**: Every query scans entire table then filters by org_id (index helps but still overhead)
* ❌ **Complexity**: RLS policies must be perfect for every table
* ❌ **Migration risk**: One bad migration removes RLS policy → data leak
* ❌ **Developer cognitive load**: Must always remember `organization_id` in queries
* ❌ **Debugging difficulty**: Data leak bugs are subtle (wrong results, not errors)

**Critical Risk**: A single forgotten `WHERE organization_id = ?` in production causes **data leak across tenants** (regulatory violation, brand damage, potential lawsuits).

---

### Database-Per-Tenant

**Pros**:
* ✅ **Ultimate isolation**: Separate databases guarantee no data leakage
* ✅ **Independent scaling**: Can scale one tenant's database independently

**Cons**:
* ❌ **Cost**: Separate database per tenant (infrastructure cost scales linearly)
* ❌ **Connection pools**: Need per-tenant connection pool (connection exhaustion risk)
* ❌ **Migration overhead**: Must run migrations sequentially on N databases (slow)
* ❌ **Backup complexity**: N separate backups to manage
* ❌ **Operational burden**: N databases to monitor, upgrade, maintain
* ❌ **Over-engineering**: Unnecessary complexity for our tenant count (<1,000 expected)

---

## Implementation Details

### Tenant Context Wrapper

```typescript
// packages/db/src/tenant-context.ts
export async function withTenant<T>(
  tenantSlug: string,
  callback: () => Promise<T>
): Promise<T> {
  const schemaName = `tenant_${tenantSlug}`

  // Validate schema exists
  const exists = await sql`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name = ${schemaName}
  `
  if (exists.rows.length === 0) {
    throw new Error(`Tenant schema not found: ${schemaName}`)
  }

  // Set search_path and execute callback
  await sql`SET search_path TO ${sql.identifier(schemaName)}, public`
  try {
    return await callback()
  } finally {
    await sql`RESET search_path`
  }
}
```

### Migration Strategy

```bash
# Create tenant schema from template
CREATE SCHEMA IF NOT EXISTS tenant_rawdog;

# Apply all tenant migrations to new schema
SET search_path TO tenant_rawdog;
\i packages/db/src/migrations/tenant/*.sql

# Apply to all existing tenants
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name LIKE 'tenant_%'
\gexec psql -c "SET search_path TO :schema_name; \i migration.sql"
```

### Pre-Commit Hook Validation

```typescript
// scripts/validate-tenant-context.ts
// Ensures all SQL queries are wrapped in withTenant()
const violations = files
  .filter(f => /await sql`/.test(content) && !/withTenant\(/.test(content))

if (violations.length > 0) {
  console.error('Tenant isolation violation: Raw SQL without withTenant()')
  process.exit(1)
}
```

---

## Comparison Matrix

| Criteria | Schema-Per-Tenant | RLS | Database-Per-Tenant |
|----------|-------------------|-----|---------------------|
| **Security** | ⭐⭐⭐⭐⭐ (structural isolation) | ⭐⭐⭐ (policy-based) | ⭐⭐⭐⭐⭐ (complete isolation) |
| **Performance** | ⭐⭐⭐⭐⭐ (schema-optimized) | ⭐⭐⭐ (filter overhead) | ⭐⭐⭐⭐ (dedicated resources) |
| **Cost** | ⭐⭐⭐⭐⭐ (shared DB) | ⭐⭐⭐⭐⭐ (shared DB) | ⭐⭐ (N databases) |
| **Developer Experience** | ⭐⭐⭐⭐ (simple wrapper) | ⭐⭐ (error-prone) | ⭐⭐⭐ (complex config) |
| **Migration Ease** | ⭐⭐⭐ (scripted) | ⭐⭐⭐⭐⭐ (single schema) | ⭐ (N migrations) |
| **Scalability** | ⭐⭐⭐⭐ (1,000+ tenants) | ⭐⭐⭐⭐⭐ (unlimited) | ⭐⭐ (cost prohibitive) |
| **Backup/Restore** | ⭐⭐⭐⭐⭐ (per-schema) | ⭐⭐⭐ (table-level filtering) | ⭐⭐⭐⭐⭐ (per-database) |

**Winner**: Schema-Per-Tenant scores highest on critical criteria (security + performance + cost).

---

## Real-World Validation

### Industry Examples

**Schema-Per-Tenant adopted by**:
- Shopify (10M+ merchants)
- Basecamp (multi-tenant SaaS)
- Heroku Postgres (shared database with schema isolation)

**RLS adopted by**:
- Simple single-tenant apps
- Low-security multi-tenant apps (blog platforms, etc.)

**Database-Per-Tenant adopted by**:
- Enterprise SaaS with <100 customers (high touch, high revenue)
- Financial institutions (regulatory requirements)

**Our use case**: Mid-scale SaaS with 10-1,000 tenants → Schema-Per-Tenant is the industry-proven choice.

---

## Migration Path (If We Need to Change)

**Schema-Per-Tenant → RLS**:
- Export data from all tenant schemas
- Consolidate into single schema with `organization_id` columns
- Apply RLS policies
- Effort: High (2-3 weeks)

**Schema-Per-Tenant → Database-Per-Tenant**:
- Export each schema to separate database
- Update connection pooling logic
- Effort: Medium (1 week)

**Verdict**: Schema-Per-Tenant is a good long-term choice with reasonable migration paths if requirements change.

---

## Links

* [CLAUDE.md#Multi-Tenancy-Patterns](../../CLAUDE.md#multi-tenancy-patterns)
* [TENANT-ISOLATION.md](../../MULTI-TENANT-PLATFORM-PLAN/TENANT-ISOLATION.md)
* [PostgreSQL Schemas Documentation](https://www.postgresql.org/docs/current/ddl-schemas.html)
* [Row-Level Security Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
