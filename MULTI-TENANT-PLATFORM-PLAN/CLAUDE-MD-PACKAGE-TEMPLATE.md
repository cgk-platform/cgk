# CLAUDE.md Package Template

> **Purpose**: This is the **PER-PACKAGE CLAUDE.md** template. Each package in `/packages/{name}/` gets its own CLAUDE.md using this template. For the root-level CLAUDE.md, see `CLAUDE-MD-TEMPLATE.md`.

**Use this template for each package's CLAUDE.md file**

---

```markdown
# @cgk-platform/{package-name} - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: YYYY-MM-DD

---

## Purpose

[1-2 sentences describing what this package does and why it exists]

Example: "Database client and tenant utilities for the multi-tenant platform. Provides schema isolation, query helpers, and migration tools."

---

## Quick Reference

```typescript
// Most common import pattern
import { withTenant, sql, getTenantFromRequest } from '@cgk-platform/db'

// Common usage
const orders = await withTenant('rawdog', async () => {
  return sql`SELECT * FROM orders LIMIT 10`
})
```

---

## Key Patterns

### Pattern 1: [Name]

**When to use**: [Brief description]

```typescript
// DO this
[Good example code]

// DON'T do this
[Bad example code]
```

### Pattern 2: [Name]

**When to use**: [Brief description]

```typescript
[Example code]
```

### Pattern 3: [Name]

**When to use**: [Brief description]

```typescript
[Example code]
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | `withTenant`, `sql`, `getTenantFromRequest` |
| `client.ts` | Database connection | `sql`, `sqlRaw` |
| `tenant.ts` | Tenant context | `withTenant`, `setTenantSchema` |
| `migrations/` | Migration utilities | `runMigrations`, `getMigrationStatus` |

---

## Exports Reference

### Functions

```typescript
// Tenant context
withTenant<T>(slug: string, fn: () => Promise<T>): Promise<T>
getTenantFromRequest(req: Request): string
setTenantSchema(slug: string): Promise<void>

// Query utilities
sql<T>(template: TemplateStringsArray, ...values: unknown[]): Promise<T[]>
sqlRaw(query: string, params?: unknown[]): Promise<unknown[]>

// Migrations
runMigrations(tenantSlug?: string): Promise<void>
getMigrationStatus(): Promise<MigrationStatus[]>
```

### Types

```typescript
interface TenantContext {
  tenantId: string
  tenantSlug: string
  schemaName: string
}

interface MigrationStatus {
  version: number
  name: string
  appliedAt: Date | null
}
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@vercel/postgres` | PostgreSQL client for Vercel/Neon |
| `@cgk-platform/core` | Shared types and utilities |

---

## Common Gotchas

### 1. Never use `db.connect()` directly

```typescript
// ❌ WRONG - Breaks with Neon connection pooling
import { db } from '@vercel/postgres'
const client = await db.connect()

// ✅ CORRECT - Use sql template tag
import { sql } from '@cgk-platform/db'
const result = await sql`SELECT * FROM users`
```

### 2. Transactions don't work with Neon pooling

```typescript
// ❌ WRONG - Transaction may span multiple connections
await sql`BEGIN`
await sql`INSERT INTO orders (...)`
await sql`INSERT INTO order_items (...)`
await sql`COMMIT`

// ✅ CORRECT - Use atomic operations with ON CONFLICT
await sql`
  INSERT INTO orders (...)
  ON CONFLICT (id) DO UPDATE SET ...
`
```

### 3. Always include tenant context

```typescript
// ❌ WRONG - Query runs in wrong schema
const orders = await sql`SELECT * FROM orders`

// ✅ CORRECT - Wrap in tenant context
const orders = await withTenant('rawdog', async () => {
  return sql`SELECT * FROM orders`
})
```

---

## Integration Points

### Used by:
- `@cgk-platform/auth` - Session storage
- `@cgk-platform/jobs` - Job state persistence
- `apps/admin` - Admin portal data access

### Uses:
- `@vercel/postgres` - Database driver
- `@cgk-platform/core` - Type definitions
- `@cgk-platform/logging` - Query logging

---

## Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run integration tests (requires database)
pnpm test:integration
```

---

## Skills Required

<!-- Include this section if package has UI components -->

### For UI-Heavy Packages

**Invoke `/frontend-design`** before creating or modifying components.

Example prompt:
\`\`\`
/frontend-design

Building [Component] for @cgk-platform/{package-name}.

Requirements:
- [List requirements]

Constraints:
- shadcn/ui components
- Tailwind CSS
- [Accessibility needs]
\`\`\`

See `FRONTEND-DESIGN-SKILL-GUIDE.md` for detailed prompts.

### For Backend Packages

No frontend-design skill needed unless adding React components.

---

## Related Documentation

- [Database Architecture](../docs/architecture/database.md)
- [Tenant Isolation](../docs/guides/tenant-isolation.md)
- [Migration Guide](../docs/guides/migrations.md)
```

---

## Usage Notes for AI Agents

When generating CLAUDE.md files:

1. **Keep it concise**: Target 200-400 lines max
2. **Focus on patterns**: AI needs "how to use" not "how it works internally"
3. **Include gotchas**: AI learns from explicit "don't do this" examples
4. **Show real code**: Copy from actual implementation, not pseudocode
5. **Update the date**: AI should know how current the docs are
6. **Cross-reference**: Link to related packages so AI can follow the chain
7. **Include skill requirements**: If package has UI, document frontend-design skill usage

---

## Skill Requirements by Package Type

When creating CLAUDE.md for packages, include the relevant skill section:

### For UI Packages (@cgk-platform/ui, @cgk-platform/admin-ui, @cgk-platform/storefront-ui)

Add this section to the CLAUDE.md:

```markdown
## Required Skill: /frontend-design

**MANDATORY**: Invoke `/frontend-design` before creating or modifying ANY component in this package.

### Component Creation Workflow

1. **Invoke the skill** with component requirements
2. **Provide context**: Who uses this? What task? What decisions?
3. **Include constraints**: shadcn/ui, Tailwind, accessibility requirements
4. **Implement the output**: Adapt to local conventions
5. **Test responsiveness**: 390px mobile, 1440px desktop

### Example Prompt

\`\`\`
/frontend-design

Building [ComponentName] for @cgk-platform/ui package.

Requirements:
- [Specific requirements]
- [Layout/interaction needs]

Constraints:
- shadcn/ui base components
- Tailwind CSS styling
- Must be reusable across admin, storefront, creator portal
\`\`\`

See `/docs/MULTI-TENANT-PLATFORM-PLAN/FRONTEND-DESIGN-SKILL-GUIDE.md` for detailed prompts.
```

### For App Packages (admin, storefront, creator-portal)

Add this section:

```markdown
## Required Skill: /frontend-design

**MANDATORY**: Invoke `/frontend-design` before creating ANY page or component.

### UI Intensity

| Area | Intensity | Notes |
|------|-----------|-------|
| [List areas] | HIGH/MEDIUM/LOW | [What's involved] |

### Pre-Built Prompts

See `/docs/MULTI-TENANT-PLATFORM-PLAN/FRONTEND-DESIGN-SKILL-GUIDE.md` for ready-to-use prompts for:
- [List relevant components for this app]
```

### For Non-UI Packages (@cgk-platform/db, @cgk-platform/auth, @cgk-platform/jobs)

Add this section if the package has ANY exported React hooks or components:

```markdown
## Skill Requirements

This package is primarily backend-focused. However:

- **If adding React hooks**: Document hook usage patterns, no frontend-design needed
- **If adding React components**: MUST invoke `/frontend-design` first

Currently exported React utilities:
- `useTenant()` hook - No frontend-design needed
- [List any components that would need it]
```

### File Discovery Pattern

AI agents should be able to:

```typescript
// 1. Read package CLAUDE.md for context
Read('/packages/db/CLAUDE.md')

// 2. Check exports in index.ts
Read('/packages/db/src/index.ts')

// 3. Find implementation details if needed
Read('/packages/db/src/tenant.ts')
```

### JSDoc Annotations for AI

Use these custom annotations in code:

```typescript
/**
 * Execute a function within a tenant's database schema.
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always wrap database operations in this
 * @ai-gotcha Schema is set via search_path, not connection switching
 *
 * @example
 * const orders = await withTenant('rawdog', async () => {
 *   return sql`SELECT * FROM orders`
 * })
 */
export async function withTenant<T>(/* ... */)
```
