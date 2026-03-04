# WordPress-Style Fork Workflow

This guide explains how to create and maintain WordPress-style forks of the CGK Platform template.

---

## Overview

CGK Platform follows the **WordPress.org distribution model** (NOT WordPress.com SaaS):

- **Template Repository**: `cgk-platform/cgk-template` (clean template, no tenant data)
- **Forks**: Users create forks with their own tenant data and deploy to their infrastructure
- **Updates**: Forks pull and merge updates from template (like WordPress core updates)

---

## Architecture

```
cgk-platform/cgk-template (WordPress "core" - clean template)
    ↓ Forks pull & merge updates
    ↓
├── cgk-unlimited/cgk-platform
│   ├── Tenants: meliusly + cgk-linens (multi-tenant)
│   ├── Own Vercel project
│   ├── Own Neon database (2 tenant schemas)
│   └── Own Upstash Redis
│
├── vitahustle/vitahustle-platform
│   ├── Tenant: vitahustle (single-tenant)
│   ├── Own Vercel project
│   └── Own infrastructure
│
└── rawdog/rawdog-commerce
    ├── Tenant: rawdog (single-tenant)
    └── Own infrastructure
```

---

## Creating a New Fork

### Prerequisites

1. **GitHub Personal Access Token**
   - Go to: https://github.com/settings/tokens/new
   - Scopes: `repo` (full), `admin:org` (if creating in orgs)
   - Save as `GITHUB_TOKEN`

2. **Vercel API Token**
   - Go to: https://vercel.com/account/tokens
   - Create new token
   - Save as `VERCEL_TOKEN`

3. **Database Access**
   - Have `DATABASE_URL` for current CGK database (to export tenant data)

### Automated Fork Creation

The `create-fork.ts` script automates the entire process:

```bash
# Set environment variables
export GITHUB_TOKEN=ghp_xxxxx
export VERCEL_TOKEN=xxxxx
export DATABASE_URL=postgres://...

# Multi-tenant fork (2+ tenants)
./scripts/create-fork.ts cgk-unlimited cgk-platform \
  --tenants meliusly,cgk-linens \
  --multi-tenant

# Single-tenant fork (1 tenant)
./scripts/create-fork.ts vitahustle vitahustle-platform \
  --tenants vitahustle
```

**What the script does:**

1. ✅ Creates GitHub repository using template API
2. ✅ Exports tenant data from source database
3. ✅ Creates Vercel project with GitHub integration
4. ✅ Generates `platform.config.ts` with tenant configuration
5. ⏸️ **Pauses** - You manually add Neon + Upstash integrations in Vercel
6. ✅ Imports tenant data to new database (after integrations added)
7. ✅ Commits and deploys

### Manual Steps (After Script)

After the script pauses, complete these steps:

#### 1. Add Vercel Integrations

Go to Vercel project settings:

```
https://vercel.com/{owner}/{repo}/settings/integrations
```

Add integrations:

- **Neon Postgres** (auto-provisions database)
- **Upstash Redis** (auto-provisions cache)
- **Vercel Blob** (for asset storage)

Wait for integrations to provision (1-2 minutes).

#### 2. Import Tenant Data

Pull environment variables:

```bash
cd {fork-directory}
vercel env pull apps/admin/.env.local
```

Import tenant data:

```bash
export NEW_DATABASE_URL=$(grep POSTGRES_URL apps/admin/.env.local | cut -d '=' -f2)
./scripts/import-tenant-data.sh exports/meliusly-export.sql exports/cgk-linens-export.sql
```

#### 3. Deploy

```bash
git add platform.config.ts
git commit -m "feat: configure {owner} deployment"
git push origin main
```

Vercel auto-deploys on push.

---

## Pulling Updates from Template

When updates are pushed to `cgk-platform/cgk-template`, forks pull and merge:

### One-Time Setup (Per Fork)

Add upstream remote:

