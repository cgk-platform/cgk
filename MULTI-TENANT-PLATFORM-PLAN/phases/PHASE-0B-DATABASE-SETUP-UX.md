# PHASE-0B: Database Setup UX

> **STATUS**: ✅ COMPLETE (2026-02-13)

> **STATUS**: Not Started
> **Target Start**: Anytime (no dependencies, can run in parallel with other work)

**Duration**: 3-4 days
**Depends On**: None (foundational improvement)
**Parallel With**: ANY phase - can run independently
**Blocks**: None (UX improvement phase)
**Priority**: HIGH (affects all new users installing the platform)

---

## Overview

Make database setup simple, foolproof, and well-documented for first-time users installing the CGK codebase. Currently, database setup requires multiple manual steps, understanding of schema-per-tenant architecture, and troubleshooting cryptic PostgreSQL errors. This phase creates a seamless one-command experience.

### Problem Statement

Current pain points for new users:
1. No single command to initialize everything
2. Migration errors are cryptic and don't suggest fixes
3. No validation that setup is complete and correct
4. Documentation scattered across multiple files
5. No dry-run mode to preview changes
6. Missing linting to catch migration syntax errors before commit

### Vision

```bash
# From fresh clone to working database in one command

> **STATUS**: ✅ COMPLETE (2026-02-13)
git clone https://github.com/cgk/cgk-platform
cd cgk-platform
pnpm install
npx @cgk-platform/cli init

# Output:
# Checking environment...
#   DATABASE_URL: Found in .env.local
#   PostgreSQL: Connected (Neon)
#
# Creating schemas...
#   public schema: Ready
#   migration_logs table: Created
#
# Running migrations...
#   001_create_organizations: Applied
#   002_create_users: Applied
#   ... (15 more)
#
# Verifying setup...
#   All tables created: 23/23
#   Tenant isolation: Verified
#   Health check: PASSED
#
# Setup complete! Run `pnpm dev` to start.
```

---

## Goals

1. **One-command database initialization** - `cgk init` handles everything
2. **Interactive setup wizard** - Prompts for missing config with smart defaults
3. **Automatic schema creation and migrations** - No manual SQL required
4. **Health checks and validation** - Verify setup is correct and complete
5. **Clear documentation** - README, CLAUDE.md, and inline comments

---

## Success Criteria

- [ ] `npx @cgk-platform/cli init` works from fresh clone with zero errors
- [ ] `cgk doctor` catches and explains all common setup issues
- [ ] `cgk migrate --dry-run` shows exactly what will change
- [ ] All migrations pass without syntax errors
- [ ] Documentation is complete and accurate
- [ ] CLAUDE.md includes rules for maintaining migrations
- [ ] Pre-commit hook validates migration SQL

---

## Deliverables

### CLI Commands

| Command | Description |
|---------|-------------|
| `cgk init` | Full initialization (env check, migrations, verification) |
| `cgk doctor` | Diagnose setup issues with actionable fixes |
| `cgk migrate` | Run pending migrations |
| `cgk migrate --status` | Show migration status table |
| `cgk migrate --dry-run` | Preview migrations without applying |
| `cgk migrate --rollback` | Rollback last migration batch |

### Validation Checks

| Check | What It Validates |
|-------|-------------------|
| DATABASE_URL present | Environment variable exists |
| DATABASE_URL format | Valid PostgreSQL connection string |
| Database reachable | Can connect to PostgreSQL |
| Migrations table exists | `migration_logs` table present |
| All migrations applied | No pending migrations |
| Required tables exist | All expected tables created |
| Tenant isolation works | `withTenant()` properly switches schema |
| Extension dependencies | Required PostgreSQL extensions installed |

---

## Tasks

### 1. CLI Improvements

- [ ] Add `cgk init` command that:
  - Checks for DATABASE_URL in env files and Vercel
  - Prompts for missing configuration interactively
  - Creates public schema tables
  - Runs all migrations in order
  - Verifies setup with health checks
  - Provides clear success/failure summary

- [ ] Enhance `cgk doctor` command to:
  - Check all env vars needed for database
  - Test database connectivity
  - Verify migration status
  - Check schema-per-tenant setup
  - Suggest specific fixes for each issue found

- [ ] Enhance `cgk migrate` command with:
  - `--status` flag showing migration table
  - `--dry-run` flag previewing changes
  - `--rollback` flag for last batch
  - Better error messages with SQL context
  - Progress indicators for long migrations

