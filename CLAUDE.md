# CGK - Commerce Growth Kit - AI Development Guide

> **Purpose**: This is the ROOT-LEVEL CLAUDE.md for the CGK platform. AI agents should read this file first for project context.

---

## 🚨 MANDATORY: Always Enter Plan Mode First

**CRITICAL REQUIREMENT**: At the start of EVERY Claude session, you MUST enter plan mode before doing any implementation work.

**Exceptions** (when plan mode is NOT required):

- Simple research/exploration tasks (reading files, searching code, answering questions)
- Trivial single-line fixes (typos, obvious bugs)
- Tasks where the user explicitly says "skip planning"

**For ALL other work** (features, refactors, multi-file changes):

1. Use the `EnterPlanMode` tool immediately
2. Explore the codebase thoroughly
3. Design your approach
4. Get user approval via `ExitPlanMode`
5. Then implement

**Why this matters**: Planning prevents wasted effort, ensures alignment with architecture, and catches issues before code is written.

---

## CRITICAL: Master Execution Guide

**Before starting ANY work, read the Master Execution Guide:**

```
Read file_path="/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/MASTER-EXECUTION-GUIDE.md"
```

This guide contains:

- Execution flow and phase sequence
- Context window management (when to start fresh sessions)
- Definition of Done requirements
- Emergency procedures
- Parallel agent coordination

---

## WORKSPACE ISOLATION (CRITICAL)

This is a **CGK project**. Never reference, access, or discuss Rawdog, rawdog-web, or any Rawdog workspace projects.

---

## MANDATORY RULES (No Exceptions)

### Rule 1: Never Skip or Defer Tasks

- Every task in a phase MUST be completed before marking phase done
- No `// TODO` or `// PLACEHOLDER` comments allowed
- No partial implementations - full functionality required
- No "we'll fix this later" - fix it now

### Rule 2: Tenant Isolation is MANDATORY

```typescript
// ALWAYS use tenant context - NO EXCEPTIONS
const data = await withTenant(tenantId, () => sql`SELECT * FROM orders`)

// ALWAYS tenant-prefix cache keys
const cache = createTenantCache(tenantId)

// ALWAYS include tenantId in job payloads
await jobs.send('order/created', { tenantId, orderId })

// NEVER query without tenant context
await sql`SELECT * FROM orders` // WRONG - NEVER DO THIS
```

### Rule 3: Context Window Management

Your context window is ~200k tokens. Start a NEW session when:

- Completing any major phase milestone
- Context exceeds ~150k tokens
- After any audit checkpoint

Before starting a new session, create a handoff document:

```
.claude/session-handoffs/PHASE-X-HANDOFF.md
```

### Rule 4: Type Check, Not Build

```bash
# FAST - Type check only (PREFERRED)
npx tsc --noEmit
pnpm turbo typecheck

# SLOW - Full build (only for actual deployment)
pnpm build
```

---

## Quick Start

**Three paths to get started** (5 minutes to 30 minutes):

### Path 1: One-Click Vercel Deploy (5 minutes) - FASTEST

Click the deploy button in README.md. Vercel auto-provisions Neon + Upstash, generates secrets, and deploys.

### Path 2: Cloud-First CLI (5-10 minutes) - RECOMMENDED

```bash
# Clone repo
git clone https://github.com/cgk-platform/cgk
cd cgk

# Run wizard to configure architecture
npx @cgk-platform/cli wizard

# Quick start with cloud databases (Neon + Upstash)
npx @cgk-platform/cli quick-start
```

### Path 3: Manual Setup (30 minutes)

See `docs/getting-started/LOCAL-DEVELOPMENT-SETUP.md` for detailed manual setup.

---

**Development Commands** (after setup):

```bash
# Development
pnpm dev                      # Start all apps
pnpm dev --filter admin       # Start admin only
pnpm dev --filter storefront  # Start storefront only

# Type checking (PREFERRED - much faster than build)
npx tsc --noEmit              # Type check current package
pnpm turbo typecheck          # Type check all packages

# Testing
pnpm test                     # Run all tests
pnpm test:e2e                 # Run Playwright E2E tests

# Database
npx @cgk-platform/cli migrate                # Run migrations
npx @cgk-platform/cli migrate:auto           # Auto-run missing migrations on existing tenants
npx @cgk-platform/cli migrate:auto --tenant meliusly  # Migrate specific tenant
npx @cgk-platform/cli doctor                 # Check configuration

# Architecture wizard
npx @cgk-platform/cli wizard  # Interactive architecture decision wizard
```

**CRITICAL: Auto-Migration System**

New migrations added to the codebase do NOT automatically apply to existing tenants. You MUST run `migrate:auto` after adding new migration files:

```bash
# After adding new migrations, run this to update all existing tenants
npx @cgk-platform/cli migrate:auto

# Check what would be migrated (dry run)
npx @cgk-platform/cli migrate:auto --dry-run

# Migrate specific tenant only
npx @cgk-platform/cli migrate:auto --tenant meliusly
```

---

## 🔑 Environment Variables Location (CRITICAL)

**WHERE TO FIND ENV VARS**: All environment variables are stored in **`apps/*/. env.local`** files, NOT in the root or packages/ directories.

```bash
# Each app has its own .env.local with all necessary credentials
apps/admin/.env.local              # Admin portal env vars (includes DATABASE_URL)
apps/storefront/.env.local         # Storefront env vars
apps/creator-portal/.env.local     # Creator portal env vars
apps/orchestrator/.env.local       # Orchestrator env vars
apps/shopify-app/.env.local        # Shopify app env vars
apps/contractor-portal/.env.local  # Contractor portal env vars

# To use database connection in Node scripts:
cd apps/admin && node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.POSTGRES_URL)"

# Or export env vars for CLI commands:
export $(cat apps/admin/.env.local | grep POSTGRES_URL | xargs) && npx @cgk-platform/cli migrate
```

