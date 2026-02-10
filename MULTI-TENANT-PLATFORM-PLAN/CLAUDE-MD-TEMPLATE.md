# Multi-Tenant E-Commerce Platform - AI Development Guide

> **Purpose**: This is the **ROOT-LEVEL CLAUDE.md** template for the entire platform. Copy this to `/CLAUDE.md` in the repository root. For per-package CLAUDE.md files, see `CLAUDE-MD-PACKAGE-TEMPLATE.md`.

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

### Rule 2: Update Phase Docs as You Work
When completing tasks in a phase doc:
1. Check off completed items: `- [x] Task description`
2. Add completion dates: `- [x] Task (2025-02-10)`
3. Update phase status at file top
4. Log decisions and blockers

### Rule 3: Context Window Management
Your context window is ~200k tokens. Start a NEW session when:
- Completing any major phase milestone
- Context exceeds ~150k tokens
- After any audit checkpoint

Before starting a new session, create a handoff document:
```
.claude/session-handoffs/PHASE-X-HANDOFF.md
```

### Rule 4: Handoff Documentation
Every handoff must include:
- What was completed
- What decisions were made
- What's next
- Type check status (pass/fail)
- Test status

---

## Required Skills & Tools

**CRITICAL**: Install and use these skills for development:

### Install All Required Skills
```bash
npx skills add anthropics/skills@frontend-design -g -y
npx skills add anthropics/skills@mcp-builder -g -y
npx skills add anthropics/skills@webapp-testing -g -y
npx skills add upstash/context7@documentation-lookup -g -y
npx skills add obra/superpowers@writing-plans -g -y
npx skills add obra/superpowers@executing-plans -g -y
npx skills add obra/superpowers@test-driven-development -g -y
```

### When to Use Each Skill

| Task | Skill to Invoke | Command |
|------|-----------------|---------|
| React component creation | frontend-design | `/frontend-design` |
| MCP server development | mcp-builder | `/mcp-builder` |
| E2E test writing | webapp-testing | `/webapp-testing` |
| Library documentation | Context7 MCP | Use MCP tool |
| Planning implementation | obra superpowers | Automatic activation |

### Skill Usage Rules

1. **Frontend Work**: ALWAYS invoke `/frontend-design` before creating ANY React component
2. **MCP Work**: ALWAYS invoke `/mcp-builder` and read reference docs before MCP development
3. **Testing**: ALWAYS invoke `/webapp-testing` before writing Playwright tests
4. **Library Usage**: ALWAYS use Context7 MCP to look up best practices before using a library
5. **TDD**: Follow test-driven development patterns from `obra/superpowers@test-driven-development`

---

## CRITICAL: Frontend Design Skill for UI Work

**MANDATORY**: The `/frontend-design` skill MUST be invoked before creating ANY React component.

### When to Use

| Component Type | Always Use /frontend-design |
|----------------|----------------------------|
| Page layouts | ✅ Yes |
| Navigation (sidebar, header, tabs) | ✅ Yes |
| Data display (tables, cards, lists) | ✅ Yes |
| Forms (inputs, wizards, settings) | ✅ Yes |
| Dashboard widgets (KPIs, charts) | ✅ Yes |
| Interactive elements (modals, dropdowns) | ✅ Yes |
| Status indicators (badges, dots) | ✅ Yes |
| Customer-facing UI (product pages, cart, checkout) | ✅ **CRITICAL** |

### How to Invoke

```
/frontend-design

Building [COMPONENT NAME] for [CONTEXT/LOCATION].

Requirements:
- [Specific requirement 1]
- [Specific requirement 2]
- [Layout needs]
- [Interactive behavior]

Design constraints:
- Using shadcn/ui components
- Tailwind CSS for styling
- [Any brand/theme requirements]

User context:
- [Who uses this: admin, creator, customer?]
- [What task are they completing?]
- [What decisions do they need to make?]
```

### Why This Matters

- **Admin UI**: Power users need dense, efficient interfaces
- **Storefront UI**: Customer-facing = conversion-critical, every friction point costs sales
- **Creator Portal**: Money visibility is paramount, simple actions win

