# @vercel/postgres SQL Patterns

**Purpose**: Critical patterns and limitations for using `@vercel/postgres` sql template tag
**Last Updated**: 2026-02-27

---

## Overview

The `@vercel/postgres` `sql` template tag has specific limitations that differ from other SQL libraries. This guide documents patterns to avoid TypeScript errors and runtime issues.

**Key Limitation**: The `sql` tag does NOT support:

- `.unsafe()` method for dynamic SQL
- SQL fragment composition
- Dynamic table names
- Direct array/object parameters

---

## Pattern 1: Arrays → PostgreSQL Array Literals

**Problem**: Arrays cannot be passed directly to the `sql` tag.

```typescript
import { sql } from '@vercel/postgres'

// WRONG - Arrays cannot be passed directly
const ids = ['id1', 'id2', 'id3']
sql`SELECT * FROM items WHERE id = ANY(${ids})` // ❌ TypeScript error

// CORRECT - Convert to PostgreSQL array format
sql`SELECT * FROM items WHERE id = ANY(${`{${ids.join(',')}}`}::text[])`
```

### Empty Array Handling

```typescript
// Handle empty arrays
const tags = ['tag1', 'tag2']
sql`
  SELECT * FROM items
  WHERE tags && ${tags.length > 0 ? `{${tags.join(',')}}` : '{}'}::text[]
`
```

### Numeric Arrays

```typescript
const numbers = [1, 2, 3]
sql`SELECT * FROM items WHERE quantity = ANY(${`{${numbers.join(',')}}`}::integer[])`
```

---

## Pattern 2: Dates → ISO Strings

**Problem**: Date objects cannot be passed directly.

```typescript
// WRONG - Date objects cannot be passed
const expiresAt = new Date('2026-12-31')
sql`UPDATE items SET expires_at = ${expiresAt}` // ❌ Error

// CORRECT - Convert to ISO string
sql`UPDATE items SET expires_at = ${expiresAt.toISOString()}`
```

### Nullable Dates

```typescript
const expiresAt: Date | null = getExpiryDate()
sql`
  UPDATE items
  SET expires_at = ${expiresAt ? expiresAt.toISOString() : null}
`
```

---

## Pattern 3: Type Conversion with toCamelCase

**Problem**: Direct type casts from `toCamelCase` fail TypeScript checks.

```typescript
import { sql } from '@vercel/postgres'
import { toCamelCase } from '@cgk-platform/db'

// WRONG - Direct cast doesn't satisfy TypeScript
const result = await sql`SELECT * FROM items WHERE id = ${id}`
return toCamelCase(result.rows[0]) as MyType // ❌ Type error

// CORRECT - Double cast through unknown
const row = result.rows[0]
if (!row) throw new Error('Not found')
return toCamelCase(row as Record<string, unknown>) as unknown as MyType
```

### For Nullable Returns

```typescript
const row = result.rows[0]
return row ? (toCamelCase(row as Record<string, unknown>) as unknown as MyType) : null
```

### For Array Results

```typescript
const result = await sql`SELECT * FROM items`
return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as MyType)
```

---

## Pattern 4: No SQL Fragment Composition

**Problem**: `sql` template tag returns a Promise, not a composable fragment.

```typescript
// WRONG - sql`` returns Promise, not composable
const filter = sql`AND status = ${status}` // ❌ Returns Promise!
sql`SELECT * FROM items WHERE active = true ${filter}` // ❌ Error

// CORRECT - Use conditional queries (if/else branches)
const result = status
  ? await sql`SELECT * FROM items WHERE active = true AND status = ${status}`
  : await sql`SELECT * FROM items WHERE active = true`
```

### Multiple Filters

```typescript
async function getItems(filters: { status?: string; category?: string }) {
  const { status, category } = filters

  if (status && category) {
    return sql`
      SELECT * FROM items
      WHERE status = ${status} AND category = ${category}
    `
  } else if (status) {
    return sql`SELECT * FROM items WHERE status = ${status}`
  } else if (category) {
    return sql`SELECT * FROM items WHERE category = ${category}`
  } else {
    return sql`SELECT * FROM items`
  }
}
```

---

## Pattern 5: No Dynamic Table Names - Use Switch/Case

**Problem**: Table names cannot be interpolated, and `sql.raw()` doesn't exist on `@vercel/postgres`.

```typescript
// WRONG - sql(tableName) is not valid
const table = getTableName(entityType)
sql`UPDATE ${sql(table)} SET status = ${status} WHERE id = ${id}` // ❌ Error

// WRONG - sql.raw() doesn't exist on @vercel/postgres
sql`UPDATE ${sql.raw(table)} SET ...` // ❌ Method doesn't exist

// CORRECT - Use explicit switch/case for each table
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

---

## Pattern 6: QueryResultRow Undefined Checks

**Problem**: `result.rows[0]` may be undefined but TypeScript doesn't enforce checks.

```typescript
// WRONG - result.rows[0] may be undefined
const result = await sql`SELECT * FROM items WHERE id = ${id}`
return mapToEntity(result.rows[0]) // ❌ Might be undefined!

