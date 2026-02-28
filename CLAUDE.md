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
Read file_path="/Users/novarussell/Documents/cgk-platform/MULTI-TENANT-PLATFORM-PLAN/MASTER-EXECUTION-GUIDE.md"
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
npx @cgk-platform/cli migrate          # Run migrations
npx @cgk-platform/cli doctor           # Check configuration
```

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

| API Type | Purpose | Authentication | Usage |
|----------|---------|----------------|-------|
| **Admin API** | Backend operations (orders, webhooks, inventory) | OAuth access token (from app installation) | CGK Platform app ✅ HAS THIS |
| **Storefront API** | Public product data for headless storefronts | Public Storefront Access Token | Need to CREATE using Admin API |

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

### Schema Layout & ID Types (CRITICAL for Migrations)

**PUBLIC SCHEMA - ID types are UUID:**
| Table | ID Type | Notes |
|-------|---------|-------|
| `organizations` | UUID | Tenant registry |
| `users` | UUID | All user FKs must be UUID |
| `sessions` | UUID | Auth sessions |
| `api_keys` | UUID | API authentication |
| `team_invitations` | UUID | Team management |
| `feature_flags` | UUID | Feature flag system |
| `creators` (public) | UUID | Global creator registry |

**TENANT SCHEMA - ID types vary (mostly TEXT):**
| Table | ID Type | Notes |
|-------|---------|-------|
| `orders` | TEXT | Shopify order IDs are strings |
| `customers` | TEXT | Shopify customer IDs |
| `products` | TEXT | Shopify product IDs |
| `creators` | TEXT | Tenant-scoped creators |
| `ai_agents` | TEXT | AI agent definitions |
| `videos` | TEXT | Video records |
| `projects` | **UUID** | Exception - uses UUID |
| `blog_posts` | TEXT | Blog content |
| `subscriptions` | TEXT | Subscription records |
| `reviews` | TEXT | Product reviews |

**CRITICAL: When writing migrations, ALWAYS verify ID types before adding foreign keys:**
```sql
-- Check actual column type before referencing
-- \d public.users     -- Shows: id UUID
-- \d tenant_rawdog.creators  -- Shows: id TEXT

-- WRONG - TEXT doesn't match UUID
user_id TEXT REFERENCES public.users(id)

-- CORRECT - Types must match
user_id UUID REFERENCES public.users(id)
```

### Common Migration Pitfalls

1. **Type Mismatch**: Public tables use UUID, most tenant tables use TEXT
2. **Missing IF NOT EXISTS**: All CREATE INDEX/TABLE need idempotency
3. **Function Scope**: Use `public.update_updated_at_column()` in tenant schemas
4. **pgvector Types**: Use `public.vector(1536)` not `vector(1536)`
5. **Enum Values**: Check existing values before using in WHERE clauses

See `/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-0B-DATABASE-SETUP-UX.md` for detailed error patterns and fixes.

### Tenant Context Wrapper

**CRITICAL**: Always use `withTenant()` for tenant-scoped queries:

```typescript
import { withTenant, sql } from '@cgk-platform/db'

