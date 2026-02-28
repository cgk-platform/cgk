# CGK Platform - Skill Registry

**Purpose**: Comprehensive catalog of all executable skills, knowledge bases, and agent personas available in the CGK platform development environment.

**Last Updated**: 2026-02-27

---

## Overview

The `.claude/` directory contains three distinct types of development assets:

| Type | Directory | Purpose | Invocation |
|------|-----------|---------|------------|
| **Executable Skills** | `.claude/skills/` | User-invocable workflows with code | `/skill-name` or direct execution |
| **Knowledge Bases** | `.claude/knowledge-bases/` | Domain expertise documentation (agent reference only) | Referenced in prompts |
| **Agent Definitions** | `.claude/agents/` | Specialized agent personas for specific tasks | `/agent-name` or handoff |

**Key Distinction** (from [ADR-004](./adrs/004-skill-architecture-separation.md)):
- **Skills** = Executable code with `index.js` entry point (DO one thing)
- **Knowledge Bases** = Read-only documentation (KNOW one domain)
- **Agents** = Specialized personas (ARE one role)

---

## 1. Executable Skills (5 Total)

### 1.1 tenant-isolation-validator

**Purpose**: Validates that all tenant-scoped operations use proper isolation patterns across the CGK codebase.

**Invocation**:
```bash
/tenant-isolation-validator [--path <directory>] [--fix] [--verbose]

# Examples
/tenant-isolation-validator
/tenant-isolation-validator --path apps/admin
/tenant-isolation-validator --fix
```

**Key Features**:
- ✅ Detects SQL queries without `withTenant()` wrapper
- ✅ Detects cache operations without `createTenantCache()`
- ✅ Detects background jobs missing `tenantId` in payload
- ✅ Auto-fix mode for simple violations
- ✅ Pre-commit hook integration
- ✅ CI/CD pipeline integration

**Validation Rules**:
1. **no-raw-sql**: All SQL queries MUST be wrapped in `withTenant()`
2. **no-raw-cache**: All cache operations MUST use `createTenantCache()`
3. **no-tenant-in-job**: All job payloads MUST include `{ tenantId }`

**When to Use**:
- Before committing code (automatic via pre-commit hook)
- During code review
- Before deploying to production
- After refactoring tenant-scoped code

**Documentation**: [.claude/skills/tenant-isolation-validator/README.md](./skills/tenant-isolation-validator/README.md)

---

### 1.2 meliusly-figma-audit

**Purpose**: Encapsulates all Figma knowledge for the Meliusly storefront and provides pixel-perfect audit capabilities throughout the implementation process.

**Invocation**:
```bash
/meliusly-figma-audit <command> [args]

# Available commands
/meliusly-figma-audit extract <section> [page]
/meliusly-figma-audit list [page]
/meliusly-figma-audit tokens
/meliusly-figma-audit audit <page>

# Examples
/meliusly-figma-audit extract hero
/meliusly-figma-audit list homepage
/meliusly-figma-audit tokens
/meliusly-figma-audit audit pdp
```

**Key Features**:
- 📐 Complete Figma node ID registry (100+ sections across 5 pages)
- 🎨 Design token extraction (colors, typography, spacing, breakpoints)
- 📋 Section-by-section validation checklists
- 🔗 MCP tool integration commands
- 📊 Page audit generators

**Meliusly Design System**:
- **Pages**: Homepage (12 sections), PDP (12 sections), Collections (4 sections), Cart (2 states), How It Works
- **Colors**: Primary `#0268A0`, Dark `#161F2B`, White `#FFFFFF`
- **Typography**: Manrope font family, 12-40px sizes, 400-600 weights
- **Breakpoints**: 360/768/1024/1440px
- **Tolerance**: ±2px for all measurements

**When to Use**:
- Before building any Meliusly storefront section
- During implementation to reference exact measurements
- After building to validate pixel-perfect match
- When completing a full page to verify all sections

**Documentation**: [.claude/skills/meliusly-figma-audit/README.md](./skills/meliusly-figma-audit/README.md)

---

### 1.3 sql-pattern-enforcer

**Purpose**: Validates SQL patterns specific to `@vercel/postgres` and prevents common TypeScript type errors.

**Invocation**:
```bash
/sql-pattern-enforcer [--path <directory>] [--fix] [--verbose]
```