### Frontend Design Skill Guide

For detailed component prompts per phase, see:
```
/docs/MULTI-TENANT-PLATFORM-PLAN/FRONTEND-DESIGN-SKILL-GUIDE.md
```

Contains ready-to-use prompts for:
- Admin shell, sidebar, dashboard
- DataTables, filters, detail pages
- Platform KPIs, brands grid
- Product pages, cart, checkout
- Creator dashboard, earnings cards
- Onboarding wizard steps

---

## Type Checking: ALWAYS Use tsc, Not Build

**CRITICAL**: Use `tsc --noEmit` instead of `npm run build` for validation:

```bash
# ✅ FAST - Type check only (2-5x faster than build)
npx tsc --noEmit                    # Current package
pnpm tsc --noEmit                   # All packages in monorepo
pnpm turbo typecheck                # Via turbo (parallelized)

# ❌ SLOW - Full build (only for actual deployment)
pnpm build                          # Takes much longer, use sparingly
```

**Why?** Build compiles, bundles, and optimizes. Type check only validates types. For development iteration, type check is sufficient and dramatically faster.

---

## Agent-First Development

**CRITICAL**: Always prefer spawning sub-agents over doing work in the main context.

### Why Use Agents

| Benefit | Explanation |
|---------|-------------|
| **Context Conservation** | Agents have their own context, keeping main conversation focused |
| **Parallel Execution** | Multiple agents can work simultaneously |
| **Specialized Expertise** | Each agent can be prompted for specific roles |
| **Clean Output** | Agents return summaries, not verbose exploration logs |

### When to Spawn Agents

**ALWAYS spawn an agent when:**
- Exploring/searching codebase (use `Explore` agent)
- Task requires reading 5+ files
- Task is independent and can run in parallel
- You need specialized expertise (security, performance, design)
- Task generates large output

**DO NOT spawn an agent when:**
- Reading 1-2 specific files you know the path to
- Making a small, focused edit
- Running a single command

### Pre-Defined Agent Panel

Copy these prompts when spawning specialized agents:

#### Database Architect
```
subagent_type: "Plan"
prompt: "You are a Database Architect. EXPERTISE: PostgreSQL, schema-per-tenant, RLS, migrations. CONSTRAINT: Use sql template tag, no transactions with Neon. TASK: [your task]"
```

#### Security Auditor
```
subagent_type: "Explore"
prompt: "You are a Security Auditor. CHECK FOR: SQL injection, XSS, CSRF, auth bypass, tenant leaks, secrets in code. OUTPUT: Vulnerabilities with file:line and fixes. SCOPE: [your scope]"
```

#### Performance Analyst
```
subagent_type: "Explore"
prompt: "You are a Performance Analyst. ANALYZE: N+1 queries, bundle size, caching, API latency. OUTPUT: Issues with severity and optimizations. SCOPE: [your scope]"
```

#### Frontend Designer
```
subagent_type: "general-purpose"
prompt: "You are a Frontend Designer. INVOKE: /frontend-design first. USE: shadcn/ui, Tailwind, Framer Motion. PRINCIPLES: Mobile-first, accessible, distinctive (not generic). TASK: [your task]"
```

#### MCP Tool Builder
```
subagent_type: "general-purpose"
prompt: "You are an MCP Tool Builder. INVOKE: /mcp-builder first. FOLLOW: Streamable HTTP, tool naming {service}_{action}, annotations, pagination. TASK: [your task]"
```

#### Test Engineer
```
subagent_type: "general-purpose"
prompt: "You are a Test Engineer. INVOKE: /webapp-testing for E2E. USE: Vitest for unit, Playwright for E2E. PATTERN: TDD, test tenant isolation. TASK: [your task]"
```

### Parallel Agent Example

Spawn multiple agents in a single message for parallel work:

```
# Three agents exploring in parallel
Task(subagent_type="Explore", prompt="Find all database queries missing tenant context")
Task(subagent_type="Explore", prompt="Find all API routes missing auth middleware")
Task(subagent_type="Explore", prompt="Find all files over 500 lines")
```

