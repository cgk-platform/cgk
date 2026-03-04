# CGK Platform Update Guide

> **Last Updated**: 2026-03-03
> **Audience**: CGK platform users managing their own instances

---

## Overview

The CGK platform is designed as a **template-based system** where each business gets their own codebase instance. Platform updates are distributed through Git and applied selectively using merge strategies.

This guide covers how to safely update your platform instance while preserving your customizations.

---

## 1. Understanding Platform Updates

### Semantic Versioning

The CGK platform follows [semantic versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH (e.g., 2.1.3)
```

| Type  | Example | What Changes                       | Risk Level | Testing Required        |
| ----- | ------- | ---------------------------------- | ---------- | ----------------------- |
| PATCH | 2.1.3   | Bug fixes, security patches        | Low        | Type check + smoke test |
| MINOR | 2.2.0   | New features, non-breaking changes | Medium     | Full local testing      |
| MAJOR | 3.0.0   | Breaking changes, API changes      | High       | Staging + full QA       |

### What Gets Updated vs Protected

The platform uses `.gitattributes` merge strategies to protect your customizations:

```gitattributes
# Protected files (your changes always win)
apps/*/app.config.ts merge=ours
apps/*/.env.local merge=ours
apps/*/.env.*.local merge=ours
apps/*/public/* merge=ours

# Platform files (platform changes usually win)
packages/** merge=theirs
.claude/** merge=theirs

# Merged files (requires manual review)
apps/**/package.json merge=union
```

**Protected (Your Changes Win)**:

- App-specific configuration (`app.config.ts`)
- Environment variables (`.env.local`, `.env.*.local`)
- Public assets (logos, images, fonts)
- Tenant-specific customizations

**Platform-Managed (Platform Changes Win)**:

- Shared packages (`packages/*`)
- CLI tools (`.claude/skills/`)
- Core utilities and types

**Requires Review**:

- `package.json` dependencies (merged with union strategy)
- Database migrations (append-only, may need ordering)
- Custom code in `apps/*` (case-by-case basis)

### How .gitattributes Works

```bash
# When you run update, Git uses these strategies:
merge=ours    # Keep your version, ignore platform changes
merge=theirs  # Take platform version, discard your changes
merge=union   # Combine both (line-by-line append)
```

**Example**:

```bash
# Platform adds new env var to .env.example
# You have custom vars in .env.local
# Result: Your .env.local is untouched (merge=ours)
```

---

## 2. Checking for Updates

### Using the CLI (Recommended)

```bash
# Check what would be updated (dry run)
npx @cgk-platform/cli update:platform --dry-run

# Example output:
# ✓ Connected to platform repository
# ✓ Available updates found
#
# Current version: 2.1.2
# Latest version:  2.2.0 (minor update)
#
# Changes in this update:
# - 14 files changed in packages/
# - 2 new migrations added
# - 3 security patches applied
#
# Protected files (will not be overwritten):
# - apps/admin/app.config.ts
# - apps/storefront/.env.local
#
# Files requiring review:
# - apps/admin/package.json (dependency updates)
# - packages/db/migrations/0043_add_analytics.sql (new migration)
#
# Run without --dry-run to apply updates
```

### Reading Changelogs

Before applying updates, always review the changelog:

```bash
# View changelog for specific version
npx @cgk-platform/cli update:platform --changelog 2.2.0

# View all unreleased changes
npx @cgk-platform/cli update:platform --changelog
```

**What to Look For**:

- Breaking changes (MAJOR version)
- New dependencies requiring environment variables
- Database migrations requiring manual steps
- Deprecated features you might be using

---

## 3. Applying Updates

### Method 1: CLI Command (Recommended)

```bash
# Step 1: Check for updates
npx @cgk-platform/cli update:platform --dry-run

# Step 2: Create backup branch
git checkout -b backup-pre-update-$(date +%Y%m%d)
git push origin backup-pre-update-$(date +%Y%m%d)

# Step 3: Return to main and apply update
git checkout main
npx @cgk-platform/cli update:platform

# Step 4: Review changes
git status
git diff HEAD~1

# Step 5: Test locally (see Testing section)
pnpm turbo typecheck
pnpm dev

# Step 6: Commit if successful
git add .
git commit -m "chore: update platform to v2.2.0"
git push origin main
```

### Method 2: Manual Git Merge (Advanced)

```bash
# Step 1: Add platform remote (one-time setup)
git remote add platform https://github.com/cgk-platform/cgk-platform.git
git fetch platform

# Step 2: Create update branch
git checkout -b platform-update-2.2.0

# Step 3: Merge platform changes
git merge platform/main --allow-unrelated-histories

# Step 4: Resolve conflicts (see Resolving Conflicts)
# ... resolve conflicts ...

# Step 5: Test and commit
pnpm turbo typecheck
git add .
git commit -m "chore: merge platform updates to v2.2.0"

# Step 6: Merge to main
git checkout main
git merge platform-update-2.2.0
git push origin main
```

### Resolving Conflicts

#### Conflict in Migration Files

**Scenario**: Platform adds migration `0043_add_analytics.sql`, you added `0043_add_custom_fields.sql`

```bash
# Step 1: Rename your migration to next available number
mv packages/db/migrations/0043_add_custom_fields.sql \
   packages/db/migrations/0044_add_custom_fields.sql

# Step 2: Update migration index
# Edit packages/db/migrations/index.ts
export { default as migration_0043 } from './0043_add_analytics.sql'
export { default as migration_0044 } from './0044_add_custom_fields.sql'

# Step 3: Mark conflict as resolved
git add packages/db/migrations/
```

#### Conflict in package.json

**Scenario**: Both you and platform updated dependencies

```bash
# Step 1: View the conflict
cat apps/admin/package.json
# <<<<<<< HEAD
#   "stripe": "^17.0.0"
# =======
#   "stripe": "^17.1.0"
# >>>>>>> platform/main

# Step 2: Choose the newer version (platform's)
# Edit file to keep platform version: "stripe": "^17.1.0"

# Step 3: Reinstall dependencies
pnpm install

# Step 4: Mark as resolved
git add apps/admin/package.json
```

#### Conflict in Custom Code

**Scenario**: Platform refactored a file you customized

```bash
# Step 1: Understand both changes
git diff HEAD:apps/admin/app/api/orders/route.ts \
         MERGE_HEAD:apps/admin/app/api/orders/route.ts

# Step 2: Manually merge changes
# - Keep your business logic
# - Adopt platform's structural changes (imports, types, patterns)

# Step 3: Test thoroughly
pnpm turbo typecheck
pnpm dev --filter admin

# Step 4: Mark as resolved
git add apps/admin/app/api/orders/route.ts
```

---

## 4. Testing After Updates

### Phase 1: Type Check (Required)

```bash
# Type check all packages
pnpm turbo typecheck

# Expected output:
# Tasks:    6 successful, 6 total
# Cached:   0 cached, 6 total
# Time:     12.5s

# If errors occur:
# 1. Review breaking changes in changelog
# 2. Update type imports (packages may have moved)
# 3. Fix deprecated API usage
```

### Phase 2: Local Testing (Required)

```bash
# Test all apps locally
pnpm dev

# Verify each app starts:
# ✓ admin: http://localhost:3000
# ✓ storefront: http://localhost:3001
# ✓ creator-portal: http://localhost:3002
# ✓ orchestrator: http://localhost:3003

# Manual testing checklist:
# [ ] Login/logout works
# [ ] Database queries succeed (check tenant isolation)
# [ ] Shopify integration functional (if applicable)
# [ ] Payment flows work (Stripe test mode)
# [ ] Background jobs trigger (check logs)
```

### Phase 3: Database Migrations (If Applicable)

```bash
# Check for new migrations
ls packages/db/migrations/*.sql | tail -5

# Run migrations on local database
npx @cgk-platform/cli migrate

# Expected output:
# ✓ Connected to database
# ✓ Running migration 0043_add_analytics.sql
# ✓ Migration completed successfully

# Verify migration applied
psql $POSTGRES_URL -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

### Phase 4: Staging Deployment (Recommended for MINOR/MAJOR)

```bash
# Push to staging branch
git push origin main:staging

# Wait for Vercel deployment
# Visit staging URLs and test:
# - https://staging-admin.yourcompany.com
# - https://staging-storefront.yourcompany.com

# Run smoke tests:
# [ ] Create test order
# [ ] Process test payment
# [ ] Trigger background job
# [ ] Verify email notifications
```

### Phase 5: Production Deployment (Final Step)

```bash
# Deploy to production
git push origin main

# Monitor deployment:
# 1. Vercel deployment logs
# 2. Application error logs (Vercel dashboard)
# 3. Database query performance (if migrations ran)

# Verify production health:
curl https://admin.yourcompany.com/api/health
# Expected: {"status": "ok", "version": "2.2.0"}
```

---

## 5. Rollback Procedures

### Git Revert for Failed Updates

```bash
# Scenario: Update deployed but breaking changes found

# Step 1: Identify the update commit
git log --oneline -5
# abc123f chore: update platform to v2.2.0
# def456g feat: add custom dashboard widget

# Step 2: Revert the update commit
git revert abc123f --no-edit

# Step 3: Push revert
git push origin main

# Vercel will auto-deploy the reverted state
```

### Database Migration Rollback

```bash
# Scenario: Migration caused data issues

# Step 1: Identify migration to rollback
psql $POSTGRES_URL -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# Step 2: Write rollback migration
# Create packages/db/migrations/0045_rollback_analytics.sql
cat > packages/db/migrations/0045_rollback_analytics.sql <<EOF
-- Rollback migration 0043_add_analytics.sql

DROP TABLE IF EXISTS analytics_events CASCADE;
DROP INDEX IF EXISTS idx_analytics_tenant_id;
EOF

# Step 3: Run rollback migration
npx @cgk-platform/cli migrate

# Step 4: Deploy rollback
git add packages/db/migrations/0045_rollback_analytics.sql
git commit -m "fix: rollback analytics migration"
git push origin main
```

### Emergency Recovery (Nuclear Option)

```bash
# Scenario: Complete failure, need to restore previous version

# Step 1: Restore from backup branch
git reset --hard backup-pre-update-20260303
git push origin main --force

# Step 2: Restore database from backup
# (Requires database backup/restore access)
pg_restore -d $POSTGRES_URL latest_backup.dump

# Step 3: Clear Vercel build cache
vercel --scope cgk-linens-88e79683 --force

# Step 4: Redeploy
vercel --prod --scope cgk-linens-88e79683
```

---

## 6. Update Frequency Recommendations

### Patch Updates (x.x.PATCH)

**Apply**: Immediately (within 24-48 hours)

**Reason**: Security fixes, critical bug fixes

**Process**:

1. Run `update:platform --dry-run`
2. Apply update
3. Type check + smoke test
4. Deploy to production

**Example**:

```bash
# Daily update check in CI/CD
npx @cgk-platform/cli update:platform --dry-run --json | jq '.updateType'
# Output: "patch"

# Auto-apply patch updates (optional)
if [ "$UPDATE_TYPE" = "patch" ]; then
  npx @cgk-platform/cli update:platform --auto-commit
  git push origin main
fi
```

### Minor Updates (x.MINOR.x)

**Apply**: Within 1-2 weeks

**Reason**: New features, non-breaking improvements

**Process**:

1. Review changelog thoroughly
2. Test on staging environment
3. Schedule deployment during low-traffic window
4. Monitor for 24 hours post-deployment

**Example**:

```bash
# Weekly update check
npx @cgk-platform/cli update:platform --changelog

# Review new features:
# - Analytics dashboard enhancements
# - Shopify API v2024-10 support
# - Performance optimizations

# Apply after review:
npx @cgk-platform/cli update:platform
pnpm turbo typecheck
git push origin main:staging  # Test first
```

### Major Updates (MAJOR.x.x)

**Apply**: Within 1-3 months (plan carefully)

**Reason**: Breaking changes, architecture changes

**Process**:

1. Read migration guide (provided with major releases)
2. Create feature branch for update
3. Test extensively on staging (1-2 weeks)
4. Plan production deployment (maintenance window)
5. Have rollback plan ready

**Example**:

```bash
# Major update process
git checkout -b platform-v3-migration
npx @cgk-platform/cli update:platform

# Follow migration guide
cat docs/migration-guides/v2-to-v3.md

# Test for 1-2 weeks on staging
git push origin platform-v3-migration:staging

# After testing, merge to main
git checkout main
git merge platform-v3-migration
git push origin main
```

---

## 7. Common Update Scenarios

### Scenario 1: Dependency Conflict

**Problem**: Platform updates `next` to 16.2.0, you're on 16.1.0

```bash
# Step 1: Check if your code relies on 16.1.0 behavior
git diff platform/main -- packages/**/package.json | grep next

# Step 2: Review Next.js changelog
# https://github.com/vercel/next.js/releases/tag/v16.2.0

# Step 3: Accept platform version
git checkout --theirs apps/admin/package.json
pnpm install

# Step 4: Test for breaking changes
pnpm dev --filter admin
pnpm turbo typecheck
```

### Scenario 2: Environment Variable Added

**Problem**: Platform adds new required env var `ANALYTICS_API_KEY`

```bash
# Step 1: Platform update shows new env var in .env.example
cat apps/admin/.env.example | grep ANALYTICS_API_KEY
# ANALYTICS_API_KEY=  # Required for analytics tracking

# Step 2: Add to your .env.local (protected by merge=ours)
echo "ANALYTICS_API_KEY=your-actual-key" >> apps/admin/.env.local

# Step 3: Add to Vercel
cd apps/admin
vercel env add ANALYTICS_API_KEY production --scope cgk-linens-88e79683
vercel env add ANALYTICS_API_KEY preview --scope cgk-linens-88e79683
vercel env add ANALYTICS_API_KEY development --scope cgk-linens-88e79683

# Step 4: Verify locally
pnpm dev --filter admin
# Check logs for "Analytics initialized" message
```

### Scenario 3: Breaking API Change

**Problem**: Platform renames `getTenantConfig()` to `getTenantSettings()`

```bash
# Step 1: Review deprecation notice in changelog
npx @cgk-platform/cli update:platform --changelog
# BREAKING: getTenantConfig() renamed to getTenantSettings()
# Migration: Replace all instances in your code

# Step 2: Find all usages in your custom code
grep -r "getTenantConfig" apps/ --exclude-dir=node_modules

# Step 3: Update your code
# apps/admin/app/api/dashboard/route.ts:12
# - const config = await getTenantConfig(tenantId)
# + const settings = await getTenantSettings(tenantId)

# Step 4: Test updated code
pnpm turbo typecheck
pnpm dev
```

### Scenario 4: Migration Conflict

**Problem**: Both you and platform added migration `0050_*.sql`

```bash
# Step 1: List migrations
ls packages/db/migrations/*.sql | tail -5
# 0048_add_subscriptions.sql
# 0049_add_webhooks.sql
# 0050_add_analytics.sql (platform)
# 0050_add_custom_reports.sql (yours) ← CONFLICT

# Step 2: Rename yours to next number
git mv packages/db/migrations/0050_add_custom_reports.sql \
       packages/db/migrations/0051_add_custom_reports.sql

# Step 3: Update migration index
# Edit packages/db/migrations/index.ts:
export { default as migration_0050 } from './0050_add_analytics.sql'
export { default as migration_0051 } from './0051_add_custom_reports.sql'

# Step 4: Run migrations in order
npx @cgk-platform/cli migrate
# ✓ Running migration 0050_add_analytics.sql
# ✓ Running migration 0051_add_custom_reports.sql
```

---

## Real-World Update Examples

### Example 1: Patch Update (Security Fix)

```bash
$ npx @cgk-platform/cli update:platform --dry-run

✓ Connected to platform repository
✓ Available updates found

Current version: 2.1.2
Latest version:  2.1.3 (patch update - security fix)

Changes in this update:
- packages/auth/src/jwt.ts (XSS vulnerability fix)
- packages/db/src/tenant-context.ts (SQL injection protection)

No conflicts detected.
Estimated update time: <5 minutes

$ npx @cgk-platform/cli update:platform
✓ Applied updates successfully
✓ No merge conflicts

$ pnpm turbo typecheck
Tasks:    6 successful, 6 total
Time:     8.2s

$ git add .
$ git commit -m "chore: apply security patch v2.1.3"
$ git push origin main
```

### Example 2: Minor Update (New Features)

```bash
$ npx @cgk-platform/cli update:platform --changelog 2.2.0

CGK Platform v2.2.0 Release Notes
=================================

NEW FEATURES:
- Analytics dashboard with real-time metrics
- Shopify Storefront API v2024-10 support
- Background job retry logic improvements

IMPROVEMENTS:
- 40% faster database queries (connection pooling)
- Improved error handling in payment flows
- Enhanced tenant isolation validation

DEPENDENCIES:
- next: 16.1.0 → 16.2.0
- stripe: 17.0.0 → 17.1.0
- @shopify/shopify-api: 12.2.0 → 12.3.0

MIGRATIONS:
- 0043_add_analytics.sql (creates analytics_events table)

ENV VARS:
- ANALYTICS_API_KEY (optional, for external analytics)

$ npx @cgk-platform/cli update:platform
✓ Applied updates successfully
✓ Review required: apps/admin/package.json (dependency update)

$ pnpm install
$ pnpm turbo typecheck
$ git push origin main:staging

# Test on staging for 24 hours...

$ git push origin main
```

---

## Troubleshooting

### "Merge conflict in package.json"

```bash
# Accept both changes (union merge)
git checkout --ours apps/admin/package.json
git checkout --theirs apps/admin/package.json --merge

# Manually review and pick latest versions
pnpm install
pnpm turbo typecheck
```

### "Migration already exists"

```bash
# Rename your migration to next available number
ls packages/db/migrations/*.sql | tail -1
# 0049_add_webhooks.sql

# Your migration should be 0050, 0051, etc.
```

### "Type error after update"

```bash
# Check what changed in package exports
git diff platform/main -- packages/*/src/index.ts

# Update your imports
# Old: import { getTenantConfig } from '@cgk-platform/core'
# New: import { getTenantSettings } from '@cgk-platform/core'
```

---

## Best Practices

1. **Always run --dry-run first** to preview changes
2. **Create backup branch** before major updates
3. **Test on staging** before production (MINOR/MAJOR updates)
4. **Update .env.local** if new variables added
5. **Review migrations** before running them
6. **Monitor logs** after deployment
7. **Keep update frequency consistent** (weekly checks recommended)

---

## Emergency Contacts

If updates cause critical issues:

1. **Rollback immediately** using Git revert
2. **Check platform status**: https://status.cgk-platform.com
3. **Open support ticket**: support@cgk-platform.com
4. **Emergency hotline**: [provided to customers]

---

## Verification

This guide was prepared for **Mr. Tinkleberry** and covers all aspects of safely updating the CGK platform while preserving customizations.
