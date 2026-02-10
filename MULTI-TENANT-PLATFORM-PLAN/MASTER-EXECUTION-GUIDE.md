# CGK Multi-Tenant Platform - Master Execution Guide

> **THIS IS THE KICKOFF PROMPT**: Copy and paste this entire document into a fresh Claude Code agent to start building the platform.

---

## Your Mission

You are building **CGK (Commerce Growth Kit)** - a multi-tenant e-commerce orchestration platform. This is a complete rebuild of the RAWDOG platform as a portable, installable, white-labeled system that can power multiple DTC brands from a single codebase.

**Key Goals:**
- Clone and deploy in < 1 hour
- Same codebase scales from 1 to 1000+ tenants
- Each brand fully isolated and transferable
- WordPress-style install and configuration
- AI-first documentation throughout

---

## STEP 1: Read These Documents (In Order)

```bash
# 1. Read this file completely first (you're doing this now)

# 2. Read the master plan (goals, architecture decisions, scope)
Read file_path="/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/PLAN.md"

# 3. Read tenant isolation rules (MANDATORY - no exceptions)
Read file_path="/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/TENANT-ISOLATION.md"

# 4. Read the index (all phase docs, dependencies, parallelization map)
Read file_path="/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/INDEX.md"

# 5. Read the architecture (technical decisions)
Read file_path="/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/ARCHITECTURE.md"

# 6. Read phase execution order (parallel tracks, checkpoints)
Read file_path="/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/PHASE-EXECUTION-ORDER.md"

# 7. Read your current phase doc
Read file_path="/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-0-PORTABILITY.md"
```

---

## STEP 2: Understand the Critical Rules

### Rule 1: Tenant Isolation is MANDATORY

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

### Rule 2: Never Skip or Defer Tasks

- Every task in a phase MUST be completed before marking phase done
- No `// TODO` or `// PLACEHOLDER` comments allowed
- No partial implementations - full functionality required
- Every Definition of Done item must pass
- Audit checkpoints cannot be skipped

### Rule 3: File Size and Quality

- **Target**: 400-600 lines per file
- **Maximum**: 650 lines - split if larger
- Use `npx tsc --noEmit` for type checking (NOT `npm run build`)
- Use `import type` for type-only imports

### Rule 4: UI Components Require /frontend-design

Before creating ANY UI component:
```
/frontend-design

Building [COMPONENT] for [PHASE].
Requirements: [list requirements]
```

### Rule 5: Database Patterns

```typescript
// ALWAYS use sql template tag
import { sql } from '@vercel/postgres'
const result = await sql`SELECT * FROM users WHERE id = ${userId}`

// NEVER use db.connect() - it breaks in production
await db.connect()  // WRONG
```

---

## STEP 3: Execution Flow

### Phase Sequence

```
PHASE 0 → 1A → 1B → 1C → 1D
   ↓ [CHECKPOINT: Foundation Audit]
PHASE 2A-2D (Brand Admin) || PHASE 2SA-* (Super Admin)
   ↓ [CHECKPOINT: Admin Audit]
PHASE 3A-3I (Storefront)
   ↓ [CHECKPOINT: Storefront Audit]
PHASE 4A-4E (External Portals)
   ↓ [CHECKPOINT: Portals Audit]
PHASE 5A → 5B || 5C || 5D || 5E (Jobs - parallel after 5A)
   ↓ [CHECKPOINT: Jobs Audit]
PHASE 6A → 6B (MCP)
   ↓ [CHECKPOINT: MCP Audit]
PHASE 7A → 7B → 7C (Migration)
   ↓ [CHECKPOINT: Pre-Cutover Audit]
PHASE 8 (Final Audit - 15 parallel agents)
   ↓ [PRODUCTION READY]
```

### At Each Checkpoint

1. Run `npx tsc --noEmit` - MUST pass
2. Run all tests - MUST pass
3. Verify tenant isolation in new code
4. Check all Definition of Done items
5. Create handoff document
6. START A FRESH CLAUDE SESSION

---

## STEP 4: Context Window Management

### When to Start Fresh Session

Your context window is ~200k tokens. Start a new session when:
- Completing any major phase milestone
- Context exceeds ~150k tokens (leave buffer)
- After any audit checkpoint
- When switching between unrelated major areas

### Handoff Document Template

Before starting fresh session, create: `.claude/session-handoffs/PHASE-X-HANDOFF.md`

```markdown
## Session Handoff: Phase [X] Complete

### Date: YYYY-MM-DD

### Completed Work
- [List phases/tasks completed]
- [Key decisions made]

### Current State
- Working branch: [branch name]
- Type check: PASS/FAIL
- Tests: X passing

### Next Steps
1. Read: [specific phase doc path]
2. Start: [specific task]

### Key Context to Preserve
- [Critical architectural decisions]
- [Patterns established]
```

---

## STEP 5: Phase Document Structure

Every phase document you work with has this structure:

1. **Goal** - What to achieve
2. **Dependencies** - What must be done first
3. **Inputs Required** - What you need to start
4. **Deliverables** - Specific outputs to create
5. **Tasks** - Marked `[PARALLEL]` or `[SEQUENTIAL]`
6. **Definition of Done** - Checklist to verify completion
7. **What's Next** - Where to go after this phase

### When Working on a Phase