**NEVER** look for env vars in:

- ❌ Root directory (.env files)
- ❌ packages/db/ directory
- ❌ packages/\*/ directories

**ALWAYS** look in:

- ✅ apps/\*/. env.local files

---

## Agent Coordination

The CGK platform uses specialized Claude agents for different types of work. Full orchestration guide at `.claude/AGENT-COORDINATION.md`.

### Quick Reference Matrix

| Task Type                 | Agent                 | Model      | When to Use                                |
| ------------------------- | --------------------- | ---------- | ------------------------------------------ |
| **Architecture planning** | architect             | opus-4.5   | Multi-component designs, ADRs, migrations  |
| **Production coding**     | implementer           | sonnet-4.5 | Feature implementation, bug fixes          |
| **Security review**       | reviewer              | opus-4.5   | Code audits, tenant isolation checks       |
| **Security auditing**     | security-auditor      | opus-4.5   | OWASP Top 10 scans, secret detection       |
| **Debugging**             | debugger              | sonnet-4.5 | Root cause analysis, error investigation   |
| **Exploration**           | researcher or Explore | haiku      | Fast codebase searches, doc lookup         |
| **Test writing**          | tester                | sonnet-4.5 | Unit/integration/E2E tests                 |
| **Refactoring**           | refactorer            | sonnet-4.5 | Large-scale restructuring                  |
| **Build optimization**    | build-optimizer       | haiku      | CI/CD performance monitoring, cache tuning |

### Model Selection (Cost Optimization)

| Model          | Cost (Input/Output per MTok) | Best For                                                   |
| -------------- | ---------------------------- | ---------------------------------------------------------- |
| **Opus 4.5**   | $15 / $75                    | Critical decisions, security reviews, complex architecture |
| **Sonnet 4.5** | $3 / $15                     | Production code, debugging, testing                        |
| **Haiku**      | $0.25 / $1.25                | Exploration, doc lookup, simple queries                    |

**Cost Example**: Phase 8 audit with 15 parallel haiku agents (~$30, 1 hour) vs 1 sequential opus agent (~$300, 8 hours) = 10x cost savings + 8x time savings.

### Coordination Patterns

1. **Sequential Handoff**: Tasks with dependencies (architect → implementer → tester → reviewer)
2. **Parallel Execution**: Independent tasks (15 agents auditing different files simultaneously)
3. **Escalation**: Start cheap (haiku), escalate to opus only if needed
4. **Background Execution**: Long-running tasks that don't block other work

**CRITICAL**: Session handoffs required when:

- Context exceeds 150k tokens
- Switching agent types (opus → sonnet)
- Reaching phase milestones

See `.claude/session-handoffs/` for 44 existing handoff examples.

---

## Skills System

The platform has two types of Claude-invocable resources:

### Executable Skills (15 Total)

Located in `.claude/skills/`, these have `index.js` and are invoked via `/skill-name`:

#### Tier 1: Critical Automation (4 skills)

| Skill                           | Purpose                              | Annual Time Saved |
| ------------------------------- | ------------------------------------ | ----------------- |
| `/api-route-scaffolder`         | Generate Next.js API routes          | 1,040-2,080 hrs   |
| `/deployment-readiness-checker` | Pre-deployment validation (9 checks) | 160-320 hrs       |
| `/encryption-keys-manager`      | Automated key rotation               | 16-40 hrs         |
| `/vercel`                       | Production debugging & env var mgmt  | 80-160 hrs        |

#### Tier 2: Developer Experience (3 skills)

| Skill                 | Purpose                          | Annual Time Saved    |
| --------------------- | -------------------------------- | -------------------- |
| `/tenant-provisioner` | Automated tenant onboarding      | 45-90 min per tenant |
| `/todo-tracker`       | GitHub issue creation from TODOs | 30-60 min per sprint |
| `/env-var-workflow`   | Guided env var setup             | 10-20 min per var    |

#### Tier 3: Quality & Maintenance (4 skills)

| Skill                           | Purpose                      | Use Case                   |
| ------------------------------- | ---------------------------- | -------------------------- |
| `/type-cast-auditor`            | Fix TypeScript cast patterns | Phase 8: 806 violations    |
| `/permission-auditor`           | Validate auth patterns       | Security audits            |
| `/structured-logging-converter` | Convert to structured logs   | Phase 8: 707 console calls |
| `/migration-impact-analyzer`    | Analyze migration risks      | Pre-deployment             |

#### Tier 4: Existing Skills (5 skills)

| Skill                         | Purpose                   | Use Case             |
| ----------------------------- | ------------------------- | -------------------- |
| `/meliusly-figma-audit`       | Figma design validation   | Storefront dev       |
| `/tenant-isolation-validator` | Tenant isolation patterns | Pre-commit           |
| `/sql-pattern-enforcer`       | SQL pattern validation    | Database code        |
| `/plan-mode-enforcer`         | Require planning          | Workflow enforcement |
| `/vercel-config-auditor`      | Env var consistency       | Weekly audits        |

**Invocation Pattern**:

```typescript
// Invoke via Skill tool
Skill({ skill: 'tenant-isolation-validator', args: '--fix --path apps/admin' })
Skill({ skill: 'api-route-scaffolder', args: 'orders --methods GET,POST' })
Skill({ skill: 'deployment-readiness-checker', args: '--app admin' })
Skill({ skill: 'vercel', args: 'quick:debug admin' })
Skill({ skill: 'vercel', args: 'env:list --app admin' })
```

