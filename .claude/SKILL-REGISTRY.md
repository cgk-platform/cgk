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

## 1. Executable Skills (15 Total)

Skills are organized by tier based on impact and frequency of use.

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

### 1.6 api-route-scaffolder

**Purpose**: Generates Next.js API routes following CGK patterns (auth, tenant context, error handling, type safety).

**Invocation**:
```bash
/api-route-scaffolder <resource> [--methods GET,POST,PATCH,DELETE] [--permissions] [--app admin]

# Examples
/api-route-scaffolder orders --methods GET,POST
/api-route-scaffolder analytics --methods GET --permissions analytics.view
/api-route-scaffolder products --app storefront
```

**Key Features**:
- ✅ Auto-generates all HTTP method handlers (GET, POST, PATCH, DELETE)
- ✅ Includes `requireAuth()` and permission checks
- ✅ Tenant context with `withTenant()` wrapper
- ✅ TypeScript types with Zod validation
- ✅ Error handling patterns
- ✅ Dry-run mode for previewing

**Template Includes**:
- `requireAuth()` with proper error handling
- `checkPermissionOrRespond()` for each method
- `withTenant()` for tenant-scoped queries
- Zod schema for request validation
- Response.json() with proper status codes
- `export const dynamic = 'force-dynamic'`

**When to Use**:
- Creating new API endpoints
- Following consistent API patterns
- Reducing boilerplate code
- Ensuring security best practices

**Time Saved**: 15-30 minutes per route (1,040-2,080 hours annually for 104 routes)

**Documentation**: [.claude/skills/api-route-scaffolder/README.md](./skills/api-route-scaffolder/README.md)

---

### 1.7 deployment-readiness-checker

**Purpose**: Pre-deployment validation (9 comprehensive checks: env vars, types, build, tests, migrations, Vercel config, security, git, package.json).

**Invocation**:
```bash
/deployment-readiness-checker [--app admin] [--skip-tests] [--skip-build] [--strict]

# Examples
/deployment-readiness-checker --app admin
/deployment-readiness-checker --skip-tests --skip-build  # Fast pre-commit check
/deployment-readiness-checker --strict --env production
```

**Key Features**:
- ✅ 9 critical deployment checks
- ✅ Environment variable validation (Vercel vs .env.example)
- ✅ TypeScript type checking (`npx tsc --noEmit`)
- ✅ Production build verification
- ✅ Test suite execution
- ✅ Database migration validation
- ✅ Vercel configuration audit
- ✅ Security vulnerability scan
- ✅ Git status check (clean working tree)

**Validation Checklist**:
1. Environment variables exist in Vercel
2. TypeScript compiles without errors
3. Production build succeeds
4. All tests pass
5. Migrations validated (syntax, types)
6. Vercel config correct (team scope, framework)
7. No critical security vulnerabilities
8. Git working tree clean, on main branch
9. Package.json consistency (workspace:*)

**When to Use**:
- Before every production deployment
- In CI/CD pipelines (required gate)
- Pre-commit hooks (fast mode)
- Before creating pull requests

**Time Saved**: 30-60 minutes per deployment failure prevented (160-320 hours annually)

**Documentation**: [.claude/skills/deployment-readiness-checker/README.md](./skills/deployment-readiness-checker/README.md)

---

### 1.8 encryption-keys-manager

**Purpose**: Automated encryption key lifecycle (generate, rotate, verify) for tenant credential encryption (AES-256-GCM).

**Invocation**:
```bash
/encryption-keys-manager <action> [options]

# Actions
/encryption-keys-manager generate [--save-to-vercel]
/encryption-keys-manager rotate [--dry-run] [--auto-verify]
/encryption-keys-manager verify [--apps admin,storefront]
/encryption-keys-manager history [--format json]
```

**Key Features**:
- ✅ Cryptographically secure key generation (256-bit AES-GCM)
- ✅ Automated key rotation with re-encryption
- ✅ Vercel environment variable integration
- ✅ Backup and rollback scripts
- ✅ Audit trail of all rotation events
- ✅ Decryption verification after rotation

**Rotation Workflow**:
1. Verify current key in Vercel
2. Generate new 256-bit key
3. Backup tenant_api_credentials table
4. Decrypt all credentials with old key
5. Encrypt all credentials with new key
6. Update INTEGRATION_ENCRYPTION_KEY in Vercel (all environments)
7. Verify decryption works
8. Log rotation event
9. Create rollback script