```bash
cd {fork-directory}
git remote add upstream https://github.com/cgk-platform/cgk-template
```

### Regular Update Workflow

```bash
# Fetch latest from template
git fetch upstream

# Check what changed
git log HEAD..upstream/main --oneline

# Merge updates
git merge upstream/main

# Resolve conflicts if any
# (Usually in platform.config.ts or tenant-specific files)

# Push to deploy
git push origin main
```

**Conflict Resolution:**

Most conflicts occur in:

- `platform.config.ts` (keep YOUR tenant config)
- Database migrations (merge both, ensure order)
- Environment variables (keep YOUR credentials)

**General rule**: Keep YOUR tenant data/config, accept template's code changes.

---

## Fork Configuration

Each fork has a `platform.config.ts` that defines tenant setup:

### Multi-Tenant Example (CGK Unlimited)

```typescript
import { defineConfig } from '@cgk-platform/core'

export const platformConfig = defineConfig({
  deployment: {
    name: 'CGK Unlimited',
    organization: 'CGK Unlimited',
    mode: 'multi-tenant', // Multiple tenants
  },

  tenants: [
    {
      slug: 'meliusly',
      name: 'Meliusly',
      schema: 'tenant_meliusly',
      primaryColor: '#0268A0',
      domain: 'meliusly.com',
      // ... full meliusly config
    },
    {
      slug: 'cgk-linens',
      name: 'CGK Linens',
      schema: 'tenant_cgk_linens',
      primaryColor: '#2B3E50',
      domain: 'cgklinens.com',
      // ... full cgk-linens config
    },
  ],

  features: {
    multiTenant: true,
    shopifyIntegration: true,
  },
})
```

### Single-Tenant Example (VitaHustle)

```typescript
export const platformConfig = defineConfig({
  deployment: {
    name: 'VitaHustle',
    organization: 'VitaHustle',
    mode: 'single-tenant', // Single tenant only
  },

  tenants: [
    {
      slug: 'vitahustle',
      name: 'VitaHustle',
      schema: 'tenant_vitahustle',
      // ... vitahustle config
    },
  ],

  features: {
    multiTenant: false,
  },
})
```

---

## Database Management

### Tenant Isolation

Each tenant gets isolated data:

**Multi-tenant fork** (cgk-unlimited/cgk-platform):

```sql
-- Database: cgk-unlimited-db.neon.tech
CREATE SCHEMA tenant_meliusly;
CREATE SCHEMA tenant_cgk_linens;

-- Organizations table
INSERT INTO public.organizations (slug, name) VALUES
  ('meliusly', 'Meliusly'),
  ('cgk-linens', 'CGK Linens');
```

**Single-tenant fork** (vitahustle/vitahustle-platform):

```sql
-- Database: vitahustle-db.neon.tech
CREATE SCHEMA tenant_vitahustle;

-- Organizations table
INSERT INTO public.organizations (slug, name) VALUES
  ('vitahustle', 'VitaHustle');
```

### Running Migrations

Migrations run automatically on deploy via Vercel build:

```json
// vercel.json
{
  "buildCommand": "pnpm turbo build && pnpm db:migrate"
}
```

Manual migration:

```bash
cd apps/admin
npx @cgk-platform/cli migrate
```

---

## Environment Variables

### Shared Across All Apps

In a single Vercel project, environment variables are **shared** across all 8 apps.

Set in Vercel dashboard or CLI:

```bash
# Via Vercel CLI
vercel env add DATABASE_URL production
vercel env add REDIS_URL production

# Pull to local
vercel env pull apps/admin/.env.local
vercel env pull apps/storefront/.env.local
# ... repeat for all apps
```

### Required Variables

**Auto-set by integrations:**

- `DATABASE_URL` (Neon)
- `POSTGRES_URL` (Neon)
- `REDIS_URL` (Upstash)
- `BLOB_READ_WRITE_TOKEN` (Vercel Blob)

