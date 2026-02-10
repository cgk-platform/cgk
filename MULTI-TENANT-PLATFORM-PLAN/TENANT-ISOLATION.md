# Tenant Isolation Rules

> **MANDATORY FOR ALL AGENTS**: Every line of code you write must follow these rules. Tenant isolation is non-negotiable.

---

## The Golden Rule

**Every database query, cache operation, API call, and background job MUST be scoped to a tenant.**

If you're writing code that touches data and doesn't have a `tenantId` in scope, **STOP and fix it**.

---

## Quick Reference

| Layer | How to Isolate |
|-------|----------------|
| **Database** | Use `withTenant(tenantId, ...)` wrapper |
| **Cache** | Use `createTenantCache(tenantId)` helper |
| **API Routes** | Call `getTenantContext(req)` first |
| **Background Jobs** | Include `tenantId` in every event payload |
| **File Storage** | Store under `tenants/{tenantId}/` path |

---

## Database Isolation

### Schema Structure

```
public schema (shared):
├── organizations    # Tenant registry
├── users           # User accounts (can belong to multiple tenants)
├── feature_flags   # Platform-wide flags
└── platform_*      # Platform-level tables

tenant_{slug} schema (per-tenant):
├── orders
├── customers
├── products
├── creators
├── reviews
└── ... (all business data)
```

### How to Query

```typescript
// ✅ CORRECT - Always use withTenant
import { withTenant } from '@cgk/db'

const orders = await withTenant(tenantId, async () => {
  return sql`SELECT * FROM orders WHERE status = 'pending'`
})

// ❌ WRONG - Never query without tenant context
const orders = await sql`SELECT * FROM orders` // Which tenant's orders?!
```

### The withTenant Helper

```typescript
// packages/db/src/tenant.ts
export async function withTenant<T>(
  tenantId: string,
  operation: () => Promise<T>
): Promise<T> {
  // Sets PostgreSQL search_path to tenant schema
  await sql`SELECT set_config('search_path', ${`tenant_${tenantId}, public`}, true)`
  return operation()
}
```

### Cross-Tenant Queries (Super Admin Only)

```typescript
// Only for platform-level operations (super admin dashboard)
import { withPlatformContext } from '@cgk/db'

// Explicitly marked as cross-tenant - requires super admin auth
const allOrders = await withPlatformContext(async () => {
  return sql`
    SELECT o.*, t.slug as tenant
    FROM tenant_rawdog.orders o
    CROSS JOIN (SELECT 'rawdog' as slug) t
    UNION ALL
    SELECT o.*, t.slug as tenant
    FROM tenant_clientx.orders o
    CROSS JOIN (SELECT 'clientx' as slug) t
  `
})
```

---

## API Route Isolation

### Every Route Must Start With This

```typescript
// apps/admin/src/app/api/orders/route.ts
import { getTenantContext } from '@cgk/auth'
import { withTenant } from '@cgk/db'

export async function GET(req: Request) {
  // STEP 1: Get and validate tenant context
  const { tenantId, userId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  // STEP 2: All data operations use tenant context
  const orders = await withTenant(tenantId, async () => {
    return sql`SELECT * FROM orders ORDER BY created_at DESC`
  })

  return Response.json({ orders })
}
```

### How getTenantContext Works

```typescript
// packages/auth/src/context.ts
export async function getTenantContext(req: Request) {
  // Tenant ID comes from:
  // 1. JWT token claim (user's current org)
  // 2. Subdomain (admin.rawdog.com → rawdog)
  // 3. Header (x-tenant-id for API calls)

  const tenantId = extractTenantId(req)
  const userId = extractUserId(req)

  // CRITICAL: Validate user has access to this tenant
  if (userId && tenantId) {
    const hasAccess = await validateUserTenantAccess(userId, tenantId)
    if (!hasAccess) {
      throw new ForbiddenError('User does not have access to this tenant')
    }
  }

  return { tenantId, userId }
}
```

---

## Cache Isolation

### Always Use Tenant-Prefixed Cache

```typescript
// ✅ CORRECT - Use the helper
import { createTenantCache } from '@cgk/cache'

const cache = createTenantCache(tenantId)
await cache.set('pricing-config', config)  // Stored as: tenant:rawdog:pricing-config
const config = await cache.get('pricing-config')

// ❌ WRONG - Never use raw Redis
import { redis } from '@cgk/cache'
await redis.set('pricing-config', config)  // No tenant prefix = data leak!
```

### The Cache Helper

```typescript
// packages/cache/src/tenant.ts
export function createTenantCache(tenantId: string) {
  const prefix = `tenant:${tenantId}:`

  return {
    get: async <T>(key: string): Promise<T | null> => {
      const value = await redis.get(`${prefix}${key}`)
      return value ? JSON.parse(value) : null
    },

    set: async <T>(key: string, value: T, ttlSeconds?: number): Promise<void> => {
      const serialized = JSON.stringify(value)
      if (ttlSeconds) {
        await redis.set(`${prefix}${key}`, serialized, { ex: ttlSeconds })
      } else {
        await redis.set(`${prefix}${key}`, serialized)
      }
    },

    del: async (key: string): Promise<void> => {
      await redis.del(`${prefix}${key}`)
    },

    // Invalidate all cache for this tenant only
    invalidateAll: async (): Promise<void> => {
      const keys = await redis.keys(`${prefix}*`)
      if (keys.length > 0) await redis.del(...keys)
    }
  }
}
```

---

## Background Job Isolation

### Every Event Must Include tenantId