**When to Use**:
- Quarterly key rotation (recommended)
- Initial key generation for new tenants
- Key compromise response
- Verifying key configuration

**Time Saved**: 2-4 hours per rotation (16-40 hours annually)

**Documentation**: [.claude/skills/encryption-keys-manager/README.md](./skills/encryption-keys-manager/README.md)

---

### 1.9 type-cast-auditor

**Purpose**: Validates TypeScript type casting patterns, enforces single-cast through `unknown` standard.

**Invocation**:
```bash
/type-cast-auditor [--path apps/admin] [--fix] [--format json]

# Examples
/type-cast-auditor --path packages/db
/type-cast-auditor --fix --dry-run
/type-cast-auditor --strict  # Exit with error if violations found
```

**Key Features**:
- ✅ Detects direct double casts (no `unknown` intermediate)
- ✅ Detects database row casts without null checks
- ✅ Detects config object casts
- ✅ Auto-fix mode (adds `unknown` intermediate)
- ✅ Multiple output formats (text, JSON, CSV)

**Validation Rules**:
1. **no-direct-double-cast**: MUST use `as unknown as Type` (not `as Type`)
2. **no-unsafe-db-row-cast**: Database rows MUST null-check before casting
3. **no-unsafe-config-cast**: Config objects MUST cast through `unknown`

**Example Fix**:
```typescript
// BEFORE
const data = result.rows[0] as MyType

// AFTER (auto-fixed)
const row = result.rows[0]
if (!row) throw new Error('Not found')
return row as unknown as MyType
```

**When to Use**:
- Before committing TypeScript changes
- After Phase 8 audit (806 violations found)
- In pre-commit hooks
- During code review

**Time Saved**: 5-10 minutes per violation fixed (based on 806 violations)

**Documentation**: [.claude/skills/type-cast-auditor/README.md](./skills/type-cast-auditor/README.md)

---

### 1.10 permission-auditor

**Purpose**: Audits @cgk-platform/auth permission patterns (requireAuth, checkPermissionOrRespond signatures).

**Invocation**:
```bash
/permission-auditor [--path apps/admin] [--check-missing] [--fix] [--format json]

# Examples
/permission-auditor --path apps/admin
/permission-auditor --check-missing --strict
/permission-auditor --format csv > permissions.csv
```

**Key Features**:
- ✅ Validates `requireAuth()` usage in API routes
- ✅ Checks `checkPermissionOrRespond()` signature (3 args: userId, tenantId, permission)
- ✅ Enforces permission naming convention (resource.action)
- ✅ Detects missing permission checks
- ✅ Auto-fix for signature issues
- ✅ Permission coverage reporting

**Validation Rules**:
1. **require-auth**: All protected routes MUST use `requireAuth()`
2. **correct-signature**: `checkPermissionOrRespond(userId, tenantId, permission)` (3 args)
3. **naming-convention**: Permissions MUST follow `resource.action` format
4. **permission-after-auth**: Protected routes SHOULD check specific permissions

**When to Use**:
- Before deploying security-sensitive features
- During security audits
- In pre-commit hooks (API routes only)
- After refactoring auth code

**Time Saved**: 10-20 minutes per security issue prevented

**Documentation**: [.claude/skills/permission-auditor/README.md](./skills/permission-auditor/README.md)

---

### 1.11 structured-logging-converter

**Purpose**: Converts console.log/error/warn to structured logging (@cgk-platform/logging).

**Invocation**:
```bash
/structured-logging-converter [--path apps/admin] [--convert] [--format json]

# Examples
/structured-logging-converter --path apps/admin
/structured-logging-converter --convert --dry-run
/structured-logging-converter --strict  # Fail on console.* found
```

**Key Features**:
- ✅ Detects all console.log/error/warn/info calls
- ✅ Auto-converts to structured logging (logger.info/error/warn)
- ✅ Adds context metadata (tenantId, userId, requestId)
- ✅ Multiple output formats (text, JSON, CSV)
- ✅ Dry-run mode for previewing
- ✅ Observability integration (DataDog, Vercel Logs)