**Must set manually:**

- `JWT_SECRET` (generate with `openssl rand -hex 32`)
- `ENCRYPTION_KEY` (generate with `openssl rand -hex 32`)
- Shopify credentials (per tenant)
- Stripe credentials (per tenant)

---

## Deployment URLs

### Multi-Tenant Fork

```
cgk-unlimited-platform.vercel.app
├── /?tenant=meliusly       → Meliusly storefront
├── /?tenant=cgk-linens     → CGK Linens storefront
├── /admin?tenant=meliusly  → Meliusly admin
└── /admin?tenant=cgk-linens→ CGK Linens admin
```

### Single-Tenant Fork

```
vitahustle-platform.vercel.app
├── /              → VitaHustle storefront
└── /admin         → VitaHustle admin
```

---

## Troubleshooting

### Fork Creation Fails

**Error**: "Repository already exists"

```bash
# Delete existing repository
gh repo delete {owner}/{repo} --yes

# Re-run create-fork script
./scripts/create-fork.ts {owner} {repo} --tenants {tenants}
```

**Error**: "Vercel project already exists"

```bash
# Delete existing project
vercel projects rm {repo} --yes

# Re-run create-fork script
```

### Tenant Data Import Fails

**Error**: "Database connection failed"

```bash
# Verify Neon integration is added
vercel integrations ls

# If missing, add in Vercel dashboard
# Then pull env vars again
vercel env pull apps/admin/.env.local
```

**Error**: "Schema already exists"

```sql
-- Drop existing schemas
DROP SCHEMA IF EXISTS tenant_meliusly CASCADE;

-- Re-import
psql $NEW_DATABASE_URL -f exports/meliusly-export.sql
```

### Update Merge Conflicts

**Conflict in platform.config.ts**:

```bash
# Keep YOUR tenant configuration
# Accept template's code structure changes

# Example resolution:
git checkout --ours platform.config.ts
git add platform.config.ts
git commit
```

**Conflict in migrations**:

```bash
# Both migrations are usually valid
# Rename to sequential order:
# - Template: 20260303_add_feature.sql
# - Your fork: 20260303_add_tenant_data.sql
# Rename to: 20260304_add_tenant_data.sql
```

---

## Best Practices

### Before Pulling Updates

1. **Backup database**:

   ```bash
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

2. **Test in staging first**:

   ```bash
   # Create staging branch
   git checkout -b staging
   git merge upstream/main
   # Deploy to Vercel preview
   git push origin staging
   ```

3. **Review changes**:
   ```bash
   git log HEAD..upstream/main --oneline
   git diff HEAD..upstream/main
   ```

### After Pulling Updates

1. **Run tests**:

   ```bash
   pnpm test
   pnpm test:e2e
   ```

2. **Verify tenant isolation**:

   ```bash
   pnpm validate:tenant-isolation
   ```

3. **Check deployments**:
   ```bash
   vercel ls
   ```

---

## Support

### Template Updates

Template maintainers push updates to `cgk-platform/cgk-template`.

**Update frequency**: Weekly (bug fixes), Monthly (features)

**Breaking changes**: Announced via GitHub Releases

### Fork-Specific Issues

For issues specific to YOUR fork:

- Database problems → Check Neon dashboard
- Deployment issues → Check Vercel logs
- Tenant data → Verify `platform.config.ts`

For template issues:

- Open issue: https://github.com/cgk-platform/cgk-template/issues

---

## Summary

**Fork workflow** (one-time):

1. Run `create-fork.ts` script
2. Add Vercel integrations (Neon + Upstash)
3. Import tenant data
4. Deploy

**Update workflow** (ongoing):

1. Fetch updates: `git fetch upstream`
2. Merge: `git merge upstream/main`
3. Resolve conflicts (keep YOUR config)
4. Deploy: `git push origin main`

**Result**: WordPress-style self-hosted platform with automatic updates.
