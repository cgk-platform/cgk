# Multi-Tenancy Patterns

**Purpose**: Comprehensive guide to multi-tenant architecture patterns in the CGK platform
**Last Updated**: 2026-02-27

---

## Overview

CGK uses **schema-per-tenant** PostgreSQL architecture for complete data isolation. Every tenant gets their own PostgreSQL schema with isolated tables.

**Architecture**:

```
public schema (shared):
├── organizations     # Tenant registry
├── users            # All users across tenants
└── platform_*       # Platform-wide tables

tenant_{slug} schema (per-tenant):
├── orders, customers, products
├── creators, projects, balance_transactions
├── reviews, ab_tests
└── ... all tenant-specific data
```

---

## CRITICAL RULE: Always Use withTenant()

**MANDATORY**: All tenant-scoped queries MUST use `withTenant()` wrapper:

```typescript
import { withTenant, sql } from '@cgk-platform/db'

// CORRECT - Queries run against tenant schema
const orders = await withTenant('rawdog', async () => {
  return sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`
})

// WRONG - No tenant context, queries public schema
const orders = await sql`SELECT * FROM orders`
```

**What withTenant() does**:

1. Sets PostgreSQL `search_path` to `tenant_{slug}, public`
2. All queries within the callback run against tenant schema
3. Falls back to public schema for shared tables (users, organizations)
4. Automatically resets search_path after callback completes

---

## Schema Layout & ID Types (CRITICAL for Migrations)

### PUBLIC SCHEMA - ID types are UUID

| Table               | ID Type | Notes                     |
| ------------------- | ------- | ------------------------- |
| `organizations`     | UUID    | Tenant registry           |
| `users`             | UUID    | All user FKs must be UUID |
| `sessions`          | UUID    | Auth sessions             |
| `api_keys`          | UUID    | API authentication        |
| `team_invitations`  | UUID    | Team management           |
| `feature_flags`     | UUID    | Feature flag system       |
| `creators` (public) | UUID    | Global creator registry   |

### TENANT SCHEMA - ID types vary (mostly TEXT)

| Table           | ID Type  | Notes                         |
| --------------- | -------- | ----------------------------- |
| `orders`        | TEXT     | Shopify order IDs are strings |
| `customers`     | TEXT     | Shopify customer IDs          |
| `products`      | TEXT     | Shopify product IDs           |
| `creators`      | TEXT     | Tenant-scoped creators        |
| `ai_agents`     | TEXT     | AI agent definitions          |
| `videos`        | TEXT     | Video records                 |
| `projects`      | **UUID** | Exception - uses UUID         |
| `blog_posts`    | TEXT     | Blog content                  |
| `subscriptions` | TEXT     | Subscription records          |
| `reviews`       | TEXT     | Product reviews               |

### CRITICAL: Always Verify ID Types Before Foreign Keys

```sql
-- Check actual column type before referencing
-- \d public.users     -- Shows: id UUID
-- \d tenant_rawdog.creators  -- Shows: id TEXT

-- WRONG - TEXT doesn't match UUID
user_id TEXT REFERENCES public.users(id)

-- CORRECT - Types must match
user_id UUID REFERENCES public.users(id)
```

---

## Cache Isolation

**MANDATORY**: Use `createTenantCache()` for all tenant-scoped caching:

```typescript
import { createTenantCache } from '@cgk-platform/cache'

// CORRECT - Cache keys prefixed with tenant
const cache = createTenantCache(tenantId)
await cache.set('pricing-config', config) // Stored as: tenant:rawdog:pricing-config

// WRONG - No tenant prefix
await redis.set('pricing-config', config) // Data leak!
```

**What createTenantCache() does**:

- Automatically prefixes all keys with `tenant:{tenantId}:`
- Prevents cache collisions between tenants
- Uses same Redis API as unprefixed cache
- TTL management per tenant

---

## Background Jobs

**MANDATORY**: Always include `tenantId` in job payloads:

```typescript
// CORRECT - tenantId in payload
await jobs.send('order/created', {
  tenantId: 'rawdog', // REQUIRED
  orderId: 'order_123',
})

// WRONG - Missing tenantId
await jobs.send('order/created', {
  orderId: 'order_123', // Which tenant?!
})
```

**Job handler pattern**:

```typescript
import { withTenant } from '@cgk-platform/db'

export const handleOrderCreated = task({
  id: 'order/created',
  run: async (payload: { tenantId: string; orderId: string }) => {
    const { tenantId, orderId } = payload

    // Use withTenant for all database queries
    await withTenant(tenantId, async () => {
      const order = await sql`SELECT * FROM orders WHERE id = ${orderId}`
      // Process order...
    })
  },
})
```

---

## Tenant-Managed Integrations (CRITICAL)

**Architecture**: Tenants own their own accounts for ALL third-party services. The platform only provides encryption infrastructure.

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

### Service Client Pattern

```typescript
import { getTenantStripeClient, requireTenantStripeClient } from '@cgk-platform/integrations'
import { getTenantResendClient } from '@cgk-platform/integrations'

