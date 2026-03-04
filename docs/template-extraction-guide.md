# CGK Platform - Template Extraction Guide

This guide explains how to extract a clean platform template from the current CGK repository that can be used as the base for brand forks (WordPress-style model).

## Overview

**Goal**: Create `cgk-platform/cgk-template` - a clean platform template with NO brand-specific code

**What stays**: CGK Platform branding (for admin/orchestrator apps)
**What goes**: Tenant-specific data (CGK Linens, Meliusly storefronts, production secrets)

## Phase 0: Extract Clean Template Repository

### Step 1: Clone Current Repository

```bash
# Clone current repository to new directory
cd ~/Documents
git clone /Users/holdenthemic/Documents/cgk cgk-template
cd cgk-template

# Remove existing git history (optional - clean slate)
rm -rf .git
git init
git add .
git commit -m "Initial commit: CGK Platform template"
```

### Step 2: Clean Tenant-Specific Data

#### 2.1 Remove Tenant-Specific Storefront Code

The current repository has Meliusly-specific storefront customizations that should be removed for the template:

```bash
# Check for Meliusly-specific files
find apps/storefront -type f -name "*meliusly*"
find apps/storefront -type f -name "*Meliusly*"

# Remove brand-specific customizations (ONLY from cgk-template, NOT from original)
# This is manual cleanup - review each file

# Example: Reset storefront to generic template
cd apps/storefront/src/app
# Review and remove hardcoded Meliusly content
# Replace with generic placeholders or env vars
```

#### 2.2 Clean Environment Variable Examples

```bash
# Update .env.example files to use placeholders
cd apps/admin

# Replace production URLs with placeholders
sed -i '' 's|https://cgk-admin.*\.vercel\.app|https://admin.yourbrand.com|g' .env.example
sed -i '' 's|https://cgk-storefront.*\.vercel\.app|https://shop.yourbrand.com|g' .env.example
sed -i '' 's|meliusly\.com|yourbrand.com|g' .env.example

# Repeat for other apps
cd ../storefront
sed -i '' 's|https://cgk-admin.*\.vercel\.app|https://admin.yourbrand.com|g' .env.example
sed -i '' 's|https://cgk-storefront.*\.vercel\.app|https://shop.yourbrand.com|g' .env.example

# Continue for creator-portal, contractor-portal
```

#### 2.3 Remove Production Secrets

```bash
# Ensure no production secrets in examples
grep -r "sk_live" apps/*/. env.example || echo "✓ No Stripe live keys"
grep -r "pk_live" apps/*/.env.example || echo "✓ No Stripe public keys"
grep -r "@cgklinens" apps/*/.env.example || echo "✓ No production emails"

# Replace any found secrets with placeholders
# Example: STRIPE_SECRET_KEY=sk_live_xxxx → STRIPE_SECRET_KEY=<YOUR_STRIPE_SECRET_KEY>
```

#### 2.4 Genericize Storefront Content

**Files to review and make generic**:

```bash
# Storefront pages
apps/storefront/src/app/page.tsx
apps/storefront/src/app/layout.tsx
apps/storefront/src/components/Hero.tsx
apps/storefront/src/components/ProductGrid.tsx

# Replace hardcoded brand content with:
# - Environment variables
# - platformConfig imports
# - Generic placeholder content
```

**Example changes**:

```typescript
// BEFORE (brand-specific)
export default function Home() {
  return (
    <div>
      <h1>Welcome to Meliusly</h1>
      <p>Premium linens for luxury living</p>
    </div>
  )
}

// AFTER (generic template)
import { platformConfig } from '@/platform.config'

export default function Home() {
  const tenant = platformConfig.tenants[0]

  return (
    <div>
      <h1>Welcome to {tenant.name}</h1>
      <p>{process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Your brand description'}</p>
    </div>
  )
}
```

#### 2.5 Remove Brand-Specific Assets

```bash
# Remove brand logos, images, fonts
cd apps/storefront/public

# Remove Meliusly-specific assets
rm -rf brands/meliusly
rm -rf brands/cgk-linens

# Create generic brand folder structure
mkdir -p brands/template
echo "# Place your brand assets here" > brands/template/README.md

# Generic logo placeholder
# (Create or copy a generic logo.svg)
```

### Step 3: Update Configuration Files

#### 3.1 Replace platform.config.ts with Template

```bash
# Replace with template version
cp platform.config.template.ts platform.config.ts

# Update to use env vars for all brand-specific values
```

#### 3.2 Update README.md

````bash
# Replace current README with template README
cat > README.md << 'EOF'
# CGK Platform Template

This is the official template for creating brand deployments using the CGK Platform.

## Quick Start

