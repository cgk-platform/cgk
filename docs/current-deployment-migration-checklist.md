# Current Deployment Migration Checklist

This checklist guides migrating your CURRENT deployment (CGK Linens + Meliusly) to the WordPress-style fork model.

**IMPORTANT**: This migration **PRESERVES ALL MELIUSLY WORK**. Nothing is deleted. Both brands stay together in your deployment.

## Your Deployment Architecture

```
YOUR COMPANY DEPLOYMENT:
├── Git Repository: /Users/holdenthemic/Documents/cgk (this repo)
├── Vercel Team: cgk-linens-88e79683
├── Database (Neon PostgreSQL)
│   ├── public schema (shared: organizations, users)
│   ├── tenant_cgk_linens schema (CGK Linens data) ✅ PRESERVED
│   └── tenant_meliusly schema (Meliusly data) ✅ PRESERVED
├── Vercel Projects (all 7 apps)
│   ├── cgk-admin
│   ├── cgk-storefront
│   ├── cgk-shopify-app
│   ├── cgk-orchestrator
│   ├── cgk-creator-portal
│   ├── cgk-contractor-portal
│   └── cgk-mcp-server
└── Storefronts
    ├── CGK Linens storefront ✅ PRESERVED
    └── Meliusly storefront (apps/storefront or apps/meliusly-storefront) ✅ PRESERVED
```

**Key Point**: CGK Linens and Meliusly are SISTER COMPANIES. They share the same deployment but have separate tenant schemas for data isolation.

## Migration Overview

**What we're doing**:

1. ✅ Configure current repo to receive platform updates (DONE)
2. ⏳ Set up upstream remote (when cgk-template exists)
3. ⏳ Test update workflow
4. ✅ Preserve ALL Meliusly work (guaranteed by .gitattributes)

**What we're NOT doing**:

- ❌ Deleting Meliusly data
- ❌ Removing Meliusly storefront
- ❌ Changing database schemas
- ❌ Migrating to separate deployments

## Pre-Migration Checklist

### 1. Verify Current State

- [ ] **Check git status is clean**

  ```bash
  git status
  # Should show: "nothing to commit, working tree clean"
  ```

- [ ] **Verify both tenant schemas exist**

  ```bash
  # Connect to database and check schemas
  psql $DATABASE_URL -c "\dn" | grep tenant_
  # Should show:
  #   tenant_cgk_linens
  #   tenant_meliusly
  ```

- [ ] **Verify Meliusly storefront files exist**

  ```bash
  # Check for Meliusly storefront customizations
  ls -la apps/storefront/src/
  # OR check if separate storefront exists
  ls -la apps/meliusly-storefront/ 2>/dev/null || echo "Using shared storefront"
  ```

- [ ] **Document current Meliusly customizations**
  ```bash
  # Create snapshot of Meliusly-specific files
  find apps/storefront -type f -name "*meliusly*" > meliusly-files-backup.txt
  # OR
  find apps/meliusly-storefront -type f > meliusly-files-backup.txt 2>/dev/null
  ```

### 2. Backup Current State

- [ ] **Create git tag for current state**

  ```bash
  git tag pre-fork-migration-$(date +%Y%m%d)
  git push --tags
  ```

- [ ] **Export environment variables**

  ```bash
  cd apps/admin
  vercel env pull .env.backup --scope cgk-linens-88e79683

  cd ../storefront
  vercel env pull .env.backup --scope cgk-linens-88e79683

  # Repeat for all apps
  ```

- [ ] **Backup database (optional but recommended)**
  ```bash
  # Export both tenant schemas
  pg_dump $DATABASE_URL --schema=tenant_cgk_linens > backup-cgk-linens.sql
  pg_dump $DATABASE_URL --schema=tenant_meliusly > backup-meliusly.sql
  ```

## Migration Steps

### Step 1: Configure Git Merge Drivers (✅ DONE)

- [x] **Run setup script**

  ```bash
  ./scripts/setup-git-merge-drivers.sh
  ```

- [x] **Verify configuration**

  ```bash
  git config --get merge.ours.driver
  # Should output: true

  git config --get merge.union.driver
  # Should output: git merge-file --union %A %O %B
  ```

### Step 2: Verify .gitattributes Protections (✅ DONE)

- [x] **Check storefront is protected**

  ```bash
  grep "apps/storefront" .gitattributes
  # Should show: apps/storefront/src/** merge=ours
  ```

- [x] **Check platform.config.ts is protected**
  ```bash
  grep "platform.config.ts" .gitattributes
  # Should show: platform.config.ts merge=ours
  ```

### Step 3: Create Brand Configuration Files (✅ DONE)

- [x] **Verify platform.config.ts exists**

  ```bash
  ls -la platform.config.ts
  # File created with CGK Linens + Meliusly config
  ```

- [x] **Review configuration**
  ```bash
  cat platform.config.ts | grep -A 5 "tenants:"
  # Should show both CGK Linens and Meliusly
  ```

### Step 4: Set Up Upstream Remote (⏳ PENDING)

**Note**: This step requires cgk-template repository to exist first.

- [ ] **Add upstream remote**

  ```bash
  git remote add upstream https://github.com/cgk-platform/cgk-template.git
  ```

- [ ] **Verify remote added**

  ```bash
  git remote -v
  # Should show:
  #   origin    <current-repo> (fetch/push)
  #   upstream  https://github.com/cgk-platform/cgk-template.git (fetch)
  ```

- [ ] **Fetch from upstream**
  ```bash
  git fetch upstream
  git fetch --tags upstream
  ```

### Step 5: Test Merge Strategy (⏳ PENDING)

- [ ] **Create test branch**

  ```bash
  git checkout -b test-merge-protection
  ```