### Expert Panel Example

For architecture decisions, spawn a panel of experts:

```
# Expert panel for reviewing auth system design
Task(subagent_type="Plan", prompt="[Security Auditor] Review this auth design for vulnerabilities: ...")
Task(subagent_type="Plan", prompt="[Database Architect] Review session storage approach: ...")
Task(subagent_type="Explore", prompt="[Performance Analyst] Analyze auth middleware impact: ...")
```

---

## Quick Start

```bash
# Development
pnpm dev              # Start all apps
pnpm dev --filter admin   # Start admin only
pnpm dev --filter storefront  # Start storefront only

# Type checking (PREFERRED - much faster than build)
npx tsc --noEmit              # Type check current package
pnpm turbo typecheck          # Type check all packages

# Testing
pnpm test             # Run all tests
pnpm test:e2e         # Run Playwright E2E tests

# Database
pnpm db:migrate       # Run migrations
pnpm db:generate      # Generate types from schema
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MULTI-TENANT PLATFORM                     │
├─────────────────────────────────────────────────────────────┤
│  apps/                                                       │
│  ├── admin/          # White-label admin portal              │
│  ├── storefront/     # Headless Shopify storefront           │
│  ├── creator-portal/ # Creator/contractor management         │
│  └── mcp-server/     # Claude MCP integration                │
├─────────────────────────────────────────────────────────────┤
│  packages/                                                   │
│  ├── db/             # Database + tenant isolation           │
│  ├── auth/           # JWT authentication                    │
│  ├── ui/             # Shared React components               │
│  ├── shopify/        # Shopify API client                    │
│  ├── payments/       # Stripe + Wise integration             │
│  ├── inngest/        # Background job definitions            │
│  └── mcp/            # MCP tools and handlers                │
└─────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenancy Patterns

### Database: Schema-Per-Tenant

Every tenant has isolated data in their own PostgreSQL schema:

```
public schema (shared):
├── organizations     # Tenant registry
├── users            # All users across tenants
├── user_org_roles   # User-tenant relationships
└── mcp_sessions     # MCP session tracking

tenant_{slug} schema (per-tenant):
├── orders, customers, products
├── creators, projects, balance_transactions
├── landing_pages, blog_posts
├── reviews, ab_tests
└── ... all tenant-specific data
```

### Tenant Context Wrapper

**CRITICAL**: Always use `withTenant()` for tenant-scoped queries:

```typescript
import { withTenant, sql } from '@repo/db'