1. **Fork this repository**
   ```bash
   gh repo fork cgk-platform/cgk-template your-company/your-deployment
````

2. **Configure environment variables**

   ```bash
   cp .env.brand-template apps/admin/.env.local
   ./scripts/generate-brand-secrets.sh your-brand > secrets.txt
   # Add secrets to .env.local
   ```

3. **Deploy to Vercel**
   ```bash
   ./scripts/setup-brand-vercel.sh your-brand yourbrand.com your-vercel-team
   ```

## Documentation

- [Brand Deployment Guide](docs/brand-deployment-guide.md)
- [Platform Update Guide](docs/platform-update-guide.md)
- [Environment Variables Reference](docs/environment-variables-reference.md)

## Support

For support, contact: support@cgkplatform.com

## License

Proprietary - CGK Platform
EOF

````

#### 3.3 Update Package Names (Optional)

```bash
# Update root package.json to reflect template status
code package.json

# Change name from "cgk" to "cgk-platform-template"
# Update description to "CGK Platform Template for Brand Deployments"
````

### Step 4: Clean Git History

```bash
# Check repository size
du -sh .git

# If history is large, clean it
git gc --aggressive --prune=now

# Or start fresh (recommended for template)
rm -rf .git
git init
git add .
git commit -m "chore: initial CGK Platform template"
```

### Step 5: Create GitHub Repository

```bash
# Create new GitHub repository (requires GitHub CLI)
gh repo create cgk-platform/cgk-template \
  --public \
  --description "CGK Platform Template - WordPress-style fork base for brand deployments" \
  --source=. \
  --remote=origin

# Push to GitHub
git branch -M main
git push -u origin main

# Create initial release tag
git tag v1.0.0
git push --tags
```

### Step 6: Verify Template is Clean

**Checklist**:

- [ ] No "Meliusly" mentions in code (except docs)
- [ ] No "CGK Linens" mentions in code (except docs)
- [ ] All env vars use placeholders
- [ ] No production secrets (API keys, tokens)
- [ ] Storefront uses generic content
- [ ] platform.config.ts uses template version
- [ ] README explains fork workflow
- [ ] All docs reference template, not specific brands

**Verification commands**:

```bash
# Search for brand names (should only be in docs/)
grep -r "Meliusly" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs
grep -r "CGK Linens" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs

# Search for production URLs
grep -r "cgk-admin.*vercel.app" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "meliusly.com" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs

# Search for production secrets
grep -r "sk_live" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "pk_live" . --exclude-dir=node_modules --exclude-dir=.git
```

## What to Keep vs Remove

### ✅ KEEP (Platform Branding)

**CGK Platform** branding for platform apps:

- Admin portal branding → "CGK Platform Admin"
- Orchestrator branding → "CGK Platform Orchestrator"
- Creator portal branding → "CGK Platform Creator Portal"
- Contractor portal branding → "CGK Platform Contractor Portal"
- All CGK Platform logos, fonts, colors for these apps

**Rationale**: These are platform-managed apps. Brands use the CGK-branded admin/orchestrator to manage their own brands.

### ❌ REMOVE (Tenant-Specific Data)

**Tenant data** for CGK Linens and Meliusly:

- CGK Linens storefront customizations
- Meliusly storefront customizations (`apps/meliusly-storefront/` if exists)
- Production database credentials
- Production Shopify/Stripe credentials
- Hardcoded tenant slugs
- Brand-specific product catalogs
- Brand-specific content/copy

**Rationale**: These are brand-specific. Each fork will add their own tenant data.

### 📝 MAKE GENERIC (Storefront Template)

**Storefront** - Generic template (no brand):

- Replace hardcoded values with env vars
- Use `platformConfig` for brand info
- Generic placeholder content
- No specific product catalogs
- Example: "Your Brand" instead of "Meliusly"

## Alternative: Branch-Based Template

If you prefer to keep template in the same repository:

```bash
# Create template branch from main
git checkout -b template

# Clean tenant data (same steps as above)
# ...

# Push template branch
git push -u origin template

# Tag as template version
git tag template-v1.0.0
git push --tags

# Brands fork and checkout template branch
git clone <repo>
git checkout template
git checkout -b main
```

## Migration vs Fresh Template

### Option A: Migrate Current Repo (Recommended)

**Your current repo** becomes a fork:

1. Extract clean template (this guide)
2. Set current repo to track template as upstream
3. Both CGK Linens AND Meliusly data stay in current repo
4. Pull updates from template when ready

**Pros**: Zero data loss, all work preserved
**Cons**: More complex initial setup

### Option B: Start Fresh from Template

**Create new repo** from template:

1. Fork cgk-template
2. Manually re-apply CGK Linens + Meliusly customizations
3. Migrate data from old repo

**Pros**: Cleaner separation
**Cons**: Must manually migrate customizations

**Recommendation**: Use Option A (migrate current repo) to preserve all Meliusly work.

## Next Steps After Template Creation

1. **Document fork workflow** in template README
2. **Test brand fork process** with test brand
3. **Create release tags** (v1.0.0, v1.1.0, etc.)
4. **Migrate existing deployments** to fork model
5. **Test platform updates** (upstream → fork merge)

See [docs/brand-deployment-guide.md](./brand-deployment-guide.md) for brand fork instructions.
