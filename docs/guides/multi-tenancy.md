# Multi-Tenancy Guide

Comprehensive guide for working with multi-tenant architecture in CGK.

## Overview

CGK uses a **schema-per-tenant** PostgreSQL architecture where each tenant has complete data isolation through separate database schemas.

```
PostgreSQL Database
├── public schema (shared)
│   ├── organizations     # Tenant registry
│   ├── users            # All users across tenants
│   ├── sessions         # Auth sessions
│   ├── api_keys         # API authentication
│   ├── team_invitations # Team management
│   ├── feature_flags    # Platform feature flags
│   └── platform_*       # Platform-wide tables
│
├── tenant_rawdog schema
│   ├── orders
│   ├── customers
│   ├── products
│   ├── creators
│   ├── projects
│   └── ... (tenant-specific data)
│
├── tenant_acme schema
│   ├── orders
│   ├── customers
│   └── ... (isolated from rawdog)
│
└── tenant_brand3 schema
    └── ... (isolated from others)
```

## Creating Tenants

### Using the CLI

```bash
# Create tenant with auto-generated name
npx @cgk-platform/cli tenant:create my_brand

# Create with custom display name
npx @cgk-platform/cli tenant:create my_brand --name "My Brand Store"

# Preview creation
npx @cgk-platform/cli tenant:create my_brand --dry-run
```

### Programmatically

```typescript
import { sql } from '@cgk-platform/db'
import { createTenantSchema, runTenantMigrations } from '@cgk-platform/db/migrations'

async function createTenant(slug: string, name: string) {
  // 1. Create schema and run migrations
  const results = await createTenantSchema(slug)

  // 2. Create organization record
  await sql`
    INSERT INTO public.organizations (slug, name, status)
    VALUES (${slug}, ${name}, 'active')
  `

  return { slug, name, migrationsRun: results.length }
}
```

### Tenant Slug Rules

- Lowercase letters, numbers, and underscores only
- Must start with a letter
- Examples: `my_brand`, `acme_store`, `brand123`
- Invalid: `My-Brand`, `123brand`, `brand-name`

## Tenant Isolation Patterns

### The withTenant Wrapper

**CRITICAL**: Always use `withTenant()` for tenant-scoped database queries.

```typescript
import { withTenant, sql } from '@cgk-platform/db'

// CORRECT - Queries run against tenant schema
const orders = await withTenant('rawdog', async () => {
  return sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`
})

// WRONG - No tenant context, queries public schema (or fails)
const orders = await sql`SELECT * FROM orders`  // DON'T DO THIS
```

### How withTenant Works

```typescript
// Internally, withTenant:
// 1. Sets search_path to the tenant schema
// 2. Executes your callback
// 3. Resets search_path
// 4. Returns the result

await withTenant('rawdog', async () => {
  // search_path is now: tenant_rawdog, public
  // This query hits: tenant_rawdog.orders
  await sql`SELECT * FROM orders`

  // This still works for cross-schema queries:
  await sql`SELECT * FROM public.users WHERE id = ${userId}`
})
// search_path is reset after callback
```

### API Route Pattern

```typescript
// apps/admin/src/app/api/orders/route.ts
import { NextResponse } from 'next/server'
import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { withTenant, sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // 1. Authenticate
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Require tenant context
  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  // 3. Execute with tenant isolation
  return withTenant(auth.tenantId, async () => {
    const result = await sql`
      SELECT * FROM orders
      ORDER BY created_at DESC
      LIMIT 50
    `
    return NextResponse.json({ orders: result.rows })
  })
}
```

### Server Component Pattern

```typescript
// apps/admin/src/app/orders/page.tsx
import { getTenantContext } from '@cgk-platform/auth'
import { withTenant, sql } from '@cgk-platform/db'