**Full Documentation**: See [.claude/SKILL-REGISTRY.md](.claude/SKILL-REGISTRY.md) for comprehensive skill catalog.

### Knowledge Bases (Agent Reference Docs)

Located in `.claude/knowledge-bases/`, these are README-only references (10 total):

| Knowledge Base                     | Content                                 | When to Reference            |
| ---------------------------------- | --------------------------------------- | ---------------------------- |
| `wordpress-distribution-patterns/` | Self-hosted architecture, fork workflow | Understanding platform model |
| `database-migration-patterns/`     | SQL best practices, ID type patterns    | Writing migrations           |
| `payment-processing-patterns/`     | Stripe Connect, Wise integration        | Payment features             |
| `shopify-api-guide/`               | Shopify Admin/Storefront API            | Shopify integration          |
| `figma-design-system/`             | Meliusly design tokens, components      | Storefront design            |
| `environment-variables-guide/`     | Env var management, Vercel workflow     | Setting up env vars          |
| `multi-tenancy-patterns/`          | Tenant isolation, schema-per-tenant     | Multi-tenant development     |
| `design-system-rules/`             | Portal design system (Navy + Gold)      | Building portal UI           |
| `vercel-postgres-patterns/`        | SQL template tag limitations            | Database queries             |
| `build-errors-reference/`          | Common build errors and solutions       | Troubleshooting builds       |

**Reference Pattern**:

```typescript
// Agents read directly (no /command invocation)
Read('.claude/knowledge-bases/database-migration-patterns/README.md')
Read('.claude/knowledge-bases/environment-variables-guide/README.md')
```

---

## Pre-Commit Validations

The platform has automated validations that run before every commit. These prevent critical errors from reaching production.

### Validation Scripts

Located in `scripts/`:

| Script                       | Purpose                      | Checks                                                                             |
| ---------------------------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| `validate-tenant-context.ts` | Tenant isolation enforcement | SQL without withTenant(), cache without createTenantCache(), jobs missing tenantId |
| `validate-migration.sh`      | Migration file validation    | ID type mismatches, missing IF NOT EXISTS, pgvector syntax                         |
| `verify-env-vars.sh`         | Environment variable sync    | .env.example consistency across apps                                               |

### Manual Validation Commands

```bash
# Validate tenant isolation
pnpm validate:tenant-isolation

# Validate migrations
bash scripts/validate-migration.sh

# Verify environment variables
bash scripts/verify-env-vars.sh

# Run all validations
pnpm validate:all
```

### Bypassing Validations (NOT RECOMMENDED)

```bash
# Skip pre-commit hooks (CI will still enforce)
git commit --no-verify -m "message"
```

**WARNING**: CI enforces all validations. Bypassing locally will cause PR failures.

### Auto-Fix Support

Some validators support auto-fixing violations:

```bash
# Fix tenant isolation violations
pnpm validate:tenant-isolation --fix

# Fix specific path
pnpm validate:tenant-isolation --fix --path apps/admin
```

---

## Vercel Deployment Architecture

**CRITICAL**: CGK Platform uses **ONE Vercel project** per user deployment, NOT 8 separate projects.

### Single Project with Path-Based Routing

Users fork the template and deploy to **THEIR Vercel account** as a single project:

```
User's Vercel Project: my-commerce-platform
├── Domain: my-store.vercel.app (or custom domain)
├── Path Routing (via vercel.json):
│   ├── /                  → apps/storefront/
│   ├── /admin/*           → apps/admin/
│   ├── /creator/*         → apps/creator-portal/
│   ├── /contractor/*      → apps/contractor-portal/
│   ├── /orchestrator/*    → apps/orchestrator/
│   ├── /shopify-app/*     → apps/shopify-app/
│   ├── /command-center/*  → apps/command-center/
│   └── /mcp/*             → apps/mcp-server/
└── Build: pnpm turbo build (builds ALL 8 apps in one deploy)
```

### vercel.json Configuration

```json
{
  "buildCommand": "pnpm turbo build --filter=admin --filter=storefront ...",
  "rewrites": [
    { "source": "/admin/:path*", "destination": "/apps/admin/:path*" },
    { "source": "/creator/:path*", "destination": "/apps/creator-portal/:path*" },
    { "source": "/:path*", "destination": "/apps/storefront/:path*" }
  ],
  "integrations": {
    "neon": { "required": true },
    "upstash": { "required": true }
  }
}
```

### One-Click Deploy Button

Users click "Deploy with Vercel" button in README.md:

1. ✅ Fork repository to **USER's GitHub**
2. ✅ Deploy to **USER's Vercel account** (single project)
3. ✅ Auto-provision Neon PostgreSQL on **USER's Neon account**
4. ✅ Auto-provision Upstash Redis on **USER's Upstash account**
5. ✅ Auto-generate secrets (JWT, encryption keys)
6. ✅ Site live in 5-10 minutes

**Time to live**: 5-10 minutes | **Cost**: $0/month (free tier)

### Environment Variable Management

```bash
# List environment variables (user's project)
vercel env ls

# Add environment variable (applies to ALL 8 apps)
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development

# Pull to local .env.local files
vercel env pull apps/admin/.env.local
vercel env pull apps/storefront/.env.local
# ... repeat for all apps
```

**IMPORTANT**: Environment variables are **shared across all 8 apps** in the single Vercel project.

### Deployment Workflow

