# Admin Settings & API Patterns

> **Source**: Adapted from `/docs/ai-reference/ADMIN-PATTERNS.md` with multi-tenant context additions.

**CRITICAL**: Follow these patterns for all admin pages to avoid common pitfalls.

---

## Multi-Tenant Context (NEW)

All admin operations must include tenant context. The tenant ID flows through the system via middleware headers.

### Tenant-Aware Database Queries

```typescript
// ALWAYS include tenant schema in queries
import { sql } from '@vercel/postgres'
import { getTenantSchema } from '@repo/db'

export async function getCreators(tenantId: string) {
  const schema = getTenantSchema(tenantId) // e.g., 'tenant_rawdog'

  // Use template literal for schema, parameterized for values
  const result = await sql.query(
    `SELECT * FROM ${schema}.creators WHERE status = $1`,
    ['active']
  )
  return result.rows
}
```

### Getting Tenant Context in API Routes

```typescript
// apps/admin/src/app/api/admin/[resource]/route.ts
import { headers } from 'next/headers'

export async function GET() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
  }

  // Proceed with tenant-scoped query
  const data = await getResourceForTenant(tenantId)
  return NextResponse.json(data)
}
```

### Cross-Tenant Operations (Super Admin Only)

```typescript
// Only for orchestrator app - iterate over all tenants
import { getAllTenants } from '@repo/db'

export async function aggregateAllTenants() {
  const tenants = await getAllTenants()

  const results = await Promise.all(
    tenants.map(tenant =>
      getMetricsForTenant(tenant.id)
    )
  )

  return results
}
```

---

## Batch Save Pattern

### The Problem
Direct API calls using `await res.json()` fail on errors/empty responses, causing 405/500 errors that break the UI:
- `res.json()` throws an exception if the response isn't valid JSON
- Error responses may have empty bodies or HTML error pages
- The UI breaks silently with no feedback to the user

### The Solution
All admin settings pages use a single "Save Settings" button that:
1. Collects all settings state locally (React state)
2. Sends all API calls in parallel via `Promise.all()`
3. Uses `safeParseJson()` helper for error-tolerant JSON parsing

### Required Pattern

```typescript
// 1. Define safeParseJson helper
const safeParseJson = async (res: Response) => {
  try {
    const text = await res.text()
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

// 2. Update local state on user input (NO API calls here)
const handleSettingChange = (key: string, value: any) => {
  setSettings(prev => ({ ...prev, [key]: value }))
}

// 3. Save ALL settings on "Save Settings" button click
const saveSettings = async () => {
  setSaving(true)
  try {
    const [res1, res2, res3] = await Promise.all([
      fetch('/api/admin/endpoint1', { method: 'PUT', body: JSON.stringify(settings1) }),
      fetch('/api/admin/endpoint2', { method: 'PUT', body: JSON.stringify(settings2) }),
      fetch('/api/admin/endpoint3', { method: 'PUT', body: JSON.stringify(settings3) }),
    ])

    const [data1, data2, data3] = await Promise.all([
      safeParseJson(res1),
      safeParseJson(res2),
      safeParseJson(res3),
    ])

    if (res1.ok && res2.ok && res3.ok) {
      toast.success('Settings saved!')
    } else {
      toast.error('Failed to save some settings')
    }
  } finally {
    setSaving(false)
  }
}
```

### NEVER Do This
```typescript
// BAD: Direct API call on change with raw res.json()
const updateSetting = async (value: boolean) => {
  const res = await fetch('/api/admin/setting', {
    method: 'PUT',
    body: JSON.stringify({ enabled: value }),
  })
  const data = await res.json() // THROWS on error/empty response!
  setEnabled(data.enabled)
}
```

---

## Triple Cache-Busting for Admin API Routes

**CRITICAL**: Admin API routes can show stale/cached data on Vercel production, even when localhost works correctly. This is a known Next.js issue (affects 14.2.0+ through 16.x).

**ALL admin API routes MUST have these three exports:**

```typescript
// At the top of the route file, after imports
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
```

**Why all three are needed:**
- `dynamic = 'force-dynamic'` - Prevents static generation and route caching
- `revalidate = 0` - Disables Incremental Static Regeneration
- `fetchCache = 'force-no-store'` - Forces fetch requests inside the route to bypass cache (CRITICAL: `force-dynamic` alone doesn't do this in Next.js 14.2.0+ through 16.x)

**Response headers for extra protection:**
```typescript
return NextResponse.json(
  { success: true, ...data },
  {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store', // Vercel CDN specific
      'CDN-Cache-Control': 'no-store', // CloudFlare/other CDNs
    },
  }
)
```

**Frontend fetch (client-side) with timestamp:**
```typescript
// In useEffect when loading data - timestamp busts CDN/edge cache
const response = await fetch(`/api/admin/endpoint?_t=${Date.now()}`, {
  cache: 'no-store',
})
```

---

## Neon Connection Pooling: Don't Re-Query After Write

**CRITICAL**: When using Neon's pooled connection (`-pooler` in hostname), a SELECT immediately after INSERT/UPDATE can return stale data because it may hit a different connection.

**BAD Pattern:**
```typescript
// Save the value
await sql`INSERT INTO settings (key, value) VALUES ('trigger', ${value}::jsonb) ON CONFLICT...`

// Re-query to return current state - MAY RETURN STALE DATA!
const result = await sql`SELECT value FROM settings WHERE key = 'trigger'`
return { trigger: result.rows[0].value }  // Could be old value!
```

**GOOD Pattern:**
```typescript
// Save the value with RETURNING to confirm
const result = await sql`
  INSERT INTO settings (key, value) VALUES ('trigger', ${value}::jsonb)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  RETURNING value
`

// Return what we saved, not a fresh query
return { trigger: value }  // Return the input value we know was saved
```

**Why this happens:** Neon's connection pooler distributes queries across multiple connections. Write goes to connection A, but read may go to connection B which hasn't seen the write yet (eventual consistency).

---

## Transactions Don't Work with Neon Pooling

**CRITICAL**: Each `sql` call can go to a different connection from the pool:
- `BEGIN` might go to connection A, but queries go to B, C, D...
- `COMMIT` goes to yet another connection E
- Result: transactions don't actually isolate anything!

**Solutions:**
1. **Use atomic SQL statements** - INSERT/UPDATE with ON CONFLICT handles most cases
2. **Use RETURNING** - Get the result in the same statement
3. **NEVER use `withTransaction` wrappers** - they silently fail with pooling

```typescript
// GOOD: Atomic upsert with returning
const result = await sql`
  INSERT INTO creators (email, status)
  VALUES (${email}, 'pending')
  ON CONFLICT (email) DO UPDATE SET status = 'pending'
  RETURNING id, status
`

// BAD: Transaction wrapper (doesn't work with pooling)
await withTransaction(async (tx) => {
  await tx.query('BEGIN')  // Goes to connection A
  await tx.query('INSERT...')  // Goes to connection B!
  await tx.query('COMMIT')  // Goes to connection C!
})
```
