# Fork Execution Guide

This guide walks through the actual execution of creating the 3 WordPress-style forks.

---

## Prerequisites

Before starting, gather these credentials:

### 1. GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens/new
2. Token name: "CGK Fork Creation"
3. Scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `admin:org` (if creating in organizations)
4. Click "Generate token"
5. Copy token: `ghp_xxxxxxxxxxxxx`

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
```

### 2. Vercel API Token

1. Go to: https://vercel.com/account/tokens
2. Token name: "CGK Fork Creation"
3. Scope: Full Account
4. Click "Create"
5. Copy token

```bash
export VERCEL_TOKEN=xxxxxxxxxxxxx
```

### 3. Database Access

Get current database URL from `.env.local`:

```bash
cd apps/admin
export DATABASE_URL=$(grep POSTGRES_URL .env.local | cut -d '=' -f2)
```

### 4. Verify Current Tenants

Check which tenants exist in current database:

```bash
psql "$DATABASE_URL" -c "SELECT slug, name FROM public.organizations ORDER BY slug;"
```

**Expected output**:

```
     slug     |    name
--------------+-------------
 cgk-linens   | CGK Linens
 meliusly     | Meliusly
 rawdog       | Rawdog
 vitahustle   | VitaHustle
```

---

## Execution Plan

We'll create 3 forks in this order:

1. **cgk-unlimited/cgk-platform** - Multi-tenant (meliusly + cgk-linens)
2. **vitahustle/vitahustle-platform** - Single-tenant (vitahustle)
3. **rawdog/rawdog-commerce** - Single-tenant (rawdog)

---

## Fork #1: CGK Unlimited (Multi-Tenant)

### Step 1: Run Fork Creation Script

```bash
cd /Users/holdenthemic/Documents/cgk

./scripts/create-fork.ts cgk-unlimited cgk-platform \
  --tenants meliusly,cgk-linens \
  --multi-tenant
```

**What happens:**

- ✅ Creates GitHub repo: `cgk-unlimited/cgk-platform`
- ✅ Exports tenant data: `exports/meliusly-export.sql`, `exports/cgk-linens-export.sql`
- ✅ Creates Vercel project: `cgk-platform`
- ✅ Generates `platform.config.ts`
- ⏸️ **Pauses** - Waiting for you to add integrations

**Expected output:**

```
🎯 Fork Configuration
────────────────────
Owner:        cgk-unlimited
Repository:   cgk-platform
Tenants:      meliusly, cgk-linens
Multi-tenant: true

📦 Creating GitHub repository: cgk-unlimited/cgk-platform
✅ Repository created: https://github.com/cgk-unlimited/cgk-platform

📤 Exporting tenant data: meliusly
✅ Tenant data exported: /Users/holdenthemic/Documents/cgk/exports/meliusly-export.sql

📤 Exporting tenant data: cgk-linens
✅ Tenant data exported: /Users/holdenthemic/Documents/cgk/exports/cgk-linens-export.sql

🚀 Creating Vercel project: cgk-platform
✅ Vercel project created: cgk-platform
   URL: https://cgk-platform.vercel.app

⚙️  Generating platform.config.ts
✅ platform.config.ts generated

✅ Fork created successfully!

Next steps:
───────────
1. Add Vercel integrations:
   - Go to: https://vercel.com/cgk-unlimited/cgk-platform/settings/integrations
   - Add: Neon Postgres
   - Add: Upstash Redis
   - Add: Vercel Blob