// In API routes - get tenant's own Stripe client
export async function POST(req: Request) {
  const { tenantId } = await getTenantContext(req)

  // Returns null if not configured
  const stripe = await getTenantStripeClient(tenantId)
  if (!stripe) {
    return Response.json({ error: 'Stripe not configured' }, { status: 400 })
  }

  // Or throw if not configured
  const stripe = await requireTenantStripeClient(tenantId)

  // Use tenant's own Stripe account
  const customer = await stripe.customers.create({ email })
}

// In background jobs - same pattern
export const sendOrderConfirmation = task({
  id: 'send-order-confirmation',
  run: async (payload: { tenantId: string; orderId: string }) => {
    const { tenantId, orderId } = payload

    // Get tenant's Resend client
    const resend = await getTenantResendClient(tenantId)
    if (!resend) throw new Error('Resend not configured')

    // Send using tenant's own Resend account
    await resend.emails.send({ from, to, subject, html })
  },
})
```

### Credential Tables (in tenant schema)

- `tenant_stripe_config` - Stripe secret key, publishable key, webhook secret
- `tenant_resend_config` - Resend API key, sender settings
- `tenant_wise_config` - Wise API key for international payouts
- `tenant_api_credentials` - Generic table for Mux, AssemblyAI, Anthropic, OpenAI

### CRITICAL Rules

1. **NEVER use platform-level API keys for tenant operations**
2. **ALWAYS use `getTenant*Client()` functions** - they handle decryption and caching
3. **Clients are cached for 5 minutes** per tenant to avoid repeated decryption
4. **All credentials encrypted with AES-256-GCM** using `INTEGRATION_ENCRYPTION_KEY`
5. **Admin UI at** `/admin/settings/integrations/credentials` for credential management

---

## Common Migration Pitfalls

### 1. Type Mismatch (UUID vs TEXT)

```sql
-- WRONG - Public tables use UUID, most tenant tables use TEXT
CREATE TABLE tenant_schema.table_name (
  user_id TEXT REFERENCES public.users(id)  -- ❌ Type mismatch
);

-- CORRECT - Types must match
CREATE TABLE tenant_schema.table_name (
  user_id UUID REFERENCES public.users(id)  -- ✅ Matches UUID
);
```

### 2. Missing IF NOT EXISTS

```sql
-- WRONG - Fails on re-run
CREATE TABLE orders (...);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- CORRECT - Idempotent
CREATE TABLE IF NOT EXISTS orders (...);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
```

### 3. Function Scope

```sql
-- WRONG - Function in tenant schema
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON tenant_schema.orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CORRECT - Reference public schema function
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON tenant_schema.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### 4. pgvector Types

```sql
-- WRONG - Missing public schema prefix
embedding vector(1536)

-- CORRECT - Use public.vector
embedding public.vector(1536)
```

### 5. Enum Values

```sql
-- WRONG - Using enum value that doesn't exist yet
WHERE status = 'pending_verification'  -- Might not exist in all schemas

-- CORRECT - Check existing values first or use ALTER TYPE
-- See migration files for enum management patterns
```

---

## Tenant Resolution Patterns

### From HTTP Request (Next.js API Routes)

```typescript
import { getTenantContext } from '@cgk-platform/auth'

export async function GET(req: Request) {
  const { tenantId, userId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  return withTenant(tenantId, async () => {
    const data = await sql`SELECT * FROM orders LIMIT 50`
    return Response.json({ orders: data })
  })
}
```

### From JWT Token

```typescript
import { decodeToken } from '@cgk-platform/auth'

const token = req.headers.get('authorization')?.replace('Bearer ', '')
if (!token) throw new Error('Unauthorized')

const payload = await decodeToken(token)
const tenantId = payload.tenantId // Embedded in JWT
```

### From Subdomain (Storefront)

```typescript
import { getTenantBySubdomain } from '@cgk-platform/db'

const host = req.headers.get('host')
const subdomain = host?.split('.')[0]

const tenant = await getTenantBySubdomain(subdomain)
if (!tenant) throw new Error('Tenant not found')
```

---

## Testing Multi-Tenant Code

### Use Test Tenant Schemas

```typescript
import { withTenant, sql } from '@cgk-platform/db'

describe('Order creation', () => {
  const testTenantId = 'test-tenant'

  beforeAll(async () => {
    // Create test tenant schema
    await sql`CREATE SCHEMA IF NOT EXISTS tenant_${sql.raw(testTenantId)}`
    // Run migrations...
  })

  afterAll(async () => {
    // Clean up test schema
    await sql`DROP SCHEMA tenant_${sql.raw(testTenantId)} CASCADE`
  })

  it('creates order in tenant schema', async () => {
    await withTenant(testTenantId, async () => {
      const order = await sql`INSERT INTO orders (...) RETURNING *`
      expect(order).toBeDefined()
    })
  })
})
```

---

## Monitoring & Debugging

### Check Current Search Path

```sql
SHOW search_path;
-- Should show: tenant_{slug}, public
```

### Verify Schema Isolation

```sql
-- List all tenant schemas
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name LIKE 'tenant_%';

-- Check table ownership
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'tenant_rawdog';
```

### Audit Tenant Data Leaks

```bash
# Run tenant isolation validator
pnpm validate:tenant-isolation

# Fix violations automatically
pnpm validate:tenant-isolation --fix
```

---

**For detailed migration patterns, see**: `.claude/knowledge-bases/database-migration-patterns/README.md`

**End of Guide**
