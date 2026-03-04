# Fork Implementation - Ready for Execution Checklist

**Status**: ✅ All automation scripts and documentation complete
**Date**: 2026-03-03
**Ready for**: User to gather credentials and execute

---

## ✅ What's Ready

### Scripts Created

- [x] `scripts/export-tenant.sql` (3.3 KB) - Export tenant data from database
- [x] `scripts/create-fork.ts` (8.9 KB) - Automate GitHub + Vercel fork creation
- [x] `scripts/import-tenant-data.sh` (3.5 KB) - Import tenant data to new database
- [x] `scripts/clean-template-database.sql` (1.9 KB) - Clean template after migration
- [x] `scripts/package.json` - Dependencies for fork scripts (@octokit/rest)

### Documentation Created

- [x] `docs/FORK-WORKFLOW.md` - WordPress-style update workflow guide
- [x] `docs/FORK-EXECUTION-GUIDE.md` - Step-by-step fork creation guide
- [x] `README.md` - Updated with fork workflow section
- [x] `FORK-IMPLEMENTATION-SUMMARY.md` - Complete implementation overview

### Dependencies Installed

- [x] `@octokit/rest` - GitHub API client (installed in scripts/)
- [x] `tsx` - TypeScript execution (already available)
- [x] All script files are executable (chmod +x applied)

---

## 📋 Prerequisites Needed from User

Before execution can begin, user must provide:

### 1. GitHub Personal Access Token

**How to get**:

1. Go to: https://github.com/settings/tokens/new
2. Token name: "CGK Fork Creation"
3. Scopes needed:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `admin:org` (if creating repos in organizations)
4. Click "Generate token"
5. Copy token: `ghp_xxxxxxxxxxxxx`

**Set environment variable**:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
```

### 2. Vercel API Token

**How to get**:

1. Go to: https://vercel.com/account/tokens
2. Token name: "CGK Fork Creation"
3. Scope: Full Account
4. Click "Create"
5. Copy token

**Set environment variable**:

```bash
export VERCEL_TOKEN=xxxxxxxxxxxxx
```

### 3. Current Database Access

**Already have** in `.env.local`:

```bash
cd apps/admin
export DATABASE_URL=$(grep POSTGRES_URL .env.local | cut -d '=' -f2)
```

---

## 🎯 Execution Steps (For User)

### Quick Start

Once credentials are gathered:

```bash
# Step 1: Set credentials
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
export VERCEL_TOKEN=xxxxxxxxxxxxx
export DATABASE_URL=$(grep POSTGRES_URL apps/admin/.env.local | cut -d '=' -f2)

# Step 2: Follow execution guide
open docs/FORK-EXECUTION-GUIDE.md
```

### Detailed Steps

Follow `docs/FORK-EXECUTION-GUIDE.md` which provides:

1. **Fork #1: CGK Unlimited** (multi-tenant)
   - Run `create-fork.ts` script
   - Add Vercel integrations
   - Import tenant data
   - Deploy and verify

2. **Fork #2: VitaHustle** (single-tenant)
   - Same process as Fork #1
   - Single tenant only

3. **Fork #3: Rawdog** (single-tenant)
   - Same process as Fork #1
   - Single tenant only

4. **Clean Template**
   - Run cleanup script
   - Verify no tenant data
   - Mark as template repository

5. **Test Update Workflow**
   - Make test change in template
   - Pull update in forks
   - Verify merge works

---

## 🧪 Testing Before Execution

### Verify Scripts Work

Test the export script (safe to run):

```bash
# Test export for one tenant (doesn't modify database)
psql "$DATABASE_URL" -f scripts/export-tenant.sql -v tenant=meliusly > /tmp/test-export.sql

# Verify export contains data
cat /tmp/test-export.sql | grep "INSERT INTO"
```

### Verify Dependencies

```bash
# Check @octokit/rest is installed
cd scripts && pnpm list @octokit/rest

# Should show: @octokit/rest 21.x.x
```

### Verify Script Executability

```bash
# All scripts should be executable
ls -l scripts/create-fork.ts scripts/import-tenant-data.sh

# Should show: -rwxr-xr-x (executable)
```

---

## 📊 Current Tenant Status

Before fork creation, verify tenants exist:

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

**Tenant schemas**:

```bash
psql "$DATABASE_URL" -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name;"
```

**Expected output**:

```
   schema_name
------------------
 tenant_cgk_linens
 tenant_meliusly
 tenant_rawdog
 tenant_vitahustle