- [ ] Add better error messages:
  - Show failing SQL with line numbers
  - Suggest specific fixes for common errors
  - Link to relevant documentation
  - Include "Did you mean?" suggestions

### 2. Setup Wizard Enhancements

- [ ] Auto-detect DATABASE_URL from:
  - `.env.local` in all app directories
  - `.env` files
  - Vercel environment (via `vercel env pull`)
  - Environment variables already set

- [ ] Interactive prompts for missing config:
  - Offer to create Neon database if none exists
  - Generate DATABASE_URL from components
  - Validate format before proceeding
  - Save to correct env file

- [ ] Progress indicators:
  - Spinner for long operations
  - Step-by-step progress (e.g., "Step 3/7: Running migrations")
  - Time estimates for large migrations
  - Clear success/failure markers

- [ ] Setup summary showing:
  - Tables created with row counts
  - Schemas created (public, tenant schemas)
  - Extensions installed
  - Next steps (run `pnpm dev`)

### 3. Migration System

- [ ] Audit and fix all existing migration syntax errors:
  - Run each migration in dry-run mode
  - Fix SQL syntax issues
  - Ensure idempotency (can run multiple times)
  - Add proper error handling

- [ ] Add migration linting/validation:
  - Check SQL syntax before allowing commit
  - Verify table/column naming conventions
  - Ensure tenant isolation patterns followed
  - Check for dangerous operations (DROP without IF EXISTS)

- [ ] Add migration dry-run mode:
  - Parse SQL without executing
  - Show tables/columns that will be created/modified
  - Estimate execution time
  - Warn about potentially slow operations

- [ ] Add migration status dashboard:
  - Table showing all migrations
  - Status: Applied, Pending, Failed
  - Timestamp of application
  - Batch number for rollback groups

### 4. Documentation Requirements (CRITICAL)

- [ ] Update `/README.md`:
  - Add "Quick Start" section with database setup
  - Include prerequisites (Node.js, pnpm, PostgreSQL)
  - Show one-command setup flow
  - Link to detailed docs for troubleshooting

- [ ] Update `/CLAUDE.md`:
  - Add "Database Setup Patterns" section
  - Add "How to Add New Migrations" guide
  - Add rule: "When adding migrations, run `cgk migrate --dry-run` to validate"
  - Add "Common Migration Errors" troubleshooting guide

- [ ] Update `/packages/db/CLAUDE.md`:
  - Document schema-per-tenant architecture
  - Explain migration file naming conventions
  - Show how to test migrations locally
  - Include rollback procedures

- [ ] Create `/packages/db/README.md`:
  - Comprehensive migration guide
  - Database architecture overview
  - Local development setup
  - Troubleshooting common issues
  - Performance considerations

- [ ] Add inline comments in migration files:
  - Explain what each migration does
  - Document any special considerations
  - Include rollback SQL when applicable
  - Note dependencies on other migrations

### 5. Automated Checks

- [ ] Add pre-commit hook:
  - Validate SQL syntax in migration files
  - Check for proper naming conventions
  - Ensure migrations are sequential
  - Run `cgk migrate --dry-run` on changed files

- [ ] Add CI check:
  - Set up test database in CI
  - Run all migrations from scratch
  - Verify tables created correctly
  - Run `cgk doctor` to validate setup

- [ ] Generate TypeScript types from schema:
  - Use @vercel/postgres schema introspection
  - Auto-generate type definitions
  - Keep types in sync with migrations
  - Include in build process

---

## Documentation Deliverables

The agent implementing this phase MUST update:

| File | Updates Required |
|------|------------------|
| `/README.md` | Add "Database Setup" section with quick start |
| `/CLAUDE.md` | Add migration rules, patterns, troubleshooting |
| `/packages/db/CLAUDE.md` | Comprehensive setup and migration guide |
| `/packages/db/README.md` | Create full documentation |
| `/packages/cli/README.md` | Document all database commands |
| Migration files | Add inline comments explaining purpose |

---

## Definition of Done

- [ ] `npx @cgk-platform/cli init` works from fresh clone
- [ ] `cgk doctor` identifies and explains all setup issues
- [ ] `cgk migrate --dry-run` shows accurate preview
- [ ] `cgk migrate --status` shows clear migration table
- [ ] All existing migrations pass without errors
- [ ] Pre-commit hook validates migration SQL
- [ ] CI check runs migrations successfully
- [ ] `/README.md` has database quick start section
- [ ] `/CLAUDE.md` has migration rules and patterns
- [ ] `/packages/db/README.md` is comprehensive
- [ ] TypeScript types generated from schema
- [ ] `npx tsc --noEmit` passes

