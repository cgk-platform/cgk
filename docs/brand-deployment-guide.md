# Brand Deployment Guide

> **Complete guide for deploying a new brand on the CGK Commerce Platform**

This guide walks through deploying a new brand from scratch. Expected time: 2-3 hours for first deployment.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Fork Setup](#fork-setup)
3. [Environment Variables](#environment-variables)
4. [Vercel Project Creation](#vercel-project-creation)
5. [Shopify App Setup](#shopify-app-setup)
6. [Stripe Connect Setup](#stripe-connect-setup)
7. [First Deployment](#first-deployment)
8. [Testing Checklist](#testing-checklist)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

### Required Accounts

- **Vercel Account** (Pro plan required for custom domains)
  - Sign up at https://vercel.com
  - Upgrade to Pro ($20/month)
  - Install Vercel CLI: `npm i -g vercel`

- **GitHub Account**
  - Personal or organization account
  - Admin access to create repositories

- **Domain Name**
  - Registered domain (e.g., yourbrand.com)
  - Access to DNS settings (via registrar or Cloudflare)
  - Recommend: Cloudflare for DNS management

- **CGK Platform Hub Credentials**
  - Provided by CGK team
  - Includes: tenant slug, API keys, database URL

### Local Development Setup

```bash
# Required software
node --version    # Should be >=22 (LTS)
pnpm --version    # Should be >=10
git --version     # Any recent version

# Install if missing
brew install node    # macOS
brew install pnpm
```

---

## Fork Setup

### Step 1: Fork the Template Repository

1. Go to https://github.com/cgk-platform/cgk-template
2. Click "Fork" button (top right)
3. Choose your account/organization
4. Name it after your brand: `{brand}-platform` (e.g., `meliusly-platform`)
5. Click "Create fork"

### Step 2: Clone Your Fork

```bash
# Clone your forked repository
git clone https://github.com/{your-username}/{brand}-platform.git
cd {brand}-platform

# Add upstream remote (for receiving CGK updates)
git remote add upstream https://github.com/cgk-platform/cgk-template.git
git remote -v
# Should show:
# origin    https://github.com/{your-username}/{brand}-platform.git (fetch)
# origin    https://github.com/{your-username}/{brand}-platform.git (push)
# upstream  https://github.com/cgk-platform/cgk-template.git (fetch)
# upstream  https://github.com/cgk-platform/cgk-template.git (push)
```

### Step 3: Configure Git Merge Drivers

This ensures environment files merge correctly when pulling updates from CGK.

```bash
# Copy the merge driver script
cp .git-merge-drivers/merge-env-template.sh .git/hooks/
chmod +x .git/hooks/merge-env-template.sh

# Configure git to use custom merge driver
cat >> .git/config <<'EOF'
[merge "env-template"]
    name = Environment template merge driver
    driver = ./.git/hooks/merge-env-template.sh %O %A %B %P
EOF
```

### Step 4: Create Your Brand Branch

```bash
# Create and switch to your brand's main development branch
git checkout -b brand/{your-brand-slug}

# Push to your fork
git push -u origin brand/{your-brand-slug}
```

---

## Environment Variables

Environment variables are stored in `apps/*/.env.local` files (NOT in root or packages/).

### Step 1: Use the Brand Template

Each app has a `.env.brand-template` file with all required variables:

```bash
# Copy templates to .env.local for each app
cp apps/admin/.env.brand-template apps/admin/.env.local
cp apps/storefront/.env.brand-template apps/storefront/.env.local
cp apps/creator-portal/.env.brand-template apps/creator-portal/.env.local
cp apps/orchestrator/.env.brand-template apps/orchestrator/.env.local
```

### Step 2: Generate Secrets

Use the provided script to generate secure random secrets:

```bash
# Make script executable
chmod +x scripts/generate-brand-secrets.sh

# Run script (outputs secrets you'll need to paste into .env.local files)
./scripts/generate-brand-secrets.sh

# Example output:
# JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
# SESSION_SECRET=x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9
# ENCRYPTION_KEY=m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0
```

Copy these values into each `apps/*/.env.local` file.

### Step 3: Fill in Brand-Specific Values

Edit each `.env.local` file and replace placeholders:

```bash
# Required values (provided by CGK team):
BRAND_TENANT_SLUG=your-brand-slug
POSTGRES_URL=postgresql://...
REDIS_URL=redis://...

# Your custom domains:
NEXT_PUBLIC_ADMIN_URL=https://admin.yourbrand.com
NEXT_PUBLIC_STOREFRONT_URL=https://yourbrand.com
NEXT_PUBLIC_CREATOR_PORTAL_URL=https://creators.yourbrand.com

# To be filled in later (after creating accounts):
SHOPIFY_API_KEY=...              # From Shopify Partners
SHOPIFY_API_SECRET=...           # From Shopify Partners
STRIPE_SECRET_KEY=...            # From Stripe dashboard
STRIPE_PUBLISHABLE_KEY=...       # From Stripe dashboard
```

### Step 4: Environment Variable Checklist

Before proceeding, verify each app has these variables set:

**apps/admin/.env.local** (24 variables):

- ✅ `POSTGRES_URL`
- ✅ `REDIS_URL`
- ✅ `BRAND_TENANT_SLUG`
- ✅ `JWT_SECRET`
- ✅ `SESSION_SECRET`
- ✅ `ENCRYPTION_KEY`
- ✅ `NEXT_PUBLIC_ADMIN_URL`
- ✅ `NEXT_PUBLIC_STOREFRONT_URL`

**apps/storefront/.env.local** (18 variables):

- ✅ `POSTGRES_URL`
- ✅ `REDIS_URL`
- ✅ `BRAND_TENANT_SLUG`
- ✅ `NEXT_PUBLIC_STOREFRONT_URL`
- ✅ `SHOPIFY_STORE_DOMAIN`
- ✅ `SHOPIFY_STOREFRONT_ACCESS_TOKEN`

**apps/creator-portal/.env.local** (20 variables):

- ✅ `POSTGRES_URL`
- ✅ `REDIS_URL`
- ✅ `BRAND_TENANT_SLUG`
- ✅ `NEXT_PUBLIC_CREATOR_PORTAL_URL`

**apps/orchestrator/.env.local** (22 variables):

- ✅ `POSTGRES_URL`
- ✅ `REDIS_URL`
- ✅ `JWT_SECRET` (must match admin)

---

## Vercel Project Creation

You have two options: automated script or manual setup.

### Option A: Automated Setup (Recommended)

```bash
# Make script executable
chmod +x scripts/setup-brand-vercel.sh

# Run setup script
./scripts/setup-brand-vercel.sh \
  --brand your-brand-slug \
  --team your-vercel-team-id \
  --domain yourbrand.com

# Example:
./scripts/setup-brand-vercel.sh \
  --brand meliusly \
  --team team_abc123xyz \
  --domain meliusly.com
```

The script will:

1. Create 4 Vercel projects
2. Link them to your GitHub repo
3. Configure build settings
4. Upload environment variables from `.env.local` files
5. Set up custom domains

**Expected output:**

```
✓ Created project: your-brand-admin
✓ Created project: your-brand-storefront
✓ Created project: your-brand-creator-portal
✓ Created project: your-brand-orchestrator
✓ Uploaded 24 environment variables to admin
✓ Uploaded 18 environment variables to storefront
✓ Uploaded 20 environment variables to creator-portal
✓ Uploaded 22 environment variables to orchestrator
✓ Configured custom domains
```

### Option B: Manual Setup

If the script fails or you prefer manual setup:

#### Step 1: Create Vercel Projects

For each app (admin, storefront, creator-portal, orchestrator):

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project:
   - **Project Name**: `{brand}-{app}` (e.g., `meliusly-admin`)
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/{app}`
   - **Build Command**: `cd ../.. && pnpm build --filter={app}`
   - **Output Directory**: Leave as default (.next)
   - **Install Command**: `pnpm install`

#### Step 2: Upload Environment Variables

For each project:

1. Go to Project Settings → Environment Variables
2. Add each variable from `apps/{app}/.env.local`
3. Set environment to: **Production, Preview, Development** (all three)
4. Click "Save"

**Tip**: Use Vercel CLI to bulk upload:

```bash
# Navigate to app directory
cd apps/admin

# Login to Vercel
vercel login

# Link project
vercel link --yes

# Upload all env vars from .env.local
vercel env pull .env.vercel.local  # This will create .env.vercel.local
# Then manually add via dashboard or use:
cat .env.local | while IFS='=' read -r key value; do
  [ -z "$key" ] || [ "${key:0:1}" = "#" ] && continue
  echo "$value" | vercel env add "$key" production preview development
done
```

#### Step 3: Configure Custom Domains

For each project:

1. Go to Project Settings → Domains
2. Add your domain:
   - **Admin**: `admin.yourbrand.com`
   - **Storefront**: `yourbrand.com` and `www.yourbrand.com`
   - **Creator Portal**: `creators.yourbrand.com`
   - **Orchestrator**: `orchestrator.yourbrand.com` (internal only)

3. Vercel will provide DNS records to add:
   - For subdomains: Add CNAME record pointing to `cname.vercel-dns.com`
   - For apex domain: Add A record pointing to `76.76.21.21`

4. Add DNS records in your domain registrar/Cloudflare

5. Wait for DNS propagation (5-60 minutes)

---

## Shopify App Setup

**CRITICAL**: Shopify deprecated custom apps created in Admin. Apps MUST be created in Shopify Partners Dashboard.

### Step 1: Create Shopify Partners Account

1. Go to https://partners.shopify.com
2. Sign up for a partner account (free)
3. Complete account setup

### Step 2: Create App in Partners Dashboard

1. Click "Apps" in left sidebar
2. Click "Create app"
3. Choose "Public app" (even for single-store use)
4. Fill in app details:
   - **App name**: `{Your Brand} Platform` (e.g., "Meliusly Platform")
   - **App URL**: `https://admin.yourbrand.com/api/shopify/auth`
   - **Allowed redirection URL(s)**:
     ```
     https://admin.yourbrand.com/api/shopify/auth/callback
     https://admin.yourbrand.com/api/shopify/auth/token
     ```

5. Click "Create app"

### Step 3: Configure OAuth Scopes

1. Go to "Configuration" tab
2. Click "Configure" under "Admin API access scopes"
3. Select required scopes:

   ```
   read_products, write_products
   read_orders, write_orders
   read_customers, write_customers
   read_inventory, write_inventory
   read_fulfillments, write_fulfillments
   read_shipping, write_shipping
   read_content, write_content
   read_themes, write_themes
   read_script_tags, write_script_tags
   read_webhooks, write_webhooks
   ```

4. Click "Save"

### Step 4: Get API Credentials

1. Go to "Overview" tab
2. Copy **Client ID** (this is your `SHOPIFY_API_KEY`)
3. Click "Client secret" → "Show" → Copy (this is your `SHOPIFY_API_SECRET`)

### Step 5: Update Environment Variables

Add to all `apps/*/.env.local` files and Vercel:

```bash
SHOPIFY_API_KEY=your_client_id_from_step_4
SHOPIFY_API_SECRET=your_client_secret_from_step_4
SHOPIFY_STORE_DOMAIN=yourbrand.myshopify.com
SHOPIFY_APP_URL=https://admin.yourbrand.com
```

Update in Vercel:

```bash
cd apps/admin
vercel env add SHOPIFY_API_KEY production preview development
# Paste value when prompted
vercel env add SHOPIFY_API_SECRET production preview development
# Paste value when prompted
```

### Step 6: Install App to Your Store

1. Go to your Shopify Partners dashboard
2. Click your app → "Test your app"
3. Select your development store (or create one)
4. Click "Install app"
5. Approve permissions
6. App is now installed!

### Step 7: Create Storefront Access Token

The Storefront API requires a separate token (created via Admin API):

1. Go to your Shopify Admin
2. Settings → Apps and sales channels → Develop apps
3. Click "Create an app"
4. Name it "Headless Storefront"
5. Configure Admin API scopes (same as above)
6. Configure Storefront API scopes:

   ```
   unauthenticated_read_product_listings
   unauthenticated_read_product_inventory
   unauthenticated_read_product_tags
   unauthenticated_read_product_pickup_locations
   unauthenticated_read_collection_listings
   unauthenticated_read_checkouts
   unauthenticated_write_checkouts
   unauthenticated_read_customers
   unauthenticated_write_customers
   ```

7. Install app → Reveal API credentials
8. Copy **Storefront API access token**

Update environment variables:

```bash
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token_from_step_8
```

---

## Stripe Connect Setup

### Step 1: Create Stripe Account

1. Go to https://stripe.com
2. Sign up for account
3. Complete business verification (required for Connect)

### Step 2: Enable Stripe Connect

1. In Stripe Dashboard, click "Connect" in left sidebar
2. Click "Get started"
3. Choose "Platform or marketplace"
4. Complete Connect onboarding

### Step 3: Get API Keys

1. Click "Developers" → "API keys"
2. Copy keys:
   - **Publishable key**: Starts with `pk_test_` or `pk_live_`
   - **Secret key**: Starts with `sk_test_` or `sk_live_`

**IMPORTANT**: Start with test keys. Switch to live keys only after thorough testing.

### Step 4: Configure Webhook Endpoints

Stripe sends events to your app via webhooks. Set up endpoints:

1. Click "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Add endpoint URL: `https://admin.yourbrand.com/api/webhooks/stripe`
4. Select events to listen for:

   ```
   checkout.session.completed
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   invoice.payment_succeeded
   invoice.payment_failed
   payment_intent.succeeded
   payment_intent.payment_failed
   charge.refunded
   ```

5. Click "Add endpoint"
6. Copy **Signing secret** (starts with `whsec_`)

### Step 5: Update Environment Variables

Add to all `apps/*/.env.local` files and Vercel:

```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

Update in Vercel:

```bash
cd apps/admin
vercel env add STRIPE_SECRET_KEY production preview development
vercel env add STRIPE_PUBLISHABLE_KEY production preview development
vercel env add STRIPE_WEBHOOK_SECRET production preview development
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production preview development
```

---

## First Deployment

### Step 1: Verify Local Build

Before deploying, verify the apps build locally:

```bash
# Install dependencies
pnpm install

# Type check (faster than build)
pnpm turbo typecheck

# If type check passes, build
pnpm build --filter=admin
pnpm build --filter=storefront
pnpm build --filter=creator-portal
pnpm build --filter=orchestrator
```

**Expected output**: No errors, all builds succeed.

### Step 2: Commit and Push

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: initial brand deployment configuration

- Added environment variables for all apps
- Configured Shopify app integration
- Set up Stripe Connect
- Ready for first deployment

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to GitHub
git push origin brand/{your-brand-slug}

# Optionally, merge to main for production deployment
git checkout main
git merge brand/{your-brand-slug}
git push origin main
```

### Step 3: Watch Vercel Deployments

Vercel automatically deploys when you push to GitHub.

1. Go to https://vercel.com/dashboard
2. Click on each project
3. Watch deployment logs
4. Verify all 4 apps deploy successfully

**Deployment order** (Vercel deploys in parallel):

- Admin: ~3-5 minutes
- Storefront: ~3-5 minutes
- Creator Portal: ~3-5 minutes
- Orchestrator: ~3-5 minutes

**Total time**: ~5-7 minutes for all apps

### Step 4: Verify Deployments

Check each app's deployment URL:

```bash
# Admin
open https://admin.yourbrand.com

# Storefront
open https://yourbrand.com

# Creator Portal
open https://creators.yourbrand.com

# Orchestrator (internal only, may require auth)
open https://orchestrator.yourbrand.com
```

---

## Testing Checklist

After deployment, verify everything works:

### Admin Panel Tests

1. **Load Admin Panel**
   - [ ] Navigate to `https://admin.yourbrand.com`
   - [ ] Page loads without errors
   - [ ] Login page displays

2. **Authentication**
   - [ ] Login with test credentials
   - [ ] JWT token generated
   - [ ] Session persists across page reloads
   - [ ] Logout works

3. **Database Queries**
   - [ ] Navigate to Orders page
   - [ ] Data loads from tenant schema
   - [ ] Create test order
   - [ ] Verify order appears in list

4. **Shopify Integration**
   - [ ] Products sync from Shopify
   - [ ] Webhooks received from Shopify
   - [ ] Product updates reflected in admin

5. **Cache Functionality**
   - [ ] Check Redis connection in logs
   - [ ] Verify cache hits/misses
   - [ ] Clear cache works

### Storefront Tests

1. **Load Storefront**
   - [ ] Navigate to `https://yourbrand.com`
   - [ ] Page loads with products
   - [ ] No console errors

2. **Product Display**
   - [ ] Products load from Shopify
   - [ ] Images display correctly
   - [ ] Product details page works

3. **Cart Functionality**
   - [ ] Add product to cart
   - [ ] Cart persists across pages
   - [ ] Update quantities
   - [ ] Remove items

4. **Checkout Flow**
   - [ ] Proceed to checkout
   - [ ] Stripe Checkout loads
   - [ ] Test payment succeeds (use test card: 4242 4242 4242 4242)
   - [ ] Order confirmation page displays

### Creator Portal Tests

1. **Load Creator Portal**
   - [ ] Navigate to `https://creators.yourbrand.com`
   - [ ] Login page displays
   - [ ] Dashboard loads after login

2. **Content Management**
   - [ ] Upload test video
   - [ ] Video processes correctly
   - [ ] Thumbnail generated

3. **Payments**
   - [ ] View earnings dashboard
   - [ ] Request payout
   - [ ] Verify Stripe Connect account link

### Webhook Tests

1. **Shopify Webhooks**
   - [ ] Create product in Shopify
   - [ ] Verify webhook received at `https://admin.yourbrand.com/api/webhooks/shopify`
   - [ ] Product synced to database

2. **Stripe Webhooks**
   - [ ] Complete test purchase
   - [ ] Verify webhook received at `https://admin.yourbrand.com/api/webhooks/stripe`
   - [ ] Order status updated

### Performance Tests

1. **Page Load Times**
   - [ ] Admin loads in <2 seconds
   - [ ] Storefront loads in <1.5 seconds
   - [ ] Creator Portal loads in <2 seconds

2. **Database Query Performance**
   - [ ] Check Vercel logs for slow queries
   - [ ] Verify tenant isolation (`withTenant()` used)
   - [ ] No N+1 query issues

### Security Tests

1. **Tenant Isolation**
   - [ ] Login as different tenant user
   - [ ] Verify no cross-tenant data leakage
   - [ ] Check database queries use correct schema

2. **Authentication**
   - [ ] Protected routes redirect to login
   - [ ] Invalid JWT rejected
   - [ ] Expired sessions handled correctly

3. **Environment Variables**
   - [ ] No secrets exposed in client-side code
   - [ ] API keys not visible in network requests
   - [ ] Webhook signatures verified

---

## Troubleshooting

### Build Failures

**Error: "Module not found"**

```bash
# Solution: Clear build cache and reinstall
rm -rf .next node_modules .turbo
pnpm install
pnpm build --filter={app}
```

**Error: "Type error: Property X does not exist"**

```bash
# Solution: Run type check to see full error
pnpm turbo typecheck

# Check for:
# 1. Missing imports
# 2. Incorrect type assertions
# 3. Outdated package versions
```

**Error: "NEXT*PUBLIC*\* variable undefined"**

```bash
# Solution: Verify env vars are prefixed correctly
# Client-side vars MUST start with NEXT_PUBLIC_
# Restart dev server after changing .env.local
```

### Deployment Failures

**Vercel Error: "Command failed with exit code 1"**

1. Check Vercel deployment logs
2. Look for specific error message
3. Common causes:
   - Missing environment variables
   - Build command incorrect
   - Root directory misconfigured

**Fix**: Go to Project Settings → General → verify:

- Root Directory: `apps/{app}`
- Build Command: `cd ../.. && pnpm build --filter={app}`
- Install Command: `pnpm install`

**Vercel Error: "Failed to load environment variables"**

1. Go to Project Settings → Environment Variables
2. Verify all required vars exist
3. Check variable names match exactly (case-sensitive)
4. Redeploy after adding missing vars

### Database Connection Issues

**Error: "Connection refused" or "ECONNREFUSED"**

```bash
# Solution: Verify POSTGRES_URL format
# Should be: postgresql://user:pass@host:port/dbname?sslmode=require

# Test connection locally:
cd apps/admin
node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.POSTGRES_URL)"
```

**Error: "relation does not exist"**

```bash
# Solution: Run migrations
export $(cat apps/admin/.env.local | grep POSTGRES_URL | xargs)
npx @cgk-platform/cli migrate

# Verify tenant schema exists:
npx @cgk-platform/cli doctor
```

**Error: "Tenant schema not found"**

```bash
# Solution: Create tenant schema
npx @cgk-platform/cli migrate --tenant {your-tenant-slug}

# Verify:
npx @cgk-platform/cli migrate:auto --dry-run
```

### Shopify Integration Issues

**Error: "Invalid API key"**

1. Verify `SHOPIFY_API_KEY` matches Client ID from Partners dashboard
2. Check `SHOPIFY_API_SECRET` matches Client secret
3. Redeploy after updating env vars

**Error: "App not installed"**

1. Go to Shopify Partners dashboard
2. Click your app → "Test your app"
3. Install to development store
4. Verify installation in Shopify Admin → Apps

**Error: "Storefront token invalid"**

1. Recreate Storefront Access Token in Shopify Admin
2. Update `SHOPIFY_STOREFRONT_ACCESS_TOKEN` in all apps
3. Redeploy

### Stripe Webhook Issues

**Error: "Webhook signature verification failed"**

1. Verify `STRIPE_WEBHOOK_SECRET` matches Signing Secret in Stripe Dashboard
2. Check webhook endpoint URL is correct
3. Ensure no proxy/CDN modifying request headers

**Error: "Event not found"**

1. Check Stripe Dashboard → Webhooks → Your Endpoint
2. Verify events are being sent
3. Check response codes (should be 200)
4. Review Vercel function logs for errors

### Cache Issues

**Error: "Redis connection failed"**

1. Verify `REDIS_URL` format: `redis://default:password@host:port`
2. Check Redis instance is running
3. Test connection:
   ```bash
   redis-cli -u $REDIS_URL ping
   # Should return: PONG
   ```

**Cache not clearing**

```bash
# Clear cache manually via Redis CLI
redis-cli -u $REDIS_URL FLUSHDB

# Or in code, verify using:
const cache = createTenantCache(tenantId)
await cache.clear()
```

### Domain/DNS Issues

**Domain shows "404: NOT_FOUND"**

1. Wait 5-60 minutes for DNS propagation
2. Verify DNS records:

   ```bash
   dig admin.yourbrand.com
   # Should show: CNAME cname.vercel-dns.com
   ```

3. Check Vercel Dashboard → Domains → verify domain added
4. Try incognito/private browsing (cache issue)

**SSL Certificate not provisioning**

1. Vercel auto-provisions SSL via Let's Encrypt
2. Can take up to 24 hours
3. Verify domain ownership via DNS
4. Check Vercel Dashboard → Domains → Certificate status

### Performance Issues

**Slow page loads (>5 seconds)**

1. Check Vercel function logs for slow database queries
2. Enable caching for expensive queries
3. Review database indexes:
   ```bash
   npx @cgk-platform/cli db:analyze
   ```

**High memory usage**

1. Check for memory leaks in long-running functions
2. Optimize image sizes (use Next.js Image component)
3. Review Vercel function logs for OOM errors

### Getting Help

If you're still stuck:

1. **Check Vercel logs**: Project → Deployments → Click deployment → View function logs
2. **Check database logs**: Contact CGK team for database access
3. **Review recent commits**: `git log --oneline -10`
4. **Compare with working deployment**: Check what changed
5. **Contact CGK support**: support@cgk-platform.com with:
   - Tenant slug
   - Error message
   - Vercel deployment URL
   - Steps to reproduce

---

## Next Steps

After successful deployment:

1. **Set up monitoring**
   - Configure Vercel Analytics
   - Set up error tracking (Sentry)
   - Enable uptime monitoring

2. **Configure backups**
   - Database backups (handled by CGK)
   - Redis backups (if self-hosted)
   - Media file backups (Cloudflare R2/S3)

3. **Launch checklist**
   - Switch Stripe to live keys
   - Update Shopify app to production mode
   - Configure production domains
   - Set up CDN (Cloudflare)
   - Enable rate limiting
   - Configure CORS for API routes

4. **Ongoing maintenance**
   - Pull updates from CGK template: `git fetch upstream && git merge upstream/main`
   - Monitor Vercel usage and costs
   - Review security logs weekly
   - Update dependencies monthly

---

## Appendix: Quick Reference

### Essential Commands

```bash
# Development
pnpm dev                                    # Start all apps
pnpm dev --filter admin                     # Start admin only

# Type checking (faster than build)
pnpm turbo typecheck                        # Check all packages

# Building
pnpm build --filter={app}                   # Build specific app

# Database
npx @cgk-platform/cli migrate               # Run migrations
npx @cgk-platform/cli migrate:auto          # Auto-migrate all tenants
npx @cgk-platform/cli doctor                # Check configuration

# Vercel
vercel env pull .env.local                  # Pull env vars from Vercel
vercel env add VAR_NAME production          # Add env var to Vercel
vercel logs                                 # View function logs

# Git
git fetch upstream                          # Fetch CGK updates
git merge upstream/main                     # Merge CGK updates
```

### Environment Variable Locations

```
apps/admin/.env.local              # Admin portal env vars
apps/storefront/.env.local         # Storefront env vars
apps/creator-portal/.env.local     # Creator portal env vars
apps/orchestrator/.env.local       # Orchestrator env vars
```

**NEVER** create `.env` files in:

- ❌ Root directory
- ❌ packages/\* directories

### Important URLs

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Shopify Partners**: https://partners.shopify.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **CGK Platform Hub**: https://hub.cgk-platform.com (coming soon)

### Support Contacts

- **Technical Support**: support@cgk-platform.com
- **Slack Community**: #cgk-platform-help
- **Documentation**: https://docs.cgk-platform.com

---

**Need help?** Join our Slack community or email support@cgk-platform.com.

**Found an issue with this guide?** Submit a PR or open an issue at https://github.com/cgk-platform/cgk-template.