- [ ] **Simulate platform update**

  ```bash
  # This will test that Meliusly customizations are protected
  git merge upstream/main --no-commit --no-ff
  ```

- [ ] **Verify storefront unchanged**

  ```bash
  git diff --cached apps/storefront/
  # Should show NO changes (protected by merge=ours)
  ```

- [ ] **Verify platform packages updated**

  ```bash
  git diff --cached packages/
  # Should show upstream changes (merged normally)
  ```

- [ ] **Abort test merge**
  ```bash
  git merge --abort
  git checkout main
  git branch -D test-merge-protection
  ```

### Step 6: Update Documentation

- [ ] **Update README.md to reference fork model**

  ```bash
  # Add section about upstream updates
  # Mention both CGK Linens and Meliusly brands
  ```

- [ ] **Create .github/CODEOWNERS (optional)**

  ```
  # Platform packages - CGK Platform team
  packages/** @cgk-platform/core-team

  # Storefronts - Your team
  apps/storefront/** @your-team
  apps/meliusly-storefront/** @your-team

  # Platform apps - CGK Platform team
  apps/admin/** @cgk-platform/core-team
  apps/orchestrator/** @cgk-platform/core-team
  ```

## Post-Migration Verification

### Verify Meliusly Data Intact

- [ ] **Check database schemas**

  ```bash
  psql $DATABASE_URL -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'"
  # Should show both tenant_cgk_linens and tenant_meliusly
  ```

- [ ] **Check Meliusly storefront files**

  ```bash
  diff meliusly-files-backup.txt <(find apps/storefront -type f -name "*meliusly*")
  # Should show NO differences (all files preserved)
  ```

- [ ] **Test Meliusly storefront locally**

  ```bash
  cd apps/storefront
  pnpm dev
  # Visit http://localhost:3000
  # Verify Meliusly branding, products, customizations all work
  ```

- [ ] **Test CGK Linens storefront locally**
  ```bash
  # If separate storefront
  cd apps/cgk-storefront
  pnpm dev
  ```

### Verify Deployment Still Works

- [ ] **Type check passes**

  ```bash
  pnpm turbo typecheck
  ```

- [ ] **Apps build successfully**

  ```bash
  cd apps/admin && pnpm build
  cd apps/storefront && pnpm build
  cd apps/creator-portal && pnpm build
  cd apps/contractor-portal && pnpm build
  ```

- [ ] **Vercel deployments working**
  ```bash
  # Check all 7 projects are deployed
  vercel project ls --scope cgk-linens-88e79683
  ```

## Rollback Procedure (If Needed)

If something goes wrong, you can rollback:

### Option A: Restore from Git Tag

```bash
# Find your backup tag
git tag | grep pre-fork-migration

# Reset to backup
git reset --hard pre-fork-migration-YYYYMMDD

# Force push (careful!)
git push --force
```

### Option B: Restore from Database Backup

```bash
# Restore CGK Linens schema
psql $DATABASE_URL < backup-cgk-linens.sql

# Restore Meliusly schema
psql $DATABASE_URL < backup-meliusly.sql
```

### Option C: Restore Environment Variables

```bash
# Restore from backup
cd apps/admin
cp .env.backup .env.local

cd ../storefront
cp .env.backup .env.local

# Push to Vercel
vercel env add VAR_NAME production --scope cgk-linens-88e79683 < .env.backup
```

## Success Criteria

Migration is successful when:

- [x] Git merge drivers configured (merge.ours, merge.union)
- [x] .gitattributes protecting storefront customizations
- [x] platform.config.ts defines both brands
- [ ] Upstream remote added (when template exists)
- [ ] Test merge shows storefront protected
- [ ] Both tenant schemas exist in database
- [ ] Meliusly storefront files unchanged
- [ ] All apps build and deploy successfully
- [ ] No data loss or corruption

## Common Questions

### Q: Will platform updates overwrite my Meliusly customizations?

**A**: No! The .gitattributes file marks all storefront files with `merge=ours`, which means your version always wins. Platform updates to packages, admin, orchestrator will merge normally, but your storefront customizations are protected.

### Q: Do I need to separate CGK Linens and Meliusly into different deployments?

**A**: No! The WordPress-style model supports multiple brands per deployment (multi-tenant). Your current setup with both brands in one deployment is perfect and will continue working.

### Q: What if I want to add a third brand later?

**A**: Easy! Just:

1. Provision new tenant schema: `npx @cgk-platform/cli tenant:create brand3`
2. Add to platform.config.ts tenants array
3. Create storefront for brand3 (or use shared with tenant switching)

### Q: Can I still customize the admin/orchestrator apps?

**A**: You can, but be careful. These are platform-managed apps that receive updates. If you must customize:

1. Add your changes to `apps/admin/public/**` (protected by merge=ours)
2. Or fork those apps to separate directories
3. Best practice: Use theming/config rather than code changes

## Next Steps After Migration

1. **Test platform updates**:

   ```bash
   npx @cgk-platform/cli update-platform --dry-run
   ```

2. **Set up automated workflows** (optional):
   - GitHub Action to auto-fetch upstream tags
   - Slack notifications for new platform versions
   - Staging deployment for testing updates

3. **Document your customizations**:
   - Create `docs/brand/meliusly-customizations.md`
   - List all Meliusly-specific features
   - Note which files are customized

4. **Train your team**:
   - Share platform update guide
   - Explain merge strategy
   - Set up review process for updates

## Support

If you encounter issues:

1. **Check logs**: Review git merge output for conflicts
2. **Review docs**: See `docs/platform-update-guide.md`
3. **Test in branch**: Always test updates in a branch first
4. **Rollback if needed**: Use git tags to restore previous state

**Remember**: ALL Meliusly work is preserved. The fork model is additive (pulls updates) not destructive (removes customizations).
