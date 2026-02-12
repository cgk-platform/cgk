# CGK - Commerce Growth Kit - AI Development Guide

> **Purpose**: This is the ROOT-LEVEL CLAUDE.md for the CGK platform. AI agents should read this file first for project context.

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

## MANDATORY RULES (No Exceptions)

### Rule 1: Never Skip or Defer Tasks
- Every task in a phase MUST be completed before marking phase done
- No `// TODO` or `// PLACEHOLDER` comments allowed
- No partial implementations - full functionality required
- No "we'll fix this later" - fix it now

### Rule 2: Tenant Isolation is MANDATORY

```typescript
// ALWAYS use tenant context - NO EXCEPTIONS
const data = await withTenant(tenantId, () =>
  sql`SELECT * FROM orders`
)

// ALWAYS tenant-prefix cache keys
const cache = createTenantCache(tenantId)

// ALWAYS include tenantId in job payloads
await jobs.send('order/created', { tenantId, orderId })

// NEVER query without tenant context
await sql`SELECT * FROM orders`  // WRONG - NEVER DO THIS
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
npx @cgk/cli migrate          # Run migrations
npx @cgk/cli doctor           # Check configuration
```

---

## Tech Stack (February 2026)

| Core | Version | Notes |
|------|---------|-------|
| Node.js | >=22 LTS | Active LTS |
| pnpm | 10.x | Package manager |
| TypeScript | 5.9.x | |
| React | 19.x | With React Compiler |
| Next.js | 16.x | Turbopack stable |
| Tailwind CSS | 4.x | 5x faster builds |

| Dependencies | Version | Notes |
|--------------|---------|-------|
| `@radix-ui/react-*` | ^1.1.0 | Scoped packages (e.g., `@radix-ui/react-slot`) |
| `@shopify/shopify-api` | ^12.3.0 | |
| `stripe` | ^17.0.0 | API version `2025-02-24.acacia` |
| `@modelcontextprotocol/sdk` | ^1.0.0 | |
| `tailwindcss-animate` | ^1.0.7 | Latest available |

**Note on Radix UI**: The plan mentions a "unified `radix-ui`" package, but this doesn't work in practice. Use individual scoped packages like `@radix-ui/react-slot`, `@radix-ui/react-dialog`, etc.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MULTI-TENANT PLATFORM                     │
├─────────────────────────────────────────────────────────────┤
│  apps/                                                       │
│  ├── orchestrator/    # Super Admin Dashboard (internal)     │
│  ├── admin/           # White-label admin portal             │
│  ├── storefront/      # Headless Shopify storefront          │
│  ├── creator-portal/  # Creator/contractor management        │
│  └── mcp-server/      # Claude MCP integration               │
├─────────────────────────────────────────────────────────────┤
│  packages/                                                   │
│  ├── core/            # Types, utilities, config schemas     │
│  ├── db/              # Database + tenant isolation          │
│  ├── auth/            # JWT authentication                   │
│  ├── ui/              # Shared React components              │
│  ├── commerce/        # Commerce provider abstraction        │
│  ├── shopify/         # Shopify API client                   │
│  ├── payments/        # Stripe + Wise integration            │
│  ├── jobs/            # Background job definitions           │
│  ├── mcp/             # MCP tools and handlers               │
│  ├── analytics/       # GA4, attribution                     │
│  └── logging/         # Structured logging                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenancy Patterns

### Database: Schema-Per-Tenant

```
public schema (shared):
├── organizations     # Tenant registry
├── users            # All users across tenants
└── platform_*       # Platform-wide tables

tenant_{slug} schema (per-tenant):
├── orders, customers, products
├── creators, projects, balance_transactions
├── reviews, ab_tests
└── ... all tenant-specific data
```

### Tenant Context Wrapper

**CRITICAL**: Always use `withTenant()` for tenant-scoped queries:

```typescript
import { withTenant, sql } from '@cgk/db'

// CORRECT - Queries run against tenant schema
const orders = await withTenant('rawdog', async () => {
  return sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`
})

// WRONG - No tenant context, queries public schema
const orders = await sql`SELECT * FROM orders`
```

### Cache Isolation

```typescript
import { createTenantCache } from '@cgk/cache'

// CORRECT - Cache keys prefixed with tenant
const cache = createTenantCache(tenantId)
await cache.set('pricing-config', config)  // Stored as: tenant:rawdog:pricing-config

