# Tenant Isolation Validator

> **Purpose**: Validates that all tenant-scoped operations use proper isolation patterns across the CGK codebase

**Version**: 1.0.0
**Type**: Executable Skill
**Invocation**: `/tenant-isolation-validator [options]`

---

## Overview

This skill scans the CGK codebase for violations of tenant isolation patterns, ensuring:
- ✅ All SQL queries are wrapped in `withTenant()`
- ✅ All cache operations use `createTenantCache()`
- ✅ All background jobs include `tenantId` in payload

**Critical**: Tenant isolation violations can cause data leaks between white-labeled brands. This validator prevents those violations from entering the codebase.

---

## Usage

### Basic Scan

```bash
/tenant-isolation-validator
```

Scans current directory and all subdirectories for violations.

### Scan Specific Path

```bash
/tenant-isolation-validator --path apps/admin
```

Scans only the `apps/admin` directory.

### Auto-Fix Mode

```bash
/tenant-isolation-validator --fix
```

Automatically fixes violations where possible (simple wrapper additions).

### Verbose Output

```bash
/tenant-isolation-validator --verbose
```

Shows all violations (not just first 5 per rule).

---

## Validation Rules

### Rule 1: No Raw SQL (`no-raw-sql`)

**Violation**:
```typescript
// ❌ BAD - SQL without withTenant
export async function getOrders() {
  return await sql`SELECT * FROM orders ORDER BY created_at DESC`
}
```

**Fix**:
```typescript
// ✅ GOOD - SQL wrapped in withTenant
export async function getOrders(tenantId: string) {
  return await withTenant(tenantId, async () => {
    return sql`SELECT * FROM orders ORDER BY created_at DESC`
  })
}
```

**Rationale**: Without `withTenant()`, the SQL query runs against the default schema (likely `public`), not the tenant-specific schema. This causes cross-tenant data leakage.

---

### Rule 2: No Raw Cache (`no-raw-cache`)

**Violation**:
```typescript
// ❌ BAD - Direct Redis access
export async function getCachedConfig(key: string) {
  return await redis.get(key)
}
```

**Fix**:
```typescript
// ✅ GOOD - Tenant-prefixed cache
import { createTenantCache } from '@cgk-platform/cache'

export async function getCachedConfig(tenantId: string, key: string) {
  const cache = createTenantCache(tenantId)
  return await cache.get(key) // Stored as: tenant:{tenantId}:{key}
}
```

**Rationale**: Without tenant prefixes, cache keys collide across tenants (e.g., `pricing-config` could be overwritten by another tenant).

---

### Rule 3: Jobs Must Include `tenantId` (`no-tenant-in-job`)

**Violation**:
```typescript
// ❌ BAD - Job payload missing tenantId
await jobs.send('order/created', {
  orderId: 'order_123'
})
```

**Fix**:
```typescript
// ✅ GOOD - Job payload includes tenantId
await jobs.send('order/created', {
  tenantId: 'rawdog',
  orderId: 'order_123'
})
```

**Rationale**: Background jobs run asynchronously and need to know which tenant's data to operate on. Missing `tenantId` causes jobs to fail or operate on wrong tenant.

---

## Output Format

### Success (No Violations)

```
🔍 Scanning for tenant isolation violations...

📊 Scan Results:
   Files scanned: 247
   Files with violations: 0
   Total violations: 0

✅ No tenant isolation violations found!
```

### Failure (Violations Found)

