# WordPress-Style Fork Implementation - Summary

**Status**: ✅ Ready for Execution
**Created**: 2026-03-03
**Implementation Plan**: Corrected based on user clarification

---

## What Was Built

### 1. Scripts (Automation)

| Script                        | Purpose                                 | Location                              |
| ----------------------------- | --------------------------------------- | ------------------------------------- |
| `export-tenant.sql`           | Export single tenant data from database | `scripts/export-tenant.sql`           |
| `create-fork.ts`              | Automate GitHub + Vercel fork creation  | `scripts/create-fork.ts`              |
| `import-tenant-data.sh`       | Import tenant data to new database      | `scripts/import-tenant-data.sh`       |
| `clean-template-database.sql` | Remove all tenant data from template    | `scripts/clean-template-database.sql` |

### 2. Documentation

| Document            | Purpose                         | Location                       |
| ------------------- | ------------------------------- | ------------------------------ |
| Fork Workflow Guide | WordPress-style update workflow | `docs/FORK-WORKFLOW.md`        |
| Execution Guide     | Step-by-step fork creation      | `docs/FORK-EXECUTION-GUIDE.md` |
| Updated README      | Added fork workflow section     | `README.md`                    |

### 3. Dependencies

Added `@octokit/rest` for GitHub API integration:

- Created `scripts/package.json`
- Installed dependencies with `pnpm install`

---

## Architecture Clarification

### Corrected Fork Structure (3 Forks, Not 4)

**User clarification**: "Meliusly and CGK Linens should be in their own fork as tenants, they are part of CGK Unlimited which is a parent company"

#### Fork #1: cgk-unlimited/cgk-platform (Multi-Tenant)