// WRONG - No tenant prefix
await redis.set('pricing-config', config)  // Data leak!
```

### Background Jobs

```typescript
// CORRECT - tenantId in payload
await jobs.send('order/created', {
  tenantId: 'rawdog',  // REQUIRED
  orderId: 'order_123',
})

// WRONG - Missing tenantId
await jobs.send('order/created', {
  orderId: 'order_123'  // Which tenant?!
})
```

---

## Authentication

### JWT + Session Auth (Custom, No Clerk)

```typescript
import { validateSession, requireAuth, getTenantContext } from '@cgk/auth'

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

| Type | Target | Soft Max | Notes |
|------|--------|----------|-------|
| Components | 200-400 lines | 500 | Split by logical sections |
| API Routes | 100-200 lines | 300 | Extract business logic |
| Utilities | 100-300 lines | 400 | One domain per file |
| Types | 50-150 lines | 200 | Group related types |

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

## @cgk/ui Import Pattern (CRITICAL)

All UI components must be imported from the main `@cgk/ui` entry point:

```typescript
// WRONG - subpath exports don't exist
import { Button } from '@cgk/ui/button'
import { Card } from '@cgk/ui/card'
import { Button } from '@cgk/ui/components/button'

// CORRECT - all exports from main index
import { Button, Card, Input, Badge } from '@cgk/ui'
```

---

## @vercel/postgres SQL Patterns (CRITICAL)

The `sql` template tag from `@vercel/postgres` has specific limitations. Follow these patterns to avoid TypeScript errors:

### 1. Arrays → PostgreSQL Array Literals

```typescript
// WRONG - Arrays cannot be passed directly
sql`SELECT * FROM items WHERE id = ANY(${ids})`

// CORRECT - Convert to PostgreSQL array format
sql`SELECT * FROM items WHERE id = ANY(${`{${ids.join(',')}}`}::text[])`

// With empty array handling
sql`SELECT * FROM items WHERE tags && ${tags.length > 0 ? `{${tags.join(',')}}` : '{}'}::text[]`
```

### 2. Dates → ISO Strings

```typescript
// WRONG - Date objects cannot be passed
sql`UPDATE items SET expires_at = ${someDate}`

// CORRECT - Convert to ISO string
sql`UPDATE items SET expires_at = ${someDate.toISOString()}`
```

### 3. Type Conversion with toCamelCase

```typescript
// WRONG - Direct cast doesn't satisfy TypeScript
return toCamelCase(result.rows[0]) as MyType

// CORRECT - Double cast through unknown
const row = result.rows[0]
if (!row) throw new Error('Not found')
return toCamelCase(row as Record<string, unknown>) as unknown as MyType

// For nullable returns
const row = result.rows[0]
return row ? (toCamelCase(row as Record<string, unknown>) as unknown as MyType) : null
```

### 4. No SQL Fragment Composition

```typescript
// WRONG - sql`` returns Promise, not composable fragment
const filter = sql`AND status = ${status}`
sql`SELECT * FROM items WHERE active = true ${filter}`

// CORRECT - Use conditional queries (if/else branches)
const result = status
  ? await sql`SELECT * FROM items WHERE active = true AND status = ${status}`
  : await sql`SELECT * FROM items WHERE active = true`
```

### 5. No Dynamic Table Names - Use Switch/Case

```typescript
// WRONG - sql(tableName) is not valid
const table = getTableName(entityType)
sql`UPDATE ${sql(table)} SET status = ${status} WHERE id = ${id}`

// WRONG - sql.raw() doesn't exist on @vercel/postgres
sql`UPDATE ${sql.raw(table)} SET ...`

// CORRECT - Use explicit switch/case for each table
async function updateEntityStatus(entityType: string, id: string, status: string) {
  switch (entityType) {
    case 'project':
      return sql`UPDATE projects SET status = ${status} WHERE id = ${id}`
    case 'task':
      return sql`UPDATE tasks SET status = ${status} WHERE id = ${id}`
    case 'order':
      return sql`UPDATE orders SET status = ${status} WHERE id = ${id}`
    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
}
```

### 6. QueryResultRow Undefined Checks