1. Read the phase doc completely
2. Read all referenced documents (specs, patterns)
3. Work through tasks in order
4. Check off Definition of Done items
5. Update phase doc to mark completion
6. Read "What's Next" and proceed

---

## STEP 6: Key File Locations

### Planning Documentation
```
/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/
├── PLAN.md                    # Master plan
├── INDEX.md                   # Navigation, dependencies
├── ARCHITECTURE.md            # Technical architecture
├── TENANT-ISOLATION.md        # Isolation rules (MANDATORY)
├── PHASE-EXECUTION-ORDER.md   # Execution sequence
├── PHASE-DOD-TEMPLATE.md      # Definition of Done template
├── phases/                    # All phase docs
├── reference-docs/            # Pattern references
├── CODEBASE-ANALYSIS/         # RAWDOG analysis
└── *-SPEC-*.md                # Feature specifications
```

### RAWDOG Reference Code (Extract Patterns From)
```
/Users/holdenthemic/Documents/rawdog-web/
├── src/trigger/       # 199 background tasks
├── src/app/api/       # 1,032 API routes
├── src/app/admin/     # 60+ admin sections
├── src/components/    # 465 React components
└── src/lib/           # Business logic patterns
```

---

## STEP 7: Architecture Decisions (Already Made)

| Decision | Choice | Notes |
|----------|--------|-------|
| Database | Schema-per-tenant PostgreSQL | Each brand gets isolated schema |
| Auth | Custom JWT + sessions | Replacing Clerk |
| Commerce | Dual: Shopify + Custom+Stripe | Feature flag controlled |
| Background Jobs | Trigger.dev v4 | Use @trigger.dev/sdk, NOT client.defineJob |
| MCP Transport | Streamable HTTP | Not SSE (deprecated) |
| Payments | Stripe Connect + Wise | Domestic + international |

---

## STEP 8: Parallel Agent Usage

### When to Spawn Sub-Agents

For phases marked with parallel opportunities (see PHASE-EXECUTION-ORDER.md):

```
Main Agent:
  1. Read phase doc
  2. Identify [PARALLEL] tasks
  3. Spawn sub-agents for each track
  4. Wait for all completions
  5. Run integration verification
  6. Proceed to next phase
```

### Maximum Parallel Opportunities

| Phase Group | Agents | Timeline Savings |
|-------------|--------|------------------|
| Phase 2 Admin | 2 | 5 weeks |
| Phase 2 Services | 4 | 3 weeks |
| Phase 5 Jobs | 4 | 10 days |
| Phase 8 Audit | 15 | 14 weeks |

---

## STEP 9: Definition of Done (Standard)

Every phase must satisfy:

### Code Quality
- [ ] All tasks completed (no deferrals)
- [ ] `npx tsc --noEmit` passes
- [ ] No `// TODO` or `// PLACEHOLDER` comments
- [ ] All files under 650 lines
- [ ] Import type for type-only imports

### Tenant Isolation
- [ ] All database queries use `withTenant(tenantId, ...)`
- [ ] All cache operations use `createTenantCache(tenantId)`
- [ ] All background jobs include `tenantId` in payload
- [ ] All API routes call `getTenantContext(req)` first

### Testing
- [ ] Unit tests for new functions
- [ ] Integration tests for new API routes
- [ ] Manual verification in debug mode

### Documentation
- [ ] Package CLAUDE.md updated if new patterns
- [ ] Complex logic has inline comments
- [ ] API routes have JSDoc comments

### Handoff
- [ ] Type check passes
- [ ] No blockers for next phase
- [ ] Handoff document created

---

## STEP 10: Emergency Procedures

### If Type Check Fails
1. STOP - do not proceed
2. Fix all type errors immediately
3. Verify with `npx tsc --noEmit`
4. Document what caused the error

### If Tests Fail
1. Determine if test or implementation is wrong
2. Fix the issue
3. Run full test suite
4. Only proceed when green

### If Tenant Isolation Violated
1. STOP immediately
2. Audit all recent code for isolation
3. Add `withTenant()` where missing
4. Add tests to prevent regression

### If Phase Doc Unclear
1. Check reference-docs/ for patterns
2. Check RAWDOG codebase for implementation
3. Document assumption and proceed
4. Flag for review in completion

---

## BEGIN EXECUTION

**You are now ready to start. Follow these steps:**

1. Read the documents listed in STEP 1 (in order)
2. Confirm you understand the critical rules (STEP 2)
3. Begin with PHASE-0-PORTABILITY.md
4. Work through each phase sequentially
5. Start fresh sessions at checkpoints
6. Never skip or defer tasks

**First Action:**
```
Read file_path="/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/PLAN.md"
```

---

## Quick Reference Card

```
TYPE CHECK:     npx tsc --noEmit
TENANT DB:      withTenant(tenantId, () => sql`...`)
TENANT CACHE:   createTenantCache(tenantId)
TENANT API:     getTenantContext(req)
TENANT JOBS:    { tenantId, ...payload }
UI DESIGN:      /frontend-design skill first
FILE LIMIT:     650 lines max
HANDOFFS:       .claude/session-handoffs/
```

---

**Mr. Tinkleberry**, this is your complete execution guide. Paste this into a fresh Claude Code agent to begin building the CGK platform.