**Conversion Patterns**:
```typescript
// BEFORE
console.log('Order created:', orderId)
console.error('Failed to create order:', error)

// AFTER (auto-converted)
logger.info('Order created', { orderId })
logger.error('Failed to create order', { error })
```

**When to Use**:
- After Phase 8 audit (707 console calls found)
- Before production deployment
- During observability setup
- In pre-commit hooks (prevent new console calls)

**Time Saved**: 2-5 minutes per log statement (based on 707 conversions)

**Documentation**: [.claude/skills/structured-logging-converter/README.md](./skills/structured-logging-converter/README.md)

---

### 1.12 todo-tracker

**Purpose**: Scans codebase for TODO/FIXME/HACK comments, categorizes by severity, creates GitHub issues.

**Invocation**:
```bash
/todo-tracker <action> [options]

# Actions
/todo-tracker scan [--path apps/admin]
/todo-tracker create-issues [--severity critical,high]
/todo-tracker report [--format json]
/todo-tracker clean [--completed]
```

**Key Features**:
- ✅ Automatic severity categorization (critical/high/medium/low)
- ✅ Keyword-based detection (TODO, FIXME, HACK, XXX, NOTE)
- ✅ GitHub issue creation with labels
- ✅ Module categorization (api, ui, database, auth, etc.)
- ✅ Historical tracking and completion metrics
- ✅ Duplicate detection

**Severity Rules**:
- **Critical**: Keywords: critical, urgent, security, vulnerability
- **High**: Keywords: FIXME, HACK, XXX, bug
- **Medium**: Keywords: TODO, refactor, improve
- **Low**: Keywords: NOTE, optimize, consider

**When to Use**:
- Sprint planning (create issues from TODOs)
- Technical debt tracking
- Before major releases
- Weekly/monthly reports

**Time Saved**: 30-60 minutes per sprint planning session

**Documentation**: [.claude/skills/todo-tracker/README.md](./skills/todo-tracker/README.md)

---

### 1.13 tenant-provisioner

**Purpose**: Automated new tenant provisioning (organization, schema, migrations, admin user, encryption).

**Invocation**:
```bash
/tenant-provisioner <slug> <name> <admin-email> [--dry-run]

# Examples
/tenant-provisioner acme "Acme Corp" admin@acme.com
/tenant-provisioner --dry-run rawdog "RAWDOG" admin@rawdog.com
```

**Key Features**:
- ✅ 6-step automated provisioning workflow
- ✅ Organization record creation in public schema
- ✅ Tenant schema creation and migrations
- ✅ Admin user with magic link authentication
- ✅ Encryption key generation for integrations
- ✅ Rollback on failure
- ✅ Dry-run mode for preview

**Provisioning Steps**:
1. Validate inputs (slug format, email)
2. Create organization record (public.organizations)
3. Create tenant schema (tenant_{slug})
4. Run tenant migrations
5. Create admin user with magic link
6. Generate encryption keys

**When to Use**:
- Onboarding new customers
- Creating demo/sandbox tenants
- Testing multi-tenancy
- Disaster recovery

**Time Saved**: 45-90 minutes per tenant provisioned (manual process)

**Documentation**: [.claude/skills/tenant-provisioner/README.md](./skills/tenant-provisioner/README.md)

---

### 1.14 migration-impact-analyzer

**Purpose**: Analyzes database migration files for impact (table changes, downtime, rollback complexity, type compatibility).

**Invocation**:
```bash
/migration-impact-analyzer <migration-file> [--format json]

# Examples
/migration-impact-analyzer packages/db/migrations/003_add_orders.sql
/migration-impact-analyzer apps/admin/migrations/*.sql
```

**Key Features**:
- ✅ Table impact analysis (CREATE, ALTER, DROP, INDEX)
- ✅ Type compatibility check (UUID vs TEXT mismatches)
- ✅ Idempotency validation (IF NOT EXISTS)
- ✅ Downtime estimation
- ✅ Automatic rollback SQL generation
- ✅ Risk assessment scoring (low/medium/high)

**Validation Checklist**:
1. Affected tables and row counts
2. Operation types (DDL, DML)
3. Index creation (can cause locks)
4. Foreign key constraints
5. Type compatibility (UUID vs TEXT)
6. Idempotency (IF NOT EXISTS, IF EXISTS)

