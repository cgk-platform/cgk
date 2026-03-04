# Git Merge Drivers Setup for WordPress-Style Updates

This guide shows how to configure git merge drivers to enable WordPress-style platform updates while protecting brand customizations.

## Overview

The `.gitattributes` file defines merge strategies:

- `merge=default` - Normal 3-way merge (platform updates applied)
- `merge=ours` - Always keep our version (protects brand customizations)
- `merge=union` - Combine both versions (manual review required)

## Step 1: Configure Merge Drivers

Add the following to your `.git/config` file:

### Option A: Manual Edit

```bash
# Open .git/config in your editor
nano .git/config
```

Add this section:

```ini
[merge "ours"]
    name = Always keep our version
    driver = true

[merge "union"]
    name = Union merge (combine both versions)
    driver = git merge-file --union %A %O %B
```

### Option B: Using Git Commands

```bash
# Configure "ours" merge driver
git config merge.ours.name "Always keep our version"
git config merge.ours.driver true

# Configure "union" merge driver
git config merge.union.name "Union merge (combine both versions)"
git config merge.union.driver "git merge-file --union %A %O %B"
```

### Option C: Automated Script

We provide a script to set this up automatically:

```bash
./scripts/setup-git-merge-drivers.sh
```

## Step 2: Verify Configuration

```bash
# Check that merge drivers are configured
git config --get merge.ours.driver
# Should output: true

git config --get merge.union.driver
# Should output: git merge-file --union %A %O %B
```

## Step 3: Test Merge Strategy

### Test "ours" Strategy (Storefront Protection)

```bash
# Create a test branch
git checkout -b test-merge-ours

# Modify a protected file (storefront)
echo "// Brand customization" >> apps/storefront/src/app/page.tsx
git add apps/storefront/src/app/page.tsx
git commit -m "test: brand customization"

# Try to merge conflicting change
git checkout main
echo "// Platform update" >> apps/storefront/src/app/page.tsx
git add apps/storefront/src/app/page.tsx
git commit -m "test: platform update"

# Merge - should keep "ours" (brand customization)
git merge test-merge-ours

# Check the file - should have brand customization, not platform update
cat apps/storefront/src/app/page.tsx

# Clean up
git reset --hard HEAD~1
git branch -D test-merge-ours
```

### Test "union" Strategy (Infrastructure)

```bash
# Create a test branch
git checkout -b test-merge-union

# Add dependency to package.json
# Union merge will combine both versions
npm install test-package

git add package.json
git commit -m "test: add dependency"

# Switch back and add different dependency
git checkout main
npm install other-package

git add package.json
git commit -m "test: add other dependency"

# Merge - should combine both dependencies
git merge test-merge-union

# Check package.json - should have BOTH dependencies
cat package.json | grep -E "test-package|other-package"

# Clean up
git reset --hard HEAD~1
git branch -D test-merge-union
npm uninstall test-package other-package
```

## Step 4: Set Up Upstream Remote

If you're setting up the current repository to pull from cgk-template:

```bash
# Add upstream remote (cgk-template)
git remote add upstream https://github.com/cgk-platform/cgk-template.git

# Verify remote added
git remote -v
# Should show:
#   origin    <your-fork> (fetch/push)
#   upstream  https://github.com/cgk-platform/cgk-template.git (fetch)

# Fetch from upstream
git fetch upstream
git fetch --tags upstream

# See what's available
git branch -r | grep upstream
```

## How .gitattributes Works

### Protected Files (merge=ours)

These files are NEVER overwritten by platform updates:

```
apps/storefront/src/**           # Your storefront code
apps/storefront/public/**        # Your brand assets
platform.config.ts               # Your brand configuration
.env.local                       # Your secrets
vercel.json                      # Your Vercel config
```

**What happens during merge:**

- Platform updates to these files are IGNORED
- Your version always wins
- No merge conflicts

### Platform Files (merge=default)

These files ALWAYS receive platform updates:

```
packages/**                      # Core platform packages
apps/admin/src/app/**           # Admin app code
apps/orchestrator/**            # Orchestrator code
scripts/**                       # Platform scripts
```

**What happens during merge:**

- Normal 3-way merge
- Platform changes applied
- Conflicts possible (rare)

### Review Files (merge=union)

These files COMBINE both versions (requires manual review):

```
package.json                     # Dependencies
apps/*/package.json              # App dependencies
packages/db/src/migrations/**    # Database migrations
apps/*/.env.example              # Env var examples
```

**What happens during merge:**

- Both versions combined
- YOU must review and clean up
- May have duplicate entries

## Troubleshooting

### Issue: Merge driver not being used

**Symptom:** Conflicts in files marked with `merge=ours`

**Solution:**

```bash
# Verify .gitattributes exists
ls -la .gitattributes

# Verify merge drivers configured
git config --get merge.ours.driver
git config --get merge.union.driver

# Re-configure if needed
./scripts/setup-git-merge-drivers.sh
```

### Issue: Union merge creates duplicates

**Symptom:** package.json has duplicate dependencies

**Solution:**

```bash
# After union merge, review and deduplicate
code package.json

# Remove duplicates manually
# Then run:
pnpm install
```

### Issue: Can't find upstream remote

**Symptom:** `git fetch upstream` fails

**Solution:**

```bash
# Check remotes
git remote -v

# Add upstream if missing
git remote add upstream https://github.com/cgk-platform/cgk-template.git

# Fetch
git fetch upstream
```

## Best Practices

1. **Always configure merge drivers BEFORE first update**
   - Run `./scripts/setup-git-merge-drivers.sh`
   - Verify with `git config --get merge.ours.driver`

2. **Review union merges carefully**
   - Check `git diff` after union merge
   - Look for duplicates in package.json
   - Review migration files

3. **Test merge strategy on a branch first**
   - Create test branch before platform update
   - Merge upstream/main to test branch
   - Review conflicts
   - Only merge to main if clean

4. **Keep .gitattributes in sync**
   - If you add new brand-specific files, add to .gitattributes
   - Use `merge=ours` for all brand customizations

## Next Steps

After setting up merge drivers:

1. Configure upstream remote (if migrating existing deployment)
2. Test merge strategy with a dry run
3. Apply first platform update
4. Verify brand customizations intact

See [docs/platform-update-guide.md](./platform-update-guide.md) for the complete update workflow.
