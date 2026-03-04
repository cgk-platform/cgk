# CGK Platform Environment Variables Reference

> **Comprehensive reference for all ~150 environment variables in the CGK Platform**
>
> **Last Updated**: 2026-03-03

---

## Table of Contents

- [Quick Start](#quick-start)
- [Brand Configuration](#1-brand-configuration)
- [CGK Platform Hub (Provided)](#2-cgk-platform-hub-provided)
- [Platform Secrets (Generated)](#3-platform-secrets-generated)
- [Shopify Integration](#4-shopify-integration)
- [Stripe/Payments](#5-stripepayments)
- [Email (Resend)](#6-email-resend)
- [Background Jobs](#7-background-jobs)
- [Video/Media](#8-videomedia)
- [Analytics](#9-analytics)
- [AI/LLM](#10-aillm)
- [openCLAW Integration](#10b-openclaw-integration)
- [Monitoring](#11-monitoring)
- [Internal/Platform](#12-internalplatform)
- [Auto-Populated Variables](#13-auto-populated-variables)
- [Security Best Practices](#security-best-practices)

---

## Quick Start

### For Brand Forks

```bash
# 1. Copy template to each app
cp .env.brand-template apps/admin/.env.local
cp .env.brand-template apps/storefront/.env.local
cp .env.brand-template apps/creator-portal/.env.local
cp .env.brand-template apps/contractor-portal/.env.local

# 2. Generate secrets
./scripts/generate-brand-secrets.sh your-brand-name

# 3. Update brand configuration section
# 4. Add your integration credentials
# 5. Push to Vercel for production
cd apps/admin
vercel env add VAR_NAME production --scope your-team
```

### For Local Development

```bash
# Pull from Vercel (recommended)
cd apps/<app-name>
vercel env pull .env.local --scope cgk-linens-88e79683

# Or copy from .env.example
cp apps/<app-name>/.env.example apps/<app-name>/.env.local
```

---

## 1. Brand Configuration

**Purpose**: Basic brand information and URLs. These are **YOUR** values specific to your deployment.

| Variable                       | Description                              | Where to Get                                | Required    | Apps Needed | Example                             |
| ------------------------------ | ---------------------------------------- | ------------------------------------------- | ----------- | ----------- | ----------------------------------- |
| `DEFAULT_TENANT_SLUG`          | Primary tenant identifier for this brand | Choose a URL-safe slug (lowercase, hyphens) | ✅ Required | All         | `meliusly`                          |
| `NEXT_PUBLIC_SITE_NAME`        | Brand display name                       | Your brand name                             | ✅ Required | All         | `Meliusly`                          |
| `COMPANY_NAME`                 | Legal company name                       | Your company's legal entity name            | ✅ Required | All         | `Meliusly LLC`                      |
| `APP_URL`                      | Primary app URL (server-side)            | Your admin domain                           | ✅ Required | All         | `https://admin.meliusly.com`        |
| `NEXT_PUBLIC_APP_URL`          | Primary app URL (client-side)            | Same as `APP_URL`                           | ✅ Required | All         | `https://admin.meliusly.com`        |
| `NEXT_PUBLIC_URL`              | Alternative public URL                   | Same as `APP_URL`                           | ✅ Required | All         | `https://admin.meliusly.com`        |
| `NEXT_PUBLIC_SITE_URL`         | Site metadata URL                        | Same as `APP_URL`                           | ✅ Required | All         | `https://admin.meliusly.com`        |
| `NEXT_PUBLIC_ADMIN_URL`        | Admin portal URL                         | Your admin domain                           | ✅ Required | All         | `https://admin.meliusly.com`        |
| `ADMIN_BASE_URL`               | Admin base URL (server-side)             | Same as admin URL                           | ✅ Required | All         | `https://admin.meliusly.com`        |
| `NEXT_PUBLIC_STOREFRONT_URL`   | Storefront URL                           | Your storefront domain                      | ✅ Required | All         | `https://shop.meliusly.com`         |
| `STOREFRONT_URL`               | Storefront URL (server-side)             | Same as storefront URL                      | ✅ Required | All         | `https://shop.meliusly.com`         |
| `NEXT_PUBLIC_ORCHESTRATOR_URL` | Super admin dashboard URL                | Orchestrator domain                         | Optional    | All         | `https://orchestrator.meliusly.com` |
| `CREATOR_PORTAL_URL`           | Creator portal URL                       | Creator portal domain                       | ✅ Required | All         | `https://creators.meliusly.com`     |
| `CONTRACTOR_PORTAL_URL`        | Contractor portal URL                    | Contractor portal domain                    | ✅ Required | All         | `https://contractors.meliusly.com`  |

**Security Considerations**:

- URLs must match Vercel deployment domains
- Must be HTTPS in production
- Used for CORS, OAuth callbacks, webhooks

**Related Variables**: All URL variables must be consistent across apps for cross-app navigation.

---

## 2. CGK Platform Hub (Provided)

**Purpose**: Database and cache credentials **provided by CGK Platform team**. DO NOT CHANGE these unless migrating infrastructure.

### Database (Neon PostgreSQL)

| Variable                   | Description                     | Where to Get    | Required    | Apps Needed | Example                                        |
| -------------------------- | ------------------------------- | --------------- | ----------- | ----------- | ---------------------------------------------- |
| `DATABASE_URL`             | Primary pooled connection       | Provided by CGK | ✅ Required | All         | `postgres://user:pass@host/db?sslmode=require` |
| `DATABASE_URL_UNPOOLED`    | Direct non-pooled connection    | Provided by CGK | ✅ Required | All         | `postgres://user:pass@host/db`                 |
| `POSTGRES_URL`             | Vercel Postgres format (pooled) | Provided by CGK | ✅ Required | All         | Same as `DATABASE_URL`                         |
| `POSTGRES_URL_NO_SSL`      | Non-SSL connection (local only) | Provided by CGK | Optional    | All         | `postgres://user:pass@host/db`                 |
| `POSTGRES_URL_NON_POOLING` | Non-pooled connection           | Provided by CGK | ✅ Required | All         | Same as `DATABASE_URL_UNPOOLED`                |
| `POSTGRES_PRISMA_URL`      | Prisma-compatible connection    | Provided by CGK | ✅ Required | All         | Same as `DATABASE_URL`                         |
| `POSTGRES_HOST`            | Database hostname               | Provided by CGK | ✅ Required | All         | `ep-xxx.us-east-1.aws.neon.tech`               |
| `POSTGRES_DATABASE`        | Database name                   | Provided by CGK | ✅ Required | All         | `cgk_platform`                                 |
| `POSTGRES_USER`            | Database username               | Provided by CGK | ✅ Required | All         | `cgk_admin`                                    |
| `POSTGRES_PASSWORD`        | Database password               | Provided by CGK | ✅ Required | All         | `***`                                          |
| `PGHOST`                   | PostgreSQL host (CLI format)    | Provided by CGK | ✅ Required | All         | Same as `POSTGRES_HOST`                        |
| `PGHOST_UNPOOLED`          | Unpooled host                   | Provided by CGK | Optional    | All         | Same as `POSTGRES_HOST`                        |
| `PGDATABASE`               | Database name (CLI format)      | Provided by CGK | ✅ Required | All         | Same as `POSTGRES_DATABASE`                    |
| `PGUSER`                   | Database user (CLI format)      | Provided by CGK | ✅ Required | All         | Same as `POSTGRES_USER`                        |
| `PGPASSWORD`               | Database password (CLI format)  | Provided by CGK | ✅ Required | All         | Same as `POSTGRES_PASSWORD`                    |
| `NEON_PROJECT_ID`          | Neon project identifier         | Provided by CGK | Optional    | All         | `ep-xxx`                                       |

**Security Considerations**:

- **NEVER commit these to git**
- Store in Vercel environment variables for production
- Use `.env.local` (gitignored) for local development
- Multi-tenant isolation via schema-per-tenant (enforced by `withTenant()`)

### Redis / KV (Upstash Redis)

| Variable                      | Description                   | Where to Get    | Required    | Apps Needed | Example                          |
| ----------------------------- | ----------------------------- | --------------- | ----------- | ----------- | -------------------------------- |
| `REDIS_URL`                   | Standard Redis connection URL | Provided by CGK | ✅ Required | All         | `redis://default:pass@host:port` |
| `KV_URL`                      | Vercel KV format              | Provided by CGK | ✅ Required | All         | Same as `REDIS_URL`              |
| `KV_REST_API_URL`             | REST API endpoint             | Provided by CGK | ✅ Required | All         | `https://xxx.upstash.io`         |
| `KV_REST_API_TOKEN`           | REST API token                | Provided by CGK | ✅ Required | All         | `***`                            |
| `KV_REST_API_READ_ONLY_TOKEN` | Read-only API token           | Provided by CGK | Optional    | All         | `***`                            |
| `UPSTASH_REDIS_REST_URL`      | Upstash REST URL              | Provided by CGK | ✅ Required | All         | Same as `KV_REST_API_URL`        |
| `UPSTASH_REDIS_REST_TOKEN`    | Upstash REST token            | Provided by CGK | ✅ Required | All         | Same as `KV_REST_API_TOKEN`      |

**Security Considerations**:

- Tenant isolation via `createTenantCache(tenantId)` key prefixing
- REST API used in edge runtime, direct connection in Node.js runtime

---

## 3. Platform Secrets (Generated)

**Purpose**: Unique secrets for your brand. Generate using `./scripts/generate-brand-secrets.sh your-brand-name`.

### Authentication Secrets

| Variable                | Description               | Where to Get           | Required    | Apps Needed         | Example     |
| ----------------------- | ------------------------- | ---------------------- | ----------- | ------------------- | ----------- |
| `JWT_SECRET`            | Admin JWT signing key     | Generate (64-char hex) | ✅ Required | admin, orchestrator | `a1b2c3...` |
| `SESSION_SECRET`        | Session cookie encryption | Generate (64-char hex) | ✅ Required | admin, orchestrator | `d4e5f6...` |
| `CREATOR_JWT_SECRET`    | Creator portal JWT key    | Generate (64-char hex) | ✅ Required | creator-portal      | `g7h8i9...` |
| `CONTRACTOR_JWT_SECRET` | Contractor portal JWT key | Generate (64-char hex) | ✅ Required | contractor-portal   | `j0k1l2...` |

**Security Considerations**:

- **MUST be unique per brand** (never reuse across brands)
- **NEVER share or commit to git**
- Rotate if compromised (invalidates all sessions)
- Each portal has isolated JWT secrets for security boundaries

### Encryption Keys

| Variable                       | Description                  | Where to Get           | Required    | Apps Needed                | Example     |
| ------------------------------ | ---------------------------- | ---------------------- | ----------- | -------------------------- | ----------- |
| `ENCRYPTION_KEY`               | General-purpose encryption   | Generate (64-char hex) | ✅ Required | All                        | `m3n4o5...` |
| `INTEGRATION_ENCRYPTION_KEY`   | Integration credentials      | Generate (64-char hex) | ✅ Required | All                        | `p6q7r8...` |
| `SHOPIFY_TOKEN_ENCRYPTION_KEY` | Shopify access tokens        | Generate (64-char hex) | ✅ Required | All                        | `s9t0u1...` |
| `DAM_TOKEN_ENCRYPTION_KEY`     | Digital asset tokens         | Generate (64-char hex) | Optional    | All                        | `v2w3x4...` |
| `TAX_TIN_ENCRYPTION_KEY`       | Tax ID numbers (SSN/EIN)     | Generate (64-char hex) | ✅ Required | admin, creator, contractor | `y5z6a7...` |
| `TAX_ENCRYPTION_KEY`           | Tax documents/1099s          | Generate (64-char hex) | ✅ Required | admin, creator, contractor | `b8c9d0...` |
| `SLACK_TOKEN_ENCRYPTION_KEY`   | Slack OAuth tokens           | Generate (64-char hex) | Optional    | admin                      | `e1f2g3...` |
| `GSC_ENCRYPTION_KEY`           | Google Search Console tokens | Generate (64-char hex) | Optional    | admin                      | `h4i5j6...` |
| `GOOGLE_ADS_ENCRYPTION_KEY`    | Google Ads OAuth tokens      | Generate (64-char hex) | Optional    | admin                      | `k7l8m9...` |
| `META_ENCRYPTION_KEY`          | Meta (Facebook) tokens       | Generate (64-char hex) | Optional    | admin                      | `n0o1p2...` |
| `TIKTOK_ENCRYPTION_KEY`        | TikTok OAuth tokens          | Generate (64-char hex) | Optional    | admin                      | `q3r4s5...` |

**Security Considerations**:

- Uses AES-256-GCM encryption
- Keys stored in DB are encrypted at rest
- Separate keys per integration for blast radius limitation
- TAX keys have highest security requirements (PII data)

### Platform API Keys

| Variable               | Description                 | Where to Get      | Required    | Apps Needed | Example                   |
| ---------------------- | --------------------------- | ----------------- | ----------- | ----------- | ------------------------- |
| `CGK_PLATFORM_API_KEY` | Inter-app communication     | Generate (base64) | ✅ Required | All         | `openssl rand -base64 32` |
| `INTERNAL_API_KEY`     | Internal API authentication | Generate (base64) | ✅ Required | All         | `openssl rand -base64 32` |
| `PLATFORM_API_KEY`     | Platform-level API access   | Generate (base64) | Optional    | All         | `openssl rand -base64 32` |

**Security Considerations**:

- Used for Shopify app → Admin bundle/order sync
- Must match across all apps for authenticated inter-app calls
- Validated in API routes via header checks

**Related Variables**: All API keys must be identical across apps.

---

## 4. Shopify Integration

**Purpose**: Connect to your Shopify store. Create app at https://partners.shopify.com/organizations.

| Variable                          | Description                   | Where to Get                      | Required    | Apps Needed        | Example                                           |
| --------------------------------- | ----------------------------- | --------------------------------- | ----------- | ------------------ | ------------------------------------------------- |
| `SHOPIFY_CLIENT_ID`               | Shopify app client ID         | Partners Dashboard → App Settings | ✅ Required | admin, shopify-app | `a1b2c3d4e5f6g7h8`                                |
| `SHOPIFY_CLIENT_SECRET`           | Shopify app secret            | Partners Dashboard → App Settings | ✅ Required | admin, shopify-app | `shpss_***`                                       |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Headless storefront API token | Create via Admin API mutation     | ✅ Required | storefront         | `shpat_***`                                       |
| `SHOPIFY_STORE_DOMAIN`            | Your Shopify store domain     | Your store URL                    | ✅ Required | storefront         | `meliusly.myshopify.com`                          |
| `SHOPIFY_API_VERSION`             | API version to use            | Use latest stable                 | ✅ Required | All                | `2026-01`                                         |
| `SHOPIFY_WEBHOOK_BASE_URL`        | Webhook callback URL          | Your admin URL + path             | ✅ Required | admin              | `https://admin.meliusly.com/api/webhooks/shopify` |
| `SHOPIFY_TOKEN_ENCRYPTION_KEY`    | Encrypt stored tokens         | Generate (64-char hex)            | ✅ Required | All                | See [Platform Secrets](#encryption-keys)          |

**How to Get Storefront Access Token**:

```typescript
// Use Admin API mutation via existing CGK Platform app
const mutation = `
  mutation {
    storefrontAccessTokenCreate(input: {
      title: "Headless Storefront"
    }) {
      storefrontAccessToken {
        accessToken
      }
    }
  }
`
```

**Security Considerations**:

- **DO NOT** create "custom app" in Shopify Admin (deprecated since 2024)
- Must create app in Partners dashboard
- Tokens are encrypted in database using `SHOPIFY_TOKEN_ENCRYPTION_KEY`
- Webhook URLs must be publicly accessible
- Multi-tenant: Uses `public.shopify_app_installations` for shop-to-tenant mapping

**Related Variables**: `SHOPIFY_WEBHOOK_BASE_URL` must match `NEXT_PUBLIC_ADMIN_URL`.

---

## 5. Stripe/Payments

**Purpose**: Payment processing and marketplace payouts.

### Stripe

| Variable            | Description              | Where to Get                 | Required    | Apps Needed                | Example                        |
| ------------------- | ------------------------ | ---------------------------- | ----------- | -------------------------- | ------------------------------ |
| `STRIPE_SECRET_KEY` | Stripe API secret key    | Dashboard → API Keys         | ✅ Required | admin, creator, contractor | `sk_live_***` or `sk_test_***` |
| `STRIPE_CLIENT_ID`  | Stripe Connect client ID | Dashboard → Connect Settings | ✅ Required | admin, creator             | `ca_***`                       |

**How to Get**:

1. Create account at https://dashboard.stripe.com
2. Use Stripe Connect for marketplace/creator payments
3. API version: `2025-02-24.acacia` (set in code, not env var)

**Security Considerations**:

- Use `sk_test_*` keys for development/staging
- Use `sk_live_*` keys for production only
- Webhook signing secrets stored per-tenant in database
- Stripe Connect for split payments (platform fee + creator payout)

### Wise (International Payments)

| Variable          | Description          | Where to Get             | Required | Apps Needed                | Example                |
| ----------------- | -------------------- | ------------------------ | -------- | -------------------------- | ---------------------- |
| `WISE_API_KEY`    | Wise API key         | Wise Business → API      | Optional | admin, creator, contractor | `***`                  |
| `WISE_API_TOKEN`  | Wise API token       | Wise Business → API      | Optional | admin, creator, contractor | `***`                  |
| `WISE_API_URL`    | Wise API base URL    | Documentation            | Optional | admin, creator, contractor | `https://api.wise.com` |
| `WISE_PROFILE_ID` | Your Wise profile ID | Wise Business → Settings | Optional | admin, creator, contractor | `12345678`             |

**When to Use**: Required if you have international creators/contractors.

**Security Considerations**:

- Only required if paying international contractors/creators
- Uses Wise Borderless accounts for multi-currency
- Credentials stored encrypted in database

---

## 6. Email (Resend)

**Purpose**: Transactional emails (magic links, notifications, receipts).

| Variable                  | Description            | Where to Get                | Required    | Apps Needed | Example                   |
| ------------------------- | ---------------------- | --------------------------- | ----------- | ----------- | ------------------------- |
| `RESEND_API_KEY`          | Resend API key         | Resend Dashboard → API Keys | ✅ Required | All         | `re_***`                  |
| `RESEND_API_URL`          | Resend API endpoint    | Documentation               | ✅ Required | All         | `https://api.resend.com`  |
| `RESEND_WEBHOOK_SECRET`   | Webhook verification   | Resend Dashboard → Webhooks | Optional    | admin       | `whsec_***`               |
| `EMAIL_FROM`              | Default from email     | Your verified domain        | ✅ Required | All         | `noreply@meliusly.com`    |
| `ALERT_EMAIL_FROM`        | Alert email sender     | Your verified domain        | Optional    | admin       | `alerts@meliusly.com`     |
| `ALERT_EMAIL_RECIPIENTS`  | Alert email recipients | Your team emails            | Optional    | admin       | `admin@meliusly.com`      |
| `TREASURY_EMAIL_FROM`     | Treasury email sender  | Your verified domain        | Optional    | admin       | `treasury@meliusly.com`   |
| `TREASURY_EMAIL_REPLY_TO` | Treasury reply-to      | Your accounting email       | Optional    | admin       | `accounting@meliusly.com` |

**Setup Steps**:

1. Create account at https://resend.com
2. Verify your domain (add DNS records)
3. Create API key
4. Configure webhook endpoint (optional)

**Security Considerations**:

- Domain must be verified in Resend
- Use subdomains for different email types (noreply@, alerts@, treasury@)
- Rate limits: Free tier = 100 emails/day, paid = unlimited

**Related Variables**: All `*_EMAIL_FROM` addresses must use verified domains.

---

## 7. Background Jobs

**Purpose**: Asynchronous job processing. Choose **ONE** provider (Inngest OR Trigger.dev).

### Inngest

| Variable              | Description                    | Where to Get     | Required | Apps Needed | Example                   |
| --------------------- | ------------------------------ | ---------------- | -------- | ----------- | ------------------------- |
| `INNGEST_EVENT_KEY`   | Inngest event key              | Dashboard → Keys | Optional | All         | `***`                     |
| `INNGEST_SIGNING_KEY` | Webhook signature verification | Dashboard → Keys | Optional | All         | `signkey-***`             |
| `INNGEST_API_URL`     | Inngest API endpoint           | Documentation    | Optional | All         | `https://api.inngest.com` |
| `INNGEST_BASE_URL`    | Inngest base URL               | Documentation    | Optional | All         | `https://api.inngest.com` |

**Setup**: Create account at https://www.inngest.com

### Trigger.dev

| Variable                 | Description              | Where to Get                 | Required | Apps Needed | Example                   |
| ------------------------ | ------------------------ | ---------------------------- | -------- | ----------- | ------------------------- |
| `TRIGGER_SECRET_KEY`     | Production secret key    | Dashboard → Keys             | Optional | All         | `tr_prod_***`             |
| `TRIGGER_DEV_SECRET_KEY` | Development secret key   | Dashboard → Keys             | Optional | All         | `tr_dev_***`              |
| `TRIGGER_API_URL`        | Trigger.dev API endpoint | Documentation                | Optional | All         | `https://api.trigger.dev` |
| `TRIGGER_PROJECT_REF`    | Project reference ID     | Dashboard → Project Settings | Optional | All         | `proj_***`                |

**Setup**: Create account at https://trigger.dev

**Security Considerations**:

- Use dev keys for local/staging, prod keys for production
- Jobs always include `{ tenantId }` in payload for isolation
- Both providers vendor-agnostic (abstracted via `@cgk-platform/jobs`)

**Related Variables**: Choose ONE provider. Do not configure both.

---

## 8. Video/Media

**Purpose**: Video hosting, file uploads, and digital asset management.

### Mux (Video)

| Variable             | Description                    | Where to Get                      | Required | Apps Needed       | Example |
| -------------------- | ------------------------------ | --------------------------------- | -------- | ----------------- | ------- |
| `MUX_TOKEN_ID`       | Mux API token ID               | Dashboard → Settings → API Access | Optional | admin, storefront | `***`   |
| `MUX_TOKEN_SECRET`   | Mux API token secret           | Dashboard → Settings → API Access | Optional | admin, storefront | `***`   |
| `MUX_WEBHOOK_SECRET` | Webhook signature verification | Dashboard → Settings → Webhooks   | Optional | admin             | `***`   |
| `MUX_TEST_MODE`      | Use test environment           | Set manually                      | Optional | admin, storefront | `false` |

**Setup**: Create account at https://dashboard.mux.com

**When to Use**: Required if using video content features (creator content, product videos).

### Vercel Blob (File Uploads)

| Variable                   | Description        | Where to Get                      | Required    | Apps Needed       | Example                                  |
| -------------------------- | ------------------ | --------------------------------- | ----------- | ----------------- | ---------------------------------------- |
| `BLOB_READ_WRITE_TOKEN`    | Blob storage token | Vercel Dashboard → Storage → Blob | ✅ Required | admin, storefront | `vercel_blob_rw_***`                     |
| `DAM_TOKEN_ENCRYPTION_KEY` | Encrypt DAM tokens | Generate (64-char hex)            | Optional    | All               | See [Platform Secrets](#encryption-keys) |

**Setup**: Vercel Dashboard → Storage → Create Blob Store

**Security Considerations**:

- Blob used for images, documents, user uploads
- Tenant-isolated via file path prefixing (`uploads/{tenantId}/...`)
- DAM tokens encrypted in database

### Transcription (Optional)

| Variable                    | Description          | Where to Get         | Required | Apps Needed | Example      |
| --------------------------- | -------------------- | -------------------- | -------- | ----------- | ------------ |
| `TRANSCRIPTION_PROVIDER`    | Provider to use      | Choose one           | Optional | admin       | `assemblyai` |
| `ASSEMBLYAI_API_KEY`        | AssemblyAI API key   | Dashboard → API Keys | Optional | admin       | `***`        |
| `ASSEMBLYAI_WEBHOOK_SECRET` | Webhook verification | Dashboard → Webhooks | Optional | admin       | `***`        |
| `DEEPGRAM_API_KEY`          | Deepgram API key     | Dashboard → API Keys | Optional | admin       | `***`        |
| `GLADIA_API_KEY`            | Gladia API key       | Dashboard → API Keys | Optional | admin       | `***`        |

**When to Use**: Required for video/audio transcription features.

### PDF Generation (Optional)

| Variable      | Description          | Where to Get     | Required | Apps Needed | Example                   |
| ------------- | -------------------- | ---------------- | -------- | ----------- | ------------------------- |
| `PDF_API_KEY` | PDF service API key  | Your PDF service | Optional | admin       | `***`                     |
| `PDF_API_URL` | PDF service endpoint | Your PDF service | Optional | admin       | `https://pdf.example.com` |

**Fallback**: Falls back to HTML preview if not configured.

**When to Use**: Required for treasury draw request PDF generation.

---

## 9. Analytics

**Purpose**: Marketing attribution, SEO, and customer tracking.

### Google OAuth (Base)

| Variable               | Description                | Where to Get              | Required | Apps Needed | Example                                               |
| ---------------------- | -------------------------- | ------------------------- | -------- | ----------- | ----------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID     | GCP Console → Credentials | Optional | admin       | `***-***.apps.googleusercontent.com`                  |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | GCP Console → Credentials | Optional | admin       | `GOCSPX-***`                                          |
| `GOOGLE_REDIRECT_URI`  | OAuth callback URL         | Set manually              | Optional | admin       | `https://admin.meliusly.com/api/auth/google/callback` |

### Google Search Console

| Variable             | Description             | Where to Get              | Required | Apps Needed | Example                                                    |
| -------------------- | ----------------------- | ------------------------- | -------- | ----------- | ---------------------------------------------------------- |
| `GSC_CLIENT_ID`      | GSC OAuth client ID     | GCP Console → Credentials | Optional | admin       | `***-***.apps.googleusercontent.com`                       |
| `GSC_CLIENT_SECRET`  | GSC OAuth client secret | GCP Console → Credentials | Optional | admin       | `GOCSPX-***`                                               |
| `GSC_ENCRYPTION_KEY` | Encrypt GSC tokens      | Generate (64-char hex)    | Optional | admin       | See [Platform Secrets](#encryption-keys)                   |
| `GSC_REDIRECT_URI`   | OAuth callback URL      | Set manually              | Optional | admin       | `https://admin.meliusly.com/api/integrations/gsc/callback` |

### Google Ads

| Variable                       | Description             | Where to Get              | Required | Apps Needed | Example                                  |
| ------------------------------ | ----------------------- | ------------------------- | -------- | ----------- | ---------------------------------------- |
| `GOOGLE_ADS_CLIENT_ID`         | Ads OAuth client ID     | GCP Console → Credentials | Optional | admin       | `***-***.apps.googleusercontent.com`     |
| `GOOGLE_ADS_CLIENT_SECRET`     | Ads OAuth client secret | GCP Console → Credentials | Optional | admin       | `GOCSPX-***`                             |
| `GOOGLE_ADS_DEVELOPER_TOKEN`   | Ads API developer token | Google Ads → API Center   | Optional | admin       | `***`                                    |
| `GOOGLE_ADS_ENCRYPTION_KEY`    | Encrypt Ads tokens      | Generate (64-char hex)    | Optional | admin       | See [Platform Secrets](#encryption-keys) |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Manager account ID      | Google Ads → Settings     | Optional | admin       | `123-456-7890`                           |

### Meta (Facebook/Instagram)

| Variable              | Description         | Where to Get                  | Required | Apps Needed | Example                                  |
| --------------------- | ------------------- | ----------------------------- | -------- | ----------- | ---------------------------------------- |
| `META_APP_ID`         | Meta app ID         | Meta for Developers → My Apps | Optional | admin       | `***`                                    |
| `META_APP_SECRET`     | Meta app secret     | Meta for Developers → My Apps | Optional | admin       | `***`                                    |
| `META_ENCRYPTION_KEY` | Encrypt Meta tokens | Generate (64-char hex)        | Optional | admin       | See [Platform Secrets](#encryption-keys) |

### TikTok

| Variable                | Description           | Where to Get                  | Required | Apps Needed | Example                                  |
| ----------------------- | --------------------- | ----------------------------- | -------- | ----------- | ---------------------------------------- |
| `TIKTOK_APP_ID`         | TikTok app ID         | TikTok for Business → My Apps | Optional | admin       | `***`                                    |
| `TIKTOK_APP_SECRET`     | TikTok app secret     | TikTok for Business → My Apps | Optional | admin       | `***`                                    |
| `TIKTOK_ENCRYPTION_KEY` | Encrypt TikTok tokens | Generate (64-char hex)        | Optional | admin       | See [Platform Secrets](#encryption-keys) |

### Client-Side Tracking (Storefront Only)

| Variable                            | Description              | Where to Get           | Required | Apps Needed | Example       |
| ----------------------------------- | ------------------------ | ---------------------- | -------- | ----------- | ------------- |
| `NEXT_PUBLIC_GTM_ID`                | Google Tag Manager ID    | GTM Dashboard          | Optional | storefront  | `GTM-XXXXXXX` |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID`       | TikTok Pixel ID          | TikTok Events Manager  | Optional | storefront  | `***`         |
| `NEXT_PUBLIC_LUCKY_ORANGE_ID`       | Lucky Orange site ID     | Lucky Orange Dashboard | Optional | storefront  | `***`         |
| `NEXT_PUBLIC_BWP_SITE_ID`           | Buy with Prime site ID   | Amazon BWP Dashboard   | Optional | storefront  | `***`         |
| `NEXT_PUBLIC_BWP_WIDGET_ID`         | Buy with Prime widget ID | Amazon BWP Dashboard   | Optional | storefront  | `***`         |
| `NEXT_PUBLIC_BAZAARVOICE_CLIENT_ID` | Bazaarvoice client ID    | Bazaarvoice Portal     | Optional | storefront  | `***`         |

### Marketing Tools

| Variable                | Description          | Where to Get                            | Required | Apps Needed       | Example  |
| ----------------------- | -------------------- | --------------------------------------- | -------- | ----------------- | -------- |
| `KLAVIYO_PRIVATE_KEY`   | Klaviyo API key      | Klaviyo → Account → Settings → API Keys | Optional | admin, storefront | `pk_***` |
| `KLAVIYO_EMAIL_LIST_ID` | Email list ID        | Klaviyo → Lists                         | Optional | admin, storefront | `***`    |
| `KLAVIYO_SMS_LIST_ID`   | SMS list ID          | Klaviyo → Lists                         | Optional | admin, storefront | `***`    |
| `YOTPO_APP_KEY`         | Yotpo app key        | Yotpo → Settings → General Settings     | Optional | admin, storefront | `***`    |
| `YOTPO_SECRET_KEY`      | Yotpo secret key     | Yotpo → Settings → General Settings     | Optional | admin, storefront | `***`    |
| `YOTPO_API_SECRET`      | Yotpo API secret     | Yotpo → Settings → API Credentials      | Optional | admin, storefront | `***`    |
| `LOOP_API_KEY`          | Loop Returns API key | Loop → Settings → API                   | Optional | admin, storefront | `***`    |

**Security Considerations**:

- Client-side variables (`NEXT_PUBLIC_*`) are exposed to browsers
- OAuth tokens stored encrypted in database
- Each integration has separate encryption key for isolation

---

## 10. AI/LLM

**Purpose**: AI features (content generation, chatbots, MCP server).

| Variable            | Description         | Where to Get                 | Required | Apps Needed       | Example                             |
| ------------------- | ------------------- | ---------------------------- | -------- | ----------------- | ----------------------------------- |
| `ANTHROPIC_API_KEY` | Claude API key      | Anthropic Console → API Keys | Optional | admin, mcp-server | `sk-ant-***`                        |
| `OPENAI_API_KEY`    | OpenAI API key      | OpenAI Platform → API Keys   | Optional | admin, mcp-server | `sk-***`                            |
| `MCP_SERVER_URL`    | MCP server endpoint | Your MCP deployment          | Optional | admin             | `https://cgk-mcp-server.vercel.app` |

**Setup**:

- Anthropic: https://console.anthropic.com
- OpenAI: https://platform.openai.com

**When to Use**: Required if using AI features (content generation, Claude MCP tools).

**Security Considerations**:

- API keys have usage limits and costs
- Monitor usage to avoid unexpected charges
- Use separate keys for dev/prod

---

## 10b. openCLAW Integration

**Purpose**: AI agent platform connecting the CGK Platform to multi-agent automation (video editing, ad creative, competitor intelligence, marketing).

### Command Center / Gateway

| Variable                        | Description                     | Where to Get    | Required           | Example                  |
| ------------------------------- | ------------------------------- | --------------- | ------------------ | ------------------------ |
| `OPENCLAW_CGK_PORT`             | CGK profile gateway port        | openCLAW config | For Command Center | `18789`                  |
| `OPENCLAW_RAWDOG_PORT`          | RAWDOG profile gateway port     | openCLAW config | For multi-profile  | `19001`                  |
| `OPENCLAW_VITA_PORT`            | VitaHustle profile gateway port | openCLAW config | For multi-profile  | `19021`                  |
| `OPENCLAW_CGK_GATEWAY_TOKEN`    | CGK gateway auth token          | openCLAW `.env` | For Command Center | `tok_***`                |
| `OPENCLAW_RAWDOG_GATEWAY_TOKEN` | RAWDOG gateway auth token       | openCLAW `.env` | For multi-profile  | `tok_***`                |
| `OPENCLAW_VITA_GATEWAY_TOKEN`   | VitaHustle gateway auth token   | openCLAW `.env` | For multi-profile  | `tok_***`                |
| `OPENCLAW_PROFILES`             | Explicit JSON profile config    | Manual          | Optional override  | `[{"slug":"brand",...}]` |
| `OPENCLAW_DEFAULT_PORT`         | Single-profile gateway port     | openCLAW config | For single-profile | `18789`                  |

### Skill Environment Variables (per-profile `.env`)

| Variable                   | Description                | Skill        | Where to Get                   |
| -------------------------- | -------------------------- | ------------ | ------------------------------ |
| `CGK_PLATFORM_API_URL`     | Platform API base URL      | video-editor | Your deployment URL            |
| `CGK_PLATFORM_API_KEY`     | Platform API key           | video-editor | `/admin/integrations/api-keys` |
| `CGK_PLATFORM_TENANT_SLUG` | Tenant slug for API access | video-editor | Platform config                |
| `META_AD_ACCOUNT_ID`       | Meta ad account            | meta-ads     | Facebook Business Manager      |
| `META_BUSINESS_ID`         | Meta business ID           | meta-ads     | Facebook Business Manager      |
| `META_PIXEL_ID`            | Meta pixel ID              | meta-ads     | Facebook Events Manager        |
| `KLAVIYO_API_KEY`          | Klaviyo private API key    | klaviyo      | Klaviyo Account > Settings     |
| `PEXELS_API_KEY`           | Pexels stock footage       | video-editor | pexels.com/api                 |
| `FREESOUND_API_KEY`        | Freesound sound effects    | video-editor | freesound.org/apiv2/apply      |
| `TRIPLE_WHALE_API_KEY`     | Triple Whale analytics     | triple-whale | Triple Whale dashboard         |

**Setup**: See [docs/setup/openclaw-integration.md](setup/openclaw-integration.md) for the full guide.

**When to Use**: Required if using openCLAW agent automation, Command Center, or Creative Studio features.

---

## 11. Monitoring

**Purpose**: Alerting, incident management, and system monitoring.

### Slack (Notifications)

| Variable                     | Description               | Where to Get                  | Required | Apps Needed | Example                                                      |
| ---------------------------- | ------------------------- | ----------------------------- | -------- | ----------- | ------------------------------------------------------------ |
| `SLACK_BOT_TOKEN`            | Slack bot token           | Slack API → Apps → OAuth      | Optional | admin       | `xoxb-***`                                                   |
| `SLACK_CLIENT_ID`            | Slack OAuth client ID     | Slack API → Apps → Basic Info | Optional | admin       | `***`                                                        |
| `SLACK_CLIENT_SECRET`        | Slack OAuth client secret | Slack API → Apps → Basic Info | Optional | admin       | `***`                                                        |
| `SLACK_OAUTH_REDIRECT_URI`   | OAuth callback URL        | Set manually                  | Optional | admin       | `https://admin.meliusly.com/api/integrations/slack/callback` |
| `SLACK_TOKEN_ENCRYPTION_KEY` | Encrypt Slack tokens      | Generate (64-char hex)        | Optional | admin       | See [Platform Secrets](#encryption-keys)                     |
| `SLACK_WEBHOOK_URL`          | Incoming webhook URL      | Slack → Incoming Webhooks     | Optional | admin       | `https://hooks.slack.com/services/***`                       |
| `SLACK_ALERT_CHANNEL`        | Alert channel name        | Your Slack workspace          | Optional | admin       | `#alerts`                                                    |

**Setup**: Create app at https://api.slack.com/apps

### SMS (Twilio)

| Variable            | Description               | Where to Get                | Required | Apps Needed | Example |
| ------------------- | ------------------------- | --------------------------- | -------- | ----------- | ------- |
| `TWILIO_AUTH_TOKEN` | Platform-level auth token | Twilio Console → Auth Token | Optional | admin       | `***`   |

**Note**: Tenant-specific Twilio credentials stored encrypted in `tenant_sms_settings` table.

**When to Use**: Required for webhook signature verification if using SMS features.

### Voice/Phone (Retell AI)

| Variable                | Description          | Where to Get                | Required | Apps Needed | Example |
| ----------------------- | -------------------- | --------------------------- | -------- | ----------- | ------- |
| `RETELL_API_KEY`        | Retell AI API key    | Retell Dashboard → API Keys | Optional | admin       | `***`   |
| `RETELL_WEBHOOK_SECRET` | Webhook verification | Retell Dashboard → Webhooks | Optional | admin       | `***`   |

**When to Use**: Required if using voice/phone AI features.

### Incident Management

| Variable                | Description           | Where to Get                        | Required | Apps Needed | Example                      |
| ----------------------- | --------------------- | ----------------------------------- | -------- | ----------- | ---------------------------- |
| `PAGERDUTY_ROUTING_KEY` | PagerDuty routing key | PagerDuty → Services → Integrations | Optional | admin       | `***`                        |
| `PAGERDUTY_SERVICE_ID`  | PagerDuty service ID  | PagerDuty → Services                | Optional | admin       | `***`                        |
| `ALERT_WEBHOOK_URL`     | Custom alert webhook  | Your alerting service               | Optional | admin       | `https://alerts.example.com` |

**When to Use**: Required for production incident alerting.

---

## 12. Internal/Platform

**Purpose**: Inter-app communication and platform configuration.

| Variable                     | Description               | Where to Get             | Required    | Apps Needed | Example                                           |
| ---------------------------- | ------------------------- | ------------------------ | ----------- | ----------- | ------------------------------------------------- |
| `DEFAULT_TENANT_SLUG`        | Default tenant identifier | Choose slug              | ✅ Required | All         | See [Brand Configuration](#1-brand-configuration) |
| `INTERNAL_API_KEY`           | Internal API auth         | Generate (base64)        | ✅ Required | All         | See [Platform Secrets](#platform-api-keys)        |
| `INTERNAL_API_URL`           | Internal API endpoint     | Your internal API domain | Optional    | All         | `https://internal.meliusly.com`                   |
| `PLATFORM_API_KEY`           | Platform API auth         | Generate (base64)        | Optional    | All         | See [Platform Secrets](#platform-api-keys)        |
| `PLATFORM_API_URL`           | Platform API endpoint     | Your platform API domain | Optional    | All         | `https://platform.meliusly.com`                   |
| `PLATFORM_WEBHOOK_URL`       | Platform webhook receiver | Your webhook domain      | Optional    | All         | `https://webhooks.meliusly.com`                   |
| `CGK_PLATFORM_API_KEY`       | Inter-app auth key        | Generate (base64)        | ✅ Required | All         | See [Platform Secrets](#platform-api-keys)        |
| `INTEGRATION_ENCRYPTION_KEY` | Integration credentials   | Generate (64-char hex)   | ✅ Required | All         | See [Platform Secrets](#encryption-keys)          |
| `COMPANY_NAME`               | Legal company name        | Your company name        | ✅ Required | All         | See [Brand Configuration](#1-brand-configuration) |
| `APP_VERSION`                | App version string        | Semantic version         | Optional    | All         | `1.0.0`                                           |

**Security Considerations**:

- Internal API keys used for authenticated inter-app calls
- Must match across all apps
- Platform webhook URLs must be publicly accessible

### Tax (1099 Generation)

| Variable                 | Description            | Where to Get            | Required    | Apps Needed                | Example                                  |
| ------------------------ | ---------------------- | ----------------------- | ----------- | -------------------------- | ---------------------------------------- |
| `TAX_ENCRYPTION_KEY`     | Encrypt tax documents  | Generate (64-char hex)  | ✅ Required | admin, creator, contractor | See [Platform Secrets](#encryption-keys) |
| `TAX_TIN_ENCRYPTION_KEY` | Encrypt TINs (SSN/EIN) | Generate (64-char hex)  | ✅ Required | admin, creator, contractor | See [Platform Secrets](#encryption-keys) |
| `TAX_PAYER_NAME`         | Company legal name     | Your legal entity name  | ✅ Required | admin                      | `Meliusly LLC`                           |
| `TAX_PAYER_EIN`          | Company EIN            | IRS EIN letter          | ✅ Required | admin                      | `12-3456789`                             |
| `TAX_PAYER_ADDRESS_LINE` | Company address        | Your registered address | ✅ Required | admin                      | `123 Main St`                            |
| `TAX_PAYER_CITY`         | Company city           | Your registered city    | ✅ Required | admin                      | `New York`                               |
| `TAX_PAYER_STATE`        | Company state          | Your registered state   | ✅ Required | admin                      | `NY`                                     |
| `TAX_PAYER_ZIP`          | Company ZIP code       | Your registered ZIP     | ✅ Required | admin                      | `10001`                                  |

**When to Use**: Required if paying creators/contractors and issuing 1099 forms.

**Security Considerations**:

- **HIGHEST SECURITY REQUIREMENTS** (PII data)
- Encryption keys must be unique and never shared
- Comply with IRS regulations for data retention

---

## 13. Auto-Populated Variables

**Purpose**: Variables automatically set by hosting platforms. **DO NOT SET MANUALLY**.

### Vercel

| Variable            | Description            | Where to Get       | Required | Apps Needed | Example                                |
| ------------------- | ---------------------- | ------------------ | -------- | ----------- | -------------------------------------- |
| `VERCEL_ENV`        | Deployment environment | Auto-set by Vercel | N/A      | All         | `production`, `preview`, `development` |
| `VERCEL_REGION`     | Deployment region      | Auto-set by Vercel | N/A      | All         | `iad1`, `sfo1`                         |
| `VERCEL_TOKEN`      | Vercel API token       | Auto-set by Vercel | N/A      | All         | `***`                                  |
| `VERCEL_OIDC_TOKEN` | OIDC token for Vercel  | Auto-set by Vercel | N/A      | All         | `***`                                  |

**Notes**:

- Used for environment detection (`if (process.env.VERCEL_ENV === 'production')`)
- Available in all Vercel deployments
- Never commit these to git or set manually

---

## Security Best Practices

### DO

- ✅ Use `vercel env pull .env.local` to sync from Vercel
- ✅ Store production secrets in Vercel environment variables
- ✅ Use `.env.local` (gitignored) for local development
- ✅ Generate unique secrets per brand using `./scripts/generate-brand-secrets.sh`
- ✅ Use separate dev/test/prod keys for third-party services
- ✅ Rotate secrets if compromised
- ✅ Use environment-specific values (dev vs prod)

### DON'T

- ❌ **NEVER commit `.env.local` or `.env.production` to git**
- ❌ **NEVER reuse secrets across brands**
- ❌ **NEVER share secrets in Slack, email, or docs**
- ❌ Don't use production keys in development
- ❌ Don't hardcode secrets in code
- ❌ Don't create `.env.production` files (security risk)

### Variable Precedence (Local Development)

```
.env.development.local  (highest priority - local overrides)
.env.local              (local secrets - gitignored)
.env.development        (committed - no secrets)
.env                    (committed - no secrets)
```

### Variable Precedence (Production)

```
Vercel Environment Variables (production/preview/development)
```

### Encryption Standards

- **AES-256-GCM** for all encrypted data at rest
- **64-character hex keys** for encryption keys (256 bits)
- **Base64 keys** for API authentication
- **Separate keys per integration** to limit blast radius

### Compliance

- **PII Data**: Use `TAX_TIN_ENCRYPTION_KEY` for SSN/EIN storage
- **PCI DSS**: Never store raw credit card data (use Stripe tokens)
- **GDPR**: Encrypt all personal data, support data deletion
- **SOC 2**: Audit log all access to encrypted data

---

## Quick Lookup Tables

### By App

| App                   | Required Variables                                                                            | Optional Variables                     |
| --------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------- |
| **admin**             | All database, Redis, auth secrets, Shopify, Stripe, Resend, platform API keys, cross-app URLs | Jobs, video, analytics, AI, monitoring |
| **storefront**        | All database, Redis, Shopify storefront token, cross-app URLs, client tracking                | Analytics (client-side)                |
| **creator-portal**    | Database, Redis, creator JWT, Stripe, Wise, Resend, tax variables                             | Jobs                                   |
| **contractor-portal** | Database, Redis, contractor JWT, Stripe, Wise, Resend, tax variables                          | Jobs                                   |
| **orchestrator**      | Database, Redis, admin JWT, platform API keys                                                 | Monitoring                             |
| **shopify-app**       | Database, Shopify client ID/secret, platform API key                                          | -                                      |
| **mcp-server**        | Database, Redis, platform API key                                                             | AI keys                                |

### By Category Size

| Category        | Variable Count | Complexity                   |
| --------------- | -------------- | ---------------------------- |
| Database        | 15             | Low (provided by CGK)        |
| Redis/KV        | 7              | Low (provided by CGK)        |
| Auth Secrets    | 4              | Medium (generate once)       |
| Encryption Keys | 11             | Medium (generate once)       |
| Brand URLs      | 13             | Low (configure once)         |
| Shopify         | 7              | Medium (OAuth + API setup)   |
| Stripe          | 2              | Low (API keys)               |
| Email           | 7              | Low (domain verification)    |
| Analytics       | 30+            | High (multiple integrations) |
| Jobs            | 8              | Low (choose one provider)    |
| Video/Media     | 8              | Medium (multiple services)   |
| AI/LLM          | 3              | Low (API keys)               |
| Monitoring      | 10+            | Medium (multiple services)   |

### By Priority (Minimum Viable Setup)

**Tier 1 - Critical (Cannot run without)**:

- All database variables
- All Redis variables
- JWT_SECRET, SESSION_SECRET
- ENCRYPTION_KEY
- All brand URLs
- RESEND_API_KEY, EMAIL_FROM
- INTERNAL_API_KEY, CGK_PLATFORM_API_KEY

**Tier 2 - Core Features**:

- SHOPIFY\_\* (if using Shopify integration)
- STRIPE_SECRET_KEY (if using payments)
- TAX\_\* (if paying contractors/creators)

**Tier 3 - Enhanced Features**:

- Background jobs (Inngest or Trigger.dev)
- Video (Mux, transcription)
- Analytics (Google, Meta, TikTok)

**Tier 4 - Optional**:

- AI/LLM
- Monitoring (Slack, PagerDuty)
- International payments (Wise)

---

## Troubleshooting

### "Missing environment variable" errors

1. Check if variable is required for your app (see [By App](#by-app) table)
2. Verify variable exists in `.env.local` (local) or Vercel env vars (production)
3. Restart dev server after adding new variables
4. Check variable name spelling (case-sensitive)

### "Invalid credentials" errors

1. Verify API keys are correct in third-party dashboard
2. Check if using test vs production keys (must match environment)
3. Confirm OAuth callback URLs match exactly
4. Verify domain/webhook URLs are publicly accessible

### "Encryption error" when accessing integrations

1. Verify all `*_ENCRYPTION_KEY` variables are set
2. Confirm encryption keys are 64-character hex strings
3. Check if keys match between environments (can't decrypt with different key)

### "Tenant isolation violation" errors

1. Verify `DEFAULT_TENANT_SLUG` is set
2. Check if multi-tenant variables use `withTenant()` wrapper
3. Confirm cache keys use `createTenantCache(tenantId)`

### Vercel deployment fails with "Invalid environment variable"

1. Add variable to Vercel: `cd apps/<app> && vercel env add VAR_NAME production --scope your-team`
2. Add to all environments (production, preview, development)
3. Redeploy after adding variables

---

## Related Documentation

- [Environment Variables Guide](.claude/knowledge-bases/environment-variables-guide/README.md) - Detailed workflow patterns
- [.env.brand-template](/.env.brand-template) - Brand fork template
- [Vercel Configuration](.claude/VERCEL-CONFIG.md) - Vercel-specific setup
- [Security Best Practices](docs/security.md) - Security guidelines
- [Multi-Tenancy Patterns](.claude/knowledge-bases/multi-tenancy-patterns/README.md) - Tenant isolation patterns

---

**Last Updated**: 2026-03-03
**Maintained By**: CGK Platform Team
**Questions**: See CLAUDE.md or open GitHub issue