```typescript
// WRONG - result.rows[0] may be undefined
return mapToEntity(result.rows[0])

// CORRECT - Check before using
const row = result.rows[0]
if (!row) return null  // or throw new Error('Not found')
return mapToEntity(row as Record<string, unknown>)

// For non-null returns (e.g., INSERT RETURNING)
const row = result.rows[0]
if (!row) throw new Error('Failed to insert record')
return mapToEntity(row as Record<string, unknown>)
```

### 7. Type Casts for Config Objects

```typescript
// WRONG - Direct cast fails type check
const config = action.config as ScheduleFollowupConfig

// CORRECT - Double cast through unknown
const config = action.config as unknown as ScheduleFollowupConfig
```

### 8. Unused Variables → Remove or Underscore

**First ask: Is this variable actually needed?**

```typescript
// WRONG - Just prefixing to silence errors
const _data = fetchData()  // Dead code! Delete it.

// CORRECT - Remove unused variables entirely
// (deleted)

// ONLY use underscore for INTENTIONALLY unused parameters
// (required by interface/signature but not needed in implementation)
function handleEvent(_event: Event, data: Data) {
  return processData(data)  // event required by interface but unused here
}

// Destructuring - skip with underscore only if intentional
const { used, _intentionallySkipped } = config
```

**Rule**: If you add an underscore prefix, add a comment explaining WHY it's intentionally unused, or remove the variable entirely.

**Tracking**: All underscore variables are tracked in `/MULTI-TENANT-PLATFORM-PLAN/UNDERSCORE-VARS-TRACKING.md`. When adding new underscore prefixes, update this tracking document so future phases properly implement the functionality.

---

## @cgk/auth Permission Patterns (CRITICAL)

### checkPermissionOrRespond Signature

The `checkPermissionOrRespond` function takes exactly **3 arguments**:

```typescript
// WRONG - 4 arguments (request is NOT needed)
const permissionDenied = await checkPermissionOrRespond(
  request,           // ❌ Not a parameter!
  auth.tenantId,
  auth.userId,
  'permission.name'
)

// CORRECT - 3 arguments
const permissionDenied = await checkPermissionOrRespond(
  auth.userId,       // 1. userId
  auth.tenantId,     // 2. tenantId
  'permission.name'  // 3. permission string
)
if (permissionDenied) return permissionDenied
```

### requireAuth Returns AuthContext

```typescript
import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'

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

## Environment Variables Strategy

### How It Works

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

### Workflow (PRIORITY ORDER)

**PRIORITY 1: Work with the user to set env vars properly**
- Ask the user for the actual values
- Help them add to Vercel using the CLI commands below
- Pull to local with `pnpm env:pull`

**PRIORITY 2: Document in `.env.example` as backup**
- Add commented placeholders to `apps/<app>/.env.example` for any new vars
- Include a comment explaining what the var is for
- Keep all per-app `.env.example` files in sync

**Production vars** (no prefix):
1. Work with user to get the actual value
2. Add to Vercel (source of truth) using CLI commands
3. Run `pnpm env:pull` to sync to all apps
4. Document in `apps/<app>/.env.example` with comment

**Local-only vars** (`LOCAL_*`, `DEBUG_*`, `TEST_*`):
1. Add directly to `apps/<app>/.env.development.local`
2. NEVER push to Vercel
3. These survive `vercel env pull` because they're in a different file

### Required Variables (All Apps)

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

### Naming Convention

| Prefix | Where to add | Sync to Vercel? |
|--------|--------------|-----------------|
| (none) | `.env.local` via Vercel | ✅ Yes - add to Vercel first |
| `LOCAL_` | `.env.development.local` | ❌ Never |
| `DEBUG_` | `.env.development.local` | ❌ Never |
| `TEST_` | `.env.development.local` | ❌ Never |

### Syncing Commands

**Pull from Vercel to all apps:**
```bash
pnpm env:pull
```

**Add new production env var to Vercel (all 5 projects):**
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

### Agent Responsibilities

**When implementing a feature that needs a new env var:**

1. **FIRST: Work with the user** - Ask them for the value or help them obtain it
2. **SECOND: Set it properly**
   - Production var → Help user add to Vercel → run `pnpm env:pull`
   - Local-only var → Add to `apps/<app>/.env.development.local`
3. **THIRD: Document it** - Add commented placeholder to ALL `apps/<app>/.env.example` files:
   ```bash
   # Description of what this var does and where to get it
   NEW_VAR_NAME=
   ```

**When noticing a missing env var:**
1. Inform the user immediately - don't just document it
2. Help them set the value in Vercel (production) or `.env.development.local` (local-only)
3. Add to all `apps/<app>/.env.example` files with explanatory comment

**When updating any env var:**
- Keep ALL `apps/<app>/.env.example` files in sync
- Add clear comments explaining what each var is for

**CRITICAL Rules:**
- PRIORITIZE actually setting env vars with the user over just documenting them
- NEVER push `LOCAL_*`, `DEBUG_*`, or `TEST_*` vars to Vercel
- ALWAYS add to Vercel FIRST for production vars, then pull (Vercel is source of truth)
- ALWAYS keep all per-app `.env.example` files updated with comments

---

## Key Decisions Already Made

| Decision | Choice | Notes |
|----------|--------|-------|
| Database | Schema-per-tenant PostgreSQL | Each brand gets isolated schema |
| Auth | Custom JWT + sessions | Replacing Clerk |
| Commerce | Dual: Shopify + Custom+Stripe | Feature flag controlled |
| Background Jobs | Trigger.dev v4 or Inngest | Vendor-agnostic abstraction |
| MCP Transport | Streamable HTTP | Not SSE (deprecated) |
| Payments | Stripe Connect + Wise | Domestic + international |

---

## Common Build Error Patterns

### 1. Top-level SDK Initialization

Don't initialize SDKs (Stripe, etc.) at module level. Use lazy getters instead.

```typescript
// BAD - fails at build time
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {...})