```typescript
// ✅ CORRECT - tenantId in payload
await jobProvider.send('order/created', {
  tenantId: 'rawdog',  // REQUIRED
  orderId: 'order_123',
  customerId: 'cust_456'
})

// ❌ WRONG - Missing tenantId
await jobProvider.send('order/created', {
  orderId: 'order_123'  // Which tenant?!
})
```

### Job Handlers Must Use Tenant Context

```typescript
// packages/jobs/src/handlers/order-sync.ts
export const syncOrder = jobProvider.createFunction(
  { id: 'sync-order' },
  { event: 'order/created' },
  async ({ event }) => {
    const { tenantId, orderId } = event.data

    // CRITICAL: Validate tenantId exists
    if (!tenantId) {
      throw new Error('tenantId required in event payload')
    }

    // All operations scoped to tenant
    await withTenant(tenantId, async () => {
      const order = await fetchOrder(orderId)
      await processOrder(order)
    })
  }
)
```

### Event Type Definitions

```typescript
// packages/jobs/src/events.ts
// ALL events must extend TenantEvent
type TenantEvent<T> = T & { tenantId: string }

export type Events = {
  'order/created': TenantEvent<{ orderId: string }>
  'order/fulfilled': TenantEvent<{ orderId: string; trackingNumber: string }>
  'payout/requested': TenantEvent<{ payoutId: string; creatorId: string }>
  'review/submitted': TenantEvent<{ reviewId: string }>
  // ... every event requires tenantId
}
```

---

## File Storage Isolation

### Tenant-Scoped Paths

```typescript
// ✅ CORRECT - Files under tenant path
import { uploadFile } from '@cgk/storage'

const url = await uploadFile({
  tenantId: 'rawdog',
  path: 'creator-projects/video.mp4',
  file: videoFile
})
// Stored at: tenants/rawdog/creator-projects/video.mp4

// ❌ WRONG - No tenant in path
const url = await put('creator-projects/video.mp4', videoFile)
// Could overwrite another tenant's file!
```

### Storage Helper

```typescript
// packages/storage/src/upload.ts
export async function uploadFile(options: {
  tenantId: string
  path: string
  file: File | Buffer
}): Promise<string> {
  const fullPath = `tenants/${options.tenantId}/${options.path}`

  const blob = await put(fullPath, options.file, {
    access: 'public',
    addRandomSuffix: true
  })

  return blob.url
}
```

---

## Middleware Pattern

### Tenant Context Middleware

```typescript
// packages/auth/src/middleware.ts
export async function withTenantMiddleware(req: NextRequest) {
  // 1. Extract tenant from request
  const tenantId = extractTenantFromSubdomain(req)
                || req.headers.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json(
      { error: 'Tenant context required' },
      { status: 400 }
    )
  }

  // 2. Validate tenant exists
  const tenant = await getTenant(tenantId)
  if (!tenant) {
    return NextResponse.json(
      { error: 'Tenant not found' },
      { status: 404 }
    )
  }

  // 3. If authenticated, validate user access
  const token = req.cookies.get('auth-token')?.value
  if (token) {
    const user = await verifyToken(token)
    if (!user.tenantIds.includes(tenantId)) {
      return NextResponse.json(
        { error: 'Access denied to this tenant' },
        { status: 403 }
      )
    }
  }

  // 4. Set context for downstream handlers
  const headers = new Headers(req.headers)
  headers.set('x-tenant-id', tenantId)

  return NextResponse.next({ request: { headers } })
}
```

---

## Testing Isolation

### Required Tests

Every feature must include isolation tests:

```typescript
describe('Tenant Isolation', () => {
  const tenantA = 'test_tenant_a'
  const tenantB = 'test_tenant_b'

  beforeEach(async () => {
    // Create test data in both tenants
    await withTenant(tenantA, () =>
      sql`INSERT INTO orders (id, total) VALUES ('order-a', 100)`)
    await withTenant(tenantB, () =>
      sql`INSERT INTO orders (id, total) VALUES ('order-b', 200)`)
  })

  it('tenant A cannot see tenant B data', async () => {
    const orders = await withTenant(tenantA, () =>
      sql`SELECT * FROM orders`)

    expect(orders.rows).toHaveLength(1)
    expect(orders.rows[0].id).toBe('order-a')
    expect(orders.rows.find(o => o.id === 'order-b')).toBeUndefined()
  })

  it('tenant B cannot see tenant A data', async () => {
    const orders = await withTenant(tenantB, () =>
      sql`SELECT * FROM orders`)

    expect(orders.rows).toHaveLength(1)
    expect(orders.rows[0].id).toBe('order-b')
  })
})
```

---

## Common Mistakes

| Mistake | Why It's Bad | Fix |
|---------|--------------|-----|
| Querying without `withTenant` | Data from wrong tenant or all tenants | Always wrap queries |
| Caching without tenant prefix | Cache poisoning between tenants | Use `createTenantCache` |
| Jobs without `tenantId` in payload | Job processes wrong tenant's data | Add to event type |
| Storing files without tenant path | File overwrites or leaks | Use `tenants/{id}/` prefix |
| Direct object access by ID | IDOR vulnerability | Always join with tenant context |

---

## Checklist Before Merging

Before any PR is merged, verify:

- [ ] All database queries use `withTenant()`
- [ ] All cache operations use `createTenantCache()`
- [ ] All API routes call `getTenantContext()` first
- [ ] All background job events include `tenantId`
- [ ] All file uploads use tenant-prefixed paths
- [ ] Isolation tests are included
- [ ] No raw SQL without tenant context
- [ ] No raw Redis without tenant prefix

---

## Questions?

If you're unsure whether something needs tenant isolation, **assume it does**. When in doubt, ask.
