# Database Setup Guide

This guide walks you through setting up the database for your CGK platform.

## Prerequisites

- Node.js 22+ installed
- pnpm installed (`npm install -g pnpm`)
- CGK platform cloned and dependencies installed

## Quick Start

### Option 1: Vercel Storage (Recommended)

The easiest way to set up the database:

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → **Neon Postgres**
4. Connect it to your project
5. Pull environment variables locally:
   ```bash
   vercel env pull .env.local
   ```
6. Run database setup:
   ```bash
   npx @cgk/cli setup:database
   ```

This automatically provisions a Neon PostgreSQL database and sets up all the required environment variables.

### Option 2: Manual Setup

#### Step 1: Create a Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the connection string from the dashboard

The connection string looks like:
```
postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

#### Step 2: Configure Environment

Add the connection string to your `.env.local`:

```bash
# .env.local
POSTGRES_URL=postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

#### Step 3: Run Database Setup

```bash
npx @cgk/cli setup:database
```

This command will:
1. Test the database connection
2. Run all public schema migrations
3. Verify the setup

#### Step 4: Create Your First Tenant

```bash
npx @cgk/cli tenant:create my_brand --name "My Brand"
```

This creates:
- A new database schema `tenant_my_brand`
- All tenant tables (orders, customers, products, etc.)
- An organization record in the public schema

## CLI Commands Reference

### `setup:database`

Test connection and run migrations:

```bash
# Full setup
npx @cgk/cli setup:database

# Dry run (see what would happen)
npx @cgk/cli setup:database --dry-run

# Skip migrations (just test connection)
npx @cgk/cli setup:database --skip-migrations
```

### `tenant:create`

Create a new tenant:

```bash
# Basic usage
npx @cgk/cli tenant:create <slug> --name "<Display Name>"

# Examples
npx @cgk/cli tenant:create rawdog --name "RAWDOG"
npx @cgk/cli tenant:create my_brand --name "My Brand"

# Dry run
npx @cgk/cli tenant:create test_brand --dry-run
```

Slug requirements:
- Lowercase letters, numbers, and underscores only
- Pattern: `^[a-z0-9_]+$`
- Examples: `rawdog`, `my_brand`, `brand_2024`

### `tenant:list`

List all tenants:

```bash
# List all
npx @cgk/cli tenant:list

# Filter by status
npx @cgk/cli tenant:list --status active

# Output as JSON
npx @cgk/cli tenant:list --json
```

### `doctor`

Check system status:

```bash
npx @cgk/cli doctor
```

## Architecture

### Schema Structure

The database uses schema-per-tenant isolation:

```
PostgreSQL Database
├── public schema (shared)
│   ├── platform_config    # Platform settings
│   ├── organizations      # Tenant registry
│   ├── users              # All platform users
│   ├── user_organizations # User-tenant membership
│   ├── sessions           # Auth sessions
│   ├── api_keys           # API key management
│   ├── billing            # Subscription/billing
│   └── magic_links        # Passwordless auth
│
├── tenant_rawdog schema   # Brand-specific data
│   ├── orders
│   ├── customers
│   ├── products
│   ├── creators
│   ├── payouts
│   ├── reviews
│   └── blog_posts
│
└── tenant_another_brand schema
    └── ... (same tables)
```

### Using Tenant Context

Always use `withTenant()` for tenant-scoped queries:

```typescript
import { withTenant, sql } from '@cgk/db'

// CORRECT - Queries run against tenant schema
const orders = await withTenant('rawdog', async () => {
  return sql`SELECT * FROM orders ORDER BY created_at DESC`
})

// WRONG - Queries run against public schema
const orders = await sql`SELECT * FROM orders`  // Don't do this!
```

### Cache Isolation

Use `createTenantCache()` for tenant-isolated Redis caching:

```typescript
import { createTenantCache } from '@cgk/db'

const cache = createTenantCache('rawdog')

// Stored as: tenant:rawdog:pricing-config
await cache.set('pricing-config', { freeShipping: 5000 })

// Retrieved from: tenant:rawdog:pricing-config
const config = await cache.get('pricing-config')
```

## Troubleshooting

### Connection Failed

```
❌ Database connection failed
```

**Common causes:**
- Incorrect connection string - check for typos
- Database not created - verify in Neon dashboard
- Network issues - check firewall/VPN settings
- SSL required - ensure `?sslmode=require` is in URL

### Migration Failed

```
❌ Migration failed: relation "xxx" already exists
```

Migrations are idempotent, but if you see this:
1. Check if the table was partially created
2. Review the migration file for issues
3. Consider resetting the database (development only)

### Tenant Already Exists

```
❌ Tenant "my_brand" already exists
```

The tenant slug is already in use. Either:
- Choose a different slug
- Use `tenant:list` to see existing tenants

### Invalid Tenant Slug

```
❌ Invalid tenant slug
```

Slug must match pattern `^[a-z0-9_]+$`:
- Lowercase letters only (no uppercase)
- Numbers allowed
- Underscores allowed (no hyphens)
- No spaces or special characters

## Environment Variables

### Database (Required)

```bash
# Via Vercel Storage (auto-provisioned)
POSTGRES_URL=postgresql://...

# Or manually set
POSTGRES_URL=postgresql://user:password@host/database?sslmode=require
```

The `@vercel/postgres` package automatically reads from `POSTGRES_URL`.

### Redis Cache (Optional)

```bash
# Upstash Redis (via Vercel Storage or upstash.com)
UPSTASH_REDIS_REST_URL=https://us1-xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

If not configured, the platform falls back to in-memory caching (suitable for development).

## Vercel Storage Integration

When using Vercel Storage, these environment variables are automatically configured:

### Neon Postgres

```bash
POSTGRES_URL=...              # Main connection URL (pooled)
POSTGRES_PRISMA_URL=...       # For Prisma (pooled)
POSTGRES_URL_NON_POOLING=...  # Direct connection (for migrations)
POSTGRES_USER=...
POSTGRES_HOST=...
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=...
```

### Upstash Redis

```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

After adding integrations in Vercel, pull to local:

```bash
vercel env pull .env.local
```

## Next Steps

After database setup:

1. **Create your first tenant**: `npx @cgk/cli tenant:create my_brand`
2. **Run the full setup wizard**: `npx @cgk/cli setup`
3. **Start development**: `pnpm dev`

For more information, see the [main documentation](../README.md).
