# Tenant Migration Guide - WordPress-Style Separation

This guide walks through migrating the existing 4 tenants from the shared monorepo to separate GitHub forks with their own Vercel deployments.

---

## Overview

**Current State:**

- 4 tenants in shared database: meliusly, cgk-linens, vitahustle, rawdog
- 9 Vercel projects (separate apps on cgk-linens team)
- Single GitHub monorepo

**Target State:**

- cgk-platform/cgk-template: Clean template (no tenant data)
- 4 separate organizations/repos:
  - meliusly/meliusly-commerce
  - cgk-linens/cgk-commerce
  - vitahustle/vitahustle-platform
  - rawdog/rawdog-commerce
- Each tenant deploys to ONE Vercel project in their own account

---

## Prerequisites

Before starting, ensure you have:

```bash
# GitHub Personal Access Token (with repo creation permissions)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx

# Vercel API Token (from vercel.com/account/tokens)
export VERCEL_TOKEN=xxxxxxxxxxxxxxxxxxxxx

# Database connection (for data export)
export DATABASE_URL=$(cat apps/admin/.env.local | grep POSTGRES_URL | cut -d= -f2-)
```

---

## Migration Process (Per Tenant)

### Step 1: Export Tenant Data

Run the export command for each tenant:

```bash
# Meliusly
npx @cgk-platform/cli tenant:export meliusly \
  --fork \
  --github-token $GITHUB_TOKEN \
  --vercel-token $VERCEL_TOKEN \
  --org meliusly \
  --repo-name meliusly-commerce

# CGK Linens
npx @cgk-platform/cli tenant:export cgk-linens \
  --fork \
  --github-token $GITHUB_TOKEN \
  --vercel-token $VERCEL_TOKEN \
  --org cgk-linens \
  --repo-name cgk-commerce

# VitaHustle
npx @cgk-platform/cli tenant:export vitahustle \
  --fork \
  --github-token $GITHUB_TOKEN \
  --vercel-token $VERCEL_TOKEN \
  --org vitahustle \
  --repo-name vitahustle-platform

# Rawdog
npx @cgk-platform/cli tenant:export rawdog \
  --fork \
  --github-token $GITHUB_TOKEN \
  --vercel-token $VERCEL_TOKEN \
  --org rawdog \
  --repo-name rawdog-commerce
```

**What this does:**

1. Queries database for tenant's `public.organizations` record
2. Exports all data from `tenant_{slug}` schema
3. Generates 5 files:
   - `platform.config.ts` (tenant-specific configuration)
   - `migration.sql` (SQL restore script)
   - `organization.json` (organization metadata)
   - `tenant-data.json` (all table data)
   - `.env.example` (environment variable template)
4. Creates GitHub repository using cgk-template
5. Creates Vercel project (if token provided)

### Step 2: Set Up Tenant's Own Infrastructure

For each tenant, they need to create:

**Neon PostgreSQL** (free tier available):

```bash
# Go to https://neon.tech
# Create project: "{tenant-name}-production"
# Copy connection string
```

**Upstash Redis** (free tier available):

```bash
# Go to https://upstash.com
# Create database: "{tenant-name}-cache"
# Copy connection string
```

**Vercel Blob Storage** (for assets):

```bash
# In Vercel dashboard:
# Project Settings → Storage → Create Blob Store
# Copy BLOB_READ_WRITE_TOKEN
```

### Step 3: Configure Environment Variables

In the new Vercel project, add environment variables (all 3 environments: production, preview, development):

```bash
# Database
DATABASE_URL=postgresql://...neon.tech/...
POSTGRES_URL=postgresql://...neon.tech/...

# Redis Cache
REDIS_URL=rediss://...upstash.io:6379

# Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_...
NEXT_PUBLIC_ASSET_BASE_URL=https://{project}.public.blob.vercel-storage.com

# Shopify (tenant's own store)
SHOPIFY_STORE_DOMAIN={tenant}.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...
SHOPIFY_STOREFRONT_ACCESS_TOKEN=...

# Stripe (tenant's own account)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Other tenant-specific vars
NEXT_PUBLIC_APP_URL=https://{tenant}.vercel.app
```

### Step 4: Run Database Migration

In the new repository, run the migration:

```bash
# Clone the new fork
git clone https://github.com/{org}/{repo}.git
cd {repo}

# Install dependencies
pnpm install

# Set local environment variables
cp .env.example apps/admin/.env.local
# Edit apps/admin/.env.local with production values

# Run migration SQL (creates tenant schema + seeds data)
psql $DATABASE_URL -f migration.sql

# Verify migration
npx @cgk-platform/cli doctor
```

### Step 5: Migrate Assets

Upload tenant's assets to their own Blob Storage:

