# CGK Platform - App Architecture Reference

> **Purpose**: Complete reference for all 9 applications in the CGK Commerce Platform
> **Last Updated**: 2026-03-03
> **For**: Claude agents working on the platform

---

## Overview

The CGK Platform consists of 9 Next.js/Remix applications deployed independently on Vercel:

| App                 | Type    | Port | Purpose                     | Audience             |
| ------------------- | ------- | ---- | --------------------------- | -------------------- |
| orchestrator        | Next.js | 3100 | Super Admin Dashboard       | Internal CGK team    |
| admin               | Next.js | 3200 | White-label Admin Portal    | Brand administrators |
| storefront          | Next.js | 3300 | Generic Storefront Template | Brand customers      |
| meliusly-storefront | Next.js | 3300 | Meliusly Brand Storefront   | Meliusly customers   |
| creator-portal      | Next.js | 3400 | Creator Management          | Brand creators       |
| contractor-portal   | Next.js | 3500 | Contractor Management       | Brand contractors    |
| shopify-app         | Remix   | N/A  | Shopify App Integration     | Shopify merchants    |
| command-center      | Next.js | 3300 | Operations Dashboard        | Brand operations     |
| mcp-server          | Next.js | 3500 | Claude MCP Integration      | AI assistants        |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    MULTI-TENANT PLATFORM                     │
├─────────────────────────────────────────────────────────────┤
│  apps/                                                       │
│  ├── orchestrator/          # Super Admin Dashboard          │
│  ├── admin/                 # White-label admin portal       │
│  ├── storefront/            # Generic storefront template    │
│  ├── meliusly-storefront/   # Meliusly brand storefront      │
│  ├── creator-portal/        # Creator management             │
│  ├── contractor-portal/     # Contractor management          │
│  ├── shopify-app/           # Shopify App (Remix)            │
│  ├── command-center/        # Operations dashboard           │
│  └── mcp-server/            # Claude MCP integration         │
└─────────────────────────────────────────────────────────────┘
```

---

## App Details

### 1. Orchestrator (Super Admin Dashboard)

**Purpose**: Internal CGK platform management and monitoring

**Tech Stack**:

- Next.js 15.2
- React 19
- Tailwind CSS 3.4
- Port: 3100

**Key Features**:

- Platform-wide monitoring
- Tenant provisioning
- Feature flag management
- AI agent coordination
- Platform health checks
- Onboarding management
- Slack integrations

**Key Packages**:

- `@cgk-platform/admin-core` - Admin UI components
- `@cgk-platform/ai-agents` - AI agent management
- `@cgk-platform/feature-flags` - Feature flag control
- `@cgk-platform/health` - Platform health monitoring
- `@cgk-platform/onboarding` - Tenant onboarding flows
- `recharts` - Analytics charts

**Deployment**:

- Vercel Project: `cgk-orchestrator`
- URL: cgk-orchestrator-cgk-linens-88e79683.vercel.app
- Internal only (IP whitelist recommended)

**Access Control**:

- CGK platform administrators only
- Requires `super_admin` role
- No tenant context (platform-wide access)

---

### 2. Admin (White-label Admin Portal)

**Purpose**: Brand administrator portal for managing their commerce operations

**Tech Stack**:

- Next.js 15.2
- React 19
- Tailwind CSS 3.4
- Port: 3200

**Key Features**:

- Product catalog management
- Order processing
- Customer management
- Content management (CMS)
- Video content management
- Digital Asset Management (DAM)
- A/B testing
- E-signature workflows
- Tax management
- Scheduling
- Support ticketing

**Key Packages**:

- `@cgk-platform/admin-core` - Admin UI framework
- `@cgk-platform/commerce` - Commerce abstraction layer
- `@cgk-platform/dam` - Digital Asset Management
- `@cgk-platform/video-editor` - Video editing tools
- `@cgk-platform/esign` - E-signature integration
- `@cgk-platform/tax` - Tax calculation
- `@cgk-platform/ab-testing` - A/B test management
- `@dnd-kit/core` - Drag-and-drop UI
- `hls.js` - Video streaming

**Deployment**:

- Vercel Project: `cgk-admin`
- URL: cgk-admin-cgk-linens-88e79683.vercel.app
- Custom domain: admin.{tenant-domain}.com

**Access Control**:

- Tenant administrators
- Permissions system via `@cgk-platform/auth`
- Tenant isolation enforced

---

### 3. Storefront (Generic Template)

**Purpose**: Generic headless storefront template for brand deployment

**Tech Stack**:

- Next.js 15.2
- React 19
- Tailwind CSS 3.4
- Port: 3300

**Key Features**:

- Product browsing
- Shopping cart
- Checkout (Stripe)
- Video product showcases
- Google Analytics 4
- Multi-tenant theming
- Shopify integration

**Key Packages**:

- `@cgk-platform/commerce` - Commerce provider abstraction
- `@cgk-platform/shopify` - Shopify API client
- `@cgk-platform/analytics` - GA4 integration
- `@cgk-platform/video` - Video playback
- `@stripe/react-stripe-js` - Stripe checkout
- `embla-carousel-react` - Product carousels

**Deployment**:

- Vercel Project: `cgk-storefront`
- URL: cgk-storefront.vercel.app
- Custom domain: shop.{tenant-domain}.com

**Customization**:

- Tenants customize via `apps/storefront/src/`
- Protected from upstream updates via `.gitattributes`
- Theme configuration in `platform.config.ts`

---

### 4. Meliusly Storefront (Sister Brand)

**Purpose**: Meliusly-specific storefront with custom branding and features

**Tech Stack**:

- Next.js 16.1 (newer version)
- React 19
- Tailwind CSS 4.0 (newer version)
- Port: 3300

**Key Features**:

- Custom Meliusly branding
- Shopify integration
- Product catalog
- Custom design system

**Key Packages**:

- `@cgk-platform/commerce` - Commerce layer
- `@cgk-platform/shopify` - Shopify client
- `@cgk-platform/ui` - Shared UI components
- `@cgk-platform/logging` - Structured logging

**Deployment**:

- Vercel Project: `cgk-meliusly-storefront`
- URL: cgk-meliusly-storefront.vercel.app
- Custom domain: shop.meliusly.com (likely)

**Relationship to Generic Storefront**:

- Started as fork of `apps/storefront/`
- Now maintained separately
- Example of brand-specific customization

---

### 5. Creator Portal

**Purpose**: Portal for content creators and brand ambassadors

**Tech Stack**:

- Next.js 15.2
- React 19
- Tailwind CSS 3.4
- Port: 3400

**Key Features**:

- Creator onboarding
- Content submission
- Payment management (Stripe + Wise)
- Tax documentation (W-9/W-8)
- Video upload and management
- Performance analytics

**Key Packages**:

- `@cgk-platform/payments` - Stripe Connect + Wise
- `@cgk-platform/tax` - Tax form handling
- `@cgk-platform/video` - Video management
- `@vercel/blob` - File uploads
- `bcryptjs` - Password hashing
- `jose` - JWT handling
- `recharts` - Analytics charts

**Deployment**:

- Vercel Project: `cgk-creator-portal`
- URL: cgk-creator-portal.vercel.app
- Custom domain: creators.{tenant-domain}.com

**Access Control**:

- Separate JWT auth from main admin
- Creator-specific permissions
- Tenant isolation enforced

---

### 6. Contractor Portal

**Purpose**: Portal for contractors and service providers

**Tech Stack**:

- Next.js 15.2
- React 19
- Tailwind CSS 3.4
- Port: 3500

**Key Features**:

- Contractor onboarding
- Job management
- Payment processing
- Video content delivery
- Drag-and-drop task boards

**Key Packages**:

- `@cgk-platform/payments` - Payment handling
- `@hello-pangea/dnd` - Drag-and-drop (fork of react-beautiful-dnd)
- `@vercel/blob` - File uploads
- `bcryptjs` - Password hashing
- `jose` - JWT handling
- `date-fns` - Date utilities

**Deployment**:

- Vercel Project: `cgk-contractor-portal`
- URL: cgk-contractor-portal-cgk-linens-88e79683.vercel.app
- Custom domain: contractors.{tenant-domain}.com

**Access Control**:

- Separate JWT auth from main admin
- Contractor-specific permissions
- Tenant isolation enforced

---

### 7. Shopify App

**Purpose**: Shopify App for bundle builder, delivery customization, and surveys

**Tech Stack**:

- Remix 2.16.7 (NOT Next.js)
- React 18 (older version)
- Vite 6.2.2
- Prisma (separate database)

**Key Features**:

- Bundle builder
- Delivery customization
- Session stitching
- Post-purchase surveys
- Shopify Admin integration

**Key Packages**:

- `@shopify/shopify-app-remix` - Shopify App framework
- `@shopify/app-bridge-react` - Shopify App Bridge
- `@shopify/polaris` - Shopify design system
- `@prisma/client` - Database ORM
- `@cgk-platform/shopify` - Shared Shopify utilities

**Deployment**:

- Vercel Project: `cgk-shopify-app`
- URL: cgk-shopify-app-cgk-linens-88e79683.vercel.app
- Installed via Shopify Partners dashboard

**Important Differences**:

- Uses Remix, not Next.js
- Has own Prisma database (not shared)
- React 18 (not 19)
- Different auth flow (Shopify OAuth)

---

### 8. Command Center

**Purpose**: Operations dashboard for monitoring platform activity

**Tech Stack**:

- Next.js 15.2
- React 19
- Tailwind CSS 3.4
- Port: 3300

**Key Features**:

- Platform monitoring
- OpenClaw integration (internal tool)
- Real-time operations view

**Key Packages**:

- `@cgk-platform/openclaw` - Internal operations tool
- `@cgk-platform/auth` - Authentication
- `@cgk-platform/db` - Database access
- `@cgk-platform/ui` - UI components

**Deployment**:

- Vercel Project: `cgk-command-center`
- URL: cgk-command-center-cgk-linens-88e79683.vercel.app
- Internal only

**Access Control**:

- Operations team access
- Tenant-specific views
- Real-time monitoring

---

### 9. MCP Server

**Purpose**: Model Context Protocol server for AI assistant integration

**Tech Stack**:

- Next.js 15.2
- React 19
- Edge Runtime
- Port: 3500

**Key Features**:

- Streamable HTTP transport (POST-based)
- Per-request authentication
- Tenant isolation
- Streaming responses
- Token usage logging

**Key Packages**:

- `@cgk-platform/mcp` - MCP protocol handling
- `@cgk-platform/auth` - JWT verification
- `@cgk-platform/db` - Database access
- `jose` - JWT utilities

**Deployment**:

- Vercel Project: `cgk-mcp-server`
- URL: cgk-mcp-server.vercel.app
- Edge runtime (globally distributed)

**API Endpoints**:

- `POST /api/mcp` - Main MCP endpoint (JSON-RPC 2.0)
- `GET /` - Status page

**Integration**:

- Used by Claude Desktop
- Used by other AI assistants
- Token-based authentication

**See Also**: `apps/mcp-server/CLAUDE.md` for detailed MCP documentation

---

## Common Patterns Across Apps

### Shared Dependencies

All Next.js apps share these core dependencies:

```json
{
  "@cgk-platform/core": "workspace:*",
  "@cgk-platform/db": "workspace:*",
  "@cgk-platform/auth": "workspace:*",
  "@cgk-platform/ui": "workspace:*",
  "lucide-react": "^0.468.0-0.469.0",
  "next": "^15.2.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
}
```

**Exception**: Shopify App uses React 18 and Remix instead of Next.js

### Development Ports

| App                 | Port              | Avoid Conflicts                           |
| ------------------- | ----------------- | ----------------------------------------- |
| orchestrator        | 3100              | ✅ Unique                                 |
| admin               | 3200              | ✅ Unique                                 |
| storefront          | 3300              | ⚠️ Shares with command-center             |
| meliusly-storefront | 3300              | ⚠️ Shares with storefront, command-center |
| creator-portal      | 3400              | ✅ Unique                                 |
| contractor-portal   | 3500              | ⚠️ Shares with mcp-server                 |
| shopify-app         | N/A (Shopify CLI) | ✅ N/A                                    |
| command-center      | 3300              | ⚠️ Shares with storefront                 |
| mcp-server          | 3500              | ⚠️ Shares with contractor-portal          |

**Running Multiple Apps**: Ensure you don't start apps with conflicting ports simultaneously

### Tailwind CSS Versions

- **Most apps**: Tailwind CSS 3.4
- **Meliusly Storefront**: Tailwind CSS 4.0 (newer)

### TypeScript Configuration

All apps use:

- TypeScript 5.9.0
- Shared config from `@cgk-platform/typescript-config`

### Linting

All apps use:

- ESLint 9.18.0
- Shared config from `@cgk-platform/eslint-config`

---

## Authentication Patterns

### JWT-based (Most Apps)

```typescript
import { requireAuth } from '@cgk-platform/auth'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  // auth.userId, auth.tenantId available
}
```

### Separate Auth Systems

- **Creator Portal**: Separate JWT secret (`CREATOR_JWT_SECRET`)
- **Contractor Portal**: Separate JWT secret (`CONTRACTOR_JWT_SECRET`)
- **Shopify App**: Shopify OAuth (different flow)

---

## Tenant Isolation

All apps (except orchestrator) enforce tenant isolation:

```typescript
import { withTenant } from '@cgk-platform/db'

