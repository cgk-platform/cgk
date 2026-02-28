# Environment Variable Workflow

> **Purpose**: Interactive guide for adding environment variables to the CGK platform, ensuring proper 2-file pattern usage and Vercel sync

**Version**: 1.0.0
**Type**: Executable Skill
**Invocation**: `/env-var-workflow [options]`

---

## Overview

This skill guides you through the CGK platform's environment variable workflow, enforcing the **2-file pattern**:

1. **`.env.example`** - Documentation with placeholders (✅ committed to git)
2. **`.env.local`** - Real values synced from Vercel (❌ gitignored)

**Key Features**:
- ✅ Detects LOCAL_* variables (skip Vercel, add to .env.development.local)
- ✅ Generates Vercel commands for production/preview/development
- ✅ Validates .env.example sync across ALL apps
- ✅ Checks turbo.json env declarations
- ✅ Prevents duplicate variable definitions

---

## Usage

### Add New Production Variable

```bash
/env-var-workflow --var STRIPE_SECRET_KEY --value sk_live_xxx
```

**What this does**:
1. Generates `vercel env add` commands for all 3 environments (production, preview, development)
2. Shows `pnpm env:pull` command to sync to .env.local
3. Reminds you to document in .env.example files
4. Checks if turbo.json needs updating

---

### Add Local-Only Variable

```bash
/env-var-workflow --var LOCAL_DEBUG_MODE --value true
```