```

### Step 2: Add Vercel Integrations

1. Open: https://vercel.com/cgk-unlimited/cgk-platform/settings/integrations

2. Add **Neon Postgres**:
   - Click "Add Integration"
   - Select "Neon Postgres"
   - Follow prompts
   - ✅ Wait for database to provision (~1 minute)

3. Add **Upstash Redis**:
   - Click "Add Integration"
   - Select "Upstash Redis"
   - Follow prompts
   - ✅ Wait for cache to provision (~30 seconds)

4. Add **Vercel Blob**:
   - Click "Add Integration"
   - Select "Vercel Blob"
   - Follow prompts

### Step 3: Pull Environment Variables

```bash
cd cgk-unlimited-cgk-platform  # Or wherever you cloned the fork
vercel link  # Link to cgk-unlimited/cgk-platform project
vercel env pull apps/admin/.env.local
```

**Verify variables exist:**

```bash
grep POSTGRES_URL apps/admin/.env.local
grep REDIS_URL apps/admin/.env.local
grep BLOB_READ_WRITE_TOKEN apps/admin/.env.local
```

### Step 4: Import Tenant Data

```bash
export NEW_DATABASE_URL=$(grep POSTGRES_URL apps/admin/.env.local | cut -d '=' -f2)

./scripts/import-tenant-data.sh \
  exports/meliusly-export.sql \
  exports/cgk-linens-export.sql
```

**Expected output:**

```
╔════════════════════════════════════════╗
║  Tenant Data Import                    ║
╚════════════════════════════════════════╝

🔍 Testing database connection...
✅ Database connection successful

────────────────────────────────────────
📥 Importing tenant: meliusly
────────────────────────────────────────
✅ Successfully imported meliusly

────────────────────────────────────────
📥 Importing tenant: cgk-linens
────────────────────────────────────────
✅ Successfully imported cgk-linens

────────────────────────────────────────
🔍 Verifying import...
────────────────────────────────────────
Organizations:
     slug     |    name
--------------+-------------
 cgk-linens   | CGK Linens
 meliusly     | Meliusly

Tenant schemas:
   schema_name
------------------
 tenant_cgk_linens
 tenant_meliusly

✅ Import complete!
```

### Step 5: Deploy

```bash
git add platform.config.ts
git commit -m "feat: configure CGK Unlimited deployment"
git push origin main
```

**Wait for deployment** (~3-5 minutes)

**Verify deployment:**

- Open: https://cgk-platform.vercel.app
- Test: https://cgk-platform.vercel.app/?tenant=meliusly
- Test: https://cgk-platform.vercel.app/?tenant=cgk-linens

### Step 6: Verify Admin Access

```bash
# Test admin for each tenant
curl https://cgk-platform.vercel.app/admin?tenant=meliusly
curl https://cgk-platform.vercel.app/admin?tenant=cgk-linens
```

**✅ Fork #1 Complete!**

---

## Fork #2: VitaHustle (Single-Tenant)

### Step 1: Run Fork Creation Script

```bash
cd /Users/holdenthemic/Documents/cgk

./scripts/create-fork.ts vitahustle vitahustle-platform \
  --tenants vitahustle
```

### Step 2: Add Vercel Integrations

1. Open: https://vercel.com/vitahustle/vitahustle-platform/settings/integrations
2. Add: Neon Postgres
3. Add: Upstash Redis
4. Add: Vercel Blob

### Step 3: Pull Environment Variables

```bash
cd vitahustle-vitahustle-platform
vercel link
vercel env pull apps/admin/.env.local
```

### Step 4: Import Tenant Data

```bash
export NEW_DATABASE_URL=$(grep POSTGRES_URL apps/admin/.env.local | cut -d '=' -f2)

./scripts/import-tenant-data.sh exports/vitahustle-export.sql
```

### Step 5: Deploy

```bash
git add platform.config.ts
git commit -m "feat: configure VitaHustle deployment"
git push origin main
```

### Step 6: Verify Deployment

- Open: https://vitahustle-platform.vercel.app
- Test: https://vitahustle-platform.vercel.app/admin

**✅ Fork #2 Complete!**

---

## Fork #3: Rawdog (Single-Tenant)

### Step 1: Run Fork Creation Script

```bash
cd /Users/holdenthemic/Documents/cgk

