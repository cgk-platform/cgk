# PHASE-1B: Database Foundation

**Duration**: 1 week (Week 2)
**Depends On**: PHASE-1A (monorepo must exist)
**Parallel With**: None
**Blocks**: PHASE-1C (auth needs database), PHASE-1D (packages need db client)

---

## Goal

Implement the multi-tenant database architecture using schema-per-tenant isolation. Create the public schema for platform-wide tables, design the tenant schema template, and build the migration system with tenant context utilities.

**This phase creates the foundation for ALL tenant isolation in the platform.**

---

## Portability Requirements

This package will be used by every installing user. Setup must be simple:

### CLI Setup
```bash
npx @cgk/cli setup:database
# Should:
# 1. Check DATABASE_URL env var
# 2. Test connection
# 3. Run public schema migrations
# 4. Verify setup

npx @cgk/cli tenant:create <slug>
# Should:
# 1. Create tenant schema
# 2. Run tenant migrations
# 3. Verify tenant is queryable
```

### Documentation Required
- `docs/setup/DATABASE.md` - User-facing setup guide
- Include: Neon signup, connection string, env vars
- Include: How to create first tenant

### Environment Variables
```bash
DATABASE_URL=postgresql://...  # Only required env var
```

---

## Success Criteria

- [ ] Public schema deployed with all platform tables
- [ ] Tenant schema template can be provisioned for new tenants
- [ ] `withTenant()` utility correctly sets PostgreSQL search_path
- [ ] Migration runner works for both public and tenant schemas
- [ ] Tenant isolation verified via unit tests
- [ ] Can create a new tenant via CLI script

---

## Deliverables

### Public Schema Tables
- `organizations` - Tenant registry (id, slug, name, settings, billing)
- `users` - Platform users with org membership
- `sessions` - User sessions with token hashes
- `api_keys` - API key management
- `billing` - Billing/subscription records
- `magic_links` - Passwordless auth tokens

### Tenant Schema Template
- `orders` - Order data
- `customers` - Customer profiles
- `products` - Product catalog (synced from Shopify)
- `creators` - Creator records
- `payouts` - Payout history
- `reviews` - Product reviews
- `blog_posts` - Blog content
- Additional tables per CODEBASE-ANALYSIS

### Database Package (`packages/db`)
- Database client wrapper (`client.ts`)
- Tenant context utility (`tenant.ts`)
- Migration runner (`migrations/runner.ts`)
- Public schema migrations (`migrations/public/`)
- Tenant schema migrations (`migrations/tenant/`)

### Tooling Scripts
- `scripts/create-tenant.ts` - Provision new tenant schema
- `scripts/run-migrations.ts` - Execute migrations

---

## Tenant Isolation (MANDATORY)

**READ**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

This phase establishes the foundation for all tenant isolation. The `withTenant()` helper created here will be used by ALL other phases.

```typescript
// The withTenant helper you create will be used everywhere:
const orders = await withTenant(tenantId, async () => {
  return sql`SELECT * FROM orders WHERE status = 'pending'`
})

// It MUST set the PostgreSQL search_path correctly:
await sql`SELECT set_config('search_path', ${`tenant_${tenantId}, public`}, true)`
```

**Every query in the entire platform will use this pattern.** Get it right.

---

## Constraints

- MUST use `@vercel/postgres` sql template tag (not `db.query`)
- MUST create `withTenant()` helper that sets search_path
- MUST create `createTenantCache()` helper for Redis isolation
- Schema names MUST follow pattern: `tenant_{slug}`
- Tenant slugs MUST be alphanumeric + underscore only
- All tables MUST have `created_at` and `updated_at` timestamps
- Public schema MUST NOT contain tenant-specific business data
- Tenant schemas MUST be completely isolated (no cross-tenant joins)
- Migrations MUST be idempotent (safe to re-run)

---

## Pattern References

**Skills to invoke:**
- Context7 MCP: "PostgreSQL schema isolation" - for multi-tenant patterns
- Context7 MCP: "PostgreSQL search_path" - for tenant context switching

**MCPs to consult:**
- Context7 MCP: Search "PostgreSQL multi-tenant schema per tenant"
- Context7 MCP: Search "database migration runner TypeScript"

