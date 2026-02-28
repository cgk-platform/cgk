# Environment Variables Guide

**Purpose**: Comprehensive guide to environment variable management in the CGK platform
**Last Updated**: 2026-02-27

---

## Overview

CGK uses a **two-file pattern** for environment variables:

- `.env.example` - Documentation with placeholders (committed to git)
- `.env.local` - Actual values synced from Vercel (gitignored)

**Source of Truth**: Vercel is the single source of truth for production environment variables.

---

## Two-File Pattern (MANDATORY)

Every app MUST have both files:

| File           | Purpose                         | Git Status        | Source of Truth                       |
| -------------- | ------------------------------- | ----------------- | ------------------------------------- |
| `.env.example` | Documentation with placeholders | ✅ **Committed**  | Template for new developers           |
| `.env.local`   | Actual working values           | ❌ **Gitignored** | Vercel (synced via `vercel env pull`) |

### CRITICAL Rules

1. **`.env.example`** - Documented placeholders, NO real secrets, committed to git
2. **`.env.local`** - Real values, synced from Vercel, NEVER committed
3. **`.env.production`** - **NEVER CREATE THIS FILE** - production vars only in Vercel

---

## .env.example Format

```bash
# CGK Platform - App Name
# =====================

# ===================
# DATABASE
# ===================
# Neon PostgreSQL connection (get from Vercel project settings)
DATABASE_URL=postgresql://user:password@host/db?sslmode=require

# ===================
# AUTHENTICATION
# ===================
# JWT secret for token signing (generate with: openssl rand -hex 32)
JWT_SECRET=your-64-character-hex-string-here

# ===================
# SHOPIFY (shopify-app only)
# ===================
# From Shopify Partners Dashboard -> Client credentials
SHOPIFY_CLIENT_ID=your-client-id
SHOPIFY_CLIENT_SECRET=shpss_your-secret-here

# Token encryption key (generate with: openssl rand -hex 32)
SHOPIFY_TOKEN_ENCRYPTION_KEY=your-64-character-hex-string

# Webhook secret (same as SHOPIFY_CLIENT_SECRET)
SHOPIFY_WEBHOOK_SECRET=shpss_your-secret-here
```

### Guidelines for .env.example

- Add **clear comments** explaining what each var is for
- Include **generation commands** for secrets (e.g., `openssl rand -hex 32`)
- Use **descriptive placeholders** (e.g., `your-client-id` not `xxx`)
- Group vars by **category** with headers (Database, Auth, Integrations, etc.)
- Indicate **which apps need which vars** (e.g., "shopify-app only")
- **Keep in sync** across all apps - update ALL .env.example files when adding new vars

---

## 🚨 CRITICAL: NEVER Create .env.production Files

**RULE: Production environment variables ONLY exist in Vercel, NEVER in git.**

```bash
# ❌ NEVER DO THIS - .env.production should NOT exist
touch .env.production
echo "DATABASE_URL=..." > .env.production

# ✅ CORRECT - Add to Vercel via CLI or dashboard
vercel env add DATABASE_URL production --scope cgk-linens-88e79683
# OR: Vercel Dashboard → Settings → Environment Variables
```

### Why

- `.env.production` files are a security risk (secrets in git)
- Vercel is the single source of truth for production vars
- `.env.local` is synced FROM Vercel (read-only on dev machines)

### What files ARE allowed

- `.env.example` ✅ (documentation, no real values, committed to git)
- `.env.local` ✅ (synced from Vercel, gitignored)
- `.env.development.local` ✅ (local dev only, gitignored)
- `.env.production` ❌ **NEVER - DELETE IF YOU SEE IT**

---

## How It Works

Next.js loads env files in this priority order (later = higher priority):

1. `.env` (lowest)
2. `.env.local` ← **Vercel syncs here** (production vars)
3. `.env.development`
4. `.env.development.local` ← **Local-only vars go here** (highest in dev, never overwritten)

```
cgk/
├── apps/
│   ├── admin/
│   │   ├── .env.example           ← Documentation with comments (committed)
│   │   ├── .env.local             ← Synced from Vercel (production vars)
│   │   └── .env.development.local ← Local-only vars (LOCAL_*, DEBUG_*, TEST_*)
│   ├── storefront/
│   │   ├── .env.example
│   │   ├── .env.local
│   │   └── .env.development.local
│   └── ... (same pattern for all apps)
```

**IMPORTANT: All env files live in `apps/<app>/`, NEVER at the monorepo root.**
Next.js only loads env files from the directory where `next dev` runs (each app folder).

**Key insight**: `vercel env pull` overwrites `.env.local` but NEVER touches `.env.development.local` or `.env.example`.

---

## Workflow (PRIORITY ORDER)