---

## Notes for AI Agents

### Implementation Priority

1. **Start with `cgk doctor`** - This helps identify current issues
2. **Fix existing migrations** - Ensure clean slate for new users
3. **Build `cgk init`** - Orchestrates the setup flow
4. **Add documentation** - While implementation is fresh in mind
5. **Add pre-commit hooks** - Prevent future issues

### Key Patterns

```typescript
// Use ora for spinners
import ora from 'ora'

const spinner = ora('Running migrations...').start()
try {
  await runMigrations()
  spinner.succeed('Migrations complete')
} catch (error) {
  spinner.fail('Migration failed')
  console.error(formatMigrationError(error))
}

// Use prompts for interactive input
import prompts from 'prompts'

const response = await prompts({
  type: 'text',
  name: 'databaseUrl',
  message: 'Enter your DATABASE_URL:',
  validate: value => validatePostgresUrl(value) || 'Invalid PostgreSQL URL'
})

// Dry-run mode pattern
async function runMigration(sql: string, options: { dryRun?: boolean }) {
  if (options.dryRun) {
    console.log('Would execute:')
    console.log(sql)
    return { applied: false, preview: true }
  }
  return await sql`${sql}`
}
```

### Error Message Format

```
Error: Migration 005_create_orders failed

SQL (line 12):
  CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),  -- Error here
    ...

Problem: Table 'customers' does not exist

Fix: Run migration 004_create_customers first, or check migration order.

Documentation: https://cgk.dev/docs/migrations#dependencies
```

### Testing Checklist

Before marking complete:

- [ ] Test from fresh clone (no existing database)
- [ ] Test with existing database (upgrade path)
- [ ] Test with missing env vars
- [ ] Test with invalid DATABASE_URL
- [ ] Test migration dry-run accuracy
- [ ] Test rollback functionality
- [ ] Test pre-commit hook catches errors
- [ ] Test CI workflow passes
- [ ] Verify documentation is accurate

---

## Lessons Learned from Migration Debugging (February 2026)

This section documents actual errors encountered when running all migrations and their fixes. **USE THIS AS A CHECKLIST when writing new migrations.**

### Error Categories Encountered

#### 1. Type Mismatches Between Tables (MOST COMMON)

**Symptom**: `foreign key constraint cannot be implemented`

**Root Cause**: Foreign key column type doesn't match referenced primary key type.

| Table | ID Column Type | WRONG Reference | CORRECT Reference |
|-------|---------------|-----------------|-------------------|
| `public.users` | UUID | `user_id TEXT REFERENCES public.users(id)` | `user_id UUID REFERENCES public.users(id)` |
| `public.organizations` | UUID | `org_id TEXT REFERENCES public.organizations(id)` | `org_id UUID REFERENCES public.organizations(id)` |
| `tenant.creators` | TEXT | `creator_id UUID REFERENCES creators(id)` | `creator_id TEXT REFERENCES creators(id)` |
| `tenant.ai_agents` | TEXT | `agent_id UUID REFERENCES ai_agents(id)` | `agent_id TEXT REFERENCES ai_agents(id)` |
| `tenant.videos` | TEXT | `video_id UUID REFERENCES videos(id)` | `video_id TEXT REFERENCES videos(id)` |
| `tenant.projects` | UUID | `project_id TEXT REFERENCES projects(id)` | `project_id UUID REFERENCES projects(id)` |
| `tenant.orders` | TEXT | `order_id UUID REFERENCES orders(id)` | `order_id TEXT REFERENCES orders(id)` |

**Fix Pattern**:
```sql
-- Before referencing a table, check its ID type:
-- \d table_name  (in psql)

-- WRONG - Assume TEXT
user_id TEXT REFERENCES public.users(id)

-- CORRECT - Match actual type (UUID)
user_id UUID REFERENCES public.users(id)
```

#### 2. Duplicate Object Errors

**Symptom**: `relation "idx_name" already exists`, `trigger already exists`, `type already exists`

**Root Cause**: Missing `IF NOT EXISTS` or `DROP ... IF EXISTS`