**Key Features** (Planned):
- ✅ Detects PostgreSQL array literals (MUST use `{${items.join(',')}}::type[]`)
- ✅ Detects Date objects (MUST use `.toISOString()`)
- ✅ Detects toCamelCase without double-cast (MUST use `as unknown as Type`)
- ✅ Detects undefined row access (MUST check `result.rows[0]`)
- ✅ Detects sql.unsafe() (doesn't exist - use if/else branches)
- ✅ Detects dynamic table names (use switch/case instead)

**Validation Rules**:
1. **no-direct-array**: Arrays in SQL MUST use PostgreSQL array literal syntax
2. **no-date-objects**: Dates MUST be converted to ISO strings
3. **no-unsafe-typecast**: toCamelCase results MUST double-cast through `unknown`
4. **no-undefined-row-access**: Always check `result.rows[0]` before accessing
5. **no-sql-unsafe**: sql.unsafe() doesn't exist - use conditional queries
6. **no-dynamic-table**: Dynamic table names require explicit switch/case

**When to Use**:
- Before committing database code
- After writing new SQL queries
- When encountering TypeScript errors in database code

**Status**: ⏳ Pending Implementation (see Task #5)

---

### 1.4 plan-mode-enforcer

**Purpose**: Enforces the mandatory planning workflow for all non-trivial implementation tasks.

**Invocation**:
```bash
/plan-mode-enforcer [--auto-check]

# Examples
/plan-mode-enforcer  # Interactive enforcement
/plan-mode-enforcer --auto-check  # Pre-execution check
```

**Key Features** (Planned):
- ✅ Detects when implementation starts without planning
- ✅ Checks for existence of plan documents in `.claude/plans/`
- ✅ Validates plan approval before implementation
- ✅ Enforces exceptions (simple research, typo fixes, explicit skip)
- ✅ Auto-blocks commits without approved plan

**Enforcement Rules**:
1. **plan-required**: Multi-step tasks MUST have approved plan
2. **plan-approval**: Plan MUST be explicitly approved by user
3. **plan-exceptions**: Research/trivial fixes/explicit-skip are allowed
4. **plan-tracking**: Plan document MUST exist in `.claude/plans/`

**When to Use**:
- At start of every coding session (automatic check)
- Before beginning any feature implementation
- During code review to verify planning was done

**Status**: ⏳ Pending Implementation (see Task #7)

---

### 1.5 env-var-workflow

**Purpose**: Guides proper environment variable setup workflow (Vercel → .env.local → .env.example).

**Invocation**:
```bash
/env-var-workflow <command> [args]

# Available commands
/env-var-workflow add <VAR_NAME> [--local-only]
/env-var-workflow sync
/env-var-workflow audit

# Examples
/env-var-workflow add DATABASE_URL
/env-var-workflow add DEBUG_MODE --local-only
/env-var-workflow sync
/env-var-workflow audit
```

**Key Features** (Planned):
- ✅ Validates Vercel-first workflow (production vars)
- ✅ Handles local-only vars (`LOCAL_*`, `DEBUG_*`, `TEST_*`)
- ✅ Auto-updates ALL `.env.example` files across apps
- ✅ Syncs from Vercel to local (runs `vercel env pull`)
- ✅ Audits for missing documentation

**Workflow Enforcement**:
1. **Production vars**: Add to Vercel first → `vercel env pull` → document in `.env.example`
2. **Local vars**: Add to `.env.development.local` → document in `.env.example`
3. **Documentation**: MUST add commented placeholder to ALL app `.env.example` files

**When to Use**:
- When adding any new environment variable
- When updating existing env var values
- When syncing from Vercel
- When auditing env var documentation

**Status**: ⏳ Pending Implementation (see Task #6)

---

## 2. Knowledge Bases (4 Total)

Knowledge bases are **reference documentation** for agents. They are NOT executable. Agents should reference these when working in their respective domains.

### 2.1 database-migration-patterns

**Domain**: Database schema migrations, PostgreSQL patterns, tenant isolation in migrations

**Key Topics**:
- ✅ Public vs tenant schema patterns (UUID vs TEXT IDs)
- ✅ Idempotent migration patterns (`IF NOT EXISTS`, `DO$$ EXCEPTION`)
- ✅ Foreign key type validation (UUID vs TEXT mismatches)
- ✅ pgvector extension patterns (`public.vector(1536)`)
- ✅ Enum types, indexes, JSONB operations
- ✅ Migration CLI commands and testing strategies
- ✅ Common gotchas and decision trees

**When to Reference**:
- Creating new database migrations
- Adding tables, columns, indexes, or constraints
- Working with tenant schemas
- Debugging migration failures
- Adding foreign keys across schemas

**Documentation**: [.claude/knowledge-bases/database-migration-patterns/README.md](./knowledge-bases/database-migration-patterns/README.md)

---

### 2.2 payment-processing-patterns

**Domain**: Stripe, Wise, payment flows, financial audit trails, tenant-managed credentials

**Key Topics**:
- ✅ Tenant-owned payment accounts (Stripe, Wise)
- ✅ Service client factories (`getTenantStripeClient`, `getTenantWiseClient`)
- ✅ Idempotency keys (UUID v4 for all payment operations)
- ✅ Webhook signature verification (HMAC, Stripe signatures)
- ✅ Financial audit trail (append-only `balance_transactions`)
- ✅ Stripe Connect patterns (connected accounts, payouts)
- ✅ International payouts via Wise

**When to Reference**:
- Implementing payment processing features
- Setting up webhook handlers
- Creating payout flows
- Debugging payment failures
- Implementing financial reporting

**Documentation**: [.claude/knowledge-bases/payment-processing-patterns/README.md](./knowledge-bases/payment-processing-patterns/README.md)

---

### 2.3 shopify-api-guide

**Domain**: Shopify Admin API, Storefront API, OAuth, webhooks, product sync

**Key Topics**:
- ✅ Dual API strategy (Admin for backend, Storefront for customer-facing)
- ✅ OAuth token security (encryption with `SHOPIFY_TOKEN_ENCRYPTION_KEY`)
- ✅ GraphQL cursor pagination patterns
- ✅ Bulk operations for large datasets
- ✅ HMAC webhook verification
- ✅ Product sync patterns (DB cache + Shopify fallback)
- ✅ Rate limiting and retry strategies

**When to Reference**:
- Integrating with Shopify APIs
- Implementing product display on storefronts
- Setting up Shopify webhooks
- Syncing product data to local database
- Debugging Shopify OAuth issues

**Documentation**: [.claude/knowledge-bases/shopify-api-guide/README.md](./knowledge-bases/shopify-api-guide/README.md)

---

### 2.4 figma-design-system

**Domain**: Storefront development, tenant theming, block-based architecture, Figma → code workflow

**Key Topics**:
- ✅ Figma → deployed workflow (5 steps: extract tokens, build component, store config, render, deploy)
- ✅ Tenant theming with CSS custom properties
- ✅ Server Component vs Client Component patterns
- ✅ Block-based landing page system (70+ block types)
- ✅ Theme injection (server-side, no FOUC)
- ✅ Product data flow (local DB + Shopify fallback)
- ✅ Image optimization with Next.js

**When to Reference**:
- Building storefront components
- Implementing tenant-specific theming
- Creating new landing page blocks
- Optimizing storefront performance
- Converting Figma designs to React components

**Documentation**: [.claude/knowledge-bases/figma-design-system/README.md](./knowledge-bases/figma-design-system/README.md)

---

## 3. Agent Definitions (7 Total)

Agents are specialized personas for specific development tasks. Invoke via `/agent-name` or handoff from current agent.

### 3.1 architect

**Role**: System design and architecture decisions

**Responsibilities**:
- High-level system design
- Technology selection
- Architectural decision records (ADRs)
- Performance and scalability planning
- Integration patterns

**When to Invoke**:
- Designing new features or systems
- Evaluating technology choices
- Resolving architectural conflicts
- Planning major refactors

**Documentation**: [.claude/agents/architect.md](./agents/architect.md)

---

### 3.2 implementer

**Role**: Code implementation and feature development

**Responsibilities**:
- Writing production code
- Implementing features per approved plans
- Following coding standards
- Creating unit tests
- Documenting code

**When to Invoke**:
- After plan approval, ready to code
- Building new features
- Implementing API endpoints
- Creating UI components

**Documentation**: [.claude/agents/implementer.md](./agents/implementer.md)

---

### 3.3 reviewer

**Role**: Code review and quality assurance

**Responsibilities**:
- Code review for style and patterns
- Identifying bugs and edge cases
- Ensuring test coverage
- Verifying adherence to standards
- Suggesting improvements

**When to Invoke**:
- After implementation, before merging
- During pull request review
- When validating pixel-perfect match (Figma vs live)
- Before production deployment

**Documentation**: [.claude/agents/reviewer.md](./agents/reviewer.md)

---

### 3.4 tester

**Role**: Test creation and validation

**Responsibilities**:
- Writing unit tests
- Creating integration tests
- E2E test scenarios
- Test coverage analysis
- Bug reproduction

**When to Invoke**:
- After feature implementation
- When adding test coverage
- Debugging failing tests
- Creating test fixtures

**Documentation**: [.claude/agents/tester.md](./agents/tester.md)

---

### 3.5 debugger

**Role**: Issue diagnosis and troubleshooting

**Responsibilities**:
- Root cause analysis
- Error reproduction
- Log analysis
- Performance profiling
- Debugging complex issues

**When to Invoke**:
- When encountering bugs or errors
- Debugging production issues
- Investigating performance problems
- Tracing execution flow

**Documentation**: [.claude/agents/debugger.md](./agents/debugger.md)

---

### 3.6 refactorer

**Role**: Code improvement and technical debt reduction

**Responsibilities**:
- Identifying code smells
- Refactoring for clarity
- Performance optimization
- Reducing duplication
- Improving maintainability

**When to Invoke**:
- When code quality degrades
- Before major feature work
- Addressing technical debt
- Improving test coverage

**Documentation**: [.claude/agents/refactorer.md](./agents/refactorer.md)

---

### 3.7 researcher

**Role**: Investigation and documentation

**Responsibilities**:
- Technology research
- API documentation analysis
- Creating examples
- Knowledge base updates
- Pattern discovery

**When to Invoke**:
- Exploring new technologies
- Understanding third-party APIs
- Documenting patterns
- Creating guides

**Documentation**: [.claude/agents/researcher.md](./agents/researcher.md)

---

## 4. Usage Examples

### Example 1: Full Feature Implementation Workflow

```bash
# 1. Start with planning (mandatory)
/plan-mode-enforcer  # Validates plan exists and approved

# 2. Run tenant isolation check before coding
/tenant-isolation-validator --path apps/admin

# 3. Invoke implementer agent with approved plan
/implementer "Implement order webhook handler per approved plan..."

# 4. After implementation, validate patterns
/sql-pattern-enforcer --path apps/admin/src/app/api/webhooks
/tenant-isolation-validator --path apps/admin/src/app/api/webhooks

# 5. Invoke reviewer for code review
/reviewer "Review webhook handler implementation for tenant isolation and error handling"

# 6. If tests needed, invoke tester
/tester "Create integration tests for Shopify order webhook handler"
```

---

### Example 2: Meliusly Storefront Section Build

```bash
# 1. Extract Figma data for section
/meliusly-figma-audit extract hero

# 2. Reference design tokens
/meliusly-figma-audit tokens

# 3. Use figma-design-system knowledge base
# (Agent automatically references for component patterns)

# 4. Build component with implementer
/implementer "Build Meliusly hero section matching Figma node 1:4243..."

# 5. Validate pixel-perfect match
/reviewer "Compare live Meliusly hero section vs Figma screenshot..."

# 6. Move to next section
/meliusly-figma-audit extract trustBar
```

---

### Example 3: Adding New Environment Variable

```bash
# 1. Use env-var-workflow skill to add variable
/env-var-workflow add STRIPE_SECRET_KEY

# Workflow automatically:
# - Prompts for value
# - Adds to Vercel (all environments: production, preview, development)
# - Runs vercel env pull to sync locally
# - Updates ALL .env.example files with commented placeholder

# For local-only vars (debugging, testing)
/env-var-workflow add DEBUG_SQL_QUERIES --local-only

# Audit to check for missing documentation
/env-var-workflow audit
```

---

### Example 4: Database Migration Creation

```bash
# 1. Research patterns in knowledge base
# (Agent references database-migration-patterns automatically)

# 2. Create migration file
npx @cgk-platform/cli migrate:create add_subscription_analytics --tenant

# 3. Implement migration with architect guidance
/architect "Design subscription analytics schema with proper indexes and foreign keys"

# 4. Validate migration
npx @cgk-platform/cli migrate --dry-run

# 5. Run migration
npx @cgk-platform/cli migrate --tenant rawdog
```

---

### Example 5: Payment Integration

```bash
# 1. Reference payment-processing-patterns knowledge base
# (Agent uses when implementing payment features)

# 2. Implement Stripe webhook handler
/implementer "Create Stripe payment success webhook handler with signature verification..."

# 3. Validate tenant isolation
/tenant-isolation-validator --path apps/admin/src/app/api/webhooks/stripe

# 4. Review for security
/reviewer "Review Stripe webhook handler for security (HMAC verification, idempotency)"

# 5. Test webhook flow
/tester "Create test for Stripe webhook signature verification and payment success flow"
```

---

## 5. Skill Development Guidelines

### Creating New Executable Skills

**Requirements** (from [ADR-004](./adrs/004-skill-architecture-separation.md)):
1. **index.js** or **index.ts** - Entry point with `execute()` function
2. **package.json** - Metadata and dependencies
3. **README.md** - Usage guide with examples

**Example Structure**:
```
.claude/skills/my-new-skill/
├── index.js           # Entry point
├── package.json       # Metadata
├── README.md          # Documentation
└── __tests__/         # Tests (optional)
    └── index.test.ts
```

**Entry Point Pattern**:
```javascript
// index.js
export async function execute(args) {
  // Skill implementation
  return {
    status: 'success',  // or 'fail'
    message: 'Result message',
    data: { /* results */ }
  }
}

// If invoked as CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const result = await execute(args)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.status === 'success' ? 0 : 1)
}
```

---

### Creating New Knowledge Bases

**Requirements**:
1. **README.md** - Patterns, examples, best practices
2. **Domain focus** - One area of expertise per knowledge base
3. **Decision trees** - Clear guidance for common scenarios
4. **Code examples** - Real patterns from CGK codebase

**Example Structure**:
```
.claude/knowledge-bases/my-domain-patterns/
├── README.md          # Main documentation
└── examples/          # Code samples (optional)
    ├── basic.ts
    └── advanced.ts
```

---

## 6. Integration Points

### Pre-Commit Hooks
```bash
# .husky/pre-commit
#!/bin/sh
pnpm lint-staged

# lint-staged config (package.json)
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "node .claude/skills/tenant-isolation-validator/index.js",
      "node .claude/skills/sql-pattern-enforcer/index.js"
    ]
  }
}
```

### CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
tenant-isolation:
  name: Tenant Isolation Check
  runs-on: ubuntu-latest
  steps:
    - run: node .claude/skills/tenant-isolation-validator/index.js

sql-patterns:
  name: SQL Pattern Validation
  runs-on: ubuntu-latest
  steps:
    - run: node .claude/skills/sql-pattern-enforcer/index.js
```

### Agent Handoffs
Agents automatically reference knowledge bases and can invoke skills:

```typescript
// Implementer agent implementing payment feature
// 1. Automatically references payment-processing-patterns knowledge base
// 2. Can invoke tenant-isolation-validator to check code
// 3. Hands off to reviewer agent when done
```

---

## 7. Maintenance

### Adding New Skills
1. Create skill directory in `.claude/skills/`
2. Add `index.js`, `package.json`, `README.md`
3. Update this registry
4. Add to pre-commit hooks if validation skill
5. Add to CI/CD pipeline if validation skill

### Adding New Knowledge Bases
1. Create directory in `.claude/knowledge-bases/`
2. Add comprehensive `README.md`
3. Update this registry
4. Update relevant agent definitions to reference it

### Updating Agent Definitions
1. Modify agent markdown file in `.claude/agents/`
2. Update responsibilities and knowledge base references
3. Update this registry if new agent added

---

## 8. Related Documentation

- [ADR-004: Skill Architecture Separation](./adrs/004-skill-architecture-separation.md) - Definitions and structure
- [CLAUDE.md](../CLAUDE.md) - Root project instructions
- [AGENT-COORDINATION.md](./AGENT-COORDINATION.md) - Agent handoff patterns
- [MODEL-SELECTION.md](./MODEL-SELECTION.md) - Model assignment for agents and skills

---

**Registry Version**: 1.0.0
**Last Updated**: 2026-02-27
**Maintained By**: Platform Development Team

---

*This registry serves as the single source of truth for all development assets in the `.claude/` directory. Keep it updated as new skills, knowledge bases, and agents are added.*
