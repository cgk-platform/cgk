# PHASE-1B: Database Foundation

**Duration**: 1 week (Week 2)
**Depends On**: PHASE-1A (monorepo must exist)
**Parallel With**: None
**Blocks**: PHASE-1C (auth needs database), PHASE-1D (packages need db client)
**Status**: ✅ COMPLETE (2025-02-10)

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
- `docs/setup/DATABASE.md` - User-facing setup guide ✅
- Include: Neon signup, connection string, env vars ✅
- Include: How to create first tenant ✅

### Environment Variables
```bash
POSTGRES_URL=postgresql://...  # Required (auto-provisioned by Vercel/Neon)
```

---

## Success Criteria

- [x] Public schema deployed with all platform tables
- [x] Tenant schema template can be provisioned for new tenants
- [x] `withTenant()` utility correctly sets PostgreSQL search_path
- [x] Migration runner works for both public and tenant schemas
- [x] Tenant isolation verified via unit tests
- [x] Can create a new tenant via CLI script

---

## Deliverables

### Public Schema Tables ✅
- `platform_config` - Platform settings, fresh install detection
- `organizations` - Tenant registry (id, slug, name, settings, billing)
- `users` - Platform users with org membership
- `user_organizations` - User-org membership (many-to-many)
- `sessions` - User sessions with token hashes
- `api_keys` - API key management
- `billing` - Billing/subscription records
- `magic_links` - Passwordless auth tokens

### Tenant Schema Template ✅
- `orders` - Order data (Shopify sync)
- `customers` - Customer profiles
- `products` - Product catalog (synced from Shopify)
- `creators` - Creator records
- `payouts` - Payout history
- `balance_transactions` - Creator balance ledger
- `reviews` - Product reviews
- `review_media` - Review photos/videos
- `blog_posts` - Blog content

### Database Package (`packages/db`) ✅
- Database client wrapper (`client.ts`)
- Tenant context utility (`tenant.ts`) with validation
- Request helpers (`request.ts`) - getTenantFromRequest, requireTenant
- Cache isolation (`cache.ts`) - createTenantCache
- Migration runner (`migrations/runner.ts`)
- Public schema migrations (`migrations/public/`) - 7 files
- Tenant schema migrations (`migrations/tenant/`) - 7 files

### CLI Commands ✅ (instead of tooling scripts)
- `npx @cgk/cli setup:database` - Test connection, run migrations, verify
- `npx @cgk/cli tenant:create <slug>` - Provision new tenant schema
- `npx @cgk/cli tenant:list` - List all tenants

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

- [x] MUST use `@vercel/postgres` sql template tag (not `db.query`)
- [x] MUST create `withTenant()` helper that sets search_path
- [x] MUST create `createTenantCache()` helper for Redis isolation
- [x] Schema names MUST follow pattern: `tenant_{slug}`
- [x] Tenant slugs MUST be alphanumeric + underscore only
- [x] All tables MUST have `created_at` and `updated_at` timestamps
- [x] Public schema MUST NOT contain tenant-specific business data
- [x] Tenant schemas MUST be completely isolated (no cross-tenant joins)
- [x] Migrations MUST be idempotent (safe to re-run)

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
1. ✅ Migration file naming convention (numeric prefix vs timestamp) → **Numeric prefix (001_, 002_)**
2. ✅ Whether to use raw SQL files or TypeScript migration functions → **Raw SQL files with TypeScript runner**
3. ✅ Handling failed migrations (rollback strategy) → **No automatic rollback; idempotent SQL with IF NOT EXISTS**
4. ✅ Connection pooling configuration for schema switching → **Use search_path with Neon pooling**
5. ✅ Whether `withTenant` should use AsyncLocalStorage or explicit passing → **Explicit passing**

---

## Tasks

### [PARALLEL] Public Schema Design ✅
- [x] Create `001_platform_config.sql` migration
- [x] Create `002_organizations.sql` migration
- [x] Create `003_users.sql` migration
- [x] Create `004_sessions.sql` migration
- [x] Create `005_api_keys.sql` migration
- [x] Create `006_billing.sql` migration
- [x] Create `007_magic_links.sql` migration

### [PARALLEL] Tenant Schema Template Design ✅
- [x] Create tenant `001_orders.sql` migration
- [x] Create tenant `002_customers.sql` migration
- [x] Create tenant `003_products.sql` migration
- [x] Create tenant `004_creators.sql` migration
- [x] Create tenant `005_payouts.sql` migration (includes balance_transactions)
- [x] Create tenant `006_reviews.sql` migration (includes review_media)
- [x] Create tenant `007_blog_posts.sql` migration

### [PARALLEL] Database Package Core ✅
- [x] Implement `packages/db/src/client.ts` with sql wrapper
- [x] Implement `packages/db/src/tenant.ts` with `withTenant()`
- [x] Implement `packages/db/src/cache.ts` with `createTenantCache()`
- [x] Implement `getTenantFromRequest()` header extraction
- [x] Export all utilities from `packages/db/src/index.ts`

### [SEQUENTIAL after Core] Migration Runner ✅
- [x] Implement `packages/db/src/migrations/runner.ts`
- [x] Add `loadMigrations()` to read SQL files
- [x] Add `applyMigration()` with version tracking
- [x] Add migration tracking table (`schema_migrations`)
- [x] Support both public and tenant schema migrations