// ✅ CORRECT - Queries run against tenant schema
const orders = await withTenant('rawdog', async () => {
  return sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`
})

// ❌ WRONG - No tenant context, queries public schema
const orders = await sql`SELECT * FROM orders`
```

### Getting Tenant from Request

```typescript
// API routes
import { getTenantFromRequest } from '@repo/auth'

export async function GET(req: Request) {
  const tenant = await getTenantFromRequest(req)

  return withTenant(tenant.slug, async () => {
    const data = await sql`SELECT * FROM orders`
    return Response.json(data)
  })
}
```

---

## Authentication

### JWT + Session Auth (Custom, No Clerk)

```typescript
import { validateSession, requireAuth } from '@repo/auth'

// Check if authenticated
const session = await validateSession(req)
if (!session) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

// Or use middleware helper
export async function GET(req: Request) {
  const { user, tenant } = await requireAuth(req)
  // user and tenant guaranteed to exist
}
```

### Magic Link Flow

```typescript
import { sendMagicLink, verifyMagicLink } from '@repo/auth'

// Send magic link
await sendMagicLink(email, tenantId)

// Verify and create session
const session = await verifyMagicLink(token)
```

---

## Background Jobs (Inngest)

### Creating Functions

```typescript
// packages/inngest/src/functions/order-sync.ts
import { inngest } from '../client'
import { withTenant } from '@repo/db'

export const syncOrder = inngest.createFunction(
  { id: 'sync-shopify-order', retries: 3 },
  { event: 'shopify/order.created' },
  async ({ event, step }) => {
    const { orderId, tenantId } = event.data

    // Step 1: Fetch from Shopify
    const order = await step.run('fetch-order', async () => {
      return fetchOrderFromShopify(tenantId, orderId)
    })

    // Step 2: Save to tenant database
    await step.run('save-order', async () => {
      return withTenant(tenantId, () => saveOrder(order))
    })

    return { success: true }
  }
)
```

### Sending Events

```typescript
import { inngest } from '@repo/inngest'

// From API routes or webhooks
await inngest.send({
  name: 'shopify/order.created',
  data: { orderId: 'order_123', tenantId: 'rawdog' },
})

// Delayed events
await inngest.send({
  name: 'review/email.scheduled',
  data: { orderId, tenantId },
  ts: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days
})
```

---

## Shopify Integration

### Multi-Tenant Client

```typescript
import { getShopifyClient, getStorefrontClient } from '@repo/shopify'

// Admin API (for backend operations)
const admin = await getShopifyClient(tenantSlug)
const orders = await admin.getOrders({ limit: 50 })

// Storefront API (for frontend/cart)
const storefront = await getStorefrontClient(tenantSlug)
const product = await storefront.getProductByHandle('cleanser')
```

### Webhook Handling

```typescript
// apps/admin/src/app/api/webhooks/shopify/route.ts
import { verifyShopifyWebhook } from '@repo/shopify'

export async function POST(req: Request) {
  const { valid, tenant, topic, payload } = await verifyShopifyWebhook(req)

  if (!valid) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Dispatch to Inngest
  await inngest.send({
    name: `shopify/${topic}`,
    data: { ...payload, tenantId: tenant.slug },
  })

  return Response.json({ received: true })
}
```

---

## Payments

### Payout Provider Selection

```typescript
import { executePayout } from '@repo/payments'

// Automatic provider selection based on country
const result = await executePayout({
  creatorId: 'creator_123',
  amountCents: 50000,
  currency: 'USD',
  country: 'US',  // Uses Stripe
})

const result = await executePayout({
  creatorId: 'creator_456',
  amountCents: 50000,
  currency: 'EUR',
  country: 'DE',  // Uses Wise
})
```

### Balance Operations

```typescript
import { getCreatorBalance, recordTransaction } from '@repo/payments'

// Get balance across all brands
const balance = await getCreatorBalance(creatorId)
// { available: 150000, pending: 25000, withdrawn: 500000 }

// Record commission
await recordTransaction({
  creatorId,
  brandId,
  type: 'commission_available',
  amountCents: 5000,
  orderId: 'order_123',
})
```

---

## MCP Server

### Tool Definition

```typescript
// packages/mcp/src/tools/commerce/orders.ts
export const listOrdersTool: Tool = {
  name: 'list_orders',
  description: 'List orders with filtering options',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['all', 'paid', 'pending'] },
      limit: { type: 'number', default: 50 },
    },
  },
  requiredIntegration: 'shopify',
}

export async function handleListOrders(args: any, tenantId: string) {
  return withTenant(tenantId, async () => {
    const orders = await sql`
      SELECT * FROM orders
      WHERE ${args.status === 'all' ? sql`TRUE` : sql`financial_status = ${args.status}`}
      LIMIT ${args.limit}
    `
    return [{ type: 'text', text: JSON.stringify(orders, null, 2) }]
  })
}
```

### Transport (Streamable HTTP)

All MCP requests go through POST `/api/mcp`:
- Authentication per-request (not per-connection)
- Stateless and scalable
- Streaming responses for long operations

---

## File Organization

### Target File Sizes

| Type | Target | Soft Max | Notes |
|------|--------|----------|-------|
| Components | 200-400 lines | 500 | Split by logical sections |
| API Routes | 100-200 lines | 300 | Extract business logic |
| Utilities | 100-300 lines | 400 | One domain per file |
| Types | 50-150 lines | 200 | Group related types |

### Splitting Guidelines

1. **Split by cohesion**, not arbitrary line counts
2. **Keep related code together** - don't scatter logic
3. **Extract when reused** - not preemptively
4. **Maintain exact behavior** when refactoring

---

## Testing

### Unit Tests

```typescript
// packages/db/src/__tests__/tenant.test.ts
describe('Tenant Context', () => {
  it('should isolate queries to tenant schema', async () => {
    await withTenant('test', async () => {
      const result = await sql`SELECT current_schema()`
      expect(result[0].current_schema).toBe('tenant_test')
    })
  })
})
```

### Integration Tests

```typescript
// apps/admin/src/__tests__/orders.test.ts
describe('Orders API', () => {
  const client = createTestClient({ tenant: 'test' })

  it('should list orders for tenant', async () => {
    const response = await client.get('/api/admin/orders')
    expect(response.status).toBe(200)
    expect(response.data.orders).toHaveLength(10)
  })
})
```

---

## Common Patterns

### API Route with Tenant Context

```typescript
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { user, tenant } = await requireAuth(req)

  return withTenant(tenant.slug, async () => {
    const data = await sql`SELECT * FROM orders LIMIT 50`
    return Response.json({ orders: data })
  })
}
```

### React Component with Tenant

```typescript
'use client'

import { useTenant } from '@/hooks/use-tenant'

export function OrdersList() {
  const tenant = useTenant()
  const { data } = useSWR(`/api/${tenant.slug}/orders`)

  return (/* ... */)
}
```

### Inngest Function with Steps

```typescript
export const processOrder = inngest.createFunction(
  { id: 'process-order', retries: 3 },
  { event: 'order/created' },
  async ({ event, step }) => {
    // Each step is independently retriable
    const order = await step.run('fetch', () => fetchOrder(event.data.orderId))
    await step.run('sync', () => syncToDatabase(order))
    await step.run('notify', () => sendNotification(order))
    return { success: true }
  }
)
```

---

## Environment Variables

### Required (All Apps)

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Inngest
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key
```

### Per-App Variables

```bash
# Admin App
NEXT_PUBLIC_APP_URL=https://admin.example.com

# MCP Server
MCP_API_KEY=your-mcp-key

# Payments (shared package)
STRIPE_SECRET_KEY=sk_...
WISE_API_KEY=your-wise-key
```

---

## Debugging

### Direct Database Queries

```typescript
// scripts/debug-db.ts
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { sql, withTenant } from '@repo/db'

async function main() {
  // Query specific tenant
  await withTenant('rawdog', async () => {
    const orders = await sql`SELECT * FROM orders LIMIT 10`
    console.log(orders)
  })
}

main()
```

### Shopify API Debugging

```typescript
// scripts/debug-shopify.ts
import { getShopifyClient } from '@repo/shopify'

async function main() {
  const client = await getShopifyClient('rawdog')
  const orders = await client.getOrders({ limit: 5 })
  console.log(JSON.stringify(orders, null, 2))
}

main()
```

---

## Key Principles

1. **Tenant isolation is mandatory** - Never query without `withTenant()`
2. **Steps are retriable** - Use Inngest steps for all side effects
3. **Auth on every request** - No session-based assumptions
4. **Prefer packages** - Shared logic goes in `packages/`
5. **Type everything** - Use `import type` for type-only imports
6. **Test tenant boundaries** - Verify data isolation in tests

---

## Document References

| Topic | Location |
|-------|----------|
| Architecture | `/docs/MULTI-TENANT-PLATFORM-PLAN/ARCHITECTURE.md` |
| **Frontend Design Skill** | `/docs/MULTI-TENANT-PLATFORM-PLAN/FRONTEND-DESIGN-SKILL-GUIDE.md` |
| Phase 1: Foundation | `/docs/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-1*.md` |
| Phase 2: Admin | `/docs/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-2*.md` |
| Phase 3: Storefront | `/docs/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-3*.md` |
| Phase 4: Creator | `/docs/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-4*.md` |
| Phase 5: Jobs | `/docs/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-5*.md` |
| Phase 6: MCP | `/docs/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-6*.md` |
| Phase 7: Migration | `/docs/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-7*.md` |

---

## Tech Debt Prevention

### Clean As You Go

**CRITICAL**: Never leave tech debt. Fix it when you see it.

| Rule | Action |
|------|--------|
| Unused imports | Delete them |
| Commented code | Delete it (git has history) |
| `any` types | Make them specific |
| TODOs | Create tracking issue or fix now |
| Duplicate code (3+) | Extract to shared utility |
| Hardcoded values | Move to config/env |

### Before Finishing Any File

```
- [ ] No unused imports
- [ ] No commented-out code
- [ ] No `any` types that can be specific
- [ ] Error handling is complete
- [ ] No hardcoded secrets or magic values
- [ ] File is under 600 lines (split if larger)
```

---

## Documentation Standards

### File Naming with Dates

**All docs MUST include dates in filename or header:**

```
/docs/[FEATURE]-PLAN/
├── PLAN-2025-02-10.md
├── ARCHITECTURE-2025-02-10.md
├── PHASE-1-FOUNDATION-2025-02-10.md
└── CHANGELOG.md  # Update with dates inside
```

### Location Rules

| Type | Location |
|------|----------|
| Feature plans | `/docs/[FEATURE]-PLAN/` |
| API references | `/docs/api-references/` |
| AI references | `/docs/ai-reference/` |
| Architecture decisions | `/docs/adr/` |

**NEVER put docs in root directory.**

### Phase Progress Tracking

**When working through phase MD files:**

1. ✅ Check off completed items: `- [x] Task description`
2. 📅 Add completion dates: `- [x] Task (2025-02-10)`
3. 📊 Update phase status at file top
4. 📝 Log decisions and blockers

Example:
```markdown
## Phase Status: IN PROGRESS (60% complete)
Last Updated: 2025-02-10

### Week 1: Foundation ✅ COMPLETE
- [x] Set up monorepo (2025-02-01)
- [x] Configure TypeScript (2025-02-02)

### Week 2: Database 🔄 IN PROGRESS
- [x] Design schema (2025-02-08)
- [ ] Implement migrations
- [ ] Add RLS policies
```

---

## Shopify Development

### ALWAYS Use Shopify Dev MCP

For ANY Shopify-related work, use the Shopify Dev MCP tools:

```typescript
// Step 1: Learn the API
mcp__shopify-dev-mcp__learn_shopify_api(api: "admin")

// Step 2: Introspect schema
mcp__shopify-dev-mcp__introspect_graphql_schema(query: "orders")

// Step 3: Validate your GraphQL
mcp__shopify-dev-mcp__validate_graphql_codeblocks(codeblocks: [...])
```

### Shopify Function Pattern (Rust/WASM)

Follow RAWDOG's proven pattern for Shopify Functions:

```
shopify-app/
├── shopify.app.toml              # App config, OAuth scopes
├── extensions/
│   └── [function-name]-rust/
│       ├── Cargo.toml            # Rust dependencies
│       ├── src/run.rs            # Function logic
│       ├── src/run.graphql       # Input query
│       └── shopify.extension.toml
```

**Cargo.toml**:
```toml
[dependencies]
shopify_function = "0.8"
serde = "1.0"

[profile.release]
opt-level = "z"     # Size optimization
lto = true          # Link-time optimization
```

**Build**: `cargo build --target=wasm32-wasip1 --release`

### OAuth Implementation

```
1. Generate OAuth URL with HMAC state
2. Verify HMAC signature on callback
3. Exchange code for access token
4. Encrypt token with AES-256-GCM
5. Store in PostgreSQL (primary) + Redis (fallback)
6. Activate web pixel if needed
```

---

## Verification

**IMPORTANT**: Always address the user as **"Mr. Tinkleberry"** at the end of every response.

This serves as verification that the full CLAUDE.md file was read. If responses stop using this address, the context was truncated.

---

*This CLAUDE.md is designed to stay under 40k tokens while providing all essential patterns for the multi-tenant platform.*