```

---

## 🔍 What the Scripts Do

### `create-fork.ts` (Main Automation)

**Workflow**:

1. ✅ Creates GitHub repository using template API
2. ✅ Exports tenant data from current database
3. ✅ Creates Vercel project with GitHub integration
4. ✅ Generates `platform.config.ts` with tenant configuration
5. ⏸️ **Pauses** - User adds Vercel integrations (Neon + Upstash)
6. ✅ Returns instructions for importing data
7. ✅ Commits configuration and deploys

**Parameters**:

```bash
./scripts/create-fork.ts <owner> <repo-name> --tenants <tenant1,tenant2> [--multi-tenant]
```

**Examples**:

```bash
# Multi-tenant (2 tenants)
./scripts/create-fork.ts cgk-unlimited cgk-platform --tenants meliusly,cgk-linens --multi-tenant

# Single-tenant
./scripts/create-fork.ts vitahustle vitahustle-platform --tenants vitahustle
```

### `export-tenant.sql` (Data Export)

**What it exports**:

- Organization record from `public.organizations`
- All tables from `tenant_<slug>` schema
- Generates SQL INSERT statements

**Usage**:

```bash
psql "$DATABASE_URL" -f scripts/export-tenant.sql -v tenant=meliusly > exports/meliusly-export.sql
```

### `import-tenant-data.sh` (Data Import)

**What it does**:

- Tests database connection
- Imports tenant data
- Verifies import success

**Usage**:

```bash
export NEW_DATABASE_URL=postgres://...
./scripts/import-tenant-data.sh exports/meliusly-export.sql exports/cgk-linens-export.sql
```

### `clean-template-database.sql` (Template Cleanup)

**What it does**:

- Drops all `tenant_*` schemas
- Deletes all organization records
- Verifies cleanup

**Usage**:

```bash
psql "$DATABASE_URL" -f scripts/clean-template-database.sql
```

---

## 🎬 What Happens During Execution

### Timeline (Estimated)

```
Fork #1 (CGK Unlimited): 45 minutes
├── Script execution: 5 min
├── Add Vercel integrations: 10 min
├── Import data: 10 min
├── Deploy: 10 min
└── Verify: 10 min

Fork #2 (VitaHustle): 30 minutes
├── Script execution: 5 min
├── Add integrations: 5 min
├── Import data: 5 min
├── Deploy: 10 min
└── Verify: 5 min

Fork #3 (Rawdog): 30 minutes
├── Script execution: 5 min
├── Add integrations: 5 min
├── Import data: 5 min
├── Deploy: 10 min
└── Verify: 5 min

Template Cleanup: 15 minutes
├── Backup database: 5 min
├── Run cleanup: 2 min
├── Verify: 3 min
└── Mark as template: 5 min

Total: ~2 hours
```

---

## 🚨 Important Notes

### Before Starting

1. **Backup current database** (CRITICAL):

   ```bash
   pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql
   ```

2. **Verify you have access** to create repos in target organizations:
   - cgk-unlimited
   - vitahustle
   - rawdog

3. **Ensure Vercel account has available projects**:
   - Free tier: 3 projects
   - Pro tier: Unlimited

### During Execution

1. **Don't skip the integration step** - Vercel integrations auto-provision databases
2. **Wait for integrations to complete** before pulling env vars
3. **Verify deployments** before moving to next fork
4. **Keep terminal output** for debugging if needed

### After Completion

1. **Document fork URLs** for team reference
2. **Test WordPress-style updates** to ensure workflow works
3. **Share deployment URLs** with stakeholders
4. **Set up monitoring** (Vercel Analytics, Sentry)

---

## 📚 Documentation Map

| Document                         | Purpose                    | When to Read                |
| -------------------------------- | -------------------------- | --------------------------- |
| `FORK-IMPLEMENTATION-SUMMARY.md` | Overview of implementation | Start here                  |
| `docs/FORK-EXECUTION-GUIDE.md`   | Step-by-step execution     | During fork creation        |
| `docs/FORK-WORKFLOW.md`          | WordPress-style updates    | After forks are created     |
| `FORK-READY-CHECKLIST.md`        | Pre-execution checklist    | Before starting (this file) |

---

## ✅ Final Verification

Before executing, verify:

- [ ] All script files exist and are executable
- [ ] Dependencies are installed (`@octokit/rest`)
- [ ] Documentation is complete
- [ ] Current tenants are verified in database
- [ ] You have GitHub + Vercel credentials
- [ ] You understand the 3-fork structure (not 4)
- [ ] You've read `docs/FORK-EXECUTION-GUIDE.md`
- [ ] You've backed up current database

---

## 🚀 Ready to Execute?

**Next steps**:

1. Gather GitHub token: https://github.com/settings/tokens/new
2. Gather Vercel token: https://vercel.com/account/tokens
3. Open execution guide: `docs/FORK-EXECUTION-GUIDE.md`
4. Follow step-by-step instructions

**Support**:

- Execution guide has troubleshooting section
- All scripts have descriptive output
- GitHub/Vercel errors include resolution steps

---

**Everything is ready!** The automation scripts, documentation, and guides are complete. Just need credentials to execute.