### [SEQUENTIAL after Runner] CLI Commands ✅
- [x] Implement `npx @cgk/cli setup:database` command
- [x] Implement `npx @cgk/cli tenant:create <slug>` command
- [x] Implement `npx @cgk/cli tenant:list` command
- [x] Update doctor command to check database status

### [SEQUENTIAL after All] Testing & Docs ✅
- [x] Write tenant isolation tests
- [x] Write migration loader tests
- [x] Write cache isolation tests
- [x] Verify search_path switching works correctly
- [x] Create `docs/setup/DATABASE.md`

---

## Public Schema Tables Detail

```
platform_config
├── id (uuid, PK)
├── key (varchar, unique) -- 'setup', 'platform', 'defaults', 'features'
├── value (jsonb)
├── created_at (timestamptz)
└── updated_at (timestamptz)

organizations
├── id (uuid, PK)
├── slug (text, unique) -- used for schema name
├── name (text)
├── settings (jsonb) -- theme, features, etc.
├── shopify_store_domain (text)
├── shopify_access_token_encrypted (text)
├── stripe_account_id (text)
├── stripe_customer_id (text)
├── status (enum: active, suspended, onboarding)
├── created_at (timestamptz)
└── updated_at (timestamptz)

users
├── id (uuid, PK)
├── email (text, unique)
├── name (text)
├── password_hash (text, nullable) -- null for magic link only
├── role (enum: super_admin, owner, admin, member)
├── status (enum: active, invited, disabled)
├── email_verified (boolean)
├── email_verified_at (timestamptz)
├── last_login_at (timestamptz)
├── created_at (timestamptz)
└── updated_at (timestamptz)

user_organizations
├── id (uuid, PK)
├── user_id (uuid, FK)
├── organization_id (uuid, FK)
├── role (enum)
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
├── key_prefix (text)
├── name (text)
├── scopes (text[])
├── expires_at (timestamptz, nullable)
├── last_used_at (timestamptz)
├── rate_limit_per_minute (integer)
├── created_at (timestamptz)
└── revoked_at (timestamptz, nullable)

billing
├── id (uuid, PK)
├── organization_id (uuid, FK, unique)
├── stripe_customer_id (text)
├── stripe_subscription_id (text)
├── plan (enum: free, starter, growth, enterprise)
├── status (enum: trialing, active, past_due, canceled, paused)
├── trial_ends_at (timestamptz)
├── current_period_start (timestamptz)
├── current_period_end (timestamptz)
├── usage_limits (jsonb)
├── created_at (timestamptz)
└── updated_at (timestamptz)

magic_links
├── id (uuid, PK)
├── email (text)
├── token_hash (text)
├── purpose (enum: login, signup, invite, password_reset)
├── organization_id (uuid, FK, nullable)
├── invite_role (enum, nullable)
├── expires_at (timestamptz)
├── used_at (timestamptz, nullable)
└── created_at (timestamptz)
```

---

## Definition of Done

- [x] All public schema tables created via migrations
- [x] Tenant schema template migrations ready
- [x] `withTenant()` correctly switches search_path
- [x] `getTenantFromRequest()` extracts tenant from headers
- [x] CLI `tenant:create` command provisions new tenant
- [x] All database tests pass
- [x] `npx tsc --noEmit` passes for packages/db

---

## Implementation Notes

**Completed**: 2025-02-10

### Files Created

```
packages/db/src/
├── index.ts              # Enhanced exports
├── client.ts             # Existing
├── tenant.ts             # Enhanced with validation
├── cache.ts              # NEW: createTenantCache (Redis isolation)
├── request.ts            # NEW: getTenantFromRequest
├── types.ts              # Existing
└── migrations/
    ├── index.ts          # Migration exports
    ├── types.ts          # Migration types
    ├── loader.ts         # SQL file loader
    ├── runner.ts         # Migration executor
    ├── public/
    │   ├── 001_platform_config.sql
    │   ├── 002_organizations.sql
    │   ├── 003_users.sql
    │   ├── 004_sessions.sql
    │   ├── 005_api_keys.sql
    │   ├── 006_billing.sql
    │   └── 007_magic_links.sql
    └── tenant/
        ├── 001_orders.sql
        ├── 002_customers.sql
        ├── 003_products.sql
        ├── 004_creators.sql
        ├── 005_payouts.sql
        ├── 006_reviews.sql
        └── 007_blog_posts.sql

packages/cli/src/commands/
├── tenant.ts             # NEW: tenant:create, tenant:list
└── setup.ts              # Enhanced: setup:database

docs/setup/
└── DATABASE.md           # NEW: User-facing setup guide
```

### Verification Commands

```bash
# Test database setup (requires DATABASE_URL env var)
npx @cgk/cli setup:database

# Create a test tenant
npx @cgk/cli tenant:create test_brand --name "Test Brand"

# List tenants
npx @cgk/cli tenant:list

# Check overall status
npx @cgk/cli doctor

# Type check
pnpm turbo typecheck --filter=@cgk/db --filter=@cgk/cli
```