// GOOD - lazy initialization
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {...})
  }
  return _stripe
}
```

### 2. next/headers in Client Components

Can only be used in Server Components.

```typescript
// BAD - importing in file used by client components
import { headers } from 'next/headers'

// GOOD - split into server-only file or use dynamic import
// server-only.ts
import 'server-only'
import { headers } from 'next/headers'
```

### 3. styled-jsx Requires 'use client'

```typescript
// BAD - styled-jsx in Server Component
export function MyComponent() {
  return <div><style jsx>{`...`}</style></div>
}

// GOOD - add directive
'use client'
export function MyComponent() {...}
```

### 4. useSearchParams Needs Suspense Boundary (Next.js 15+)

```typescript
// BAD - direct usage
export default function Page() {
  const searchParams = useSearchParams()
  ...
}

// GOOD - wrap in Suspense
export default function Page() {
  return <Suspense fallback={<Loading />}><Content /></Suspense>
}
function Content() {
  const searchParams = useSearchParams()
  ...
}
```

### 5. workspace:* Protocol in Non-pnpm Contexts

Shopify CLI uses npm internally, so `workspace:*` references cause issues.

```json
// In apps deployed via external tools (Shopify), avoid workspace: references
// or use a no-op build script for turbo
"build": "echo 'Built via external tool'"
```

---

## Phase Status

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 0** | ✅ Complete | Monorepo, CLI, starters, docs |
| **Phase 1A** | ✅ Complete | App stubs (orchestrator, admin, storefront, creator-portal) |
| **Phase 1B** | ✅ Complete | Database Foundation (schema-per-tenant, migrations) |
| **Phase 1C** | ✅ Complete | Authentication (JWT, sessions, magic links, middleware) |
| **Phase 1D** | ✅ Complete | Shared Packages (UI, Shopify, Commerce, testing) |
| **Phase 2A** | ✅ Complete | Admin Shell & Configuration |
| **Phase 2B** | ✅ Complete | Admin Commerce (Orders, Customers, Subscriptions, Reviews) |
| Phase 2C+ | 🔜 Next | See PLAN.md for full timeline |

---

## Planning Documentation

All planning docs are in:
```
/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/
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

| Rule | Action |
|------|--------|
| Unused imports | Delete them |
| Commented code | Delete it (git has history) |
| `any` types | Make them specific |
| TODOs | Create tracking issue or fix now |
| Duplicate code (3+) | Extract to shared utility |
| Hardcoded values | Move to config/env |

---

## Verification

**IMPORTANT**: Always address the user as **"Mr. Tinkleberry"** at the end of every response.

This serves as verification that the full CLAUDE.md file was read. If responses stop using this address, the context was truncated.