**Fix Patterns**:
```sql
-- WRONG
CREATE INDEX idx_foo ON table(column);
CREATE TYPE my_enum AS ENUM ('a', 'b');
CREATE TRIGGER my_trigger ...;

-- CORRECT
CREATE INDEX IF NOT EXISTS idx_foo ON table(column);

DO $$ BEGIN
  CREATE TYPE my_enum AS ENUM ('a', 'b');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS my_trigger ON table;
CREATE TRIGGER my_trigger ...;
```

#### 3. Missing Functions in Tenant Schema

**Symptom**: `function update_updated_at_column() does not exist`

**Root Cause**: Functions defined in public schema aren't in tenant search_path

**Fix Pattern**:
```sql
-- WRONG - function not found
EXECUTE FUNCTION update_updated_at_column();

-- CORRECT - fully qualify with schema
EXECUTE FUNCTION public.update_updated_at_column();
```

#### 4. pgvector Extension Not in Search Path

**Symptom**: `type "vector" does not exist`

**Root Cause**: pgvector extension installed in public schema, but tenant schema search_path doesn't include it

**Fix Pattern**:
```sql
-- WRONG
embedding vector(1536),
USING hnsw (embedding vector_cosine_ops)

-- CORRECT - use public schema qualifier
embedding public.vector(1536),
USING hnsw (embedding public.vector_cosine_ops)
```

#### 5. Column Name Mismatches

**Symptom**: `column "X" does not exist`

**Root Cause**: Migration references column names that don't match actual schema

**Actual vs Expected (examples)**:
| Expected | Actual |
|----------|--------|
| `orders.email` | `orders.customer_email` |
| `orders.total_price_cents` | `orders.total_cents` |
| `orders.source_name` | `orders.utm_source` |
| `treasury.request_id` | `treasury.treasury_request_id` |
| `receipts.expense_id` | `receipts.linked_expense_id` |

**Fix Pattern**:
```sql
-- Before writing queries, check actual columns:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'tenant_rawdog' AND table_name = 'orders';
```

#### 6. Invalid Enum Values

**Symptom**: `invalid input value for enum X: "Y"`

**Root Cause**: Using enum value that doesn't exist in the enum type

**Example**:
```sql
-- Check existing values first:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'creator_status'::regtype;
-- Returns: pending, approved, active, paused, terminated

-- WRONG - 'onboarding' doesn't exist
WHERE status IN ('approved', 'onboarding')

-- CORRECT - use actual enum values
WHERE status IN ('approved', 'pending')
```

### Pre-Flight Checklist for New Migrations

Before committing a new migration, verify:

- [ ] All `CREATE INDEX` statements have `IF NOT EXISTS`
- [ ] All `CREATE TYPE` statements wrapped in `DO $$ ... EXCEPTION` block
- [ ] All `CREATE TRIGGER` preceded by `DROP TRIGGER IF EXISTS`
- [ ] All foreign keys match the referenced column's type exactly
- [ ] All function calls in tenant schema use `public.` prefix
- [ ] All pgvector types use `public.vector()` not `vector()`
- [ ] All enum values exist (check with `pg_enum` query)
- [ ] All column references match actual schema (check with `\d table_name`)

### Recommended: Run Migrations in Test Tenant First

```bash
# Before deploying, test migrations against a fresh tenant
export DATABASE_URL="..."
psql -c "CREATE SCHEMA IF NOT EXISTS tenant_test_migration"
# Run your migration file
psql -c "DROP SCHEMA tenant_test_migration CASCADE"
```

---

## Pattern References

**Skills to invoke:**
- Context7 MCP: "PostgreSQL migration patterns" - Best practices
- Context7 MCP: "CLI UX patterns" - User-friendly commands

**RAWDOG code to reference:**
- `packages/cli/src/commands/` - Existing CLI command structure
- `packages/db/src/migrations/` - Current migration files
- `packages/db/src/index.ts` - Database connection patterns

**Spec documents:**
- `PLATFORM-SETUP-SPEC-*.md` - First-run wizard patterns
- `TENANT-ISOLATION.md` - Schema-per-tenant rules

---

## Dependencies

### Required Packages

```json
{
  "dependencies": {
    "ora": "^8.0.1",
    "prompts": "^2.4.2",
    "chalk": "^5.3.0",
    "cli-table3": "^0.6.3"
  }
}
```

### Environment Requirements

- Node.js >= 22 LTS
- pnpm >= 10.x
- PostgreSQL >= 15 (Neon recommended)
- Vercel CLI (optional, for env sync)