const data = await withTenant(tenantId, async () => {
  return sql`SELECT * FROM orders`
})
```

**Exception**: Orchestrator has platform-wide access (no tenant context)

---

## Deployment Architecture

```
GitHub Repo (main branch)
    │
    ├── Push to main
    │
    ▼
Vercel Auto-Deploy
    │
    ├── Build all apps in parallel
    │   ├── orchestrator
    │   ├── admin
    │   ├── storefront
    │   ├── meliusly-storefront
    │   ├── creator-portal
    │   ├── contractor-portal
    │   ├── shopify-app
    │   ├── command-center
    │   └── mcp-server
    │
    ▼
Production (9 separate deployments)
```

Each app is a separate Vercel project with independent deployments.

---

## Environment Variables by App

### Shared Across All Apps

```bash
DATABASE_URL                  # Neon PostgreSQL
REDIS_URL                     # Upstash Redis
JWT_SECRET                    # Main JWT secret
SESSION_SECRET                # Session encryption
ENCRYPTION_KEY                # Data encryption
DEFAULT_TENANT_SLUG           # Fallback tenant
```

### App-Specific

**Admin**:

```bash
STRIPE_SECRET_KEY
SHOPIFY_CLIENT_ID
SHOPIFY_CLIENT_SECRET
RESEND_API_KEY
```

**Creator Portal**:

```bash
CREATOR_JWT_SECRET
STRIPE_CONNECT_CLIENT_ID
WISE_API_KEY
```

**Contractor Portal**:

```bash
CONTRACTOR_JWT_SECRET
```

**Shopify App**:

```bash
SHOPIFY_API_KEY
SHOPIFY_API_SECRET
SCOPES
```

**MCP Server**:

```bash
JWT_SECRET                    # (Same as main JWT_SECRET)
```

---

## Development Workflow

### Starting Individual App

```bash
# From repo root
pnpm --filter cgk-admin dev