```bash
# Export assets from old location
# (Assuming assets are in apps/{tenant}-storefront/public/)

# If tenant has local assets:
cd /path/to/old/cgk/repo
npx tsx scripts/migrate-tenant-assets.ts \
  ./apps/{tenant}-storefront/public/{tenant} \
  $BLOB_READ_WRITE_TOKEN

# If assets are on our Blob Storage:
# Download assets first, then upload to tenant's storage
```

### Step 6: Update DNS (When Ready)

Point tenant's custom domain to new Vercel project:

```bash
# In Vercel dashboard for new project:
# Settings → Domains → Add Domain
# Add: {tenant}.com

# Update DNS records:
# - CNAME: www → cname.vercel-dns.com
# - A: @ → 76.76.21.21

# Verify deployment
curl -I https://{tenant}.com
```

### Step 7: Deactivate Old Deployment

**DO NOT DELETE** until new deployment is verified working:

1. Test new deployment thoroughly
2. Verify all features work (auth, payments, webhooks)
3. Monitor for 24-48 hours
4. **Then** delete old Vercel projects

---

## What to Delete (After Migration Complete)

### Vercel Projects to Delete

Once ALL 4 tenants are migrated and verified:

**Delete these projects from cgk-linens team:**

```
cgk-meliusly-storefront    # Already deleted from codebase
cgk-admin                  # Multi-tenant admin (no longer needed)
cgk-storefront             # Generic storefront (tenants have their own)
cgk-shopify-app            # Each tenant runs their own
cgk-orchestrator           # Multi-tenant orchestrator (deprecated)
cgk-creator-portal         # Multi-tenant (deprecated)
cgk-contractor-portal      # Multi-tenant (deprecated)
cgk-command-center         # Multi-tenant (deprecated)
cgk-mcp-server             # Multi-tenant (deprecated)
```

**⚠️ CRITICAL**: Do NOT delete until:

- All 4 tenants have new deployments running
- DNS is updated and verified
- 48-hour monitoring period completed
- Old deployments show zero traffic

### Database Cleanup

After all tenants migrated:

```bash
# Connect to old shared database
psql $OLD_DATABASE_URL

# Delete tenant schemas (BACKUP FIRST!)
DROP SCHEMA IF EXISTS tenant_meliusly CASCADE;
DROP SCHEMA IF EXISTS tenant_cgk_linens CASCADE;
DROP SCHEMA IF EXISTS tenant_vitahustle CASCADE;
DROP SCHEMA IF EXISTS tenant_rawdog CASCADE;

# Delete organization records
DELETE FROM public.organizations WHERE slug IN (
  'meliusly', 'cgk-linens', 'vitahustle', 'rawdog'
);

# Verify cleanup
SELECT * FROM public.organizations;
\dn  -- Should show only 'public' schema
```

### Template Repository Cleanup

Update cgk-platform/cgk to be a clean template:

```bash
# Already done in Phase 6, but verify:
# - No hard-coded tenant data in platform.config.ts
# - No tenant-specific storefronts
# - No tenant data in database
# - README.md has "Deploy to Vercel" button
# - .github/template.yml configured
```

---

## Migration Checklist (Per Tenant)

- [ ] Export tenant data (`tenant:export --fork`)
- [ ] GitHub repository created
- [ ] Vercel project created
- [ ] Neon PostgreSQL provisioned
- [ ] Upstash Redis provisioned
- [ ] Vercel Blob Storage created
- [ ] Environment variables configured (all 3 environments)
- [ ] Database migration run (`migration.sql`)
- [ ] Assets migrated to new Blob Storage
- [ ] Test deployment (auth, payments, webhooks)
- [ ] DNS updated (if custom domain)
- [ ] 48-hour monitoring (zero errors)
- [ ] Old deployment deactivated
- [ ] Old Vercel project deleted
- [ ] Old database schema deleted

---

## Rollback Plan (If Issues Arise)

If migration fails for a tenant:

1. **DNS**: Revert CNAME back to old deployment
2. **Database**: Old schema still exists (not deleted until verified)
3. **Vercel**: Old project still running (not deleted until verified)
4. **Assets**: Old assets still accessible

**No downtime** if you follow the staged migration approach.

---

## Estimated Timeline

Per tenant:

- Export: 5 minutes
- Infrastructure setup: 15 minutes
- Environment variables: 10 minutes
- Database migration: 5 minutes
- Asset migration: 10 minutes
- Testing: 30 minutes
- DNS update: 5 minutes
- Monitoring: 48 hours

**Total per tenant**: ~1.5 hours active work + 48 hours monitoring

**All 4 tenants**: ~6 hours active work + 48 hours monitoring

---

## Support

If you encounter issues:

1. Check `npx @cgk-platform/cli doctor` output
2. Review Vercel deployment logs
3. Check database connection: `psql $DATABASE_URL -c "SELECT 1"`
4. Verify environment variables: `vercel env ls --scope {org-name}`

---

**DO NOT DELETE OLD INFRASTRUCTURE UNTIL NEW DEPLOYMENTS ARE VERIFIED WORKING FOR 48+ HOURS.**
