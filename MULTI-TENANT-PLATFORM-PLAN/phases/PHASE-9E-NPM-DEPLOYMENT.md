# PHASE-9E: npm Deployment & Package Publishing

**Status**: NOT STARTED
**Duration**: 1 hour (setup) + ongoing
**Depends On**: Code complete (Phase 8)
**Blocks**: Open-source release, CLI distribution

---

## Goal

Configure npm publishing for all @cgk-platform/* packages to enable:
1. `npx @cgk-platform/cli create my-brand` - Create new brand sites
2. `npm install @cgk-platform/ui @cgk-platform/db` - Use packages in custom projects
3. Versioned releases with changelog

---

## Current State

**Already Implemented:**

| Component | Status | Location |
|-----------|--------|----------|
| Changesets config | ✅ | `.changeset/config.json` |
| CI workflow | ✅ | `.github/workflows/ci.yml` |
| Release workflow | ✅ | `.github/workflows/release.yml` |
| Canary workflow | ✅ | `.github/workflows/canary.yml` |
| Package configs | ✅ | All packages have proper `exports`, `files`, `main`, `types` |
| Root scripts | ✅ | `pnpm release`, `pnpm version-packages` |

**Needs User Action:**

| Item | Action Required |
|------|-----------------|
| npm organization | Create `@cgk` org on npm (or use own scope) |
| NPM_TOKEN | Add to GitHub repository secrets |
| First changeset | Create initial changeset to version packages |

---

## Step 1: Create npm Organization

### Option A: Use @cgk (if available)

```bash
# Check if @cgk is available
npm org ls @cgk

# If not taken, create the organization at:
# https://www.npmjs.com/org/create
```

### Option B: Use Your Own Scope

If `@cgk` is taken, update the package scope:

```bash
# Update all package names from @cgk-platform/* to @your-org/*
# This requires updating:
# 1. All package.json "name" fields
# 2. All imports in source files
# 3. .changeset/config.json "fixed" array
```

---

## Step 2: Generate npm Access Token

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Click "Generate New Token"
3. Select "Automation" type (for CI/CD)
4. Copy the token (starts with `npm_`)

---

## Step 3: Add NPM_TOKEN to GitHub

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Your npm token from Step 2
6. Click "Add secret"

---

## Step 4: Create First Release

### 4a. Create Changeset

```bash
cd /Users/holdenthemic/Documents/cgk

# Create a changeset for the initial release
pnpm changeset

# When prompted:
# - Select all packages (space to select, enter to confirm)
# - Choose "major" for initial 1.0.0 release (or "minor" for 0.1.0)
# - Write a summary: "Initial release of CGK platform packages"
```

This creates a file like `.changeset/random-name.md`:

```markdown
---
"@cgk-platform/core": major
"@cgk-platform/db": major
"@cgk-platform/auth": major
"@cgk-platform/ui": major
"@cgk-platform/cli": major
... (all packages)
---

Initial release of CGK platform packages.

Features:
- Multi-tenant database with schema isolation
- JWT authentication with MFA support
- React UI components
- CLI for project creation and management
- Shopify integration
- Background job processing
```

### 4b. Commit and Push

```bash
git add .changeset/
git commit -m "chore: add changeset for initial release"
git push origin main
```

### 4c. Release Process

The GitHub Action will:

1. **Detect changeset** → Create a "Version Packages" PR
2. **Merge the PR** → Packages are published to npm
3. **Create GitHub release** → With changelog

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Developer Workflow                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Make changes to packages                                │
│  2. Run: pnpm changeset                                     │
│     - Select affected packages                              │
│     - Choose bump type (patch/minor/major)                  │
│     - Write changelog entry                                 │
│  3. Commit and push                                         │
│                                                             │
│  4. GitHub Action creates "Version Packages" PR             │
│     - Updates package.json versions                         │
│     - Updates CHANGELOG.md files                            │
│     - Replaces workspace:* with actual versions             │
│                                                             │
│  5. Merge the PR → Packages published to npm                │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Canary Releases (Automatic)                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  On every push to main (that touches packages/apps):        │
│  - Publishes 0.0.0-canary.{timestamp} to npm                │
│  - Tagged as @canary                                        │
│  - Install with: npm install @cgk-platform/cli@canary                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Package Publishing Configuration

### Changeset Config (`.changeset/config.json`)

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [
    ["@cgk-platform/*"]
  ],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": [],
  "privatePackages": {
    "version": false,
    "tag": false
  }
}
```

**Key Settings:**
- `fixed: ["@cgk-platform/*"]` - All packages share the same version
- `access: "public"` - Packages are public on npm
- `privatePackages.version: false` - Private packages (apps) aren't versioned

### Package Requirements

Each package must have:

```json
{
  "name": "@cgk-platform/package-name",
  "version": "0.0.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "license": "MIT"
}
```

---

## Packages to Publish

| Package | Description | Primary Users |
|---------|-------------|---------------|
| `@cgk-platform/cli` | CLI tool | All users |
| `@cgk-platform/core` | Types, utilities | All packages |
| `@cgk-platform/db` | Database, tenant isolation | Apps |
| `@cgk-platform/auth` | Authentication | Apps |
| `@cgk-platform/ui` | React components | Apps |
| `@cgk-platform/commerce` | Commerce abstraction | Apps |
| `@cgk-platform/shopify` | Shopify integration | Apps |
| `@cgk-platform/payments` | Stripe/Wise | Apps |
| `@cgk-platform/jobs` | Background jobs | Apps |
| `@cgk-platform/analytics` | GA4, attribution | Apps |
| `@cgk-platform/mcp` | Claude MCP | MCP server |
| `@cgk-platform/logging` | Structured logging | All |
| ... | (28 total packages) | ... |

---

## Verification Checklist

### Before First Release

- [ ] npm organization created (or scope decided)
- [ ] NPM_TOKEN added to GitHub secrets
- [ ] All packages have proper `exports`, `files`, `main`, `types`
- [ ] All packages have `"license": "MIT"`
- [ ] Changeset created for initial release

### After First Release

- [ ] Packages visible on npm: https://www.npmjs.com/org/cgk
- [ ] `npx @cgk-platform/cli create test-brand` works
- [ ] `npm install @cgk-platform/ui` works
- [ ] GitHub release created with changelog

### Ongoing

- [ ] Create changeset for each PR that modifies packages
- [ ] "Version Packages" PR appears after merging
- [ ] Merging version PR publishes to npm

---

## Common Issues

### "npm ERR! 403 Forbidden"

```bash
# Token doesn't have publish access
# Solution: Generate new token with "Automation" type
```

### "Package name too similar to existing"

```bash
# npm thinks name conflicts with another package
# Solution: Use different scope or add prefix
```

### "workspace:* in published package"

```bash
# Changesets should replace these automatically
# If not, check changeset config and ensure pnpm version >= 8
```

### Canary versions accumulating

```bash
# Old canary versions pile up on npm
# Solution: Periodically clean with:
npm unpublish @cgk-platform/cli@0.0.0-canary.20240101120000
# Or use npm deprecate for all canaries after stable release
```

---

## Post-Release Tasks

After first stable release:

1. **Update README** - Add installation instructions
2. **Create docs site** - docs.cgk.dev
3. **Deprecate canaries** - `npm deprecate @cgk-platform/cli@"<1.0.0" "Use stable release"`
4. **Announce** - Social, Discord, etc.

---

## Quick Commands Reference

```bash
# Create changeset (interactive)
pnpm changeset

# Version packages (creates PR commit locally)
pnpm version-packages

# Publish to npm (usually done by CI)
pnpm release

# Check what would be published
pnpm -r publish --dry-run

# Install canary version
npm install @cgk-platform/cli@canary

# Check package on npm
npm view @cgk-platform/cli
```

---

*Last Updated: 2026-02-13*