# Or navigate to app directory
cd apps/admin
pnpm dev
```

### Starting Multiple Apps

```bash
# Terminal 1
pnpm --filter cgk-admin dev

# Terminal 2
pnpm --filter cgk-creator-portal dev

# Terminal 3
pnpm --filter cgk-storefront dev
```

### Type Checking All Apps

```bash
pnpm turbo typecheck
```

### Building for Production

```bash
# All apps
pnpm turbo build

# Single app
pnpm --filter cgk-admin build
```

---

## Inter-App Communication

### Database (Shared)

All apps share same PostgreSQL database with tenant isolation via schemas:

```
public schema (shared):
├── users
├── organizations
├── permissions

tenant_cgk_linens schema:
├── orders
├── products
├── customers

tenant_meliusly schema:
├── orders
├── products
├── customers
```

### Background Jobs (Shared)

All apps can send background jobs via `@cgk-platform/jobs`:

```typescript
import { jobs } from '@cgk-platform/jobs'

await jobs.send('order/created', {
  tenantId: 'cgk_linens',
  orderId: 'order_123',
})
```

### No Direct HTTP Communication

Apps do NOT call each other's APIs directly. All communication happens through:

- Shared database
- Shared background jobs
- Shared Redis cache

---

## Troubleshooting

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3300
```

