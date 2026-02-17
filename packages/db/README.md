# @cgk-platform/db

Database client and tenant utilities for the CGK platform.

## Installation

```bash
pnpm add @cgk-platform/db
```

## Features

- **Multi-Tenant Support** - Row-level security and schema isolation
- **Tenant Context** - Automatic tenant scoping for queries
- **Request Utilities** - Extract tenant from HTTP requests
- **Cache Utilities** - Tenant-aware caching
- **SQL Client** - Direct SQL access when needed
- **Schema Management** - Tenant schema creation and migration

## Quick Start

### Tenant-Scoped Queries

```typescript
import { withTenant } from '@cgk-platform/db'

// All queries automatically scoped to tenant
const products = await withTenant('tenant_123', async (db) => {
  return db.query.products.findMany({
    where: eq(products.status, 'active'),
  })
})
// Only returns products for tenant_123
```

### Get Tenant from Request

```typescript
import { getTenantFromRequest, requireTenant } from '@cgk-platform/db'

export async function GET(request: Request) {
  // Returns null if no tenant found
  const tenant = await getTenantFromRequest(request)
  
  // Or throw error if tenant required
  const { tenantId, slug } = await requireTenant(request)
  
  return Response.json({ tenantId, slug })
}
```

### Direct SQL Queries

```typescript
import { sql } from '@cgk-platform/db'

const result = await sql`
  SELECT * FROM products 
  WHERE tenant_id = ${tenantId} 
  AND created_at > ${since}
`
```

### Schema Management

```typescript
import {
  setTenantSchema,
  getTenantSchemaName,
  resetToPublicSchema,
} from '@cgk-platform/db'

// Set search path to tenant schema
await setTenantSchema('tenant_123')

// Get schema name
const schemaName = getTenantSchemaName('tenant_123')
// => "tenant_tenant_123"

// Reset to public schema
await resetToPublicSchema()
```

### Tenant Slug Validation

```typescript
import { isValidTenantSlug, validateTenantSlug } from '@cgk-platform/db'

// Check if valid (boolean)
if (isValidTenantSlug('my-brand')) {
  // Valid tenant slug
}

// Validate or throw
validateTenantSlug('my-brand') // OK
validateTenantSlug('invalid slug!') // Throws error
```

## Key Exports

### Tenant Context
- `withTenant(tenantId, fn)` - Execute queries with tenant scope
- `setTenantSchema(tenantId)` - Set schema for connection
- `resetToPublicSchema()` - Reset to public schema
- `getTenantSchemaName(tenantId)` - Get schema name

### Request Utilities
- `getTenantFromRequest(request)` - Extract tenant (returns null if not found)
- `requireTenant(request)` - Extract tenant (throws if not found)
- `tenantNotFoundResponse()` - Create 404 response

### Validation
- `isValidTenantSlug(slug)` - Check slug format
- `validateTenantSlug(slug)` - Validate or throw

### Client
- `sql` - Tagged template for SQL queries

### Errors
- `TenantRequiredError` - Thrown when tenant required but missing

## Usage Patterns

### API Route with Tenant

```typescript
import { requireTenant, withTenant } from '@cgk-platform/db'

export async function GET(request: Request) {
  const { tenantId } = await requireTenant(request)
  
  const data = await withTenant(tenantId, async (db) => {
    return db.query.orders.findMany({
      limit: 10,
      orderBy: desc(orders.createdAt),
    })
  })
  
  return Response.json(data)
}
```

### Server Action with Tenant

```typescript
'use server'

import { requireTenant, withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'

export async function createProduct(data: FormData) {
  const request = new Request('https://example.com', {
    headers: headers(),
  })
  
  const { tenantId } = await requireTenant(request)
  
  return withTenant(tenantId, async (db) => {
    return db.insert(products).values({
      name: data.get('name'),
      price: data.get('price'),
    })
  })
}
```

### Tenant Slug Format

Valid tenant slugs:
- Lowercase letters, numbers, hyphens
- Start with letter
- 3-63 characters
- No consecutive hyphens

Examples:
- ✅ `my-brand`
- ✅ `brand123`
- ✅ `my-luxury-brand`
- ❌ `My-Brand` (uppercase)
- ❌ `my--brand` (consecutive hyphens)
- ❌ `ab` (too short)

## License

MIT