// CORRECT - Check before using
const row = result.rows[0]
if (!row) return null // or throw new Error('Not found')
return mapToEntity(row as Record<string, unknown>)
```

### For Non-Null Returns (INSERT RETURNING)

```typescript
// When you know the row MUST exist (INSERT/UPDATE RETURNING)
const result = await sql`
  INSERT INTO items (name, status) VALUES (${name}, ${status})
  RETURNING *
`
const row = result.rows[0]
if (!row) throw new Error('Failed to insert record')
return mapToEntity(row as Record<string, unknown>)
```

---

## Pattern 7: Type Casts for Config Objects

**Problem**: Direct type casts on JSON columns fail.

```typescript
// WRONG - Direct cast fails type check
const result = await sql`SELECT config FROM items WHERE id = ${id}`
const config = result.rows[0].config as ScheduleFollowupConfig // ❌ Error

// CORRECT - Double cast through unknown
const row = result.rows[0]
if (!row) throw new Error('Not found')
const config = row.config as unknown as ScheduleFollowupConfig
```

---

## Pattern 8: Unused Variables → Remove or Document

**First ask: Is this variable actually needed?**

```typescript
// WRONG - Just prefixing to silence errors
const _data = fetchData() // Dead code! Delete it.

// CORRECT - Remove unused variables entirely
// (deleted)

// ONLY use underscore for INTENTIONALLY unused parameters
// (required by interface/signature but not needed in implementation)
function handleEvent(_event: Event, data: Data) {
  return processData(data) // event required by interface but unused here
}

// Destructuring - skip with underscore only if intentional
const { used, _intentionallySkipped } = config
```

### Documentation Rule

**If you add an underscore prefix, add a comment explaining WHY it's intentionally unused, or remove the variable entirely.**

### Tracking

All underscore variables are tracked in `/MULTI-TENANT-PLATFORM-PLAN/UNDERSCORE-VARS-TRACKING.md`. When adding new underscore prefixes, update this tracking document so future phases properly implement the functionality.

---

## Pattern 9: Pagination with Filters

**Combine filters + pagination efficiently:**

```typescript
function getImagesQuery(options: { status?: string; offset: number; limit: number }) {
  const { status, offset, limit } = options

  if (status) {
    return sql`
      SELECT * FROM images
      WHERE status = ${status}
      ORDER BY created_at DESC
      OFFSET ${offset} LIMIT ${limit}
    `
  }

  return sql`
    SELECT * FROM images
    ORDER BY created_at DESC
    OFFSET ${offset} LIMIT ${limit}
  `
}
```

---

## Pattern 10: JSONB Column Updates

**Problem**: Updating JSONB columns requires careful type handling.

```typescript
// WRONG - Direct object interpolation
const metadata = { key: 'value' }
sql`UPDATE items SET metadata = ${metadata}` // ❌ Error

// CORRECT - Stringify first
sql`UPDATE items SET metadata = ${JSON.stringify(metadata)}::jsonb`

// Merging JSONB
sql`
  UPDATE items
  SET metadata = metadata || ${JSON.stringify(newFields)}::jsonb
  WHERE id = ${id}
`
```

---

## Common Error Messages & Solutions

### "Type 'Promise<...>' is not assignable to type 'string'"

**Cause**: Trying to use `sql`` ` as a fragment

**Solution**: Use conditional if/else branches instead of composing SQL fragments

### "Property 'unsafe' does not exist on type..."

**Cause**: Trying to use `sql.unsafe()` (doesn't exist in @vercel/postgres)

**Solution**: Use explicit switch/case for dynamic queries

### "Argument of type '...' is not assignable to parameter of type 'Primitive'"

**Cause**: Passing array/object/Date directly to `sql` tag

**Solution**: Convert to PostgreSQL literals (arrays) or ISO strings (dates)

### "Object is possibly 'undefined'"

**Cause**: Not checking if `result.rows[0]` exists

**Solution**: Add null check before using row

---

## Best Practices Summary

1. ✅ **Arrays**: Convert to `{item1,item2}::type[]` format
2. ✅ **Dates**: Use `.toISOString()` before passing
3. ✅ **Type Casts**: Double cast through `unknown`
4. ✅ **Dynamic Queries**: Use if/else branches, not fragment composition
5. ✅ **Table Names**: Explicit switch/case, no interpolation
6. ✅ **Row Access**: Always check `result.rows[0]` before use
7. ✅ **Config Objects**: Cast through `unknown`
8. ✅ **Unused Variables**: Remove entirely or document WHY

---

## Quick Reference Cheat Sheet

```typescript
// Arrays
sql`WHERE id = ANY(${`{${ids.join(',')}}`}::text[])`

// Dates
sql`WHERE created_at > ${date.toISOString()}`

// Type conversion
const row = result.rows[0]
if (!row) throw new Error('Not found')
return toCamelCase(row as Record<string, unknown>) as unknown as MyType

// Conditional queries
const result = filter
  ? await sql`SELECT * FROM items WHERE status = ${filter}`
  : await sql`SELECT * FROM items`

// Switch for dynamic tables
switch (entityType) {
  case 'project':
    return sql`UPDATE projects SET ...`
  case 'task':
    return sql`UPDATE tasks SET ...`
}

// JSONB
sql`UPDATE items SET config = ${JSON.stringify(obj)}::jsonb`
```

---

**For multi-tenancy patterns with withTenant(), see**: `.claude/knowledge-bases/multi-tenancy-patterns/README.md`

**End of Guide**