./scripts/create-fork.ts rawdog rawdog-commerce \
  --tenants rawdog
```

### Step 2: Add Vercel Integrations

1. Open: https://vercel.com/rawdog/rawdog-commerce/settings/integrations
2. Add: Neon Postgres
3. Add: Upstash Redis
4. Add: Vercel Blob

### Step 3: Pull Environment Variables

```bash
cd rawdog-rawdog-commerce
vercel link
vercel env pull apps/admin/.env.local
```

### Step 4: Import Tenant Data

```bash
export NEW_DATABASE_URL=$(grep POSTGRES_URL apps/admin/.env.local | cut -d '=' -f2)

./scripts/import-tenant-data.sh exports/rawdog-export.sql
```

### Step 5: Deploy

```bash
git add platform.config.ts
git commit -m "feat: configure Rawdog deployment"
git push origin main
```

### Step 6: Verify Deployment

- Open: https://rawdog-commerce.vercel.app
- Test: https://rawdog-commerce.vercel.app/admin

**✅ Fork #3 Complete!**

---

## Clean Template Repository

After all forks are created and verified, clean the template:

### Step 1: Backup Current Database

```bash
cd /Users/holdenthemic/Documents/cgk

pg_dump "$DATABASE_URL" > template-backup-$(date +%Y%m%d).sql
```

### Step 2: Run Cleanup Script

```bash
psql "$DATABASE_URL" -f scripts/clean-template-database.sql
```

**Expected output:**

```
-- ============================================
-- Template Database Cleanup
-- Started: 2026-03-03 ...
-- ============================================

-- Dropping tenant schemas...
NOTICE: Dropping schema: tenant_cgk_linens
NOTICE: Dropping schema: tenant_meliusly
NOTICE: Dropping schema: tenant_rawdog
NOTICE: Dropping schema: tenant_vitahustle

-- Deleting organization records...

-- Verification
-- Organizations remaining:
 organization_count
--------------------
                  0

-- Tenant schemas remaining:
 tenant_schema_count
---------------------
                   0

-- Cleanup complete
-- Finished: 2026-03-03 ...

✅ Template database cleaned successfully
```

### Step 3: Verify Clean State

```bash
# Should return 0 rows
psql "$DATABASE_URL" -c "SELECT * FROM public.organizations;"

# Should return empty list (no tenant_* schemas)
psql "$DATABASE_URL" -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';"
```

### Step 4: Mark as Template Repository

1. Go to: https://github.com/cgk-platform/cgk/settings
2. Scroll to "Template repository"
3. ✅ Check "Template repository"
4. Click "Save"

**✅ Template cleaned!**

---

## Verification Checklist

### Template Repository (cgk-platform/cgk)

- [ ] Marked as "Template repository" in GitHub settings
- [ ] Database has 0 organizations: `SELECT COUNT(*) FROM public.organizations;` → 0
- [ ] Database has 0 tenant schemas
- [ ] README has "Use this template" button
- [ ] Has Vercel deploy button with integrations

### Fork #1: CGK Unlimited

- [ ] GitHub repo: https://github.com/cgk-unlimited/cgk-platform
- [ ] Vercel project: https://vercel.com/cgk-unlimited/cgk-platform
- [ ] Database has 2 tenants: meliusly + cgk-linens
- [ ] `platform.config.ts` has `mode: 'multi-tenant'`
- [ ] Deployment works: https://cgk-platform.vercel.app/?tenant=meliusly
- [ ] Deployment works: https://cgk-platform.vercel.app/?tenant=cgk-linens
- [ ] Admin works: https://cgk-platform.vercel.app/admin?tenant=meliusly

### Fork #2: VitaHustle

- [ ] GitHub repo: https://github.com/vitahustle/vitahustle-platform
- [ ] Vercel project: https://vercel.com/vitahustle/vitahustle-platform
- [ ] Database has 1 tenant: vitahustle
- [ ] `platform.config.ts` has `mode: 'single-tenant'`
- [ ] Deployment works: https://vitahustle-platform.vercel.app
- [ ] Admin works: https://vitahustle-platform.vercel.app/admin

### Fork #3: Rawdog

- [ ] GitHub repo: https://github.com/rawdog/rawdog-commerce
- [ ] Vercel project: https://vercel.com/rawdog/rawdog-commerce
- [ ] Database has 1 tenant: rawdog
- [ ] `platform.config.ts` has `mode: 'single-tenant'`
- [ ] Deployment works: https://rawdog-commerce.vercel.app
- [ ] Admin works: https://rawdog-commerce.vercel.app/admin

---

## Testing WordPress-Style Updates

After all forks are created, test the update workflow:

### Step 1: Make a Change in Template

```bash
cd /Users/holdenthemic/Documents/cgk

