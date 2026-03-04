# Vercel Deployment Patterns - Knowledge Base

> **Purpose**: Comprehensive guide to Vercel deployment patterns, integrations, environment variable management, and production debugging for CGK Platform.
> **Last Updated**: 2026-03-03

---

## Table of Contents

1. [Vercel Integration Marketplace](#vercel-integration-marketplace)
2. [Deploy Button Configuration](#deploy-button-configuration)
3. [Environment Variable Tiers](#environment-variable-tiers)
4. [Build-Time Secret Generation](#build-time-secret-generation)
5. [Post-Deploy Setup Wizard](#post-deploy-setup-wizard)
6. [Production Debugging Workflows](#production-debugging-workflows)
7. [Vercel CLI Commands Reference](#vercel-cli-commands-reference)
8. [Multi-App Deployment Strategies](#multi-app-deployment-strategies)
9. [Troubleshooting Guide](#troubleshooting-guide)

---

## 1. Vercel Integration Marketplace

Vercel provides a marketplace of integrations that can be automatically provisioned during deployment.

### Supported Integrations for CGK Platform

| Integration     | Type            | Free Tier           | Auto-Provision | Purpose                      |
| --------------- | --------------- | ------------------- | -------------- | ---------------------------- |
| **Neon**        | PostgreSQL      | ✅ 3GB storage      | ✅ Yes         | Multi-tenant database        |
| **Upstash**     | Redis           | ✅ 10K commands/day | ✅ Yes         | Session cache, rate limiting |
| **Stripe**      | Payments        | ✅ (fees apply)     | ❌ No          | Payment processing           |
| **Shopify**     | E-commerce      | ❌ No               | ❌ No          | Product management           |
| **Vercel Blob** | Object Storage  | ✅ 500MB            | ✅ Yes         | Image uploads, DAM           |
| **Vercel KV**   | Key-Value Store | ✅ 256MB            | ✅ Yes         | Alternative to Upstash       |

### Integration Configuration in vercel.json

```json
{
  "integrations": {
    "neon": {
      "required": true,
      "description": "PostgreSQL database for multi-tenant data"
    },
    "upstash": {
      "required": true,
      "description": "Redis for caching and sessions"
    }
  }
}
```

**How it works**:

1. User clicks "Deploy with Vercel" button
2. Vercel prompts to install integrations
3. Neon creates a new PostgreSQL database
4. Upstash creates a new Redis database
5. Environment variables automatically injected:
   - `DATABASE_URL` (Neon)
   - `POSTGRES_URL` (Neon)
   - `UPSTASH_REDIS_REST_URL` (Upstash)
   - `UPSTASH_REDIS_REST_TOKEN` (Upstash)

### Manual Integration Setup (Alternative)

If auto-provision fails, you can add integrations manually:

```bash
# Go to Vercel dashboard → Integrations
# Search for "Neon" or "Upstash"
# Click "Add Integration"
# Select project
# Follow prompts
```

---

## 2. Deploy Button Configuration

The "Deploy with Vercel" button enables one-click repository cloning and deployment.

### Deploy Button Anatomy

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=REPO_URL&integration-ids=INTEGRATIONS)
```

**Parameters**:

- `repository-url`: GitHub repository URL (URL-encoded)
- `integration-ids`: Comma-separated integration IDs (e.g., `oac_neon,oac_upstash`)

### CGK Platform Deploy Button

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcgk-platform%2Fcgk&integration-ids=oac_neon%2Coac_upstash)
```

**What happens when clicked**:

1. **Fork repository** to user's GitHub account
2. **Install integrations**: Neon + Upstash
3. **Run build** with `GENERATE_SECRETS=true`
4. **Execute** `scripts/generate-secrets-vercel.sh`
5. **Auto-generate** JWT_SECRET, ENCRYPTION_KEY, etc.
6. **Deploy** to `*.vercel.app`
7. **Show** post-deploy wizard at `/setup`

### Integration IDs Reference

| Integration | ID                |
| ----------- | ----------------- |
| Neon        | `oac_neon`        |
| Upstash     | `oac_upstash`     |
| Vercel Blob | `oac_blob`        |
| Vercel KV   | `oac_kv`          |
| PlanetScale | `oac_planetscale` |

---

## 3. Environment Variable Tiers

Vercel supports three environment tiers: **Production**, **Preview**, and **Development**.

### Tier Behavior

| Tier            | When Used                          | Git Branch   | Purpose                       |
| --------------- | ---------------------------------- | ------------ | ----------------------------- |
| **Production**  | Deployments from `main` branch     | `main`       | Live production environment   |
| **Preview**     | Deployments from feature branches  | Any non-main | Testing before merge          |
| **Development** | Local development via `vercel dev` | N/A          | Local testing with Vercel CLI |

### Adding Environment Variables to All Tiers

**Via Vercel CLI**:

```bash
# Add to production
echo "value" | vercel env add VAR_NAME production --yes

# Add to preview
echo "value" | vercel env add VAR_NAME preview --yes

# Add to development
echo "value" | vercel env add VAR_NAME development --yes
```

**Via Vercel Dashboard**:

1. Go to Project Settings → Environment Variables
2. Add variable
3. Check boxes for: Production, Preview, Development
4. Save

### Environment Variable Inheritance

```
Production (most specific)
  ↓
Preview (fallback if not set in preview)
  ↓
Development (fallback if not set in dev)
```

**Best practice**: Set variables in ALL three tiers to avoid unexpected behavior.

---

## 4. Build-Time Secret Generation

CGK Platform auto-generates secrets during the Vercel build process.

### How It Works

1. **Trigger**: `GENERATE_SECRETS=true` environment variable set in `vercel.json`
2. **Script**: `scripts/generate-secrets-vercel.sh` runs during build
3. **Generated secrets**:
   - JWT_SECRET
   - ENCRYPTION_KEY
   - SESSION_SECRET
   - WEBHOOK_SECRET
4. **Output**: Written to `.env.production` file
5. **Persistence**: Secrets added to Vercel project via CLI

### Build-Time Script Execution

In `vercel.json`:

```json
{
  "build": {
    "env": {
      "GENERATE_SECRETS": "true"
    }
  },
  "buildCommand": "bash scripts/generate-secrets-vercel.sh && pnpm turbo build"
}
```

### Secret Generation Script Pattern

```bash
#!/bin/bash
set -e

# Generate cryptographically secure secret
generate_secret() {
  openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Generate secrets
JWT_SECRET=$(generate_secret)
ENCRYPTION_KEY=$(generate_secret)
SESSION_SECRET=$(generate_secret)

# Write to .env.production
echo "JWT_SECRET=$JWT_SECRET" >> .env.production
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env.production
echo "SESSION_SECRET=$SESSION_SECRET" >> .env.production

# Add to Vercel project (for future deployments)
if command -v vercel &> /dev/null; then
  echo "$JWT_SECRET" | vercel env add JWT_SECRET production --yes
  echo "$ENCRYPTION_KEY" | vercel env add ENCRYPTION_KEY production --yes
  echo "$SESSION_SECRET" | vercel env add SESSION_SECRET production --yes
fi
```

### Limitations

- **One-time generation**: Secrets only generated on first build
- **Manual rotation**: Must manually rotate secrets via Vercel dashboard
- **No deletion**: Script does not delete old secrets

### Secret Rotation

```bash
# Generate new secret locally
NEW_SECRET=$(openssl rand -base64 32)

# Update in Vercel (overwrites existing)
echo "$NEW_SECRET" | vercel env add JWT_SECRET production --yes
echo "$NEW_SECRET" | vercel env add JWT_SECRET preview --yes
echo "$NEW_SECRET" | vercel env add JWT_SECRET development --yes

# Redeploy
vercel --prod
```

---

## 5. Post-Deploy Setup Wizard

After deployment, users need to configure Shopify and Stripe credentials.

### Wizard Flow

```
Deployment Complete
  ↓
User visits https://*.vercel.app
  ↓
Redirect to /setup (if not configured)
  ↓
Setup Wizard:
  1. Check database connection
  2. Add Shopify credentials
  3. Add Stripe credentials
  4. Complete
  ↓
Redirect to /admin
```

### Wizard Implementation

**Setup Page**: `apps/admin/src/app/setup/page.tsx`

**API Routes**:

- `/api/setup/check-db` - Test database connection
- `/api/setup/shopify` - Save Shopify credentials
- `/api/setup/stripe` - Save Stripe credentials

**Database Storage**:

```sql
INSERT INTO public.settings (key, value, created_at, updated_at)
VALUES
  ('shopify_api_key', 'abc123', NOW(), NOW()),
  ('shopify_api_secret', 'xyz789', NOW(), NOW()),
  ('stripe_secret_key', 'sk_...', NOW(), NOW())
ON CONFLICT (key)
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
```

### Skip Wizard (For Testing)

Set `SETUP_COMPLETE=true` environment variable to bypass wizard.

---

## 6. Production Debugging Workflows

### Quick Debug Workflow

```bash
# 1. Check env vars
vercel env ls --scope cgk-linens-88e79683

# 2. View recent logs
vercel logs --scope cgk-linens-88e79683 --since 1h

# 3. Inspect latest deployment
vercel ls --scope cgk-linens-88e79683
```

### Common Issues and Solutions

#### Issue: "Database connection failed"

**Diagnosis**:

```bash
# Check if DATABASE_URL is set
vercel env ls --scope cgk-linens-88e79683 | grep DATABASE_URL

# View error logs
vercel logs --scope cgk-linens-88e79683 --since 1h | grep -i database
```

**Solutions**:

1. Verify Neon integration is installed
2. Check DATABASE_URL format: `postgresql://user:pass@host/db`
3. Test connection from local: `psql $DATABASE_URL`

#### Issue: "Redis connection failed"

**Diagnosis**:

```bash
# Check Redis env vars
vercel env ls --scope cgk-linens-88e79683 | grep UPSTASH
```

**Solutions**:

1. Verify Upstash integration is installed
2. Check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
3. Test from local: `curl $UPSTASH_REDIS_REST_URL/ping -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"`

#### Issue: "Build failed"

**Diagnosis**:

```bash
# View build logs
vercel logs --scope cgk-linens-88e79683 --output build

# Inspect failed deployment
vercel inspect <deployment-url> --scope cgk-linens-88e79683
```

**Solutions**:

1. Check build command in `vercel.json`
2. Verify all dependencies installed: `pnpm install --frozen-lockfile`
3. Test locally: `pnpm turbo build`

---

## 7. Vercel CLI Commands Reference

### Authentication

```bash
# Login
vercel login

# Logout
vercel logout

# Check current user
vercel whoami
```

### Environment Variables

```bash
# List all env vars
vercel env ls --scope cgk-linens-88e79683

# Add env var (single tier)
echo "value" | vercel env add VAR_NAME production --scope cgk-linens-88e79683 --yes

# Pull env vars to local .env.local
vercel env pull .env.local --scope cgk-linens-88e79683

# Remove env var
vercel env rm VAR_NAME production --scope cgk-linens-88e79683 --yes
```

### Deployments

```bash
# List deployments
vercel ls --scope cgk-linens-88e79683

# Deploy to production
vercel --prod --scope cgk-linens-88e79683

# Deploy to preview
vercel --scope cgk-linens-88e79683

# Inspect deployment
vercel inspect <deployment-url> --scope cgk-linens-88e79683

# Promote preview to production
vercel promote <deployment-url> --scope cgk-linens-88e79683
```

### Logs

```bash
# View production logs
vercel logs --scope cgk-linens-88e79683

# View logs for specific deployment
vercel logs <deployment-url> --scope cgk-linens-88e79683

# View logs since specific time
vercel logs --scope cgk-linens-88e79683 --since 2h

# View logs with limit
vercel logs --scope cgk-linens-88e79683 --limit 100

# Follow logs in real-time
vercel logs --scope cgk-linens-88e79683 --follow
```

### Projects

```bash
# List projects
vercel project ls --scope cgk-linens-88e79683

# Create project (not recommended - use deploy button instead)
vercel project add --scope cgk-linens-88e79683

# Remove project
vercel project rm <project-name> --scope cgk-linens-88e79683 --yes
```

---

## 8. Multi-App Deployment Strategies

CGK Platform has 9 apps. Vercel handles each as a separate project.

### Apps and Projects

| App                         | Vercel Project            | Production URL                                       |
| --------------------------- | ------------------------- | ---------------------------------------------------- |
| `apps/admin/`               | `cgk-admin`               | cgk-admin-cgk-linens-88e79683.vercel.app             |
| `apps/storefront/`          | `cgk-storefront`          | cgk-storefront.vercel.app                            |
| `apps/meliusly-storefront/` | `cgk-meliusly-storefront` | cgk-meliusly-storefront.vercel.app                   |
| `apps/creator-portal/`      | `cgk-creator-portal`      | cgk-creator-portal.vercel.app                        |
| `apps/contractor-portal/`   | `cgk-contractor-portal`   | cgk-contractor-portal-cgk-linens-88e79683.vercel.app |
| `apps/orchestrator/`        | `cgk-orchestrator`        | cgk-orchestrator-cgk-linens-88e79683.vercel.app      |
| `apps/shopify-app/`         | `cgk-shopify-app`         | cgk-shopify-app-cgk-linens-88e79683.vercel.app       |
| `apps/command-center/`      | `cgk-command-center`      | cgk-command-center-cgk-linens-88e79683.vercel.app    |
| `apps/mcp-server/`          | `cgk-mcp-server`          | cgk-mcp-server.vercel.app                            |

### Deployment Workflow

**Automatic** (recommended):

1. Push to `main` branch
2. GitHub webhook triggers Vercel
3. Vercel builds and deploys all changed apps
4. Zero manual intervention

**Manual**:

```bash
# Deploy specific app
cd apps/admin && vercel --prod --scope cgk-linens-88e79683

# Deploy all apps (from monorepo root)
vercel --prod --scope cgk-linens-88e79683
```

### Shared Environment Variables

All apps share the same environment variables (Neon DATABASE_URL, Upstash Redis, etc.).

**Adding a variable to ALL apps**:

```bash
# Loop through all apps
for app in admin storefront creator-portal contractor-portal orchestrator shopify-app command-center; do
  cd apps/$app
  echo "value" | vercel env add VAR_NAME production --scope cgk-linens-88e79683 --yes
  echo "value" | vercel env add VAR_NAME preview --scope cgk-linens-88e79683 --yes
  echo "value" | vercel env add VAR_NAME development --scope cgk-linens-88e79683 --yes
  cd ../..
done
```

**OR use the Vercel skill**:

```bash
npx ts-node .claude/skills/vercel/index.ts env:add VAR_NAME "value"
```

---

## 9. Troubleshooting Guide

### Build Errors

#### "Module not found"

**Cause**: Missing dependency or incorrect import path

**Solution**:

```bash
# Reinstall dependencies
pnpm install --frozen-lockfile

# Check import paths
# Ensure imports match package exports in package.json
```

#### "Out of memory"

**Cause**: Vercel free tier has 1GB memory limit

**Solution**:

1. Optimize build: `pnpm turbo build --filter=admin` (build fewer apps)
2. Upgrade to Pro plan (6GB memory)
3. Use Turbopack: `next dev --turbo`

### Runtime Errors

#### "Cannot connect to database"

**Diagnosis**:

```bash
# Check DATABASE_URL
vercel env ls --scope cgk-linens-88e79683 | grep DATABASE

# Test connection
psql "$DATABASE_URL" -c "SELECT 1"
```

**Solutions**:

1. Verify Neon integration installed
2. Check DATABASE_URL format
3. Ensure database exists
4. Check firewall rules

#### "Middleware error"

**Cause**: Edge Runtime incompatibility

**Solution**:

```typescript
// apps/admin/src/middleware.ts
export const config = {
  matcher: ['/admin/:path*'], // Specify exact paths
  runtime: 'edge', // Ensure edge runtime
}
```

### Deployment Errors

#### "No access to team"

**Cause**: Not added to `cgk-linens-88e79683` team

**Solution**:

1. Ask team owner for invite
2. Accept invite at vercel.com
3. Run `vercel teams` to verify

#### "Project not found"

**Cause**: Project doesn't exist or wrong scope

**Solution**:

```bash
# List projects to verify
vercel project ls --scope cgk-linens-88e79683

# Ensure --scope flag used
vercel --scope cgk-linens-88e79683
```

---

## Best Practices

1. **Always use `--scope cgk-linens-88e79683`** with Vercel CLI commands
2. **Never deploy via CLI** - Use GitHub auto-deploy instead
3. **Add env vars to ALL three tiers** (production, preview, development)
4. **Test locally first** with `vercel env pull .env.local`
5. **Use post-deploy wizard** for user credentials (Shopify, Stripe)
6. **Rotate secrets quarterly** via Vercel dashboard
7. **Monitor logs** via `vercel logs --follow` during deploys
8. **Use integrations** instead of manual env var setup

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Vercel Integrations](https://vercel.com/integrations)
- [Neon Integration](https://vercel.com/integrations/neon)
- [Upstash Integration](https://vercel.com/integrations/upstash)
- [Deploy Button Generator](https://vercel.com/docs/deployments/deploy-button)

---

**This knowledge base provides comprehensive Vercel deployment patterns for CGK Platform, Mr. Tinkleberry.**