**What this does**:
1. Detects `LOCAL_*` prefix (won't push to Vercel)
2. Generates commands to add to .env.development.local
3. Suggests documenting in .env.example as optional

**LOCAL_* variables are NEVER synced to Vercel** - they survive `vercel env pull` because they live in a separate file.

---

### Add to Specific Apps Only

```bash
/env-var-workflow --var MUX_TOKEN_ID --value xxx --apps admin,orchestrator
```

Limits workflow to specific apps instead of all apps.

---

### Check .env.example Sync

```bash
/env-var-workflow --check
```

Validates that shared variables (DATABASE_URL, JWT_SECRET, etc.) exist in ALL apps' .env.example files.

**Output**:
```
✅ All .env.example files are in sync

# OR

❌ Shared variables missing from some apps:
   DATABASE_URL: missing from storefront, creator-portal
```

---

## The 2-File Pattern

### File Priority (Next.js Loading Order)

Next.js loads env files in this priority order (later = higher priority):

1. `.env` (lowest)
2. **`.env.local`** ← Vercel syncs here (production vars)
3. `.env.development`
4. **`.env.development.local`** ← Local-only vars go here (highest in dev)

**Key Insight**: `vercel env pull` overwrites `.env.local` but NEVER touches `.env.development.local` or `.env.example`.

---

### File Responsibilities

| File | Purpose | Git Status | Source of Truth |
|------|---------|------------|-----------------|
| `.env.example` | Documentation with placeholders | ✅ Committed | Template for new developers |
| `.env.local` | Actual working values | ❌ Gitignored | Vercel (synced via `vercel env pull`) |
| `.env.development.local` | Local-only overrides | ❌ Gitignored | Developer machine |
| `.env.production` | **NEVER CREATE** | ❌ Security risk | Production vars only in Vercel |

---

### Variable Naming Convention

| Prefix | Where to Add | Sync to Vercel? |
|--------|--------------|-----------------|
| (none) | `.env.local` via Vercel | ✅ Yes - add to Vercel first |
| `LOCAL_` | `.env.development.local` | ❌ Never |
| `DEBUG_` | `.env.development.local` | ❌ Never |
| `TEST_` | `.env.development.local` | ❌ Never |

---

## Workflow Steps

### Adding Production Variable (Step-by-Step)

**1. Get the actual value from user** - Don't proceed without it

**2. Add to Vercel (source of truth)**:
```bash
cd apps/<app-name>
vercel env add VAR_NAME production --scope cgk-linens-88e79683
vercel env add VAR_NAME preview --scope cgk-linens-88e79683
vercel env add VAR_NAME development --scope cgk-linens-88e79683
```

**3. Pull to local** to update `.env.local`:
```bash
cd apps/<app-name>
vercel env pull .env.local --scope cgk-linens-88e79683

# OR from monorepo root
pnpm env:pull
```

**4. Document in `.env.example`** - CRITICAL:
```bash
# Add to apps/<app-name>/.env.example

# ===== NEW SECTION (if needed) =====
# Description of what this var does and where to get it
VAR_NAME=placeholder-value-here
```

**5. Update ALL apps' .env.example files** if the var is shared (e.g., DATABASE_URL)

**6. Check turbo.json** (if variable affects build):
```json
// turbo.json
{
  "tasks": {
    "build": {
      "env": [
        "DATABASE_URL",
        "JWT_SECRET",
        "NEW_VAR_NAME"  // Add here if it affects runtime
      ]
    }
  }
}
```

---

## Shared Variables

These variables should exist in **ALL** apps' .env.example files:

```bash
# Database
DATABASE_URL=postgresql://...
POSTGRES_URL=postgresql://...

# Auth
JWT_SECRET=
SESSION_SECRET=

# Shopify (if app needs it)
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_STORE_DOMAIN=

# Stripe (if app needs it)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

Use `/env-var-workflow --check` to validate sync across all apps.

---

## Vercel Team Configuration

**CRITICAL**: All CGK apps are deployed under a single Vercel team.

**Team Details**:
- **Team ID**: `cgk-linens-88e79683`
- **Team Name**: CGK Linens
- **Scope Flag**: `--scope cgk-linens-88e79683`

**Existing Vercel Projects**:
| Project Name | App Directory | Production URL |
|--------------|---------------|----------------|
| `cgk-admin` | `apps/admin/` | cgk-admin-cgk-linens-88e79683.vercel.app |
| `cgk-storefront` | `apps/storefront/` | cgk-storefront.vercel.app |
| `cgk-shopify-app` | `apps/shopify-app/` | cgk-shopify-app-cgk-linens-88e79683.vercel.app |
| `cgk-orchestrator` | `apps/orchestrator/` | cgk-orchestrator-cgk-linens-88e79683.vercel.app |
| `cgk-creator-portal` | `apps/creator-portal/` | cgk-creator-portal.vercel.app |
| `cgk-contractor-portal` | `apps/contractor-portal/` | cgk-contractor-portal-cgk-linens-88e79683.vercel.app |
| `cgk-mcp-server` | `apps/mcp-server/` | cgk-mcp-server.vercel.app |

**ALWAYS use `--scope cgk-linens-88e79683`** with Vercel CLI commands.

---

## Bulk Add to All Apps

To add a new production env var to ALL 5 main apps at once:

```bash
VALUE="your-secret-value"
VAR_NAME="NEW_VARIABLE"

for app in admin storefront orchestrator creator-portal contractor-portal; do
  echo "Adding to $app..."
  (cd apps/$app && \
    printf "$VALUE" | vercel env add $VAR_NAME production --scope cgk-linens-88e79683 && \
    printf "$VALUE" | vercel env add $VAR_NAME preview --scope cgk-linens-88e79683 && \
    printf "$VALUE" | vercel env add $VAR_NAME development --scope cgk-linens-88e79683)
done

# Then pull to sync locally:
pnpm env:pull
```

---

## Common Scenarios

### Scenario 1: Adding Stripe Integration

```bash
# 1. Get Stripe keys from user
/env-var-workflow --var STRIPE_SECRET_KEY --value sk_live_xxx --apps admin,storefront
/env-var-workflow --var STRIPE_PUBLISHABLE_KEY --value pk_live_xxx --apps admin,storefront
/env-var-workflow --var STRIPE_WEBHOOK_SECRET --value whsec_xxx --apps admin,storefront

# 2. Follow generated commands to add to Vercel
# 3. Run pnpm env:pull
# 4. Update .env.example files with comments
```

---

### Scenario 2: Adding Local Debug Flag

```bash
# 1. Add LOCAL_* variable (auto-detected as local-only)
/env-var-workflow --var LOCAL_DEBUG_MODE --value true

# 2. Follow commands to add to .env.development.local
# 3. NO need to push to Vercel or sync
```

---

### Scenario 3: New Developer Setup

```bash
# 1. Clone repo
git clone https://github.com/cgk/platform

# 2. Copy .env.example to .env.local
cd apps/admin
cp .env.example .env.local

# 3. Pull real values from Vercel (requires auth)
vercel env pull .env.local --scope cgk-linens-88e79683

# OR from monorepo root
pnpm env:pull
```

---

## Validation & Checks

### Check 1: .env.example Sync

Ensures shared variables exist in ALL apps:

```bash
/env-var-workflow --check
```

**Fails if**:
- `DATABASE_URL` missing from any app
- `JWT_SECRET` missing from any app
- Shared vars are inconsistently documented

---

### Check 2: turbo.json Env Declarations

Ensures build-affecting variables are declared in turbo.json:

```json
// turbo.json
{
  "tasks": {
    "build": {
      "env": [
        "DATABASE_URL",
        "JWT_SECRET",
        "STRIPE_SECRET_KEY"  // Must list all runtime vars
      ]
    }
  }
}
```

**Warning if**:
- Production variable missing from turbo.json `build.env` array
- Causes incorrect cache hits on Vercel

---

## Output Examples

### Success - Adding Production Variable

```
🔧 CGK Environment Variable Workflow

📌 Adding environment variable: STRIPE_SECRET_KEY

☁️  Detected PRODUCTION variable (STRIPE_SECRET_KEY)
   ✓ Will be pushed to Vercel (production, preview, development)
   ✓ Will be synced to .env.local via `pnpm env:pull`
   ✓ Will be documented in .env.example files

📝 Workflow Steps:

1. Add to Vercel (source of truth)
   cd apps/admin && printf 'sk_live_xxx' | vercel env add STRIPE_SECRET_KEY production --scope cgk-linens-88e79683
   cd apps/admin && printf 'sk_live_xxx' | vercel env add STRIPE_SECRET_KEY preview --scope cgk-linens-88e79683
   cd apps/admin && printf 'sk_live_xxx' | vercel env add STRIPE_SECRET_KEY development --scope cgk-linens-88e79683
   Adds to production, preview, and development environments

2. Pull to local .env.local
   pnpm env:pull
   Syncs Vercel variables to all apps/.env.local files

3. Document in .env.example
   # Add to apps/admin/.env.example with comment explaining what it's for
   Update ALL .env.example files with clear comments

🔍 Checking .env.example sync across apps...

✅ All .env.example files are in sync

🔍 Checking turbo.json env declarations...

⚠️  Variable should be added to turbo.json build.env array
   File: turbo.json
   Add: "STRIPE_SECRET_KEY" to tasks.build.env array
```

---

### Success - Adding Local Variable

```
🔧 CGK Environment Variable Workflow

📌 Adding environment variable: LOCAL_DEBUG_MODE

🏠 Detected LOCAL-ONLY variable (LOCAL_DEBUG_MODE)
   ✓ Will NOT be pushed to Vercel
   ✓ Will be added to .env.development.local files

📝 Workflow Steps:

1. Add to .env.development.local (local-only)
   echo 'LOCAL_DEBUG_MODE=true' >> apps/admin/.env.development.local
   These files are gitignored and never synced to Vercel

2. Document in .env.example (optional)
   Add commented placeholder to apps/<app>/.env.example:
   # LOCAL_DEBUG_MODE= (local development only)
```

---

## Agent Responsibilities

**When implementing a feature that needs a new env var:**

1. **FIRST: Work with the user** - Ask them for the value or help them obtain it
2. **SECOND: Use this skill** - `/env-var-workflow --var VAR_NAME --value VALUE`
3. **THIRD: Execute the workflow** - Follow generated commands step-by-step
4. **FOURTH: Document it** - Update ALL relevant .env.example files

**When noticing a missing env var:**
1. Inform the user immediately - don't just document it
2. Help them set the value in Vercel (production) or `.env.development.local` (local-only)
3. Use this skill to validate proper setup

---

## Related Documentation

- [CLAUDE.md#Environment-Variables-Strategy](../../../CLAUDE.md#environment-variables-strategy) - Full env var patterns
- [CLAUDE.md#Vercel-Team-Configuration](../../../CLAUDE.md#vercel-team-configuration) - Vercel setup
- [apps/admin/.env.example](../../../apps/admin/.env.example) - Example documentation template

---

## Changelog

- **1.0.0** (2026-02-27): Initial release with 2-file pattern enforcement
