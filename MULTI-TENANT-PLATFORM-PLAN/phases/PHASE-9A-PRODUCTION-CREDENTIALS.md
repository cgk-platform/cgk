# PHASE-9A: Production Credentials Configuration

**Status**: NOT STARTED
**Duration**: 1-2 hours
**Depends On**: All previous phases complete
**Blocks**: Production deployment

---

## Goal

Configure all external service credentials in Vercel for production deployment. Each tenant manages their own service accounts, but the platform needs encryption keys and some platform-level credentials.

---

## Prerequisites

- [ ] Vercel CLI installed (`npm i -g vercel`)
- [ ] Vercel account linked (`vercel login`)
- [ ] All 5 Vercel projects created (admin, storefront, orchestrator, creator-portal, contractor-portal)
- [ ] Access to create accounts on external services

---

## Step 1: Generate Platform Encryption Keys

These are the ONLY platform-level secrets needed. All other credentials are tenant-managed.

```bash
# Generate encryption keys
cd /Users/holdenthemic/Documents/cgk

# Master encryption key for all tenant credentials
INTEGRATION_KEY=$(openssl rand -base64 32)
echo "INTEGRATION_ENCRYPTION_KEY=$INTEGRATION_KEY"

# Shopify token encryption (64 hex chars)
SHOPIFY_KEY=$(openssl rand -hex 32)
echo "SHOPIFY_TOKEN_ENCRYPTION_KEY=$SHOPIFY_KEY"

# Session and JWT secrets
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET"
echo "SESSION_SECRET=$SESSION_SECRET"
```

---

## Step 2: Add to Vercel (All Projects)

```bash
# Add encryption keys to ALL Vercel projects
for app in admin storefront orchestrator creator-portal contractor-portal; do
  echo "Adding keys to $app..."
  cd apps/$app

  # Encryption keys
  printf "$INTEGRATION_KEY" | vercel env add INTEGRATION_ENCRYPTION_KEY production
  printf "$INTEGRATION_KEY" | vercel env add INTEGRATION_ENCRYPTION_KEY preview
  printf "$SHOPIFY_KEY" | vercel env add SHOPIFY_TOKEN_ENCRYPTION_KEY production
  printf "$SHOPIFY_KEY" | vercel env add SHOPIFY_TOKEN_ENCRYPTION_KEY preview

  # Auth secrets
  printf "$JWT_SECRET" | vercel env add JWT_SECRET production
  printf "$JWT_SECRET" | vercel env add JWT_SECRET preview
  printf "$SESSION_SECRET" | vercel env add SESSION_SECRET production
  printf "$SESSION_SECRET" | vercel env add SESSION_SECRET preview

  cd ../..
done

# Sync to local
pnpm env:pull
```

---

## Step 3: Database Configuration

### Option A: Vercel Postgres (Recommended)

1. Go to Vercel Dashboard → Storage → Create Database → Postgres
2. Select region closest to your users
3. Copy the connection strings
4. Link to all projects

```bash
# Vercel automatically adds these when you link the database:
# - POSTGRES_URL
# - POSTGRES_URL_NON_POOLING
# - POSTGRES_USER
# - POSTGRES_HOST
# - POSTGRES_PASSWORD
# - POSTGRES_DATABASE
```

### Option B: Neon (Alternative)

1. Create account at neon.tech
2. Create new project
3. Copy connection string

```bash
# Add manually to all projects
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```

---

## Step 4: Redis/Cache Configuration

### Option A: Vercel KV (Recommended)

1. Go to Vercel Dashboard → Storage → Create Database → KV
2. Link to all projects

```bash
# Vercel automatically adds:
# - KV_URL
# - KV_REST_API_URL
# - KV_REST_API_TOKEN
# - KV_REST_API_READ_ONLY_TOKEN
```

### Option B: Upstash (Alternative)

1. Create account at upstash.com
2. Create new Redis database
3. Copy REST URL and token

```bash
# Add manually
KV_REST_API_URL="https://xxx.upstash.io"
KV_REST_API_TOKEN="xxx"
```

---

## Step 5: Shopify App Credentials (Platform-Level)

These are for the Shopify app installation OAuth flow:

1. Go to Shopify Partners → Apps → Create App
2. Configure OAuth callback URLs
3. Copy Client ID and Secret

```bash
# Add to admin, storefront, and shopify-app projects
SHOPIFY_API_KEY="your-client-id"
SHOPIFY_API_SECRET="your-client-secret"
SHOPIFY_SCOPES="read_products,write_products,read_orders,write_orders,read_customers"
SHOPIFY_APP_URL="https://your-admin-domain.com"
```

---

## Step 6: Trigger.dev Configuration

1. Create account at trigger.dev
2. Create new project
3. Copy project ID and API key

```bash
# Add to jobs package / all apps that trigger jobs
TRIGGER_API_KEY="tr_xxx"
TRIGGER_API_URL="https://api.trigger.dev"

# For Vercel env sync (optional)
VERCEL_ACCESS_TOKEN="your-vercel-token"
VERCEL_PROJECT_ID="prj_xxx"
```

---

## Verification Checklist

### Platform Secrets (All Projects)

- [ ] `INTEGRATION_ENCRYPTION_KEY` - 32+ char base64
- [ ] `SHOPIFY_TOKEN_ENCRYPTION_KEY` - 64 hex chars
- [ ] `JWT_SECRET` - 32+ char base64
- [ ] `SESSION_SECRET` - 32+ char base64

### Database (All Projects)

- [ ] `POSTGRES_URL` or `DATABASE_URL` - Connection string with SSL
- [ ] `POSTGRES_URL_NON_POOLING` - For migrations

### Cache (All Projects)

- [ ] `KV_REST_API_URL` or `REDIS_URL`
- [ ] `KV_REST_API_TOKEN` (if using Vercel KV)

### Shopify (admin, storefront, shopify-app)

- [ ] `SHOPIFY_API_KEY`
- [ ] `SHOPIFY_API_SECRET`

### Jobs (all apps)

- [ ] `TRIGGER_API_KEY`

---

## Environment Variable Summary

| Variable | Required In | Source |
|----------|-------------|--------|
| `INTEGRATION_ENCRYPTION_KEY` | All | Generated |
| `SHOPIFY_TOKEN_ENCRYPTION_KEY` | All | Generated |
| `JWT_SECRET` | All | Generated |
| `SESSION_SECRET` | All | Generated |
| `POSTGRES_URL` | All | Vercel/Neon |
| `KV_REST_API_URL` | All | Vercel/Upstash |
| `SHOPIFY_API_KEY` | admin, storefront | Shopify Partners |
| `SHOPIFY_API_SECRET` | admin, storefront | Shopify Partners |
| `TRIGGER_API_KEY` | All | Trigger.dev |

---

## Notes

- **Tenant credentials** (Stripe, Resend, Wise, etc.) are NOT configured here
- Tenants add their own credentials via Admin Settings → Integrations
- Platform only provides encryption keys and infrastructure

---

*Last Updated: 2026-02-13*