### When adding a NEW environment variable

1. **Get the actual value from user** - Don't proceed without it
2. **Add to Vercel** (source of truth):
   ```bash
   cd apps/<app-name>
   vercel env add VAR_NAME production --scope cgk-linens-88e79683
   vercel env add VAR_NAME preview --scope cgk-linens-88e79683
   vercel env add VAR_NAME development --scope cgk-linens-88e79683
   ```
3. **Pull to local** to update `.env.local`:
   ```bash
   cd apps/<app-name>
   vercel env pull .env.local --scope cgk-linens-88e79683
   ```
4. **Document in `.env.example`** - CRITICAL:
   ```bash
   # Add to apps/<app-name>/.env.example
   # ===== NEW SECTION (if needed) =====
   # Description of what this var does and where to get it
   VAR_NAME=placeholder-value-here
   ```
5. **Update ALL apps' .env.example files** if the var is shared (e.g., DATABASE_URL)

### CRITICAL: .env.example files are for future developers

Always keep them:

- ✅ Up to date with all required vars
- ✅ Well-commented with clear explanations
- ✅ Synced across apps (shared vars like DATABASE_URL)
- ✅ Using placeholders, NEVER real secrets
- ✅ Committed to git

### Local-only vars (LOCAL*\*, DEBUG*_, TEST\__)

1. Add directly to `apps/<app>/.env.development.local`
2. NEVER push to Vercel
3. These survive `vercel env pull` because they're in a different file

---

## Required Variables (All Apps)

See `apps/<app>/.env.example` for per-app documentation. Core vars include:

```bash
# Database
DATABASE_URL=postgresql://...
POSTGRES_URL=postgresql://...

# Auth
JWT_SECRET=
SESSION_SECRET=

# Shopify
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_STORE_DOMAIN=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Naming Convention

| Prefix   | Where to add             | Sync to Vercel?              |
| -------- | ------------------------ | ---------------------------- |
| (none)   | `.env.local` via Vercel  | ✅ Yes - add to Vercel first |
| `LOCAL_` | `.env.development.local` | ❌ Never                     |
| `DEBUG_` | `.env.development.local` | ❌ Never                     |
| `TEST_`  | `.env.development.local` | ❌ Never                     |

---

## Syncing Commands

### Pull from Vercel to all apps

```bash
pnpm env:pull
```

### Add new production env var to Vercel (all 5 projects)

```bash
VALUE="your-secret-value"
for app in admin storefront orchestrator creator-portal contractor-portal; do
  echo "Adding to $app..."
  (cd apps/$app && \
    printf "$VALUE" | vercel env add VAR_NAME production && \
    printf "$VALUE" | vercel env add VAR_NAME preview && \
    printf "$VALUE" | vercel env add VAR_NAME development)
done
# Then pull to sync locally:
pnpm env:pull
```

---

## Agent Responsibilities

### When implementing a feature that needs a new env var

1. **FIRST: Work with the user** - Ask them for the value or help them obtain it
2. **SECOND: Set it properly**
   - Production var → Help user add to Vercel → run `pnpm env:pull`
   - Local-only var → Add to `apps/<app>/.env.development.local`
3. **THIRD: Document it** - Add commented placeholder to ALL `apps/<app>/.env.example` files:
   ```bash
   # Description of what this var does and where to get it
   NEW_VAR_NAME=
   ```

### When noticing a missing env var

1. Inform the user immediately - don't just document it
2. Help them set the value in Vercel (production) or `.env.development.local` (local-only)
3. Add to all `apps/<app>/.env.example` files with explanatory comment

### When updating any env var

- Keep ALL `apps/<app>/.env.example` files in sync
- Add clear comments explaining what each var is for

### CRITICAL Rules

- PRIORITIZE actually setting env vars with the user over just documenting them
- NEVER push `LOCAL_*`, `DEBUG_*`, or `TEST_*` vars to Vercel
- ALWAYS add to Vercel FIRST for production vars, then pull (Vercel is source of truth)
- ALWAYS keep all per-app `.env.example` files updated with comments

---

## Troubleshooting

### "Variable not defined" errors at build time

1. Check if var is in Vercel (via `vercel env ls`)
2. Pull latest vars: `cd apps/<app> && vercel env pull .env.local`
3. Restart dev server

### Variables not syncing across apps

1. Ensure var is added to ALL environments (production, preview, development)
2. Run `pnpm env:pull` from monorepo root
3. Check `.env.example` files are in sync

### Accidentally committed .env.local

1. Remove from git immediately: `git rm --cached apps/*/.env.local`
2. Rotate all secrets in Vercel
3. Update `.gitignore` to ensure `.env.local` is ignored

---

**End of Guide**