export default async function OrdersPage() {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return <div>Please select a tenant</div>
  }

  const orders = await withTenant(tenantId, async () => {
    return sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 50`
  })

  return <OrderList orders={orders.rows} />
}
```

## Cache Isolation

All cache keys must be prefixed with the tenant identifier.

### Using Tenant Cache

```typescript
import { createTenantCache } from '@cgk-platform/cache'

// CORRECT - Cache keys prefixed with tenant
const cache = createTenantCache(tenantId)

await cache.set('pricing-config', config)
// Stored as: tenant:rawdog:pricing-config

await cache.get('pricing-config')
// Retrieves: tenant:rawdog:pricing-config

// WRONG - No tenant prefix (data leak risk)
await redis.set('pricing-config', config)  // DON'T DO THIS
```

### Cache Key Pattern

```typescript
// For custom cache keys, always include tenant
function getCacheKey(tenantId: string, ...parts: string[]): string {
  return `tenant:${tenantId}:${parts.join(':')}`
}

// Examples
getCacheKey('rawdog', 'product', productId)
// => 'tenant:rawdog:product:prod_123'

getCacheKey('rawdog', 'user', userId, 'permissions')
// => 'tenant:rawdog:user:usr_456:permissions'
```

## Background Jobs

All background jobs must include `tenantId` in their payload.

### Defining Jobs

```typescript
// packages/jobs/src/tasks/orders/process-order.ts
import { task } from '@trigger.dev/sdk/v3'
import { withTenant, sql } from '@cgk-platform/db'

export const processOrder = task({
  id: 'orders/process-order',
  run: async (payload: { tenantId: string; orderId: string }) => {
    const { tenantId, orderId } = payload

    // ALWAYS use tenant context
    return withTenant(tenantId, async () => {
      const result = await sql`
        UPDATE orders
        SET status = 'processing', processed_at = NOW()
        WHERE id = ${orderId}
        RETURNING *
      `

      return { success: true, order: result.rows[0] }
    })
  },
})
```

### Triggering Jobs

```typescript
import { processOrder } from '@cgk-platform/jobs'

// CORRECT - Include tenantId
await processOrder.trigger({
  tenantId: 'rawdog',  // REQUIRED
  orderId: 'order_123',
})

// WRONG - Missing tenantId
await processOrder.trigger({
  orderId: 'order_123'  // Which tenant?!
})
```

### Job Payload Validation

```typescript
import { z } from 'zod'

const OrderJobPayload = z.object({
  tenantId: z.string().min(1),  // Required
  orderId: z.string().min(1),
})

export const processOrder = task({
  id: 'orders/process-order',
  run: async (payload: unknown) => {
    // Validate payload including tenantId
    const validated = OrderJobPayload.parse(payload)
    const { tenantId, orderId } = validated

    return withTenant(tenantId, async () => {
      // Process order
    })
  },
})
```

## Tenant-Managed Integrations

Each tenant owns their own third-party service accounts.

### Architecture

```
TENANT A (rawdog):
├── Stripe: sk_live_xxx (THEIR account)
├── Resend: re_xxx (THEIR account)
├── Wise: api_xxx (THEIR account)
├── Mux: mux_xxx (THEIR account)
├── AssemblyAI: aai_xxx (THEIR account)
└── Anthropic: sk-ant-xxx (THEIR account)

PLATFORM provides:
├── INTEGRATION_ENCRYPTION_KEY (encrypts all credentials)
├── SHOPIFY_TOKEN_ENCRYPTION_KEY (Shopify OAuth tokens)
└── Infrastructure (database, hosting, jobs)
```

### Getting Tenant Service Clients

```typescript
import {
  getTenantStripeClient,
  requireTenantStripeClient,
  getTenantResendClient,
} from '@cgk-platform/integrations'

// Returns null if not configured
const stripe = await getTenantStripeClient(tenantId)
if (!stripe) {
  return Response.json({ error: 'Stripe not configured' }, { status: 400 })
}

// Or throw if not configured
const stripe = await requireTenantStripeClient(tenantId)

// Use tenant's own Stripe account
const customer = await stripe.customers.create({ email })
```

### Storing Tenant Credentials

```sql
-- Credentials stored in tenant schema
CREATE TABLE tenant_api_credentials (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  service_name TEXT NOT NULL,
  credential_key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,  -- AES-256-GCM encrypted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(service_name, credential_key)
);
```

### Adding Credentials via Admin

```typescript
// apps/admin/src/app/api/settings/credentials/route.ts
import { encryptCredential } from '@cgk-platform/integrations'
import { withTenant, sql } from '@cgk-platform/db'

export async function POST(request: Request) {
  const { tenantId } = await requireAuth(request)
  const { serviceName, credentialKey, value } = await request.json()

  const encryptedValue = await encryptCredential(value)

  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO tenant_api_credentials (service_name, credential_key, encrypted_value)
      VALUES (${serviceName}, ${credentialKey}, ${encryptedValue})
      ON CONFLICT (service_name, credential_key)
      DO UPDATE SET encrypted_value = ${encryptedValue}, updated_at = NOW()
    `
  })

  return Response.json({ success: true })
}
```

## Cross-Tenant Queries

For platform-wide operations (orchestrator, analytics):

```typescript
import { sql } from '@cgk-platform/db'

// Query public schema (no withTenant needed)
const tenants = await sql`
  SELECT * FROM public.organizations
  WHERE status = 'active'
  ORDER BY created_at DESC
`

