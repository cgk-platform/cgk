# PHASE-9C: Database Migrations

**Status**: NOT STARTED
**Duration**: 30 minutes
**Depends On**: PHASE-9A (Database credentials configured)
**Blocks**: Production deployment

---

## Goal

Run all database migrations to set up the production schema, including public tables and the template tenant schema.

---

## Prerequisites

- [ ] Database connection string configured (`POSTGRES_URL` or `DATABASE_URL`)
- [ ] Database is empty or migrations haven't been run
- [ ] CLI installed (`pnpm build --filter @cgk-platform/cli`)

---

## Step 1: Verify Database Connection

```bash
# Test connection
npx @cgk-platform/cli doctor

# Expected output:
# ✓ Database connection successful
# ✓ Redis connection successful
# ...
```

---

## Step 2: Run Public Schema Migrations

Public schema contains platform-wide tables:
- `organizations` (tenant registry)
- `users` (all users across tenants)
- `sessions` (authentication sessions)
- `api_keys` (API authentication)
- `super_admin_*` (super admin tables)
- `feature_flags` (feature flag system)
- `platform_config` (platform settings)

```bash
# Run public migrations
npx @cgk-platform/cli migrate --schema public

# Or via pnpm
pnpm --filter @cgk-platform/cli migrate --schema public
```

---

## Step 3: Create Template Tenant Schema

The template schema (`tenant_template`) contains all tenant-specific tables. When a new tenant is created, this schema is cloned.

```bash
# Run tenant template migrations
npx @cgk-platform/cli migrate --schema tenant_template

# This creates ~90 tables including:
# - orders, customers, products
# - creators, projects, balance_transactions
# - reviews, subscriptions, blog_posts
# - ai_agents, videos, esign_documents
# - and many more...
```

---

## Step 4: Verify Migrations

```bash
# Check migration status
npx @cgk-platform/cli migrate --status

# Expected output:
# Public Schema: 28/28 migrations applied
# Tenant Template: 90/90 migrations applied
```

### Manual Verification

```sql
-- Connect to database and verify
\dn                           -- List schemas (should see public, tenant_template)
\dt public.*                  -- List public tables
\dt tenant_template.*         -- List tenant tables

-- Check migration tracking
SELECT * FROM public.schema_migrations ORDER BY version;
SELECT * FROM tenant_template.schema_migrations ORDER BY version;
```

---

## Step 5: Create First Tenant (Optional)

If you want to create an initial tenant:

```bash
# Via CLI
npx @cgk-platform/cli tenant create --slug "demo" --name "Demo Brand"

# This will:
# 1. Create organization record in public.organizations
# 2. Clone tenant_template schema to tenant_demo
# 3. Set up initial configuration
```

### Via SQL (Manual)

```sql
-- Create organization
INSERT INTO public.organizations (id, slug, name, status, created_at)
VALUES (gen_random_uuid(), 'demo', 'Demo Brand', 'active', NOW());

-- Clone schema (handled by CLI, but for reference)
-- The CLI uses CREATE SCHEMA tenant_demo and copies all tables
```

---

## Migration Files Location

```
packages/db/src/migrations/
├── public/                    # Platform-wide tables (28 files)
│   ├── 001_platform_config.sql
│   ├── 002_organizations.sql
│   ├── 003_users.sql
│   ├── 004_sessions.sql
│   ├── ...
│   └── 028_shopify_oauth.sql
│
└── tenant/                    # Per-tenant tables (90+ files)
    ├── 001_orders.sql
    ├── 002_customers.sql
    ├── 003_products.sql
    ├── ...
    └── 090_contractor_payments.sql
```

---

## Rollback (If Needed)

```bash
# Rollback last migration
npx @cgk-platform/cli migrate --rollback --schema public

# Rollback specific version
npx @cgk-platform/cli migrate --rollback --version 028 --schema public
```

---

## Verification Checklist

### Public Schema

- [ ] `platform_config` table exists
- [ ] `organizations` table exists
- [ ] `users` table exists
- [ ] `sessions` table exists
- [ ] `api_keys` table exists
- [ ] `super_admin_users` table exists
- [ ] `super_admin_sessions` table exists
- [ ] `feature_flags` table exists
- [ ] `schema_migrations` tracking table exists

### Tenant Template Schema

- [ ] `tenant_template` schema exists
- [ ] `orders` table exists
- [ ] `customers` table exists
- [ ] `products` table exists
- [ ] `creators` table exists
- [ ] `projects` table exists
- [ ] `reviews` table exists
- [ ] `blog_posts` table exists
- [ ] `ai_agents` table exists
- [ ] `schema_migrations` tracking table exists

### Functions & Triggers

- [ ] `update_updated_at_column()` function exists in public
- [ ] Triggers attached to tables with `updated_at`

### Extensions

- [ ] `pgvector` extension enabled (for AI embeddings)
- [ ] `pg_trgm` extension enabled (for text search)

---

## Common Issues

### Permission Denied

```sql
-- Grant necessary permissions
GRANT ALL ON SCHEMA public TO your_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
```

### Extension Not Available

```sql
-- Enable extensions (requires superuser)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Migration Already Run

The migrations are idempotent (use IF NOT EXISTS). Re-running is safe:

```bash
# Force re-run (safe due to idempotency)
npx @cgk-platform/cli migrate --force
```

---

## Post-Migration Setup

After migrations complete:

1. **Create Super Admin** (if not using CLI setup)
   ```sql
   INSERT INTO public.users (id, email, name, role, status, created_at)
   VALUES (gen_random_uuid(), 'admin@example.com', 'Admin', 'super_admin', 'active', NOW());
   ```

2. **Set Platform Config**
   ```sql
   INSERT INTO public.platform_config (key, value, created_at)
   VALUES
     ('setup', '{"completed": true, "date": "2026-02-13"}', NOW()),
     ('platform_name', '"CGK Platform"', NOW());
   ```

3. **Create First Tenant**
   ```bash
   npx @cgk-platform/cli tenant create --slug "demo" --name "Demo Brand"
   ```

---

*Last Updated: 2026-02-13*
