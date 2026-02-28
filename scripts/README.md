# CGK Platform Validation Scripts

This directory contains standalone validation scripts for ensuring code quality and platform standards.

## Available Scripts

### 1. Tenant Context Validator (`validate-tenant-context.ts`)

Validates that all tenant-scoped operations use proper isolation patterns.

**What it checks:**
- SQL queries wrapped in `withTenant()`
- Cache operations using `createTenantCache()`
- Background jobs including `tenantId` in payload

**Usage:**
```bash
# Validate entire codebase
pnpm exec tsx scripts/validate-tenant-context.ts

# Validate specific directory
pnpm exec tsx scripts/validate-tenant-context.ts packages/db/src

# Verbose output (show all violations)
pnpm exec tsx scripts/validate-tenant-context.ts --verbose
```

**Exit codes:**
- `0` - No violations found
- `1` - Violations found

**Example output:**
```
🔍 Scanning for tenant isolation violations...

📊 Scan Results:
   Files scanned: 12
   Files with violations: 2
   Total violations: 5

❌ Tenant Isolation Violations Found:

  🗄️ SQL without withTenant() (5)
    ./packages/db/src/webhook-idempotency.ts:38
      SQL query without withTenant() wrapper
      const result = await sql`

📝 Remediation:
  1. Wrap SQL queries in withTenant(): withTenant(tenantId, () => sql`...`)
  2. Use createTenantCache(tenantId) instead of direct cache access
  3. Include { tenantId } in all job payloads
```

---

### 2. Migration Validator (`validate-migration.sh`)

Validates SQL migration files for common issues.

**What it checks:**
- Missing `IF NOT EXISTS` on `CREATE TABLE` statements
- Missing `IF NOT EXISTS` on `CREATE INDEX` statements
- Missing `IF EXISTS` on `DROP TRIGGER` statements
- ID type compatibility on foreign keys (UUID vs TEXT)
- Missing `public.` prefix for functions in tenant schemas
- Missing `public.` prefix for vector types in tenant schemas

**Usage:**
```bash
# Validate single migration file
./scripts/validate-migration.sh packages/db/src/migrations/public/003_users.sql

# Validate all migrations in a directory
./scripts/validate-migration.sh packages/db/src/migrations/tenant/

# Validate all migrations
./scripts/validate-migration.sh packages/db/src/migrations/
```

**Exit codes:**
- `0` - No violations found
- `1` - Violations found

**Example output:**
```
🔍 Scanning SQL migrations for violations...

📊 Scan Results:
   Files scanned: 1
   Files with violations: 1
   Total violations: 3

❌ Migration Violations Found:

  📝 Missing IF NOT EXISTS / IF EXISTS (2)
    packages/db/src/migrations/tenant/010_ai_agents.sql:19
      CREATE TABLE without IF NOT EXISTS
      CREATE TABLE ai_agents (

  🔤 Foreign Key Type Mismatch (1)
    packages/db/src/migrations/tenant/010_ai_agents.sql:45
      TEXT column referencing public.users(id) - should be UUID
      user_id TEXT REFERENCES public.users(id)

📝 Remediation:
  1. Add IF NOT EXISTS to CREATE TABLE and CREATE INDEX statements
  2. Add IF EXISTS to DROP TRIGGER statements
  3. Match foreign key types (UUID for public.users, public.organizations)
  4. Use public.update_updated_at_column() in tenant schemas
  5. Use public.vector(1536) for pgvector types in tenant schemas
```

---

## Integration with CI/CD

Both scripts are designed to be used in CI/CD pipelines:

### GitHub Actions

```yaml
# .github/workflows/validate.yml
name: Validate Code Standards

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: pnpm install

      - name: Validate tenant isolation
        run: pnpm exec tsx scripts/validate-tenant-context.ts

      - name: Validate migrations
        run: ./scripts/validate-migration.sh packages/db/src/migrations/
```

### Pre-commit Hook (Husky)

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Validate tenant isolation
pnpm exec tsx scripts/validate-tenant-context.ts || exit 1

# Validate migrations (only if migration files changed)
git diff --cached --name-only | grep "migrations/.*\.sql$" && {
  ./scripts/validate-migration.sh packages/db/src/migrations/ || exit 1
}
```

---

## Common Patterns

### Tenant Context Violations

**Problem:** SQL query without `withTenant()`
```typescript
// ❌ WRONG - No tenant context
const orders = await sql`SELECT * FROM orders`
```

**Solution:**
```typescript
// ✅ CORRECT - Wrapped in withTenant()
const orders = await withTenant('rawdog', async () => {
  return sql`SELECT * FROM orders`
})
```

---

**Problem:** Direct cache access
```typescript
// ❌ WRONG - No tenant isolation
await redis.set('pricing-config', config)
```

**Solution:**
```typescript
// ✅ CORRECT - Using createTenantCache()
const cache = createTenantCache('rawdog')
await cache.set('pricing-config', config)
```

---

**Problem:** Job payload missing `tenantId`
```typescript
// ❌ WRONG - Missing tenantId
await jobs.send('order/created', {
  orderId: 'order_123'
})
```

**Solution:**
```typescript
// ✅ CORRECT - Include tenantId
await jobs.send('order/created', {
  tenantId: 'rawdog',
  orderId: 'order_123'
})
```

---

### Migration Violations

**Problem:** CREATE TABLE without IF NOT EXISTS
```sql
-- ❌ WRONG - Not idempotent
CREATE TABLE orders (
  id TEXT PRIMARY KEY
);
```

**Solution:**
```sql
-- ✅ CORRECT - Idempotent
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY
);
```

---

**Problem:** Foreign key type mismatch
```sql
-- ❌ WRONG - TEXT referencing UUID
user_id TEXT REFERENCES public.users(id)
```

**Solution:**
```sql
-- ✅ CORRECT - UUID referencing UUID
user_id UUID REFERENCES public.users(id)
```

---

**Problem:** Missing public. prefix in tenant schema
```sql
-- ❌ WRONG - Function not qualified
CREATE TRIGGER update_updated_at
  BEFORE UPDATE ON creators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Solution:**
```sql
-- ✅ CORRECT - Use public. prefix
CREATE TRIGGER update_updated_at
  BEFORE UPDATE ON creators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

---

## False Positives

Both scripts may report false positives in certain edge cases:

### Tenant Context Validator

- **Public schema operations** - The validator may flag SQL queries in `packages/db/src/tenant.ts` that legitimately operate on the public schema
- **Migration utilities** - Code that creates tenant schemas won't use `withTenant()`

**Workaround:** Review violations manually. Violations in `packages/db/src/tenant.ts` and `packages/db/src/migrations/` are often legitimate.

### Migration Validator

- **DO blocks** - CREATE TYPE statements wrapped in DO blocks are idempotent but may still be flagged
- **Comments** - The script tries to skip comments but may occasionally flag commented-out SQL

**Workaround:** Review violations manually. DO blocks are safe to ignore.

---

## Maintenance

These scripts are standalone and reference patterns from `/Users/holdenthemic/Documents/cgk/CLAUDE.md`:

- **Tenant isolation rules** - CLAUDE.md section "Multi-Tenancy Patterns"
- **Migration patterns** - CLAUDE.md section "Schema Layout & ID Types"

When updating these patterns in CLAUDE.md, ensure these scripts are updated to match.