# Add a test file
echo "# Test Update" > TEST-UPDATE.md
git add TEST-UPDATE.md
git commit -m "test: WordPress-style update workflow"
git push origin main
```

### Step 2: Pull Update in Fork #1 (CGK Unlimited)

```bash
cd cgk-unlimited-cgk-platform

# Add upstream remote (one-time)
git remote add upstream https://github.com/cgk-platform/cgk

# Fetch and merge
git fetch upstream
git merge upstream/main

# Should see TEST-UPDATE.md added
git log -1

# Push to deploy
git push origin main
```

### Step 3: Verify Update Deployed

Wait for Vercel deployment (~2-3 minutes)

```bash
# Test file exists in deployment
curl https://cgk-platform.vercel.app/TEST-UPDATE.md
```

**✅ WordPress-style updates work!**

---

## Troubleshooting

### Fork Creation Fails

**Error**: "Repository already exists"

```bash
# Delete and retry
gh repo delete cgk-unlimited/cgk-platform --yes
./scripts/create-fork.ts cgk-unlimited cgk-platform --tenants meliusly,cgk-linens --multi-tenant
```

**Error**: "Vercel project already exists"

```bash
# Delete and retry
vercel projects rm cgk-platform --yes
./scripts/create-fork.ts cgk-unlimited cgk-platform --tenants meliusly,cgk-linens --multi-tenant
```

### Tenant Import Fails

**Error**: "Database connection failed"

```bash
# Check Neon integration is added
vercel integrations ls

# If missing, add in dashboard
# Then re-pull env vars
vercel env pull apps/admin/.env.local
```

**Error**: "Schema already exists"

```sql
-- Drop and reimport
DROP SCHEMA IF EXISTS tenant_meliusly CASCADE;
psql $NEW_DATABASE_URL -f exports/meliusly-export.sql
```

### Deployment Fails

**Check build logs:**

```bash
vercel logs
```

**Common issues:**

- Missing environment variables → Add in Vercel dashboard
- TypeScript errors → Run `pnpm typecheck` locally
- Database connection → Verify `DATABASE_URL` is set

---

## Timeline

**Estimated time for all 3 forks** (with automation):

- Fork #1 (CGK Unlimited): 45 minutes
- Fork #2 (VitaHustle): 30 minutes
- Fork #3 (Rawdog): 30 minutes
- Template cleanup: 15 minutes
- Verification: 30 minutes

**Total**: ~2.5 hours

---

## Next Steps

After all forks are created:

1. **Document fork URLs** in project management tool
2. **Share deployment URLs** with stakeholders
3. **Set up custom domains** (optional)
4. **Configure monitoring** (Vercel Analytics, Sentry)
5. **Schedule regular updates** from template (weekly/monthly)

---

## Support

For issues during fork creation:

- **GitHub issues**: https://github.com/cgk-platform/cgk/issues
- **Vercel support**: https://vercel.com/support
- **Neon support**: https://neon.tech/docs

---

**Ready to begin?** Start with Fork #1: CGK Unlimited