// Query across tenants (admin/orchestrator only)
async function getGlobalOrderStats() {
  const tenants = await sql`SELECT slug FROM public.organizations WHERE status = 'active'`

  const stats = await Promise.all(
    tenants.rows.map(async (t) => {
      const slug = (t as { slug: string }).slug
      return withTenant(slug, async () => {
        const result = await sql`
          SELECT COUNT(*) as count, SUM(total_price::numeric) as revenue
          FROM orders
          WHERE created_at > NOW() - INTERVAL '30 days'
        `
        return { tenant: slug, ...result.rows[0] }
      })
    })
  )

  return stats
}
```

## User-Tenant Relationships

Users can belong to multiple tenants:

```sql
-- public.user_organizations table
CREATE TABLE user_organizations (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);
```

### Getting User's Tenants

```typescript
import { sql } from '@cgk-platform/db'

async function getUserTenants(userId: string) {
  const result = await sql`
    SELECT o.*, uo.role, uo.permissions
    FROM public.organizations o
    JOIN public.user_organizations uo ON o.id = uo.organization_id
    WHERE uo.user_id = ${userId}
    ORDER BY o.name
  `
  return result.rows
}
```

### Switching Tenant Context

```typescript
// Set current tenant in session
await sql`
  UPDATE public.sessions
  SET current_tenant_id = ${tenantId}
  WHERE id = ${sessionId}
`

// Validate user has access to tenant
async function validateTenantAccess(userId: string, tenantId: string): Promise<boolean> {
  const result = await sql`
    SELECT 1 FROM public.user_organizations
    WHERE user_id = ${userId} AND organization_id = ${tenantId}
  `
  return result.rows.length > 0
}
```

## Migration Considerations

### Public vs Tenant Migrations

```bash
packages/db/src/migrations/
├── public/           # Run once per platform
│   ├── 001_initial_setup.sql
│   ├── 002_add_users.sql
│   └── ...
└── tenant/           # Run once per tenant
    ├── 001_create_orders.sql
    ├── 002_create_customers.sql
    └── ...
```

### Running Migrations

```bash
# Public schema only
npx @cgk-platform/cli migrate --public-only

# Specific tenant
npx @cgk-platform/cli migrate --tenant rawdog

# All tenants (via app startup)
pnpm dev  # Migrations run automatically
```

### Adding a New Tenant Table

```sql
-- packages/db/src/migrations/tenant/015_add_reviews.sql

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  verified_purchase BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

## Testing Multi-Tenant Code

### Test Setup

```typescript
// tests/setup.ts
import { createTenantSchema } from '@cgk-platform/db/migrations'

beforeAll(async () => {
  // Create test tenant
  await createTenantSchema('test_tenant')
})

afterAll(async () => {
  // Clean up test tenant
  await sql`DROP SCHEMA IF EXISTS tenant_test_tenant CASCADE`
})
```

### Testing with Tenant Context

```typescript
// tests/orders.test.ts
import { withTenant, sql } from '@cgk-platform/db'

describe('Orders', () => {
  const tenantId = 'test_tenant'

  beforeEach(async () => {
    await withTenant(tenantId, async () => {
      await sql`DELETE FROM orders`
    })
  })

  it('creates order in correct tenant', async () => {
    await withTenant(tenantId, async () => {
      await sql`INSERT INTO orders (id, status) VALUES ('ord_1', 'pending')`

      const result = await sql`SELECT * FROM orders WHERE id = 'ord_1'`
      expect(result.rows).toHaveLength(1)
    })
  })

  it('isolates data between tenants', async () => {
    // Create order in tenant A
    await withTenant('tenant_a', async () => {
      await sql`INSERT INTO orders (id) VALUES ('ord_a')`
    })

    // Should not see order in tenant B
    await withTenant('tenant_b', async () => {
      const result = await sql`SELECT * FROM orders WHERE id = 'ord_a'`
      expect(result.rows).toHaveLength(0)
    })
  })
})
```

## Common Pitfalls

### Missing Tenant Context

```typescript
// WRONG - No tenant context
export async function GET() {
  const orders = await sql`SELECT * FROM orders`  // Fails or wrong data
  return Response.json({ orders })
}

// CORRECT - Always use withTenant
export async function GET(request: Request) {
  const { tenantId } = await requireAuth(request)

  const orders = await withTenant(tenantId, async () => {
    return sql`SELECT * FROM orders`
  })

  return Response.json({ orders })
}
```

### Cache Key Collisions

```typescript
// WRONG - Same key for all tenants
await redis.set('featured-products', products)

// CORRECT - Tenant-prefixed key
await redis.set(`tenant:${tenantId}:featured-products`, products)
```

### Job Payload Missing TenantId

```typescript
// WRONG - Can't determine which tenant
await myJob.trigger({ orderId })

// CORRECT - Always include tenantId
await myJob.trigger({ tenantId, orderId })
```

### Foreign Key Type Mismatches

```sql
-- WRONG - Public users have UUID id, tenant tables often use TEXT
user_id TEXT REFERENCES public.users(id)  -- Type mismatch!

-- CORRECT - Match types exactly
user_id UUID REFERENCES public.users(id)
```