- **Parent Company**: CGK Unlimited
- **Tenants**:
  - Meliusly (brand #1)
  - CGK Linens (brand #2)
- **Mode**: Multi-tenant
- **Deployment**: Single Vercel project with 2 tenant schemas

#### Fork #2: vitahustle/vitahustle-platform (Single-Tenant)

- **Company**: VitaHustle (separate company)
- **Tenants**: VitaHustle (only)
- **Mode**: Single-tenant
- **Deployment**: Single Vercel project with 1 tenant schema

#### Fork #3: rawdog/rawdog-commerce (Single-Tenant)

- **Company**: Rawdog (separate company)
- **Tenants**: Rawdog (only)
- **Mode**: Single-tenant
- **Deployment**: Single Vercel project with 1 tenant schema

---

## What Each Fork Gets

### Infrastructure (Self-Hosted)

Each fork owns its own infrastructure:

```
Fork Infrastructure
├── GitHub Repository (fork of cgk-platform/cgk-template)
├── Vercel Project (single project, 8 apps via path routing)
├── Neon PostgreSQL Database (with tenant schemas)
├── Upstash Redis Cache
└── Vercel Blob Storage
```

### Configuration

Each fork has its own `platform.config.ts`:

**Multi-tenant example** (cgk-unlimited):

```typescript
export const platformConfig = defineConfig({
  deployment: {
    name: 'CGK Unlimited',
    mode: 'multi-tenant',
  },
  tenants: [
    { slug: 'meliusly', name: 'Meliusly', ... },
    { slug: 'cgk-linens', name: 'CGK Linens', ... },
  ],
})
```

**Single-tenant example** (vitahustle):

```typescript
export const platformConfig = defineConfig({
  deployment: {
    name: 'VitaHustle',
    mode: 'single-tenant',
  },
  tenants: [
    { slug: 'vitahustle', name: 'VitaHustle', ... },
  ],
})
```

---

## WordPress-Style Update Flow

### Template Repository (cgk-platform/cgk-template)

**You (developer) push updates**:

```bash
cd cgk-platform/cgk-template
git commit -m "feat: add new feature"
git push origin main
```

### Forks Pull and Merge

**Each fork pulls updates**:

```bash
cd cgk-unlimited/cgk-platform
git fetch upstream
git merge upstream/main
git push origin main  # Auto-deploys to Vercel
```

**Conflict resolution**:

- Keep YOUR `platform.config.ts` tenant configuration
- Accept template's code changes
- Merge database migrations (both are usually valid)

---

## Execution Checklist

### Prerequisites (Before Starting)

- [ ] GitHub Personal Access Token (with `repo` scope)
- [ ] Vercel API Token
- [ ] Current database access (`DATABASE_URL`)
- [ ] Verified current tenants exist

### Fork Creation (Main Work)

- [ ] Fork #1: CGK Unlimited (multi-tenant: meliusly + cgk-linens)
  - [ ] Run `create-fork.ts` script
  - [ ] Add Vercel integrations (Neon + Upstash)
  - [ ] Import tenant data
  - [ ] Deploy and verify

- [ ] Fork #2: VitaHustle (single-tenant: vitahustle)
  - [ ] Run `create-fork.ts` script
  - [ ] Add Vercel integrations
  - [ ] Import tenant data
  - [ ] Deploy and verify

- [ ] Fork #3: Rawdog (single-tenant: rawdog)
  - [ ] Run `create-fork.ts` script
  - [ ] Add Vercel integrations
  - [ ] Import tenant data
  - [ ] Deploy and verify

### Template Cleanup (After Forks)

- [ ] Backup current database
- [ ] Run `clean-template-database.sql`
- [ ] Verify no tenant data remains
- [ ] Mark repository as "Template repository" in GitHub

### Verification (Final)

- [ ] Test all fork deployments
- [ ] Test WordPress-style update workflow
- [ ] Document fork URLs
- [ ] Share with stakeholders

---

## How to Execute

### Option 1: Automated (Recommended)

Follow the step-by-step guide:

```
docs/FORK-EXECUTION-GUIDE.md
```

**Time estimate**: 2.5 hours total

### Option 2: Manual

If automation fails, manual process:

1. Use GitHub "Use this template" button
2. Create Vercel project manually
3. Add integrations in Vercel dashboard
4. Export/import tenant data manually
5. Deploy

**Time estimate**: 6-8 hours total

---

## Scripts Usage

### Create a Fork

```bash
# Set environment variables
export GITHUB_TOKEN=ghp_xxxxx
export VERCEL_TOKEN=xxxxx
export DATABASE_URL=postgres://...

# Multi-tenant fork
./scripts/create-fork.ts cgk-unlimited cgk-platform \
  --tenants meliusly,cgk-linens \
  --multi-tenant

# Single-tenant fork
./scripts/create-fork.ts vitahustle vitahustle-platform \
  --tenants vitahustle
```

### Import Tenant Data

```bash
export NEW_DATABASE_URL=postgres://...

./scripts/import-tenant-data.sh \
  exports/meliusly-export.sql \
  exports/cgk-linens-export.sql
```

### Clean Template

```bash
psql "$DATABASE_URL" -f scripts/clean-template-database.sql
```

---

## Key Differences from Original Plan

### What Changed

**Original plan** (incorrect):

- 4 separate forks (meliusly, cgk-linens, vitahustle, rawdog)
- Each brand gets its own fork

**Corrected plan** (based on user clarification):

- 3 forks total
- cgk-unlimited fork contains BOTH meliusly + cgk-linens (they're part of same parent company)
- vitahustle and rawdog are separate single-tenant forks

### Why This Matters

**Multi-tenant architecture** (cgk-unlimited):

- Shared Vercel project
- Shared database (separate schemas)
- Single deployment with tenant routing
- Cost-effective for parent company managing multiple brands

**Single-tenant architecture** (vitahustle, rawdog):

- Dedicated infrastructure per company
- Full isolation
- Simpler configuration

---

## Success Criteria

After implementation, you should have:

1. **Template repository** (cgk-platform/cgk-template)
   - Clean, no tenant data
   - Marked as "Template repository"
   - Ready for others to fork

2. **Fork #1** (cgk-unlimited/cgk-platform)
   - Multi-tenant: meliusly + cgk-linens
   - Deployed and accessible
   - Can pull updates from template

3. **Fork #2** (vitahustle/vitahustle-platform)
   - Single-tenant: vitahustle
   - Deployed and accessible
   - Can pull updates from template

4. **Fork #3** (rawdog/rawdog-commerce)
   - Single-tenant: rawdog
   - Deployed and accessible
   - Can pull updates from template

---

## Next Steps

1. **Review execution guide**: Read `docs/FORK-EXECUTION-GUIDE.md`
2. **Gather credentials**: GitHub token, Vercel token, database access
3. **Execute fork creation**: Follow guide step-by-step
4. **Verify deployments**: Test all 3 forks
5. **Test update workflow**: Make a test change and verify forks can pull it

---

## Support

If you encounter issues:

1. **Check troubleshooting section** in `docs/FORK-EXECUTION-GUIDE.md`
2. **Review script output** for specific error messages
3. **Verify credentials** are correctly set
4. **Check Vercel logs** if deployment fails

---

## Files to Review

Before executing:

1. `docs/FORK-EXECUTION-GUIDE.md` - Step-by-step execution
2. `docs/FORK-WORKFLOW.md` - WordPress-style update workflow
3. `scripts/create-fork.ts` - Fork creation automation
4. `README.md` - Updated with fork workflow section

---

**Ready to execute?** Start with the execution guide and gather your credentials.

Mr. Tinkleberry, the WordPress-style fork implementation is ready! All scripts, documentation, and guides are in place. The key correction from your clarification is that we're creating **3 forks** (not 4), with cgk-unlimited/cgk-platform being a **multi-tenant fork** containing both Meliusly and CGK Linens as separate tenants.