```bash
# Users deploy via git push (NOT vercel CLI)
git add .
git commit -m "feat: add new feature"
git push origin main

# Vercel auto-deploys:
# 1. Detects push to main branch
# 2. Runs build: pnpm turbo build
# 3. Runs migrations: pnpm db:migrate
# 4. Deploys all 8 apps
# 5. Live at: my-store.vercel.app
```

**NEVER use `vercel deploy` CLI** - GitHub integration handles all deployments.

### Example: CGK Development Team Project (Reference Only)

The CGK development team maintains **ONE reference deployment** for testing:

- **Project**: cgk-platform (single Vercel project)
- **Team**: cgk-linens-88e79683
- **URL**: cgk-platform.vercel.app
- **Purpose**: Testing template updates before release

**This is NOT a production deployment**. Users create their own separate projects.

---

## 🚨 CRITICAL: Shopify App Architecture (MUST READ)

**SHOPIFY DEPRECATED CUSTOM APPS CREATED IN ADMIN** - As of 2024-2026, Shopify no longer allows creating "custom apps" directly in the Shopify Admin dashboard. This is a common source of confusion.

### The ONLY Way to Create Shopify Apps Now:

**Apps MUST be created in Shopify Partners Dashboard** (https://partners.shopify.com):

1. Create app in Partners dashboard
2. Deploy app to hosting (Vercel, etc.)
3. Install app to stores via OAuth flow

### CGK Platform Shopify App (Already Exists!)

**CRITICAL**: We already have a Shopify app installed and working:

- **App Name**: "CGK Platform"
- **Location**: `apps/shopify-app/` (Remix app)
- **Status**: Installed and active
- **Shop**: meliusly.myshopify.com
- **Multi-Tenant**: Uses `public.shopify_app_installations` for shop-to-tenant mapping

### Admin API vs Storefront API (IMPORTANT DISTINCTION)

| API Type           | Purpose                                          | Authentication                             | Usage                          |
| ------------------ | ------------------------------------------------ | ------------------------------------------ | ------------------------------ |
| **Admin API**      | Backend operations (orders, webhooks, inventory) | OAuth access token (from app installation) | CGK Platform app ✅ HAS THIS   |
| **Storefront API** | Public product data for headless storefronts     | Public Storefront Access Token             | Need to CREATE using Admin API |

### Getting Storefront Access Token (Use Existing App!)

**DO NOT** try to create a new app in Shopify Admin - it won't work!

**CORRECT APPROACH** - Use existing app's Admin API to create Storefront token:

```typescript
// Use Admin API mutation to create Storefront Access Token
const mutation = `
  mutation {
    storefrontAccessTokenCreate(input: {
      title: "Meliusly Headless Storefront"
    }) {
      storefrontAccessToken {
        accessToken
        title
      }
    }
  }
`
```

**Steps:**

1. Use existing CGK Platform app's Admin API token (already in database)
2. Call `storefrontAccessTokenCreate` GraphQL mutation
3. Store resulting token in database
4. Use for headless storefront product fetching

### When User Asks to "Create an App in Shopify"

**STOP** - Clarify what they actually need:

- ❌ **New app in Partners?** - We already have CGK Platform app
- ❌ **Custom app in Admin?** - Deprecated, doesn't exist anymore
- ✅ **Storefront Access Token?** - Create via Admin API mutation using existing app
- ✅ **New app for different purpose?** - Must go through Partners dashboard

### References

- Existing app config: `apps/shopify-app/shopify.app.toml`
- Admin API client: `@cgk-platform/shopify` (createAdminClient)
- Storefront API client: `@cgk-platform/shopify` (createStorefrontClient)
- Multi-tenant resolution: `packages/shopify/src/app/tenant-resolution.ts`

---

## Tech Stack (February 2026)

| Core         | Version  | Notes               |
| ------------ | -------- | ------------------- |
| Node.js      | >=22 LTS | Active LTS          |
| pnpm         | 10.x     | Package manager     |
| TypeScript   | 5.9.x    |                     |
| React        | 19.x     | With React Compiler |
| Next.js      | 16.x     | Turbopack stable    |
| Tailwind CSS | 4.x      | 5x faster builds    |

| Dependencies                | Version | Notes                                          |
| --------------------------- | ------- | ---------------------------------------------- |
| `@radix-ui/react-*`         | ^1.1.0  | Scoped packages (e.g., `@radix-ui/react-slot`) |
| `@shopify/shopify-api`      | ^12.3.0 |                                                |
| `stripe`                    | ^17.0.0 | API version `2025-02-24.acacia`                |
| `@modelcontextprotocol/sdk` | ^1.0.0  |                                                |
| `tailwindcss-animate`       | ^1.0.7  | Latest available                               |

**Note on Radix UI**: The plan mentions a "unified `radix-ui`" package, but this doesn't work in practice. Use individual scoped packages like `@radix-ui/react-slot`, `@radix-ui/react-dialog`, etc.

---

## 🏗️ Architecture: WordPress-Style Portable Platform

**CRITICAL**: CGK Platform is a **template repository** (like WordPress.org), NOT a multi-tenant SaaS (like WordPress.com or Shopify).

### Distribution Model

| CGK Platform                    | WordPress.org              | NOT WordPress.com         |
| ------------------------------- | -------------------------- | ------------------------- |
| ✅ Template repository          | ✅ Download & install      | ❌ Shared SaaS hosting    |
| ✅ Fork & deploy to YOUR Vercel | ✅ Install on YOUR hosting | ❌ wordpress.com accounts |
| ✅ Own database, cache, assets  | ✅ Own MySQL, files        | ❌ Shared infrastructure  |
| ✅ Full code access             | ✅ Full PHP access         | ❌ Limited customization  |
| ✅ Git-based updates            | ✅ Core updates            | ❌ Platform upgrades      |

**Key Insight**: Users **fork the template** and deploy to **THEIR infrastructure** (Vercel + Neon + Upstash), not ours.

See [.claude/knowledge-bases/wordpress-distribution-patterns/README.md](.claude/knowledge-bases/wordpress-distribution-patterns/README.md) for complete patterns.

### Single Vercel Project (All 8 Apps)

**Before**: 8 separate Vercel projects (REMOVED in WordPress migration)

**After**: ONE Vercel project with path-based routing

```
Single Deployment: my-commerce-platform.vercel.app
├── /                 → Storefront (apps/storefront/)
├── /admin/*          → Admin Portal (apps/admin/)
├── /creator/*        → Creator Portal (apps/creator-portal/)
├── /contractor/*     → Contractor Portal (apps/contractor-portal/)
├── /orchestrator/*   → Super Admin (apps/orchestrator/)
├── /shopify-app/*    → Shopify Integration (apps/shopify-app/)
├── /command-center/* → Operations Dashboard (apps/command-center/)
└── /mcp/*            → Claude MCP Server (apps/mcp-server/)
```

**Benefits**: True one-click deploy, single environment variable set, simplified user experience.

### platform.config.ts = wp-config.php

Users customize via configuration (not code):

```typescript
// platform.config.ts (PROTECTED from upstream merges)
export const platformConfig = {
  deployment: {
    name: 'My Commerce Platform',
    mode: 'single-tenant', // or 'multi-tenant'
  },
  tenants: [
    {
      slug: 'my-brand',
      name: 'My Brand',
      primaryColor: '#000000',
      logo: '/brands/my-brand/logo.svg',
    },
  ],
  features: {
    shopifyIntegration: true,
    creatorPortal: false,
    // ... enable/disable features
  },
}
```

**Admin UI**: `/admin/platform-config` for non-technical editing.

### Self-Hosted Infrastructure

```
User's Stack (They Own Everything)
├── Vercel Project → my-store (user's Vercel account)
├── Neon Database → cgk-db (user's Neon account)
├── Upstash Redis → cgk-cache (user's Upstash account)
├── Vercel Blob → cgk-assets (user's Vercel account)
└── GitHub Fork → my-org/my-store (user's GitHub)
```

**Cost**: $0/month (free tiers) to $49/month (production).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              WORDPRESS-STYLE PORTABLE PLATFORM               │
├─────────────────────────────────────────────────────────────┤
│  apps/                    # All in ONE Vercel project        │
│  ├── storefront/          # Generic storefront (user themes) │
│  ├── admin/               # Admin portal                     │
│  ├── creator-portal/      # Creator management               │
│  ├── contractor-portal/   # Contractor management            │
│  ├── orchestrator/        # Super Admin Dashboard            │
│  ├── shopify-app/         # Shopify App (Remix)              │
│  ├── command-center/      # Operations dashboard             │
│  └── mcp-server/          # Claude MCP integration           │
├─────────────────────────────────────────────────────────────┤
│  packages/                # Shared utilities                 │
│  ├── core/                # Types, config schemas            │
│  ├── db/                  # Database + tenant isolation      │
│  ├── auth/                # JWT authentication               │
│  ├── ui/                  # Shared React components          │
│  ├── commerce/            # Commerce abstraction             │
│  ├── shopify/             # Shopify API client               │
│  ├── payments/            # Stripe + Wise integration        │
│  ├── jobs/                # Background jobs                  │
│  ├── mcp/                 # MCP tools                        │
│  ├── analytics/           # GA4, attribution                 │
│  └── logging/             # Structured logging               │
├─────────────────────────────────────────────────────────────┤
│  platform.config.ts       # User configuration (PROTECTED)   │
│  vercel.json              # Single project, path routing     │
└─────────────────────────────────────────────────────────────┘
```

## Creative Studio (Video Editor UI)

The Creative Studio at `apps/admin/src/app/admin/creative-studio/` is the UI for the openCLAW video-editor agent (Reel). It provides real-time project editing with DnD scenes, editable captions, and SSE-driven activity updates. Backend logic is in `packages/video-editor/`.

See [.claude/knowledge-bases/creative-studio/README.md](.claude/knowledge-bases/creative-studio/README.md) for complete architecture and API reference.

---

## Multi-Tenancy Patterns

**CRITICAL RULE**: Always use `withTenant()` for tenant-scoped queries and `createTenantCache()` for cache isolation.

See [.claude/knowledge-bases/multi-tenancy-patterns/README.md](.claude/knowledge-bases/multi-tenancy-patterns/README.md) for complete patterns.

**Quick Reference**:

- Database: Schema-per-tenant (`public` + `tenant_{slug}` schemas)
- Cache: `createTenantCache(tenantId)` auto-prefixes keys
- Jobs: Always include `{ tenantId }` in payload
- Integrations: Tenants own their own accounts (use `getTenant*Client()` factories)
- ID Types: Public = UUID, Most tenant tables = TEXT (check before adding FKs)

---

## Authentication

### JWT + Session Auth (Custom, No Clerk)

```typescript
import { validateSession, requireAuth, getTenantContext } from '@cgk-platform/auth'

// API routes
export async function GET(req: Request) {
  const { tenantId, userId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const orders = await withTenant(tenantId, async () => {
    return sql`SELECT * FROM orders ORDER BY created_at DESC`
  })

  return Response.json({ orders })
}
```

---

## File Organization

### Target File Sizes

| Type       | Target        | Soft Max | Notes                     |
| ---------- | ------------- | -------- | ------------------------- |
| Components | 200-400 lines | 500      | Split by logical sections |
| API Routes | 100-200 lines | 300      | Extract business logic    |
| Utilities  | 100-300 lines | 400      | One domain per file       |
| Types      | 50-150 lines  | 200      | Group related types       |

**HARD LIMIT**: 650 lines - split if larger

---

## API Route Pattern

```typescript
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { tenantId, userId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  return withTenant(tenantId, async () => {
    const data = await sql`SELECT * FROM orders LIMIT 50`
    return Response.json({ orders: data })
  })
}
```

---

## @cgk-platform/ui Import Pattern (CRITICAL)

All UI components must be imported from the main `@cgk-platform/ui` entry point:

```typescript
// WRONG - subpath exports don't exist
import { Button } from '@cgk-platform/ui/button'
import { Card } from '@cgk-platform/ui/card'
import { Button } from '@cgk-platform/ui/components/button'

// CORRECT - all exports from main index
import { Button, Card, Input, Badge } from '@cgk-platform/ui'
```

---

## @vercel/postgres SQL Patterns (CRITICAL)

See [.claude/knowledge-bases/vercel-postgres-patterns/README.md](.claude/knowledge-bases/vercel-postgres-patterns/README.md) for complete patterns.

**8 Critical Patterns**:

1. Arrays → `{${items.join(',')}}::type[]` (PostgreSQL array literals)
2. Dates → `.toISOString()` (no Date objects)
3. Type casts → `as unknown as Type` (double cast through unknown)
4. No SQL fragment composition (use if/else branches)
5. No dynamic table names (use explicit switch/case)
6. QueryResultRow null checks (always check `result.rows[0]`)
7. Config object casts → `as unknown as ConfigType`
8. Unused variables → Remove entirely or document WHY with underscore

---

## @cgk-platform/auth Permission Patterns (CRITICAL)

### checkPermissionOrRespond Signature

The `checkPermissionOrRespond` function takes exactly **3 arguments**:

```typescript
// WRONG - 4 arguments (request is NOT needed)
const permissionDenied = await checkPermissionOrRespond(
  request, // ❌ Not a parameter!
  auth.tenantId,
  auth.userId,
  'permission.name'
)

// CORRECT - 3 arguments
const permissionDenied = await checkPermissionOrRespond(
  auth.userId, // 1. userId
  auth.tenantId, // 2. tenantId
  'permission.name' // 3. permission string
)
if (permissionDenied) return permissionDenied
```

### requireAuth Returns AuthContext

```typescript
import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk-platform/auth'

export async function GET(request: Request) {
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Now use auth.userId and auth.tenantId
  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId || '',
    'resource.action'
  )
  if (permissionDenied) return permissionDenied

  // Continue with authorized logic...
}
```

---

## Dynamic SQL Without sql.unsafe() (CRITICAL)

The `@vercel/postgres` sql tag has **NO** `.unsafe()` method. For dynamic WHERE clauses, create separate query functions:

```typescript
// WRONG - sql.unsafe() doesn't exist
const whereClause = status ? `AND status = '${status}'` : ''
await sql`SELECT * FROM items WHERE active = true ${sql.unsafe(whereClause)}`

// CORRECT - Separate query functions for each filter combination
async function getItems(filters: { status?: string; category?: string }) {
  const { status, category } = filters

  if (status && category) {
    return sql`SELECT * FROM items WHERE status = ${status} AND category = ${category}`
  } else if (status) {
    return sql`SELECT * FROM items WHERE status = ${status}`
  } else if (category) {
    return sql`SELECT * FROM items WHERE category = ${category}`
  } else {
    return sql`SELECT * FROM items`
  }
}

// For pagination with filters, create dedicated query builders
function getImagesQuery(options: { status?: string; offset: number; limit: number }) {
  const { status, offset, limit } = options

  if (status) {
    return sql`
      SELECT * FROM images
      WHERE status = ${status}
      ORDER BY created_at DESC
      OFFSET ${offset} LIMIT ${limit}
    `
  }

  return sql`
    SELECT * FROM images
    ORDER BY created_at DESC
    OFFSET ${offset} LIMIT ${limit}
  `
}
```

---

## Frontend Design Skill

**MANDATORY**: Invoke `/frontend-design` before creating ANY React component.

```
/frontend-design

Building [COMPONENT] for [LOCATION].

Requirements:
- [Specific requirements]

Constraints:
- shadcn/ui components
- Tailwind CSS
```

---

## Design System Rules

**Scope**: `apps/admin`, `apps/orchestrator`, `apps/creator-portal` ONLY
**Excluded**: `apps/storefront` (uses tenant-specific theming)

See [.claude/knowledge-bases/design-system-rules/README.md](.claude/knowledge-bases/design-system-rules/README.md) for complete design system.

**Quick Checklist**:

- ✅ Navy (#2B3E50) + Gold (#FFB81C) palette
- ✅ Semantic tokens (bg-success, text-warning, bg-gold)
- ✅ lucide-react icons only (no inline SVGs)
- ✅ StatusBadge component for all status displays
- ✅ Mobile drawer pattern required

---

## Environment Variables Strategy

See [.claude/knowledge-bases/environment-variables-guide/README.md](.claude/knowledge-bases/environment-variables-guide/README.md) for comprehensive environment variable patterns.

**Quick Reference**:

- Production vars → Vercel first → `vercel env pull .env.local`
- Local-only vars → `.env.development.local` (LOCAL*\*, DEBUG*\_, TEST\_\_)
- Documentation → ALL `apps/*/.env.example` files must stay in sync
- **NEVER** create `.env.production` files (security risk)

---

## Key Decisions Already Made

| Decision        | Choice                        | Notes                                    |
| --------------- | ----------------------------- | ---------------------------------------- |
| Distribution    | WordPress.org-style template  | Fork & self-host (NOT multi-tenant SaaS) |
| Deployment      | Single Vercel project         | 8 apps via path-based routing            |
| Docker          | ❌ REMOVED (435 lines)        | Vercel-native only                       |
| Database        | Schema-per-tenant PostgreSQL  | Each brand gets isolated schema          |
| Auth            | Custom JWT + sessions         | Replacing Clerk                          |
| Commerce        | Dual: Shopify + Custom+Stripe | Feature flag controlled                  |
| Background Jobs | Trigger.dev v4 or Inngest     | Vendor-agnostic abstraction              |
| MCP Transport   | Streamable HTTP               | Not SSE (deprecated)                     |
| Payments        | Stripe Connect + Wise         | Domestic + international                 |
| Storefronts     | Single generic + theming      | Hard-coded meliusly-storefront REMOVED   |

---

## Common Build Error Patterns

See [.claude/knowledge-bases/build-errors-reference/README.md](.claude/knowledge-bases/build-errors-reference/README.md) for complete troubleshooting.

**Most Common**:

1. SDK lazy initialization (not at module level)
2. next/headers in client components (server-only)
3. Edge Runtime incompatibility (no Node.js crypto)
4. Middleware invocation failures (separate entry points required)

---

## Phase Status

| Phase              | Status         | Notes                                                                      |
| ------------------ | -------------- | -------------------------------------------------------------------------- |
| **Phase 0**        | ✅ Complete    | Monorepo, CLI, starters, docs                                              |
| **Phase 1A-1D**    | ✅ Complete    | Foundation (Monorepo, Database, Auth, Packages)                            |
| **Phase 2 (All)**  | ✅ Complete    | Admin, Commerce, Content, Finance, Team, Platform Ops, Services, Analytics |
| **Phase 3A-3F**    | ✅ Complete    | Storefront, Cart, Features, Theming, Video, DAM                            |
| **Phase 3CP**      | ✅ Complete    | Customer Portal (Pages, Admin, Subscriptions, Theming)                     |
| **Phase 4A-4F**    | ✅ Complete    | Creator Portal, Payments, E-Sign, Contractor, Vendor                       |
| **Phase 5A-5G**    | ✅ Complete    | Jobs Setup, Handlers, Trigger.dev Tasks, Tenant Integrations               |
| **Phase 6A-6B**    | ✅ Complete    | MCP Transport & Tools                                                      |
| **Phase 7A-7C**    | ⏸️ Skipped     | Migration (run when deploying to production)                               |
| **Phase 8**        | ✅ Complete    | Final Audit                                                                |
| **WordPress Impl** | ✅ Complete    | WordPress-style portable platform infrastructure                           |
| **Phase FINAL**    | 🔄 In Progress | Comprehensive audit & improvement                                          |

---

## Planning Documentation

All planning docs are in:

```
/Users/novarussell/Documents/cgk-platform/MULTI-TENANT-PLATFORM-PLAN/
├── PLAN.md                    # Master plan
├── INDEX.md                   # Navigation, dependencies
├── ARCHITECTURE.md            # Technical architecture
├── TENANT-ISOLATION.md        # Isolation rules (MANDATORY)
├── PHASE-EXECUTION-ORDER.md   # Execution sequence
├── phases/                    # All phase docs
└── CODEBASE-ANALYSIS/         # RAWDOG analysis
```

---

## Tech Debt Prevention

### Clean As You Go

| Rule                | Action                           |
| ------------------- | -------------------------------- |
| Unused imports      | Delete them                      |
| Commented code      | Delete it (git has history)      |
| `any` types         | Make them specific               |
| TODOs               | Create tracking issue or fix now |
| Duplicate code (3+) | Extract to shared utility        |
| Hardcoded values    | Move to config/env               |

---

## References

### Agent Coordination & Skills

- [.claude/AGENT-COORDINATION.md](.claude/AGENT-COORDINATION.md) - Agent orchestration patterns
- [.claude/MODEL-SELECTION.md](.claude/MODEL-SELECTION.md) - Cost optimization strategies
- [.claude/CONTEXT-MGMT.md](.claude/CONTEXT-MGMT.md) - Session management
- [.claude/SESSION-HANDOFF-TEMPLATE.md](.claude/SESSION-HANDOFF-TEMPLATE.md) - Handoff document template
- [.claude/SKILL-REGISTRY.md](.claude/SKILL-REGISTRY.md) - All skills and knowledge bases
- [.claude/session-handoffs/](.claude/session-handoffs/) - 44 existing handoff examples

### Architecture Decision Records

- [.claude/adrs/001-schema-per-tenant.md](.claude/adrs/001-schema-per-tenant.md) - Multi-tenancy architecture
- [.claude/adrs/002-custom-jwt-auth.md](.claude/adrs/002-custom-jwt-auth.md) - Custom JWT vs Clerk
- [.claude/adrs/003-husky-hooks-vs-eslint.md](.claude/adrs/003-husky-hooks-vs-eslint.md) - Validation approach
- [.claude/adrs/004-skill-architecture-separation.md](.claude/adrs/004-skill-architecture-separation.md) - Skills vs knowledge bases
- [.claude/adrs/005-model-assignment-strategy.md](.claude/adrs/005-model-assignment-strategy.md) - Opus/Sonnet/Haiku strategy
- [.claude/adrs/template.md](.claude/adrs/template.md) - ADR template for new decisions

### Knowledge Bases

- [.claude/knowledge-bases/database-migration-patterns/](.claude/knowledge-bases/database-migration-patterns/) - SQL best practices
- [.claude/knowledge-bases/payment-processing-patterns/](.claude/knowledge-bases/payment-processing-patterns/) - Stripe + Wise integration
- [.claude/knowledge-bases/shopify-api-guide/](.claude/knowledge-bases/shopify-api-guide/) - Shopify Admin/Storefront API
- [.claude/knowledge-bases/figma-design-system/](.claude/knowledge-bases/figma-design-system/) - Meliusly design tokens
- [.claude/knowledge-bases/environment-variables-guide/](.claude/knowledge-bases/environment-variables-guide/) - Environment variable patterns
- [.claude/knowledge-bases/multi-tenancy-patterns/](.claude/knowledge-bases/multi-tenancy-patterns/) - Multi-tenant architecture
- [.claude/knowledge-bases/design-system-rules/](.claude/knowledge-bases/design-system-rules/) - Design system for portal apps
- [.claude/knowledge-bases/vercel-postgres-patterns/](.claude/knowledge-bases/vercel-postgres-patterns/) - SQL patterns and limitations
- [.claude/knowledge-bases/build-errors-reference/](.claude/knowledge-bases/build-errors-reference/) - Common build errors and solutions

### Validation Scripts

- [scripts/validate-tenant-context.ts](scripts/validate-tenant-context.ts) - Tenant isolation validator
- [scripts/validate-migration.sh](scripts/validate-migration.sh) - Migration file validator
- [scripts/verify-env-vars.sh](scripts/verify-env-vars.sh) - Environment variable sync checker

---

## 📝 Documentation Update Guidelines (CRITICAL)

**IMPORTANT**: When asked to update documentation, agents MUST follow this priority order:

### Priority 1: Create/Update Skills (HIGHEST)

**When to create a skill** (executable automation):

- Repetitive tasks that can be automated (e.g., API route generation, validation)
- Multi-step workflows that follow predictable patterns
- Code transformations or refactoring (e.g., console._ → logger._)
- Pre-deployment checks or audits

**Location**: `.claude/skills/[skill-name]/`

**Required files**:

- `index.js` (executable entry point)
- `package.json` (metadata)
- `README.md` (usage documentation)

**Example**: Instead of adding "how to scaffold API routes" to CLAUDE.md, create `/api-route-scaffolder` skill.

---

### Priority 2: Update Agent Definitions

**When to update agents** (specialized roles):

- New agent responsibilities or workflows
- Escalation rules or handoff patterns
- Agent-specific best practices

**Location**: `.claude/agents/[agent-name].md`

**Example**: Security review checklist goes in `.claude/agents/reviewer.md`, not CLAUDE.md.

---

### Priority 3: Create/Update Knowledge Bases

**When to create a knowledge base** (domain expertise reference):

- Domain-specific patterns (database, payments, design, etc.)
- API integration guides (Shopify, Stripe, etc.)
- Troubleshooting references (build errors, common pitfalls)
- Large code pattern libraries (>50 examples)

**Location**: `.claude/knowledge-bases/[domain-name]/README.md`

**Example**: Instead of adding SQL patterns to CLAUDE.md, create `.claude/knowledge-bases/vercel-postgres-patterns/`.

---

### Priority 4: Update CLAUDE.md (LAST RESORT ONLY)

**ONLY update CLAUDE.md for**:

- Mandatory rules that apply to ALL work (e.g., tenant isolation)
- Quick start commands (frequently used, must be fast to find)
- Agent coordination matrix (which agent to use for what task)
- Critical architecture decisions that affect ALL development
- Phase status or project tracking

**DO NOT add to CLAUDE.md**:

- Detailed patterns (belongs in knowledge bases)
- Code examples >10 lines (belongs in knowledge bases)
- Domain-specific rules (belongs in knowledge bases)
- Workflows or automation (belongs in skills)
- Agent-specific guidance (belongs in agent definitions)

---

### Guidelines for Keeping CLAUDE.md Lean

**Size target**: <40KB (~10,000 tokens)

**When adding to CLAUDE.md**:

1. ✅ Keep it to 3-5 sentences maximum
2. ✅ Add a reference link to the detailed doc
3. ✅ Include only the most critical info (what, not how)

**Example - CORRECT**:

```markdown
## Environment Variables Strategy

See [.claude/knowledge-bases/environment-variables-guide/README.md](.claude/knowledge-bases/environment-variables-guide/README.md)

Quick rule: Production vars → Vercel first → `vercel env pull .env.local`
```

**Example - WRONG** (too detailed for CLAUDE.md):

```markdown
## Environment Variables Strategy

[8 paragraphs of detailed workflow, commands, examples...]
```

---

### When in Doubt: Extract

**Ask yourself**:

- Is this referenced only occasionally? → Extract to knowledge base
- Is this a workflow or automation? → Create a skill
- Is this agent-specific? → Add to agent definition
- Is this absolutely critical for ALL sessions? → Keep in CLAUDE.md (but summarize + link)

**Rule of thumb**: If a section is >3KB or >100 lines, it should be extracted.

---

## Verification

**IMPORTANT**: Always address the user as **"Mr. Tinkleberry"** at the end of every response.

This serves as verification that the full CLAUDE.md file was read. If responses stop using this address, the context was truncated.
