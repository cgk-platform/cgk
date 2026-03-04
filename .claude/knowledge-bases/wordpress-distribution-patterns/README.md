# WordPress-Style Distribution Patterns

**Domain**: Self-hosted portable platform architecture, WordPress.org-style distribution model, template repository patterns

**Last Updated**: 2026-03-03

---

## Table of Contents

1. [Overview](#overview)
2. [WordPress.org vs WordPress.com Comparison](#wordpressorg-vs-wordpresscom-comparison)
3. [Architecture Philosophy](#architecture-philosophy)
4. [Distribution Model](#distribution-model)
5. [Template Repository Pattern](#template-repository-pattern)
6. [Single Vercel Project Architecture](#single-vercel-project-architecture)
7. [Configuration-Over-Code Approach](#configuration-over-code-approach)
8. [Self-Hosted Infrastructure](#self-hosted-infrastructure)
9. [One-Click Install Process](#one-click-install-process)
10. [Theme Customization System](#theme-customization-system)
11. [Asset Management](#asset-management)
12. [Tenant Export/Fork System](#tenant-exportfork-system)
13. [Migration Path (Docker → Vercel)](#migration-path-docker--vercel)
14. [Anti-Patterns](#anti-patterns)
15. [Decision Trees](#decision-trees)

---

## Overview

The CGK Platform uses a **WordPress.org-style distribution model**, NOT a WordPress.com-style multi-tenant SaaS. This is a critical distinction that affects every aspect of the architecture.

### Key Characteristics

| Aspect             | CGK Platform                        | Like WordPress                       |
| ------------------ | ----------------------------------- | ------------------------------------ |
| **Distribution**   | Template repository (fork & deploy) | WordPress.org (download & install)   |
| **Hosting**        | User's own Vercel/Neon/Upstash      | User's own hosting provider          |
| **Infrastructure** | User owns ALL resources             | User owns ALL resources              |
| **Customization**  | Full code access, fork-friendly     | Full PHP access, theme/plugin system |
| **Updates**        | Git merge from upstream             | WordPress core updates               |
| **Business Model** | Open-source template                | Open-source CMS                      |

**NOT like**:

- ❌ WordPress.com (multi-tenant SaaS)
- ❌ Shopify (hosted SaaS)
- ❌ Platform.sh (shared infrastructure)

---

## WordPress.org vs WordPress.com Comparison

Understanding this distinction is **critical** for all development decisions:

### WordPress.org (Self-Hosted) - CGK Platform Model

```
┌─────────────────────────────────────────────────────────────┐
│                   Template Repository                        │
│  (wordpress.org downloads / cgk-platform/cgk GitHub repo)   │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   User Forks or   │
                    │   Downloads       │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌─────────▼────────┐  ┌───────▼────────┐
│  User 1 Fork   │  │  User 2 Fork    │  │  User 3 Fork   │
│  (my-store)    │  │  (acme-shop)    │  │  (fashion-co)  │
├────────────────┤  ├─────────────────┤  ├────────────────┤
│ Own Vercel     │  │ Own Vercel      │  │ Own Vercel     │
│ Own Neon DB    │  │ Own Neon DB     │  │ Own Neon DB    │
│ Own Upstash    │  │ Own Upstash     │  │ Own Upstash    │
│ Own code repo  │  │ Own code repo   │  │ Own code repo  │
└────────────────┘  └─────────────────┘  └────────────────┘
```

**Characteristics**:

- ✅ Users download/fork template
- ✅ Deploy to THEIR infrastructure
- ✅ Full code ownership
- ✅ Can modify anything
- ✅ Merge updates from upstream
- ✅ Zero platform lock-in

### WordPress.com (Multi-Tenant SaaS) - NOT CGK Platform Model

```
┌─────────────────────────────────────────────────────────────┐
│            Shared WordPress.com Infrastructure               │
│  (Single shared database, multi-tenant architecture)        │
├─────────────────────────────────────────────────────────────┤
│  Tenant 1 │ Tenant 2 │ Tenant 3 │ ... │ Tenant 10,000      │
│  (blog1)  │ (blog2)  │ (blog3)  │ ... │ (blog10k)          │
└─────────────────────────────────────────────────────────────┘
              ▲
              │
    Managed by WordPress.com
    (Users don't own infrastructure)
```

**Characteristics**:

- ❌ Shared infrastructure
- ❌ Limited customization
- ❌ No code access
- ❌ Can't self-host
- ❌ Platform lock-in
- ❌ Subscription fees

---

## Architecture Philosophy

### Core Principles

1. **Template, Not Platform**
   - CGK is a **starting point**, not a destination
   - Users fork and customize extensively
   - No "platform upgrades" that break customizations
   - Git-based update strategy (merge, don't replace)

2. **Self-Hosted First**
   - Users own ALL infrastructure resources
   - No shared databases, no shared caching layers
   - Complete control over data location (GDPR compliance)
   - Can switch providers (Vercel → Netlify → Railway)

3. **Fork-Friendly Codebase**
   - Protected files use `.gitattributes merge=ours`
   - `platform.config.ts` never overwritten by upstream
   - Brand-specific assets in isolated directories
   - Clear separation: upstream vs user customizations

4. **Configuration-Over-Code**
   - Most customization via `platform.config.ts`
   - Admin UI for non-technical configuration
   - Code changes only when necessary
   - Minimize merge conflicts from upstream

5. **Zero Lock-In**
   - Export tenants to separate forks
   - Migrate between hosting providers
   - Own database backups
   - Standard Next.js app structure

---

## Distribution Model

### How Users Get CGK Platform

#### Method 1: GitHub Fork + Vercel Deploy Button (Recommended)

```bash
# 1. Click Vercel deploy button in README
# 2. Fork repository to YOUR GitHub account
# 3. Connect Vercel to YOUR fork
# 4. Vercel auto-provisions:
#    - Neon PostgreSQL (free tier) on YOUR Neon account
#    - Upstash Redis (free tier) on YOUR Upstash account
# 5. Auto-generates secrets (JWT, encryption keys)
# 6. Deploys single Vercel project with ALL 8 apps
# 7. Site live in 5-10 minutes
```

**User owns**:

- ✅ GitHub fork (full code access)
- ✅ Vercel project (deployment settings)
- ✅ Neon database (can export, migrate)
- ✅ Upstash Redis (can switch providers)
- ✅ Domain names (bring your own)

#### Method 2: CLI Create (Local Development)

```bash
# 1. Run CLI to create new project
npx @cgk-platform/cli create my-brand

# 2. User sets up own infrastructure:
#    - Create Neon database (free tier)
#    - Create Upstash Redis (optional)
#    - Generate secrets
#    - Configure .env.local

# 3. Run migrations
pnpm db:migrate

# 4. Start development
pnpm dev
```

#### Method 3: Direct Clone (Advanced)

```bash
# Clone template
git clone https://github.com/cgk-platform/cgk my-brand
cd my-brand

# Set up environment
cp apps/admin/.env.example apps/admin/.env.local
# Edit .env.local with YOUR credentials

# Install and run
pnpm install
pnpm db:migrate
pnpm dev
```

### What Users DON'T Do

- ❌ Sign up for "CGK Platform" service
- ❌ Pay subscription to CGK
- ❌ Use shared CGK infrastructure
- ❌ Request tenant provisioning from CGK
- ❌ Depend on CGK for uptime/support

---

## Template Repository Pattern

### Repository Structure

```
cgk-platform/cgk (Template Repository)
├── apps/                    # 8 Next.js apps (all in ONE Vercel project)
│   ├── admin/              # Admin portal
│   ├── storefront/         # Generic storefront (user customizes)
│   ├── creator-portal/     # Creator management
│   ├── contractor-portal/  # Contractor management
│   ├── orchestrator/       # Super admin
│   ├── shopify-app/        # Shopify integration (Remix)
│   ├── command-center/     # Operations dashboard
│   └── mcp-server/         # Claude MCP integration
├── packages/               # Shared utilities (import via @cgk-platform/*)
├── platform.config.ts      # USER CONFIGURATION (protected from upstream)
├── vercel.json             # Single project, path-based routing
└── .gitattributes          # Protect user customizations
```

### Protected Files (`.gitattributes merge=ours`)

These files are **NEVER overwritten** by upstream merges:

```gitattributes
# User customizations protected from upstream
platform.config.ts merge=ours
public/brands/** merge=ours
apps/storefront/theme/ merge=ours
apps/*/. env.local merge=ours
```

**Why**: User's brand configuration and assets must persist through updates.

### Upstream Updates Workflow

```bash
# User's fork stays in sync with CGK template
git remote add upstream https://github.com/cgk-platform/cgk
git fetch upstream
git merge upstream/main  # Respects .gitattributes merge=ours

# platform.config.ts is NOT overwritten
# User's brand assets are NOT overwritten
# New features from upstream are merged in
```

---

## Single Vercel Project Architecture

### Before: 8 Separate Vercel Projects (REMOVED)

```
❌ OLD ARCHITECTURE (Docker-based multi-tenant SaaS)
┌─────────────────────────────────────────────────────────────┐
│  Vercel Team: cgk-linens-88e79683                           │
├─────────────────────────────────────────────────────────────┤
│  cgk-admin                → admin.vercel.app                │
│  cgk-storefront           → storefront.vercel.app           │
│  cgk-creator-portal       → creator.vercel.app              │
│  cgk-contractor-portal    → contractor.vercel.app           │
│  cgk-orchestrator         → orchestrator.vercel.app         │
│  cgk-shopify-app          → shopify-app.vercel.app          │
│  cgk-command-center       → command.vercel.app              │
│  cgk-mcp-server           → mcp.vercel.app                  │
└─────────────────────────────────────────────────────────────┘
```

**Problems**:

- ❌ Required 8 Vercel projects per user
- ❌ Complex environment variable management
- ❌ Difficult for users to deploy
- ❌ Suggested multi-tenant SaaS architecture
- ❌ Not true "one-click deploy"

### After: Single Vercel Project with Path-Based Routing (CURRENT)

```
✅ NEW ARCHITECTURE (WordPress-style self-hosted)
┌─────────────────────────────────────────────────────────────┐
│  Single Vercel Project: my-commerce-platform                │
├─────────────────────────────────────────────────────────────┤
│  mystore.vercel.app               → Storefront              │
│  mystore.vercel.app/admin         → Admin Portal            │
│  mystore.vercel.app/creator       → Creator Portal          │
│  mystore.vercel.app/contractor    → Contractor Portal       │
│  mystore.vercel.app/orchestrator  → Super Admin             │
│  mystore.vercel.app/shopify-app   → Shopify App             │
│  mystore.vercel.app/command-center→ Operations Dashboard    │
│  mystore.vercel.app/mcp           → MCP Server              │
└─────────────────────────────────────────────────────────────┘
```

### Path-Based Routing Configuration

`vercel.json`:

```json
{
  "buildCommand": "pnpm turbo build --filter=admin --filter=storefront ...",
  "rewrites": [
    { "source": "/admin/:path*", "destination": "/apps/admin/:path*" },
    { "source": "/creator/:path*", "destination": "/apps/creator-portal/:path*" },
    { "source": "/contractor/:path*", "destination": "/apps/contractor-portal/:path*" },
    { "source": "/orchestrator/:path*", "destination": "/apps/orchestrator/:path*" },
    { "source": "/shopify-app/:path*", "destination": "/apps/shopify-app/:path*" },
    { "source": "/command-center/:path*", "destination": "/apps/command-center/:path*" },
    { "source": "/mcp/:path*", "destination": "/apps/mcp-server/:path*" },
    { "source": "/:path*", "destination": "/apps/storefront/:path*" }
  ]
}
```

### Benefits

- ✅ True one-click deploy (fork + deploy button)
- ✅ Single Vercel project per user
- ✅ Shared environment variables across apps
- ✅ Simplified user experience
- ✅ Standard monorepo structure
- ✅ Easy local development (`pnpm dev` runs all apps)

---

## Configuration-Over-Code Approach

### The platform.config.ts Pattern

**Inspiration**: WordPress `wp-config.php`

```typescript
// platform.config.ts (USER OWNS THIS FILE)
import { validatePlatformConfig } from '@cgk-platform/core'

const platformConfigDraft = {
  deployment: {
    name: 'My Commerce Platform',
    organization: 'My Company LLC',
    mode: 'single-tenant', // or 'multi-tenant'
  },
  tenants: [
    {
      slug: 'my-brand',
      name: 'My Brand',
      schema: 'tenant_my_brand',
      primaryColor: '#000000',
      secondaryColor: '#FFFFFF',
      logo: '/brands/my-brand/logo.svg',
      domain: 'mybrand.com',
      apps: {
        storefront: 'shop.mybrand.com',
        admin: 'admin.mybrand.com',
      },
    },
  ],
  features: {
    shopifyIntegration: true,
    stripeConnect: true,
    wisePayments: false,
    creatorPortal: false,
    videoTranscription: true,
  },
}

// Validate at module load
validatePlatformConfig(platformConfigDraft)

export const platformConfig = platformConfigDraft
```

### Admin UI for Configuration

Located at `/admin/platform-config`, allows non-technical users to:

1. **Edit tenant configuration**
   - Brand name, colors, logo
   - Domain settings
   - Feature flags

2. **Enable/disable features**
   - Shopify integration
   - Payment providers
   - Portal apps
   - AI features

3. **Manage integrations**
   - API credentials (encrypted)
   - Webhook endpoints
   - Service connections

4. **Generate platform.config.ts**
   - Live preview of configuration
   - Validation errors highlighted
   - One-click export to file

**Security**: Admin UI writes to file system (requires file write permissions). In production, this may be disabled and users edit `platform.config.ts` directly via GitHub.

---

## Self-Hosted Infrastructure

### User Owns Everything

```
┌─────────────────────────────────────────────────────────────┐
│                 User's Infrastructure Stack                  │
├─────────────────────────────────────────────────────────────┤
│  Vercel Project     → mystore (on user's Vercel account)    │
│  Neon Database      → cgk-db (on user's Neon account)       │
│  Upstash Redis      → cgk-cache (on user's Upstash account) │
│  Vercel Blob        → cgk-assets (on user's Vercel account) │
│  GitHub Repository  → my-org/my-store (user's GitHub)       │
│  Custom Domain      → mybrand.com (user's DNS)              │
└─────────────────────────────────────────────────────────────┘
```

### Infrastructure Requirements

#### Minimum (Free Tier)

| Service  | Provider    | Tier  | Cost                                              |
| -------- | ----------- | ----- | ------------------------------------------------- |
| Hosting  | Vercel      | Hobby | $0/month                                          |
| Database | Neon        | Free  | $0/month (0.5GB storage, 192 hours compute/month) |
| Cache    | Upstash     | Free  | $0/month (10k commands/day)                       |
| Assets   | Vercel Blob | Free  | $0/month (1GB)                                    |

**Total**: $0/month for small sites

#### Production (Recommended)

| Service  | Provider    | Tier   | Cost                                       |
| -------- | ----------- | ------ | ------------------------------------------ |
| Hosting  | Vercel      | Pro    | $20/month per member                       |
| Database | Neon        | Launch | $19/month (3GB storage, 300 hours compute) |
| Cache    | Upstash     | Pro    | $10/month (1M commands/month)              |
| Assets   | Vercel Blob | Pro    | Included in Vercel Pro                     |

**Total**: ~$49/month for production sites

### Provider Flexibility

**Users can switch providers**:

```bash
# Migrate from Vercel to Railway
git push railway main  # Railway auto-detects Next.js

# Migrate from Neon to Supabase
# 1. Export Neon database
pg_dump $NEON_URL > backup.sql

# 2. Import to Supabase
psql $SUPABASE_URL < backup.sql

# 3. Update DATABASE_URL in Vercel
vercel env add DATABASE_URL $SUPABASE_URL production
```

**Key Point**: No platform lock-in. Standard PostgreSQL, standard Next.js.

---

## One-Click Install Process

### Vercel Deploy Button Flow

```
User clicks "Deploy with Vercel" button
              ↓
Fork repository to user's GitHub
              ↓
Connect Vercel to GitHub fork
              ↓
Vercel detects vercel.json
              ↓
Triggers Neon integration (auto-provision database)
              ↓
Triggers Upstash integration (auto-provision Redis)
              ↓
Auto-generates secrets (JWT_SECRET, SESSION_SECRET, ENCRYPTION_KEY)
              ↓
Sets environment variables in Vercel
              ↓
Runs build command: pnpm turbo build
              ↓
Runs database migrations: pnpm db:migrate
              ↓
Deploys to production
              ↓
Site live at: user-project.vercel.app
```

**Time**: 5-10 minutes from click to live site.

### What Gets Auto-Provisioned

1. **Neon PostgreSQL**
   - Free tier database (0.5GB storage)
   - Connection string saved as `DATABASE_URL`
   - Database user with full permissions
   - Public schema + tenant schemas created

2. **Upstash Redis**
   - Free tier cache (10k commands/day)
   - Connection string saved as `UPSTASH_REDIS_REST_URL`
   - Auth token saved as `UPSTASH_REDIS_REST_TOKEN`
   - Tenant-isolated key prefixes

3. **Secrets Generation**
   - `JWT_SECRET`: 256-bit random key
   - `SESSION_SECRET`: 256-bit random key
   - `ENCRYPTION_KEY`: AES-256-GCM key
   - All stored securely in Vercel env vars

4. **DNS Configuration**
   - Auto-assigned Vercel domain (user-project.vercel.app)
   - User can add custom domain via Vercel dashboard
   - SSL certificate auto-provisioned

---

## Theme Customization System

### Storefront Customization

**Before**: Hard-coded storefronts (meliusly-storefront, cgk-storefront) - **REMOVED**

**After**: Single generic storefront customized via `platform.config.ts`

```typescript
// platform.config.ts
tenants: [
  {
    slug: 'my-brand',
    theme: {
      colors: {
        primary: '#000000',
        secondary: '#FFFFFF',
        accent: '#FFD700',
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        headingFont: 'Playfair Display, serif',
      },
      layout: {
        headerStyle: 'centered', // or 'split', 'minimal'
        productGridColumns: 3,
        heroStyle: 'full-width',
      },
    },
  },
]
```

### CSS Custom Properties Injection

```typescript
// apps/storefront/src/app/layout.tsx
import { getTenantConfig } from '@/platform.config'

export default function RootLayout({ children }) {
  const tenant = getTenantConfig('my-brand')

  return (
    <html>
      <head>
        <style>{`
          :root {
            --color-primary: ${tenant.theme.colors.primary};
            --color-secondary: ${tenant.theme.colors.secondary};
            --font-family: ${tenant.theme.typography.fontFamily};
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Component Overrides

Users can override components by creating files in `apps/storefront/components/overrides/`:

```
apps/storefront/
├── components/
│   ├── base/           # Template components (DON'T EDIT)
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── ProductCard.tsx
│   └── overrides/      # User customizations (PROTECTED FROM UPSTREAM)
│       ├── Header.tsx  # Overrides base/Header.tsx
│       └── Hero.tsx    # Custom component
```

**Fallback logic**:

```typescript
// Component resolution (auto-generated)
const Header = loadComponentWithOverride('Header')
// Checks: overrides/Header.tsx → base/Header.tsx
```

---

## Asset Management

### User's Own Vercel Blob Storage

**Before**: Shared asset storage on CGK infrastructure

**After**: Each user deployment has own Vercel Blob storage

```typescript
// Upload to user's own Blob storage
import { put } from '@vercel/blob'

const blob = await put('brands/my-brand/logo.png', file, {
  access: 'public',
  token: process.env.BLOB_READ_WRITE_TOKEN, // User's token
})

// URL: https://[user-blob-id].public.blob.vercel-storage.com/...
```

### Brand Assets Structure

```
public/
└── brands/
    └── my-brand/              # Protected from upstream merges
        ├── logo.svg
        ├── logo-dark.svg
        ├── favicon.ico
        ├── og-image.png
        └── hero-background.jpg
```

### Asset Migration Between Forks

When exporting a tenant to a new fork:

```bash
# Export tenant assets
npx @cgk-platform/cli export-tenant my-brand --include-assets

# Creates:
# - tenant-export.sql (database backup)
# - assets.tar.gz (all brand assets)
# - platform.config.json (tenant configuration)
```

Import to new fork:

```bash
# In new repository
npx @cgk-platform/cli import-tenant tenant-export.sql
tar -xzf assets.tar.gz -C public/brands/
```

---

## Tenant Export/Fork System

### Why Export Tenants?

**Use case**: User starts with multi-tenant deployment (2 brands in one platform), then wants to separate brands into individual forks.

```
BEFORE: Single Deployment (Multi-Tenant)
┌────────────────────────────────────┐
│  my-commerce-platform (Vercel)    │
│  ├── Tenant: brand-a               │
│  └── Tenant: brand-b               │
│  Database: shared (schema-per-tenant) │
└────────────────────────────────────┘

AFTER: Two Separate Deployments (Single-Tenant Each)
┌──────────────────────┐  ┌──────────────────────┐
│  brand-a (Vercel)    │  │  brand-b (Vercel)    │
│  └── Tenant: brand-a │  │  └── Tenant: brand-b │
│  Database: dedicated │  │  Database: dedicated │
└──────────────────────┘  └──────────────────────┘
```

### Export Process

```bash
# 1. Export tenant from original deployment
cd my-commerce-platform
npx @cgk-platform/cli export-tenant brand-a

# Creates:
# - brand-a-export/
#   ├── database.sql         # Schema + data for tenant_brand_a
#   ├── platform.config.json # Tenant-specific configuration
#   ├── assets.tar.gz        # All brand assets
#   └── .env.template        # Required environment variables
```

### Import Process

```bash
# 2. Create new repository for brand-a
npx @cgk-platform/cli create brand-a --empty

# 3. Import tenant data
cd brand-a
npx @cgk-platform/cli import-tenant ../brand-a-export/database.sql

# 4. Extract assets
tar -xzf ../brand-a-export/assets.tar.gz -C public/brands/

# 5. Configure platform.config.ts
# (Automatically populated from platform.config.json)

# 6. Deploy to Vercel
vercel deploy --prod
```

### Database Export/Import

```bash
# Export tenant schema + data
pg_dump $DATABASE_URL \
  --schema=tenant_brand_a \
  --schema=public \
  --exclude-table-data='public.organizations' \
  > brand-a-export/database.sql

# Import to new database
psql $NEW_DATABASE_URL < brand-a-export/database.sql
```

---

## Migration Path (Docker → Vercel)

### What Was Removed

**Docker-based Multi-Tenant SaaS** (435 lines removed):

```bash
# REMOVED FILES:
# - Dockerfile
# - docker-compose.yml
# - .dockerignore
# - scripts/docker-entrypoint.sh
# - apps/meliusly-storefront/ (hard-coded storefront)
# - apps/cgk-storefront/ (hard-coded storefront)
```

### Migration Steps (For Existing Docker Users)

If you have an existing Docker-based CGK deployment:

```bash
# 1. Export database
docker exec cgk-db pg_dump -U postgres cgk > backup.sql

# 2. Fork template repository
# (Use Vercel deploy button or manual fork)

# 3. Import database to Neon
# (Create Neon database via Vercel integration)
psql $NEON_DATABASE_URL < backup.sql

# 4. Update platform.config.ts
# (Use existing tenant configuration)

# 5. Deploy to Vercel
vercel deploy --prod

# 6. Update DNS to point to Vercel
# (Migrate from Docker host to Vercel domains)
```

### Why Vercel-Native?

| Aspect         | Docker (Old)                     | Vercel-Native (New)            |
| -------------- | -------------------------------- | ------------------------------ |
| **Deployment** | Manual docker-compose            | One-click button               |
| **Scaling**    | Manual container orchestration   | Auto-scaling                   |
| **Database**   | Self-hosted PostgreSQL           | Neon serverless                |
| **SSL**        | Manual cert management           | Auto HTTPS                     |
| **CDN**        | None or manual                   | Global edge network            |
| **Build time** | 5-10 minutes                     | 2-3 minutes                    |
| **Cost**       | $50-200/month (VPS + managed DB) | $0-49/month (free tier to pro) |

---

## Anti-Patterns

### ❌ What NOT to Do

#### 1. DON'T Build Shared Infrastructure

```typescript
// ❌ WRONG - Suggests multi-tenant SaaS
// Creating "CGK Platform" service that users sign up for
async function provisionTenantOnSharedInfra(email) {
  await createTenantInSharedDatabase()
  await sendWelcomeEmail()
}

// ✅ CORRECT - Users provision own infrastructure
// README.md: "Click deploy button to fork and deploy to YOUR Vercel account"
```

#### 2. DON'T Create "Platform" Branding

```typescript
// ❌ WRONG - Platform-centric branding
<header>
  <Logo src="/cgk-platform-logo.svg" />
  <h1>CGK Platform Dashboard</h1>
</header>

// ✅ CORRECT - User's brand front and center
<header>
  <Logo src={getTenantConfig(tenantSlug).logo} />
  <h1>{getTenantConfig(tenantSlug).name} Dashboard</h1>
</header>
```

#### 3. DON'T Hardcode "Upgrade" or "Pricing" Pages

```typescript
// ❌ WRONG - Suggests SaaS business model
<UpgradeButton plan="pro">Upgrade to Pro - $49/month</UpgradeButton>

// ✅ CORRECT - No platform pricing (users own infrastructure)
// Template doesn't include pricing/upgrade UI
```

#### 4. DON'T Store Assets on "Platform" CDN

```typescript
// ❌ WRONG - Shared asset storage
const logoUrl = 'https://cgk-platform-assets.com/brands/my-brand/logo.png'

// ✅ CORRECT - User's own Vercel Blob storage
const logoUrl = await put('logo.png', file, {
  token: process.env.BLOB_READ_WRITE_TOKEN, // User's token
})
```

#### 5. DON'T Build Centralized Analytics

```typescript
// ❌ WRONG - Platform collects user data
await trackEvent('checkout_completed', {
  tenantId: 'user-brand',
  revenue: 99.99,
  platformAnalyticsId: 'cgk-123',
})

// ✅ CORRECT - User's own analytics
await trackEvent('checkout_completed', {
  userId: currentUserId,
  revenue: 99.99,
  // Sent to user's own GA4/Mixpanel/etc.
})
```

#### 6. DON'T Create "Admin Tenant" with Special Powers

```typescript
// ❌ WRONG - Super admin tenant managed by platform
if (tenantSlug === 'cgk-admin') {
  // Special admin powers over all tenants
  await getAllTenantsData()
}

// ✅ CORRECT - Orchestrator app for DEPLOYMENT management (not cross-tenant)
// Orchestrator manages tenants within USER'S deployment, not across deployments
```

#### 7. DON'T Use Shared Secrets Across Users

```typescript
// ❌ WRONG - Platform-wide encryption key
const encryptionKey = process.env.CGK_PLATFORM_MASTER_KEY

// ✅ CORRECT - User generates own encryption key
const encryptionKey = process.env.ENCRYPTION_KEY // User's key, auto-generated on deploy
```

---

## Decision Trees

### Decision: Should This Be Multi-Tenant or Single-Tenant?

```
User deploying CGK Platform
           ↓
   ┌───────────────────┐
   │ How many brands?  │
   └───────┬───────────┘
           │
     ┌─────┴─────┐
     │           │
   1 brand    2+ brands
     │           │
     ↓           ↓
Single-Tenant  Multi-Tenant
(mode: 'single-tenant')  (mode: 'multi-tenant')
     │           │
     ↓           ↓
platform.config.ts    platform.config.ts
tenants: [1 tenant]   tenants: [2+ tenants]
```

**Key Point**: Both modes use SAME codebase, just different `platform.config.ts`.

### Decision: Should I Fork or Create Separate Deployment?

```
User has multi-tenant deployment
           ↓
   ┌────────────────────────┐
   │ Do brands need to be   │
   │ completely separated?  │
   └────────┬───────────────┘
            │
      ┌─────┴─────┐
      │           │
     No          Yes
      │           │
      ↓           ↓
Keep multi-tenant  Export tenant → New fork
Same deployment    Separate Vercel project
Shared database    Dedicated database
Shared Vercel      Own infrastructure
```

### Decision: Should I Customize Code or Use Config?

```
User wants to change something
           ↓
   ┌────────────────────────┐
   │ Is it in               │
   │ platform.config.ts?    │
   └────────┬───────────────┘
            │
      ┌─────┴─────┐
      │           │
     Yes          No
      │           │
      ↓           ↓
Edit config   ┌────────────────────────┐
file          │ Is it visual styling?  │
              └────────┬───────────────┘
                       │
                 ┌─────┴─────┐
                 │           │
                Yes          No
                 │           │
                 ↓           ↓
            Edit CSS     Edit code
            custom props  (fork-friendly)
```

---

## Code Examples

### Example 1: Checking Deployment Mode

```typescript
// apps/admin/src/app/layout.tsx
import { platformConfig } from '@/platform.config'

export default function AdminLayout({ children }) {
  const isSingleTenant = platformConfig.deployment.mode === 'single-tenant'

  return (
    <div>
      {/* Only show tenant switcher in multi-tenant mode */}
      {!isSingleTenant && <TenantSwitcher />}
      {children}
    </div>
  )
}
```

### Example 2: Tenant-Specific Theming

```typescript
// apps/storefront/src/lib/get-theme.ts
import { getTenantConfig } from '@/platform.config'

export function getThemeForTenant(slug: string) {
  const config = getTenantConfig(slug)

  return {
    colors: config.theme.colors,
    fonts: config.theme.typography,
    layout: config.theme.layout,
  }
}

// Usage in component
export default function StorefrontPage() {
  const theme = getThemeForTenant('my-brand')

  return (
    <div style={{ backgroundColor: theme.colors.primary }}>
      <h1 style={{ fontFamily: theme.fonts.headingFont }}>
        Welcome to {getTenantConfig('my-brand').name}
      </h1>
    </div>
  )
}
```

### Example 3: Feature Flag Gating

```typescript
// apps/admin/src/app/admin/creators/page.tsx
import { platformConfig } from '@/platform.config'

export default function CreatorsPage() {
  // Don't even render if feature disabled
  if (!platformConfig.features.creatorPortal) {
    return <div>Creator portal not enabled</div>
  }

  return <CreatorPortalUI />
}
```

### Example 4: Export Tenant CLI Command

```typescript
// packages/cli/src/commands/export-tenant.ts
export async function exportTenant(slug: string) {
  console.log(`Exporting tenant: ${slug}`)

  // 1. Export database schema + data
  const dbExport = await exportTenantDatabase(slug)
  await fs.writeFile('database.sql', dbExport)

  // 2. Export tenant configuration
  const config = getTenantConfig(slug)
  await fs.writeFile('platform.config.json', JSON.stringify(config, null, 2))

  // 3. Export brand assets
  await createTarball('assets.tar.gz', `public/brands/${slug}`)

  // 4. Generate .env.template
  const envTemplate = generateEnvTemplate(config)
  await fs.writeFile('.env.template', envTemplate)

  console.log(`✅ Tenant exported to ${slug}-export/`)
}
```

---

## When to Reference This Knowledge Base

### Agent Use Cases

- **Architect Agent**: When designing new features, ensure they fit WordPress-style distribution
- **Implementer Agent**: When implementing features that could be multi-tenant vs single-instance
- **Debugger Agent**: When investigating deployment issues (user's Vercel vs "platform" Vercel)
- **Reviewer Agent**: When reviewing PRs that suggest SaaS patterns

### Development Scenarios

1. **Adding new feature**: Check if it should be config-driven vs code-driven
2. **Implementing admin UI**: Ensure it's for USER'S deployment, not cross-deployment
3. **Adding authentication**: User's auth system, not platform-wide accounts
4. **Asset management**: User's Blob storage, not shared CDN
5. **Analytics integration**: User's analytics, not platform tracking
6. **Tenant provisioning**: User provisions locally, not via platform service

---

## Related Documentation

- [CLAUDE.md](../../../CLAUDE.md) - Root project instructions
- [.claude/knowledge-bases/multi-tenancy-patterns/](../multi-tenancy-patterns/) - Multi-tenant patterns (for USER'S deployment)
- [.claude/knowledge-bases/environment-variables-guide/](../environment-variables-guide/) - Env var management (user's Vercel)
- [.claude/adrs/006-wordpress-distribution-model.md](../../adrs/006-wordpress-distribution-model.md) - ADR documenting this decision

---

**Last Updated**: 2026-03-03
**Maintained By**: CGK Platform Development Team

---

_This knowledge base ensures all agents understand the WordPress.org-style distribution model and avoid building SaaS patterns that contradict the self-hosted philosophy._