// CORRECT - Queries run against tenant schema
const orders = await withTenant('rawdog', async () => {
  return sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`
})

// WRONG - No tenant context, queries public schema
const orders = await sql`SELECT * FROM orders`
```

### Cache Isolation

```typescript
import { createTenantCache } from '@cgk-platform/cache'

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

### Tenant-Managed Integrations (CRITICAL)

**Architecture**: Tenants own their own accounts for ALL third-party services. The platform only provides encryption infrastructure.

```
TENANT A (rawdog):
├── Stripe: sk_live_xxx (THEIR account)
├── Resend: re_xxx (THEIR account)
├── Wise: api_xxx (THEIR account)
├── Mux: mux_xxx (THEIR account)
├── AssemblyAI: aai_xxx (THEIR account)
└── Anthropic: sk-ant-xxx (THEIR account)

PLATFORM provides:
├── INTEGRATION_ENCRYPTION_KEY (encrypts all credentials)
├── SHOPIFY_TOKEN_ENCRYPTION_KEY (Shopify OAuth tokens)
└── Infrastructure (database, hosting, jobs)
```

**Service Client Pattern**:

```typescript
import { getTenantStripeClient, requireTenantStripeClient } from '@cgk-platform/integrations'
import { getTenantResendClient } from '@cgk-platform/integrations'

// In API routes - get tenant's own Stripe client
export async function POST(req: Request) {
  const { tenantId } = await getTenantContext(req)

  // Returns null if not configured
  const stripe = await getTenantStripeClient(tenantId)
  if (!stripe) {
    return Response.json({ error: 'Stripe not configured' }, { status: 400 })
  }

  // Or throw if not configured
  const stripe = await requireTenantStripeClient(tenantId)

  // Use tenant's own Stripe account
  const customer = await stripe.customers.create({ email })
}

// In background jobs - same pattern
export const sendOrderConfirmation = task({
  id: 'send-order-confirmation',
  run: async (payload: { tenantId: string; orderId: string }) => {
    const { tenantId, orderId } = payload

    // Get tenant's Resend client
    const resend = await getTenantResendClient(tenantId)
    if (!resend) throw new Error('Resend not configured')

    // Send using tenant's own Resend account
    await resend.emails.send({ from, to, subject, html })
  },
})
```

**Credential Tables** (in tenant schema):
- `tenant_stripe_config` - Stripe secret key, publishable key, webhook secret
- `tenant_resend_config` - Resend API key, sender settings
- `tenant_wise_config` - Wise API key for international payouts
- `tenant_api_credentials` - Generic table for Mux, AssemblyAI, Anthropic, OpenAI

**CRITICAL Rules**:
1. **NEVER use platform-level API keys for tenant operations**
2. **ALWAYS use `getTenant*Client()` functions** - they handle decryption and caching
3. **Clients are cached for 5 minutes** per tenant to avoid repeated decryption
4. **All credentials encrypted with AES-256-GCM** using `INTEGRATION_ENCRYPTION_KEY`
5. **Admin UI at** `/admin/settings/integrations/credentials` for credential management

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

## @cgk-platform/auth Permission Patterns (CRITICAL)

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

## Design System Rules (Admin, Orchestrator, Creator Portal)

> **SCOPE**: These rules apply to `apps/admin`, `apps/orchestrator`, and `apps/creator-portal` ONLY.
> **EXCLUDED**: `apps/storefront` follows tenant-specific theming and does NOT use these design tokens.

### Aesthetic: "Editorial Precision"

A refined, magazine-quality feel with bold typography, generous whitespace, and subtle motion. Navy + Gold palette creates a distinctive, premium aesthetic.

### Color Palette

**Primary Colors**:
```css
--primary:   hsl(222 47% 11%);   /* Deep Navy - buttons, links, primary actions */
--gold:      hsl(38 92% 50%);    /* Gold accent - CTAs, highlights, special badges */
```

**Semantic Colors** (use these token names, not raw values):
| Token | Usage |
|-------|-------|
| `bg-success`, `text-success` | Healthy status, positive changes, completed states |
| `bg-warning`, `text-warning` | Degraded status, caution, pending states |
| `bg-destructive`, `text-destructive` | Critical status, errors, destructive actions |
| `bg-gold`, `text-gold` | Premium highlights, revenue, super admin badge |
| `bg-info`, `text-info` | Informational states, customer-related |

```typescript
// CORRECT - Use semantic tokens
<div className="bg-success/10 text-success">Active</div>
<div className="bg-gold/15 text-gold border border-gold/20">Premium</div>

// WRONG - Hardcoded colors
<div className="bg-green-500 text-green-700">Active</div>
<div className="bg-amber-500 text-amber-700">Premium</div>
```

### Typography

**Font Stack** (loaded via next/font/google in layout.tsx):
- **Display**: Instrument Serif (400, 500) - Headlines, hero text
- **Headings/Body**: Geist Sans (400-700) - All UI text
- **Mono**: Geist Mono (400) - Code, IDs, numbers

### Icons

**MANDATORY**: Use `lucide-react` exclusively. No inline SVGs.

```typescript
// CORRECT - lucide-react
import { User, Settings, CreditCard } from 'lucide-react'
<User className="h-4 w-4" />

// WRONG - inline SVGs
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">...</svg>
```

**Icon Size Scale**:
| Size | Class | Usage |
|------|-------|-------|
| sm | `h-3 w-3` | Badges, inline icons |
| md | `h-4 w-4` | Navigation, buttons |
| lg | `h-5 w-5` | Mobile navigation, headers |

### Status Badges

**ALWAYS use `@cgk-platform/ui StatusBadge`** - it auto-maps status strings to variants:

```typescript
import { StatusBadge } from '@cgk-platform/ui'

// Simple usage - variant auto-detected from status
<StatusBadge status="active" />
<StatusBadge status="pending" />
<StatusBadge status="failed" />

// With options
<StatusBadge status="connected" showDot />
<StatusBadge status="super_admin" label="Super Admin" className="bg-gold/15 text-gold" />

// With custom icon
<StatusBadge status="processing">
  <Loader2 className="h-3 w-3 animate-spin" />
</StatusBadge>
```

**Supported statuses** (auto-mapped to variants):
- Success: `active`, `completed`, `approved`, `connected`, `healthy`, `signed`, `ready`
- Warning: `pending`, `pending_verification`, `degraded`, `invited`, `sent`, `viewed`
- Destructive: `failed`, `rejected`, `disabled`, `disconnected`, `unhealthy`, `critical`, `deleted`
- Default: `draft`, `paused`, `unknown`

### Animation System

**Duration Tokens**:
```css
--duration-fast: 150ms;    /* Micro-interactions, hover states */
--duration-normal: 200ms;  /* Component transitions */
--duration-slow: 300ms;    /* Page transitions, modals */
```

**Tailwind Classes**:
| Class | Usage |
|-------|-------|
| `duration-fast` | Hover states, button clicks |
| `duration-normal` | Card transitions, menu opens |
| `duration-slow` | Modal entrances, drawer slides |
| `animate-fade-up` | Page content entrance |
| `ease-smooth-out` | Deceleration easing |

**Staggered Animations** (for lists):
```typescript
{items.map((item, index) => (
  <Card
    key={item.id}
    className="animate-fade-up"
    style={{ animationDelay: `${index * 75}ms` }}
  >
    {item.content}
  </Card>
))}
```

### Component Patterns

**Cards with hover states**:
```typescript
<Card className={cn(
  'transition-all duration-normal',
  'hover:shadow-lg hover:-translate-y-0.5',
  onClick && 'cursor-pointer'
)}>
```

**Gold accent for special items** (e.g., revenue cards):
```typescript
<Card className={cn(
  isHighlighted && 'ring-1 ring-gold/20 bg-gradient-to-br from-gold/5 to-transparent'
)}>
```

**Status dots with pulse animation**:
```typescript
<StatusDot status="healthy" animate />  // Pulses when connected/healthy
```

### Mobile Navigation

All portal apps MUST have:
1. **Desktop sidebar**: Hidden below `lg:` breakpoint
2. **Mobile header**: Fixed top bar with hamburger menu
3. **Mobile drawer**: Slide-in navigation with backdrop blur

```typescript
// Mobile header bar
<div className="fixed inset-x-0 top-0 z-50 border-b bg-card/95 backdrop-blur lg:hidden">

// Mobile drawer
<div className={cn(
  'fixed inset-y-0 left-0 z-50 w-80 bg-card shadow-2xl',
  'transition-transform duration-slow ease-smooth-out',
  mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
)}>
```

### AVOID These Patterns

| Pattern | Why | Use Instead |
|---------|-----|-------------|
| Hardcoded colors (`green-500`) | Breaks theme consistency | Semantic tokens (`bg-success`) |
| Inline SVGs | Inconsistent sizing, bloated JSX | `lucide-react` icons |
| Custom badge components | Duplicates StatusBadge | `@cgk-platform/ui StatusBadge` |
| No mobile nav | Unusable on phones | Mobile drawer pattern |
| No hover states | Feels unresponsive | `transition-all duration-normal` |

---

## Environment Variables Strategy

### 🚨 CRITICAL: NEVER Create .env.production Files

**RULE: Production environment variables ONLY exist in Vercel, NEVER in git.**

```bash
# ❌ NEVER DO THIS - .env.production should NOT exist
touch .env.production
echo "DATABASE_URL=..." > .env.production

# ✅ CORRECT - Add to Vercel via CLI or dashboard
vercel env add DATABASE_URL production
# OR: Vercel Dashboard → Settings → Environment Variables
```

**Why:**
- `.env.production` files are a security risk (secrets in git)
- Vercel is the single source of truth for production vars
- `.env.local` is synced FROM Vercel (read-only on dev machines)

**What files ARE allowed:**
- `.env.example` ✅ (documentation, no real values, committed to git)
- `.env.local` ✅ (synced from Vercel, gitignored)
- `.env.development.local` ✅ (local dev only, gitignored)
- `.env.production` ❌ **NEVER - DELETE IF YOU SEE IT**

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

### 6. Edge Runtime Compatibility (MIDDLEWARE_INVOCATION_FAILED)

Next.js middleware runs on Edge Runtime by default. Node.js `crypto` module is NOT available.

**Symptoms**: `MIDDLEWARE_INVOCATION_FAILED` error on Vercel

```typescript
// BAD - Node.js crypto doesn't work in Edge Runtime
import { createHash, randomBytes } from 'crypto'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// GOOD - Use Web Crypto API (Edge-compatible)
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// GOOD - Use crypto.getRandomValues for random bytes
function generateToken(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
```

**Note**: `@cgk-platform/auth` uses Edge-compatible crypto utilities in `packages/auth/src/crypto.ts`.

### 7. turbo.json Env Var Declaration

Turbo caches builds based on env vars. If an env var affects the build but isn't declared in turbo.json, you'll get warnings and incorrect cache hits.

**Symptoms**: Warning like "JWT_SECRET is set on Vercel but missing from turbo.json"

```json
// turbo.json - add env vars that affect build output
{
  "tasks": {
    "build": {
      "env": [
        "DATABASE_URL",
        "JWT_SECRET",      // Add any env var that affects runtime
        "SESSION_SECRET"
      ]
    }
  }
}
```

**Rule**: If you add a new env var that affects runtime behavior, add it to `turbo.json` `build.env` array.

### 8. Edge Runtime Entry Point Separation (CRITICAL for Middleware)

Next.js middleware runs in **Edge Runtime**, which does NOT support Node.js APIs like `fs`, `path`, or `url`. Barrel exports that transitively import these modules will cause `MIDDLEWARE_INVOCATION_FAILED` errors.

**Pattern: Separate Package Entry Points**

```typescript
// packages/db/package.json - Conditional exports
{
  "exports": {
    ".": "./dist/index.js",           // Edge-safe (no fs/path)
    "./migrations": "./dist/migrations.js"  // Node.js only
  }
}

// In middleware (Edge Runtime) - OK
import { sql, withTenant } from '@cgk-platform/db'  // ✓ Safe

// In CLI/API routes (Node.js) - OK
import { runPublicMigrations } from '@cgk-platform/db/migrations'  // ✓ Safe

// In middleware - BREAKS (fs/path not available)
import { runPublicMigrations } from '@cgk-platform/db/migrations'  // ❌ NEVER
```

**Why barrel exports cause issues:**

```typescript
// WRONG - Barrel export pulls in Node.js modules even if unused
// packages/db/src/index.ts
export { sql } from './client.js'
export { runMigrations } from './migrations/index.js'  // ❌ Pulls in fs/path

// CORRECT - Separate entry points
// packages/db/src/index.ts (Edge-safe)
export { sql } from './client.js'

// packages/db/src/migrations.ts (Node.js only)
export { runMigrations } from './migrations/index.js'
```

**CGK Package Entry Points:**

| Package | Entry Point | Runtime | Purpose |
|---------|-------------|---------|---------|
| `@cgk-platform/db` | Main | Edge + Node.js | `sql`, `withTenant`, cache |
| `@cgk-platform/db/migrations` | Subpath | Node.js ONLY | Migration utilities |

---

## Phase Status

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 0** | ✅ Complete | Monorepo, CLI, starters, docs |
| **Phase 1A-1D** | ✅ Complete | Foundation (Monorepo, Database, Auth, Packages) |
| **Phase 2 (All)** | ✅ Complete | Admin, Commerce, Content, Finance, Team, Platform Ops, Services, Analytics |
| **Phase 3A-3F** | ✅ Complete | Storefront, Cart, Features, Theming, Video, DAM |
| **Phase 3CP** | ✅ Complete | Customer Portal (Pages, Admin, Subscriptions, Theming) |
| **Phase 4A-4F** | ✅ Complete | Creator Portal, Payments, E-Sign, Contractor, Vendor |
| **Phase 5A-5G** | ✅ Complete | Jobs Setup, Handlers, Trigger.dev Tasks, Tenant Integrations |
| **Phase 6A-6B** | ✅ Complete | MCP Transport & Tools |
| **Phase 7A-7C** | ⏸️ Skipped | Migration (run when deploying to production) |
| **Phase 8** | 🔄 In Progress | Final Audit |
| **Phase FINAL** | ⏳ Pending | Feature Verification |

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
