# SQL Pattern Enforcer

> **Purpose**: Validates @vercel/postgres SQL patterns to prevent TypeScript errors and runtime bugs

**Version**: 1.0.0
**Type**: Executable Skill
**Invocation**: `/sql-pattern-enforcer [options]`

---

## Overview

This skill scans the CGK codebase for violations of `@vercel/postgres` SQL patterns documented in CLAUDE.md, ensuring:
- ✅ Arrays converted to PostgreSQL array literals
- ✅ Dates converted to ISO strings
- ✅ Type conversions use double cast through unknown
- ✅ No SQL fragment composition
- ✅ No dynamic table names (use switch/case)
- ✅ QueryResultRow undefined checks before access
- ✅ No sql.unsafe() usage (doesn't exist)
- ✅ Unused variables removed or justified

**Critical**: These patterns prevent TypeScript compilation errors and runtime crashes in production.

---

## Usage

### Basic Scan

```bash
/sql-pattern-enforcer
```

Scans current directory and all subdirectories for violations.

### Scan Specific Path

```bash
/sql-pattern-enforcer --path packages/db
```

Scans only the `packages/db` directory.

### Auto-Fix Mode

```bash
/sql-pattern-enforcer --fix
```

Shows fix suggestions for violations (manual review required).

### Verbose Output

```bash
/sql-pattern-enforcer --verbose
```

Shows all violations (not just first 5 per rule).

---

## Validation Rules

### Rule 1: No Direct Array Passing (`no-direct-array`)

**Severity**: Critical

**Violation**:
```typescript
// ❌ BAD - Arrays cannot be passed directly
const ids = ['order_1', 'order_2', 'order_3']
await sql`SELECT * FROM items WHERE id = ANY(${ids})`
```

**Fix**:
```typescript
// ✅ GOOD - Convert to PostgreSQL array literal
const ids = ['order_1', 'order_2', 'order_3']
await sql`SELECT * FROM items WHERE id = ANY(${`{${ids.join(',')}}`}::text[])`

// With empty array handling
await sql`SELECT * FROM items WHERE tags && ${tags.length > 0 ? `{${tags.join(',')}}` : '{}'}::text[]`
```

**Rationale**: The `sql` template tag from `@vercel/postgres` does not support direct array passing. Arrays must be converted to PostgreSQL array literal syntax.

---

### Rule 2: No Date Objects (`no-date-objects`)

**Severity**: Critical

**Violation**:
```typescript
// ❌ BAD - Date objects cannot be passed
const expiresAt = new Date('2026-12-31')
await sql`UPDATE items SET expires_at = ${expiresAt} WHERE id = ${id}`
```

**Fix**:
```typescript
// ✅ GOOD - Convert to ISO string
const expiresAt = new Date('2026-12-31')
await sql`UPDATE items SET expires_at = ${expiresAt.toISOString()} WHERE id = ${id}`
```

**Rationale**: `@vercel/postgres` does not automatically serialize Date objects. Must be converted to ISO strings.

---

### Rule 3: Type Conversion Requires Double Cast (`no-single-cast`)

**Severity**: Critical

**Violation**:
```typescript
// ❌ BAD - Direct cast doesn't satisfy TypeScript
const result = await sql`SELECT * FROM orders WHERE id = ${id}`
return toCamelCase(result.rows[0]) as Order
```

**Fix**:
```typescript
// ✅ GOOD - Double cast through unknown
const result = await sql`SELECT * FROM orders WHERE id = ${id}`
const row = result.rows[0]
if (!row) throw new Error('Order not found')
return toCamelCase(row as Record<string, unknown>) as unknown as Order

// For nullable returns
const row = result.rows[0]
return row ? (toCamelCase(row as Record<string, unknown>) as unknown as Order) : null
```

**Rationale**: TypeScript requires explicit type conversion when mapping database rows to typed objects. The double cast pattern satisfies the type checker.

---

### Rule 4: No SQL Fragment Composition (`no-fragment-composition`)

**Severity**: Critical

**Violation**:
```typescript
// ❌ BAD - sql`` returns Promise, not composable fragment
const filter = sql`AND status = ${status}`
const result = await sql`SELECT * FROM items WHERE active = true ${filter}`
```

**Fix**:
```typescript
// ✅ GOOD - Use conditional queries (if/else branches)
const result = status
  ? await sql`SELECT * FROM items WHERE active = true AND status = ${status}`
  : await sql`SELECT * FROM items WHERE active = true`

// For complex conditions
if (status && category) {
  return sql`SELECT * FROM items WHERE status = ${status} AND category = ${category}`
} else if (status) {
  return sql`SELECT * FROM items WHERE status = ${status}`
} else if (category) {
  return sql`SELECT * FROM items WHERE category = ${category}`
} else {
  return sql`SELECT * FROM items`
}
```

**Rationale**: The `sql` template tag returns a Promise, not a composable SQL fragment. Attempting to compose fragments will fail at runtime.

---

### Rule 5: No Dynamic Table Names (`no-dynamic-tables`)

**Severity**: Critical

**Violation**:
```typescript
// ❌ BAD - sql(tableName) is not valid
const table = getTableName(entityType)
await sql`UPDATE ${sql(table)} SET status = ${status} WHERE id = ${id}`

// ❌ ALSO BAD - sql.raw() doesn't exist on @vercel/postgres
await sql`UPDATE ${sql.raw(table)} SET status = ${status} WHERE id = ${id}`
```

**Fix**:
```typescript
// ✅ GOOD - Use explicit switch/case for each table
async function updateEntityStatus(entityType: string, id: string, status: string) {
  switch (entityType) {
    case 'project':
      return sql`UPDATE projects SET status = ${status} WHERE id = ${id}`
    case 'task':
      return sql`UPDATE tasks SET status = ${status} WHERE id = ${id}`
    case 'order':
      return sql`UPDATE orders SET status = ${status} WHERE id = ${id}`
    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
}
```

**Rationale**: `@vercel/postgres` does not support dynamic table names or `sql.raw()`. Use explicit switch/case for type safety and clarity.

---

### Rule 6: QueryResultRow Undefined Checks (`no-undefined-check`)

**Severity**: Warning/Critical

**Violation**:
```typescript
// ❌ BAD - result.rows[0] may be undefined
const result = await sql`SELECT * FROM orders WHERE id = ${id}`
return mapToEntity(result.rows[0])

// ❌ CRITICAL - Destructuring without check will crash
const { id, name } = result.rows[0]
```

**Fix**:
```typescript
// ✅ GOOD - Check before using
const result = await sql`SELECT * FROM orders WHERE id = ${id}`
const row = result.rows[0]
if (!row) return null  // or throw new Error('Not found')
return mapToEntity(row as Record<string, unknown>)

// For non-null returns (e.g., INSERT RETURNING)
const row = result.rows[0]
if (!row) throw new Error('Failed to insert record')
return mapToEntity(row as Record<string, unknown>)
```

**Rationale**: `result.rows[0]` returns `undefined` if no rows match. Accessing properties or destructuring without a check causes runtime crashes.

---

### Rule 7: No sql.unsafe() (`no-sql-unsafe`)

**Severity**: Critical

**Violation**:
```typescript
// ❌ BAD - sql.unsafe() doesn't exist
const whereClause = status ? `AND status = '${status}'` : ''
await sql`SELECT * FROM items WHERE active = true ${sql.unsafe(whereClause)}`
```

**Fix**:
```typescript
// ✅ GOOD - Separate query functions for each filter combination
async function getItems(filters: { status?: string; category?: string }) {
  const { status, category } = filters

  if (status && category) {
    return sql`SELECT * FROM items WHERE status = ${status} AND category = ${category}`
  } else if (status) {
    return sql`SELECT * FROM items WHERE status = ${status}`
  } else if (category) {
    return sql`SELECT * FROM items WHERE category = ${category}`
  } else {
    return sql`SELECT * FROM items`
  }
}
```

**Rationale**: `@vercel/postgres` does not have an `unsafe()` method. Dynamic SQL must be constructed using conditional query branches.

---

### Rule 8: Unused Variables (`underscore-without-justification`, `potentially-unused`)

**Severity**: Warning/Info

**Violation**:
```typescript
// ❌ BAD - Underscore without justification
const _data = fetchData()  // Dead code! Delete it.

// ❌ BAD - Variable defined but never used
const result = await processOrder(orderId)
return { success: true }
```

**Fix**:
```typescript
// ✅ GOOD - Remove unused variables entirely
// (deleted)

// ✅ GOOD - Underscore only for intentionally unused parameters
// (required by interface/signature but not needed in implementation)
function handleEvent(_event: Event, data: Data) {
  // event required by interface but unused here
  return processData(data)
}

// ✅ GOOD - Destructuring with underscore and justification
// Intentionally unused - required by API signature
const { used, _intentionallySkipped } = config
```

**Rationale**: Unused variables indicate dead code or incomplete implementation. Remove them or justify why they're intentionally unused.

**Tracking**: All underscore variables are tracked in `/MULTI-TENANT-PLATFORM-PLAN/UNDERSCORE-VARS-TRACKING.md`. When adding new underscore prefixes, update this tracking document.

---

## Output Format

### Success (No Violations)

```
🔍 Scanning for SQL pattern violations...

📊 Scan Results:
   Files scanned: 247
   Files with violations: 0
   Total violations: 0

✅ No SQL pattern violations found!
```

### Failure (Violations Found)

```
🔍 Scanning for SQL pattern violations...

📊 Scan Results:
   Files scanned: 247
   Files with violations: 18
   Total violations: 42

❌ SQL Pattern Violations Found:

  📋 Arrays without PostgreSQL literals (12)
    ./apps/admin/app/api/orders/route.ts:45 [critical]
      Arrays cannot be passed directly - convert to PostgreSQL array literal
      await sql`SELECT * FROM orders WHERE id = ANY(${orderIds})`
      💡 Fix: {
        "type": "array-literal",
        "pattern": "${`{${arrayName.join(',')}}`}::text[]",
        "suggestion": "Convert array to PostgreSQL array literal with join"
      }

    ./packages/commerce/src/products.ts:78 [warning]
      Possible array parameter 'productIds' - verify or convert to array literal
      return sql`SELECT * FROM products WHERE id = ${productIds}`

    ... and 10 more

  📅 Date objects without .toISOString() (8)
    ./apps/admin/app/api/subscriptions/route.ts:89 [critical]
      Date objects must be converted to ISO strings with .toISOString()
      await sql`UPDATE subscriptions SET expires_at = ${expiresAt} WHERE id = ${id}`
      💡 Fix: {
        "type": "date-conversion",
        "suggestion": "${expiresAt.toISOString()}"
      }

    ... and 7 more

  🔄 Type casts without double cast (7)
    ./packages/db/src/orders.ts:123 [critical]
      toCamelCase requires double cast: as Record<string, unknown> as unknown as Type
      return toCamelCase(result.rows[0]) as Order
      💡 Fix: {
        "type": "double-cast",
        "suggestion": "as Record<string, unknown> as unknown as YourType"
      }

    ... and 6 more

  ⚠️ Missing undefined checks on result.rows[0] (9)
    ./apps/admin/app/api/customers/route.ts:56 [critical]
      Destructuring result.rows[0] without undefined check will crash if no rows
      const { id, email } = result.rows[0]
      💡 Fix: {
        "type": "undefined-check",
        "suggestion": "const row = result.rows[0]\nif (!row) return null\nreturn mapToEntity(row)"
      }

    ... and 8 more

  🚫 sql.unsafe() usage (does not exist) (3)
    ./packages/db/src/dynamic-queries.ts:34 [critical]
      sql.unsafe() does not exist in @vercel/postgres - create separate query functions
      await sql`SELECT * FROM items ${sql.unsafe(dynamicFilter)}`
      💡 Fix: {
        "type": "conditional-query",
        "suggestion": "Use if/else branches:\nif (condition) {\n  return sql`...`\n} else {\n  return sql`...`\n}"
      }

    ... and 2 more

  ❓ Underscore vars without comment (3)
    ./apps/admin/app/api/webhooks/route.ts:23 [warning]
      Underscore variable '_signature' without justification comment - remove or explain why unused
      const _signature = headers.get('x-signature')

📝 Severity Summary:
   Critical: 30
   Warning: 10
   Info: 2

📖 Remediation Guide:
  1. Arrays → Use PostgreSQL array literals: ${`{${ids.join(',')}}`}::text[]
  2. Dates → Convert to ISO strings: ${date.toISOString()}
  3. Type casts → Double cast: as Record<string, unknown> as unknown as Type
  4. No fragments → Use if/else branches for conditional queries
  5. No dynamic tables → Use explicit switch/case for each table
  6. result.rows[0] → Check for undefined: const row = result.rows[0]; if (!row) ...
  7. No sql.unsafe() → Create separate query functions
  8. Unused vars → Remove or prefix with _ and add justification comment

  See CLAUDE.md section "@vercel/postgres SQL Patterns (CRITICAL)" for details
```

---

## Integration with CI/CD

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
sql-patterns:
  name: SQL Pattern Validation
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: pnpm
    - run: pnpm install
    - run: node .claude/skills/sql-pattern-enforcer/index.js
```

**Behavior**: Pull requests are **blocked** if critical violations are found.

---

## Manual Invocation

### Standalone Script

```bash
# From project root
node .claude/skills/sql-pattern-enforcer/index.js

# With options
node .claude/skills/sql-pattern-enforcer/index.js --verbose

# Scan specific path
node .claude/skills/sql-pattern-enforcer/index.js --path packages/db
```

### As npm Script

```bash
# package.json
{
  "scripts": {
    "validate:sql": "node .claude/skills/sql-pattern-enforcer/index.js"
  }
}

# Run
pnpm validate:sql
```

---

## Common Patterns Reference

### Array Parameters

```typescript
// Multi-value IN clause
const ids = ['id1', 'id2', 'id3']
await sql`SELECT * FROM items WHERE id = ANY(${`{${ids.join(',')}}`}::text[])`

// Array overlap (tags)
const tags = ['tag1', 'tag2']
await sql`SELECT * FROM posts WHERE tags && ${tags.length > 0 ? `{${tags.join(',')}}` : '{}'}::text[]`

// Empty array handling
const statuses = []
await sql`
  SELECT * FROM orders
  WHERE ${statuses.length > 0
    ? sql`status = ANY(${`{${statuses.join(',')}}`}::text[])`
    : sql`true`
  }
`
```

### Date Handling

```typescript
// Single date
const createdAt = new Date()
await sql`INSERT INTO events (created_at) VALUES (${createdAt.toISOString()})`

// Date range
const startDate = new Date('2026-01-01')
const endDate = new Date('2026-12-31')
await sql`
  SELECT * FROM orders
  WHERE created_at >= ${startDate.toISOString()}
    AND created_at <= ${endDate.toISOString()}
`
```

### Type Conversions

```typescript
// Single row with null check
const result = await sql`SELECT * FROM orders WHERE id = ${id}`
const row = result.rows[0]
if (!row) return null
return toCamelCase(row as Record<string, unknown>) as unknown as Order

// Multiple rows
const result = await sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`
return result.rows.map(row =>
  toCamelCase(row as Record<string, unknown>) as unknown as Order
)

// INSERT RETURNING (non-null)
const result = await sql`INSERT INTO orders (...) VALUES (...) RETURNING *`
const row = result.rows[0]
if (!row) throw new Error('Failed to insert order')
return toCamelCase(row as Record<string, unknown>) as unknown as Order
```

### Conditional Queries

```typescript
// Simple filter
async function getOrders(status?: string) {
  if (status) {
    return sql`SELECT * FROM orders WHERE status = ${status}`
  }
  return sql`SELECT * FROM orders`
}

// Multiple filters
async function searchItems(filters: { status?: string; category?: string; tags?: string[] }) {
  const { status, category, tags } = filters

  if (status && category && tags?.length) {
    return sql`
      SELECT * FROM items
      WHERE status = ${status}
        AND category = ${category}
        AND tags && ${`{${tags.join(',')}}`}::text[]
    `
  } else if (status && category) {
    return sql`SELECT * FROM items WHERE status = ${status} AND category = ${category}`
  } else if (status) {
    return sql`SELECT * FROM items WHERE status = ${status}`
  } else if (category) {
    return sql`SELECT * FROM items WHERE category = ${category}`
  } else {
    return sql`SELECT * FROM items`
  }
}
```

### Dynamic Table Names

```typescript
// Use switch/case for type safety
async function updateStatus(entityType: 'order' | 'project' | 'task', id: string, status: string) {
  switch (entityType) {
    case 'order':
      return sql`UPDATE orders SET status = ${status}, updated_at = NOW() WHERE id = ${id}`
    case 'project':
      return sql`UPDATE projects SET status = ${status}, updated_at = NOW() WHERE id = ${id}`
    case 'task':
      return sql`UPDATE tasks SET status = ${status}, updated_at = NOW() WHERE id = ${id}`
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = entityType
      throw new Error(`Unknown entity type: ${_exhaustive}`)
  }
}
```

---

## Related Documentation

- [CLAUDE.md#@vercel/postgres SQL Patterns](../../../CLAUDE.md#vercelpostgres-sql-patterns-critical) - All SQL pattern rules
- [MULTI-TENANT-PLATFORM-PLAN/UNDERSCORE-VARS-TRACKING.md](../../../MULTI-TENANT-PLATFORM-PLAN/UNDERSCORE-VARS-TRACKING.md) - Underscore variable tracking
- [packages/db/README.md](../../../packages/db/README.md) - Database package documentation

---

## Changelog

- **1.0.0** (2026-02-27): Initial release with 8 core validation rules
  - Arrays → PostgreSQL literals
  - Dates → ISO strings
  - Type conversions → double cast
  - No SQL fragments
  - No dynamic tables
  - Undefined checks
  - No sql.unsafe()
  - Unused variables