**Solution**: Multiple apps use port 3300 (storefront, meliusly-storefront, command-center). Only run one at a time or change port in package.json.

### Missing Environment Variables

```
Error: Missing required environment variable: DATABASE_URL
```

**Solution**: Each app needs `.env.local` file:

```bash
cd apps/admin
cp .env.example .env.local
# Fill in actual values
```

### Shopify App Won't Build

```
Error: Cannot find module '@remix-run/dev'
```

**Solution**: Shopify app uses Remix, not Next.js. Make sure you're using correct build command:

```bash
cd apps/shopify-app
pnpm build  # NOT next build
```

---

## Future Apps (Planned)

### Customer Portal (Placeholder)

**Purpose**: Self-service customer portal for order tracking, subscriptions

**Status**: Not yet implemented (Phase 3CP was planned but may be in generic storefront)

---

## Related Documentation

- Root `CLAUDE.md` - Platform-wide development guide
- `MULTI-TENANT-PLATFORM-PLAN/` - Complete platform architecture
- `.claude/knowledge-bases/` - Other knowledge bases
- Each `apps/*/CLAUDE.md` - App-specific guides (where they exist)

---

## When to Use Each App (Agent Guide)

| User Need                    | Recommended App                       | Notes                           |
| ---------------------------- | ------------------------------------- | ------------------------------- |
| "Add product management"     | `admin`                               | Product catalog in admin portal |
| "Create storefront page"     | `storefront` or `meliusly-storefront` | Depends on which brand          |
| "Add creator payment flow"   | `creator-portal`                      | Creator-specific features       |
| "Add Shopify bundle builder" | `shopify-app`                         | Shopify-specific functionality  |
| "Platform monitoring"        | `orchestrator`                        | Super admin only                |
| "AI integration"             | `mcp-server`                          | MCP protocol for AI assistants  |
| "Operations dashboard"       | `command-center`                      | Internal operations             |
| "Contractor management"      | `contractor-portal`                   | Contractor-specific features    |

---

**This knowledge base provides complete context for all 9 apps in the CGK Platform for AI agents working on the codebase.**