**RAWDOG code to reference:**
- `/src/lib/reviews/email-queue/db.ts` - sql template tag patterns
- `/docs/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/DATABASE-SCHEMA-2025-02-10.md` - Current table inventory

**Spec documents:**
- `ARCHITECTURE.md` - Database isolation strategy section

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Migration file naming convention (numeric prefix vs timestamp)
2. Whether to use raw SQL files or TypeScript migration functions
3. Handling failed migrations (rollback strategy)
4. Connection pooling configuration for schema switching
5. Whether `withTenant` should use AsyncLocalStorage or explicit passing

---

## Tasks

### [PARALLEL] Public Schema Design
- [ ] Create `001_organizations.sql` migration
- [ ] Create `002_users.sql` migration
- [ ] Create `003_sessions.sql` migration
- [ ] Create `004_api_keys.sql` migration
- [ ] Create `005_billing.sql` migration
- [ ] Create `006_magic_links.sql` migration

### [PARALLEL] Tenant Schema Template Design
- [ ] Create tenant `001_orders.sql` migration
- [ ] Create tenant `002_customers.sql` migration
- [ ] Create tenant `003_products.sql` migration
- [ ] Create tenant `004_creators.sql` migration
- [ ] Create tenant `005_payouts.sql` migration
- [ ] Create additional tenant tables per CODEBASE-ANALYSIS

### [PARALLEL] Database Package Core
- [ ] Implement `packages/db/src/client.ts` with sql wrapper
- [ ] Implement `packages/db/src/tenant.ts` with `withTenant()`
- [ ] Implement `getTenantFromRequest()` header extraction
- [ ] Export all utilities from `packages/db/src/index.ts`

### [SEQUENTIAL after Core] Migration Runner
- [ ] Implement `packages/db/src/migrations/runner.ts`
- [ ] Add `loadMigrations()` to read SQL files
- [ ] Add `applyMigration()` with version tracking
- [ ] Add migration tracking table (`schema_migrations`)
- [ ] Support both public and tenant schema migrations

### [SEQUENTIAL after Runner] Tooling Scripts
- [ ] Create `tooling/scripts/create-tenant.ts`
- [ ] Create `tooling/scripts/run-migrations.ts`
- [ ] Add npm scripts to root package.json

### [SEQUENTIAL after All] Testing
- [ ] Write tenant isolation tests
- [ ] Write migration runner tests
- [ ] Verify search_path switching works correctly

---

## Public Schema Tables Detail

```
organizations
├── id (uuid, PK)
├── slug (text, unique) -- used for schema name
├── name (text)
├── settings (jsonb) -- theme, features, etc.
├── shopify_store_domain (text)
├── shopify_access_token (text, encrypted)
├── stripe_account_id (text)
├── status (enum: active, suspended, onboarding)
├── created_at (timestamptz)
└── updated_at (timestamptz)

users
├── id (uuid, PK)
├── organization_id (uuid, FK)
├── email (text)
├── password_hash (text, nullable) -- null for magic link only
├── role (enum: owner, admin, member)
├── status (enum: active, invited, disabled)
├── created_at (timestamptz)
└── updated_at (timestamptz)

sessions
├── id (uuid, PK)
├── user_id (uuid, FK)
├── organization_id (uuid, FK)
├── token_hash (text)
├── expires_at (timestamptz)
├── ip_address (text)
├── user_agent (text)
├── created_at (timestamptz)
└── revoked_at (timestamptz, nullable)

api_keys
├── id (uuid, PK)
├── organization_id (uuid, FK)
├── key_hash (text)
├── name (text)
├── scopes (text[])
├── expires_at (timestamptz, nullable)
├── last_used_at (timestamptz)
├── created_at (timestamptz)
└── revoked_at (timestamptz, nullable)

magic_links
├── id (uuid, PK)
├── email (text)
├── token_hash (text)
├── purpose (enum: login, signup, invite)
├── expires_at (timestamptz)
├── used_at (timestamptz, nullable)
└── created_at (timestamptz)
```

---

## Definition of Done

- [ ] All public schema tables created via migrations
- [ ] Tenant schema template migrations ready
- [ ] `withTenant()` correctly switches search_path
- [ ] `getTenantFromRequest()` extracts tenant from headers
- [ ] `create-tenant.ts` script provisions new tenant
- [ ] All database tests pass
- [ ] `npx tsc --noEmit` passes for packages/db