```
🔍 Scanning for tenant isolation violations...

📊 Scan Results:
   Files scanned: 247
   Files with violations: 12
   Total violations: 18

❌ Tenant Isolation Violations Found:

  🗄️ SQL without withTenant() (15)
    ./apps/admin/app/api/orders/route.ts:23
      SQL query without withTenant() wrapper
      return await sql`SELECT * FROM orders ORDER BY created_at DESC`
      💡 Fix available (run with --fix)

    ./apps/admin/app/api/customers/route.ts:34
      SQL query without withTenant() wrapper
      const customers = await sql`SELECT * FROM customers LIMIT 50`
      💡 Fix available (run with --fix)

    ... and 13 more

  💾 Cache without createTenantCache() (2)
    ./packages/commerce/src/pricing.ts:45
      Direct cache access without tenant isolation
      await redis.get('pricing-config')

  ⚙️ Job missing tenantId (1)
    ./apps/admin/app/api/orders/actions.ts:67
      Job payload missing tenantId field
      await jobs.send('order/created', { orderId })...

📝 Remediation:
  1. Wrap SQL queries in withTenant(): withTenant(tenantId, () => sql`...`)
  2. Use createTenantCache(tenantId) instead of direct cache access
  3. Include { tenantId } in all job payloads

  Run with --fix to auto-fix some violations
```

---

## Integration with Pre-Commit Hooks

This skill is automatically invoked by Husky pre-commit hooks:

```bash
# .husky/pre-commit
#!/bin/sh
pnpm lint-staged

# lint-staged config (package.json)
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "node .claude/skills/tenant-isolation-validator/index.js"
    ]
  }
}
```

**Behavior**: Commits are **blocked** if violations are found.

---

## CI/CD Integration

GitHub Actions workflow runs this validator on all pull requests:

```yaml
# .github/workflows/ci.yml
tenant-isolation:
  name: Tenant Isolation Check
  runs-on: ubuntu-latest
  steps:
    - run: node .claude/skills/tenant-isolation-validator/index.js
```

**Behavior**: Pull requests are **blocked** if violations are found.

---

## Manual Invocation

### Standalone Script

```bash
# From project root
node .claude/skills/tenant-isolation-validator/index.js

# With options
node .claude/skills/tenant-isolation-validator/index.js --fix --verbose
```

### As npm Script

```bash
# package.json
{
  "scripts": {
    "validate:tenant-isolation": "node .claude/skills/tenant-isolation-validator/index.js"
  }
}

# Run
pnpm validate:tenant-isolation
```

---

## False Positives

### Ignoring Specific Lines

Add comment to disable check:

```typescript
// cgk-ignore: no-raw-sql (justification: this is a platform-wide query)
const platformStats = await sql`SELECT COUNT(*) FROM public.organizations`
```

### Ignoring Entire Files

Not yet supported. If needed, add to `.gitignore` style ignore file.

---

## Extending the Validator

### Adding New Rules

Edit `index.js` and add new rule detection:

```javascript
// Rule 4: Example - No hardcoded tenant slugs
lines.forEach((line, idx) => {
  if (/tenant_rawdog|tenant_meliusly/.test(line)) {
    fileViolations.push({
      rule: 'no-hardcoded-tenant',
      message: 'Hardcoded tenant slug (use dynamic tenantId)',
      // ...
    })
  }
})
```

### Testing

Create test cases in `.claude/skills/tenant-isolation-validator/__tests__/`:

```typescript
// __tests__/index.test.ts
import { execute } from '../index.js'

describe('tenant-isolation-validator', () => {
  it('detects SQL without withTenant', async () => {
    const result = await execute({ path: './fixtures/bad-sql.ts' })
    expect(result.status).toBe('fail')
    expect(result.violations).toHaveLength(1)
    expect(result.violations[0].rule).toBe('no-raw-sql')
  })
})
```

---

## Related Documentation

- [CLAUDE.md#Tenant-Context-Wrapper](../../../CLAUDE.md#tenant-context-wrapper) - Tenant isolation patterns
- [ADR-001: Schema-Per-Tenant](../../adrs/001-schema-per-tenant.md) - Multi-tenancy architecture
- [knowledge-bases/database-migration-patterns/](../../knowledge-bases/database-migration-patterns/) - Database patterns

---

## Changelog

- **1.0.0** (2026-02-27): Initial release with 3 core validation rules