**When to Use**:
- Before running migrations in production
- During migration code review
- Planning maintenance windows
- Generating rollback plans

**Time Saved**: 15-30 minutes per migration review

**Documentation**: [.claude/skills/migration-impact-analyzer/README.md](./skills/migration-impact-analyzer/README.md)

---

### 1.15 vercel-config-auditor

**Purpose**: Audits Vercel environment variables across all 6 apps, validates .env.example consistency, auto-syncs missing vars.

**Invocation**:
```bash
/vercel-config-auditor [--fix] [--format json]

# Examples
/vercel-config-auditor  # Read-only audit
/vercel-config-auditor --fix  # Auto-sync missing vars
/vercel-config-auditor --check-undocumented
```

**Key Features**:
- ✅ Environment variable comparison across 6 apps
- ✅ .env.example validation (all required vars documented)
- ✅ Undocumented var detection
- ✅ Auto-fix mode for syncing missing vars
- ✅ Team scope validation (cgk-linens-88e79683)
- ✅ JSON output for automation

**Validation Checks**:
1. All vars in .env.example exist in Vercel
2. All Vercel vars documented in .env.example
3. Team scope correct (cgk-linens-88e79683)
4. Consistency across environments (production, preview, development)
5. No secrets in .env.example (placeholders only)

**When to Use**:
- Before deploying new apps
- After adding environment variables
- Weekly environment variable audits
- Before onboarding new developers

**Time Saved**: 15-30 minutes per audit (prevent deployment issues)

**Documentation**: [.claude/skills/vercel-config-auditor/README.md](./skills/vercel-config-auditor/README.md)

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

## 3. Agent Definitions (9 Total)

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

### 3.8 build-optimizer (Sonnet 4.5)

**Role**: Build performance optimization and resource efficiency

**Responsibilities**:
- Analyzing build performance bottlenecks
- Optimizing webpack/turbopack configurations
- Reducing bundle sizes and memory usage
- Implementing code splitting strategies
- Configuring build caching
- Resolving OOM (out of memory) errors

**When to Invoke**:
- Build failures due to memory issues
- Slow build times (>5 minutes)
- Bundle size optimization needed
- Production build errors
- Turbopack/webpack configuration issues

**Cost**: $3 input / $15 output per million tokens (Sonnet 4.5)

**Documentation**: [.claude/agents/build-optimizer.md](./agents/build-optimizer.md)

---

### 3.9 security-auditor (Opus 4.5)

**Role**: Security review and vulnerability assessment

**Responsibilities**:
- OWASP Top 10 vulnerability scanning
- Credential exposure detection
- Injection vector analysis (SQL, XSS, command)
- Authentication/authorization review
- Tenant isolation security validation
- Cryptographic implementation review
- Security best practice enforcement

**When to Invoke**:
- Before production deployment (required)
- After implementing auth/payment features
- Security incident response
- Compliance audits (PCI DSS, SOC 2)
- Third-party integration reviews

**Cost**: $15 input / $75 output per million tokens (Opus 4.5)

**Documentation**: [.claude/agents/security-auditor.md](./agents/security-auditor.md)

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

## 8. Quality & Best Practices Documentation

### Code Review & Completion Standards

- [CODE-REVIEW-CHECKLIST.md](./CODE-REVIEW-CHECKLIST.md) - Comprehensive review criteria (blocking vs non-blocking)
- [DEFINITION-OF-DONE.md](./DEFINITION-OF-DONE.md) - Completion criteria for all work

**Integration**: The `reviewer` agent automatically references CODE-REVIEW-CHECKLIST.md during all code reviews. The DEFINITION-OF-DONE.md checklist is included in all session handoff documents.

### Context Management

- [CONTEXT-MGMT.md](./CONTEXT-MGMT.md) - Context window strategies, token budgets, automated warnings
- [SESSION-HANDOFF-TEMPLATE.md](./SESSION-HANDOFF-TEMPLATE.md) - Handoff document template with DoD checklist

**Token Warning Thresholds**:
- **120k tokens**: ⚠️ Early warning - start planning handoff
- **140k tokens**: ⚠️ Urgent - create handoff in next 1-2 turns
- **150k tokens**: 🚨 Critical - MUST create handoff immediately
- **180k tokens**: 🔴 Hard limit - quality degradation begins

---

## 9. Related Documentation

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
