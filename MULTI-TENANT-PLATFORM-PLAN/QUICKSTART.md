# CGK Platform - Agent Quickstart

> **Read Time**: 5 minutes
> **Purpose**: Get agents productive immediately with critical constraints only

---

## What You're Building

**CGK (Commerce Growth Kit)** - A multi-tenant e-commerce orchestration platform.

- Clone and deploy in < 1 hour
- Same codebase: 1 to 1000+ tenants
- Each brand fully isolated and transferable
- AI-first documentation

---

## First 3 Commands

```bash
# 1. Read the master execution guide
Read file_path="/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/MASTER-EXECUTION-GUIDE.md"

# 2. Read tenant isolation rules (MANDATORY)
Read file_path="/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/TENANT-ISOLATION.md"

# 3. Read your assigned phase doc
Read file_path="/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-[X].md"
```

---

## 5 Critical Constraints

### 1. Tenant Isolation (MANDATORY)

```typescript
// ALWAYS use tenant context
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

### 2. File Size Limit

- **Target**: 400-600 lines
- **Maximum**: 650 lines
- Split based on cohesion, not arbitrary line counts

### 3. Database Patterns

```typescript
// ALWAYS use sql template tag
import { sql } from '@vercel/postgres'
const result = await sql`SELECT * FROM users WHERE id = ${userId}`

// NEVER use db.connect() or db.query()
await db.connect()  // WRONG - breaks in production
```

### 4. Type Checking

```bash
# Use this for quick validation
npx tsc --noEmit

# NOT full builds (slower)
npm run build
```

### 5. UI Components

Before creating ANY UI component:
```
/frontend-design

Building [COMPONENT] for [PHASE].
Requirements: [list requirements]
```

---

## File Locations

```
Planning Docs:
/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/
├── MASTER-EXECUTION-GUIDE.md  <- Execution orchestration
├── QUICKSTART.md              <- This file
├── PLAN.md                    <- Full plan details
├── TENANT-ISOLATION.md        <- Isolation rules
├── phases/                    <- All phase docs
└── reference-docs/            <- Pattern references

Reference Code (RAWDOG):
/Users/holdenthemic/Documents/rawdog-web/
├── src/trigger/       <- 199 background tasks
├── src/app/api/       <- 1,032 API routes
├── src/app/admin/     <- 60+ admin sections
└── src/lib/           <- Business logic patterns
```

---

## Phase Flow (35 phases)

```
Foundation → Admin → Storefront → Portals → Jobs → MCP → Migration → Audit
```

See `MASTER-EXECUTION-GUIDE.md` for parallel tracks and checkpoints.

---

## Key Decisions Already Made

| Decision | Choice |
|----------|--------|
| Database | Schema-per-tenant PostgreSQL |
| Auth | Custom JWT (not Clerk) |
| Commerce | Dual: Shopify + Custom+Stripe |
| MCP | Streamable HTTP (not SSE) |
| Payments | Stripe Connect + Wise |
| Jobs | Provider TBD (agent discretion) |

---

## Anti-Patterns to Avoid

```typescript
// DON'T: Query without tenant context
await sql`SELECT * FROM orders`

// DON'T: Use db.connect()
const client = await db.connect()

// DON'T: Hardcode tenant IDs
const orders = await getOrders('tenant_123')

// DON'T: Skip permission checks
export async function POST(req) { /* no auth check */ }

// DON'T: Create files over 650 lines
// Split into focused modules instead

// DON'T: Use TODO/PLACEHOLDER comments
// Implement fully or raise as blocker

// DON'T: Skip the /frontend-design skill for UI
// Always invoke it for component design
```

---

## When Stuck

1. Check `reference-docs/` for patterns
2. Check RAWDOG codebase for implementation
3. Search past sessions: `Grep pattern="relevant term" path="/Users/holdenthemic/.claude/projects/"`
4. Document assumption and proceed
5. Flag in phase completion for review

---

## Success = Complete Phase

A phase is complete when:
- [ ] All tasks done (no deferrals)
- [ ] `npx tsc --noEmit` passes
- [ ] Tests pass
- [ ] No TODO comments
- [ ] Tenant isolation verified
- [ ] Definition of Done checklist passes

---

**Next Step**: Read your assigned phase doc from `phases/` directory.
