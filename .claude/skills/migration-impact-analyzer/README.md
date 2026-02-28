# Migration Impact Analyzer

> **Purpose**: Pre-migration analysis and risk assessment - validates syntax, estimates downtime, generates rollback SQL, and identifies type compatibility issues.

**Version**: 1.0.0
**Type**: Validator
**Invocation**: `/migration-impact-analyzer [options]`

---

## Overview

The Migration Impact Analyzer is a comprehensive pre-migration validation tool that analyzes SQL migration files before they're applied to production databases. It identifies potential issues, estimates impact on database operations, generates rollback procedures, and provides risk assessments to prevent migration failures and minimize downtime.

**CRITICAL**: Based on Phase 8 audit findings, migration failures caused by type mismatches (UUID vs TEXT), missing IF NOT EXISTS clauses, and locking issues were the most common deployment blockers. This skill catches these issues before they reach production.

---

## Usage

### Basic Usage

```bash
# Analyze specific migration file
/migration-impact-analyzer --migration 025-add-oauth-providers.sql

# Analyze with rollback generation
/migration-impact-analyzer --migration 025-add-oauth-providers.sql --generate-rollback

# Analyze tenant migration
/migration-impact-analyzer --migration tenant-001-create-orders.sql --schema tenant_rawdog

# Skip dry-run (not recommended)
/migration-impact-analyzer --migration 025-add-oauth-providers.sql --dry-run=false
```

### CI/CD Integration

```yaml
# .github/workflows/migration-validation.yml
name: Migration Validation

on:
  pull_request:
    paths:
      - 'packages/db/migrations/**'
      - 'apps/*/migrations/**'

jobs:
  validate-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install

      - name: Analyze Migrations
        run: |
          for migration in $(git diff --name-only origin/main...HEAD | grep '\.sql$'); do
            echo "Analyzing $migration..."
            /migration-impact-analyzer --migration "$migration"
          done
```

### Pre-Migration Script

```bash
# scripts/pre-migrate.sh
#!/bin/bash

MIGRATION=$1

if [ -z "$MIGRATION" ]; then
  echo "Usage: ./pre-migrate.sh <migration-file>"
  exit 1
fi

echo "🔍 Analyzing migration: $MIGRATION"
/migration-impact-analyzer --migration "$MIGRATION"

if [ $? -ne 0 ]; then
  echo "❌ Migration analysis failed - resolve issues before applying"
  exit 1
fi

echo "✅ Migration analysis passed"
read -p "Apply migration? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  pnpm db:migrate
fi
```

---

## Validation Checks

### 1. Table Impact Analysis

**What it checks**:
- Tables affected by CREATE, ALTER, DROP operations
- Estimated row counts (if possible)
- Lock types required (ACCESS EXCLUSIVE, SHARE, etc.)
- Estimated downtime per operation

**Example Output**:
```
📋 Affected Tables:

  • users
    Operation: ALTER
    Estimated Rows: 1,247,893
    Lock Type: ACCESS EXCLUSIVE
    Estimated Downtime: ~12 seconds (based on row count)

  • oauth_providers
    Operation: CREATE
    Lock Type: ACCESS EXCLUSIVE
    Estimated Downtime: < 1 second
```

---

### 2. Operation Counting

**What it checks**:
- CREATE TABLE statements
- ALTER TABLE statements
- DROP TABLE statements
- CREATE INDEX statements

**Example Output**:
```
📊 Impact Analysis:

  Schema: public
  Tables Affected: 3
  Operations:
    - Creates: 2
    - Alters: 1
    - Drops: 0
    - Indexes: 4
```

---

### 3. Type Compatibility Check

**What it checks**:
- Foreign keys referencing public schema (UUID vs TEXT)
- Type mismatches in REFERENCES clauses
- Known problem patterns from Phase 8 audit

**Example Output**:
```
⚠️  Type Compatibility Issues:

  • users.id
    Issue: Foreign key to users.id must use UUID type
    Suggestion: Ensure column type is UUID, not TEXT

  • organizations.id
    Issue: Foreign key to organizations.id must use UUID type
    Suggestion: Ensure column type is UUID, not TEXT
```

**Why this matters**:
```sql
-- WRONG - TEXT doesn't match UUID
user_id TEXT REFERENCES public.users(id)

-- CORRECT - Types must match
user_id UUID REFERENCES public.users(id)
```

---

### 4. Idempotency Check

**What it checks**:
- CREATE TABLE has IF NOT EXISTS
- CREATE INDEX has IF NOT EXISTS
- DROP TABLE has IF EXISTS

**Example Output**:
```
⚠️  Migration is NOT idempotent

  Missing IF NOT EXISTS clauses on:
    - CREATE TABLE oauth_providers
    - CREATE INDEX idx_oauth_providers_user_id
```

**Why this matters**: Non-idempotent migrations fail if run twice, making rollback and retry difficult.

---

### 5. Rollback SQL Generation

**What it does**: Automatically generates rollback SQL for reversing migration

**Example Output**:
```
🔄 Generating Rollback SQL:

────────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS oauth_providers CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
-- Manual rollback required for ALTER TABLE users
────────────────────────────────────────────────────────────────────────────────
```

**Limitations**:
- CREATE TABLE → DROP TABLE (auto-generated)
- DROP TABLE → Cannot auto-rollback (restore from backup)
- ALTER TABLE → Manual rollback required

---

### 6. Risk Assessment

**Risk levels**: Low, Medium, High

**Risk factors**:
- DROP operations (+10 risk)
- Non-idempotent (+5 risk)
- Type issues (+8 risk)
- Table locks (+3 risk)

**Example Output**:
```
⚠️  Risk Level: MEDIUM

⚠️  Warnings:
  • Migration is not idempotent - cannot be safely re-run
  • 1 type compatibility issue(s) detected
  • 1 operation(s) will lock tables

📝 Recommendations:

  ✓ Add IF NOT EXISTS / IF EXISTS clauses
  ✓ Fix type mismatches before deploying
  ✓ Run during low-traffic window
  ✓ Test on staging environment first
```

---

## Analysis Output

### Success (Low Risk)

```
🔍 Migration Impact Analyzer

📄 Analyzing: packages/db/migrations/025-add-oauth-providers.sql

📊 Impact Analysis:

  Schema: public
  Tables Affected: 2
  Operations:
    - Creates: 2
    - Alters: 0
    - Drops: 0
    - Indexes: 3

📋 Affected Tables:

  • oauth_providers
    Operation: CREATE
    Lock Type: ACCESS EXCLUSIVE
    Estimated Downtime: < 1 second

  • user_sessions
    Operation: CREATE
    Lock Type: ACCESS EXCLUSIVE
    Estimated Downtime: < 1 second

✅ Migration is idempotent

🔄 Generating Rollback SQL:

────────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS oauth_providers CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
────────────────────────────────────────────────────────────────────────────────

⚠️  Risk Level: LOW

📝 Recommendations:

  ✓ Test on staging environment first

🔍 Dry-run complete. Run with --dry-run=false to apply migration.
```

---

### Failure (High Risk)

```
🔍 Migration Impact Analyzer

📄 Analyzing: packages/db/migrations/026-add-foreign-keys.sql

📊 Impact Analysis:

  Schema: tenant_rawdog
  Tables Affected: 3
  Operations:
    - Creates: 0
    - Alters: 3
    - Drops: 1
    - Indexes: 0

📋 Affected Tables:

  • orders
    Operation: ALTER
    Estimated Rows: 45,789
    Lock Type: ACCESS EXCLUSIVE
    Estimated Downtime: ~4 seconds

  • customers
    Operation: ALTER
    Estimated Rows: 12,345
    Lock Type: ACCESS EXCLUSIVE
    Estimated Downtime: ~1 second

  • old_orders_archive
    Operation: DROP
    Lock Type: ACCESS EXCLUSIVE
    Estimated Downtime: < 1 second

⚠️  Type Compatibility Issues:

  • users.id
    Issue: Foreign key to users.id must use UUID type
    Suggestion: Ensure column type is UUID, not TEXT

⚠️  Migration is NOT idempotent

  Missing IF NOT EXISTS clauses on:
    - ALTER TABLE orders
    - ALTER TABLE customers

🔄 Generating Rollback SQL:

────────────────────────────────────────────────────────────────────────────────
-- Cannot auto-rollback DROP TABLE - restore from backup
-- Manual rollback required for ALTER TABLE orders
-- Manual rollback required for ALTER TABLE customers
────────────────────────────────────────────────────────────────────────────────

⚠️  Risk Level: HIGH

⚠️  Warnings:
  • Migration includes DROP operations - data loss risk
  • Migration is not idempotent - cannot be safely re-run
  • 1 type compatibility issue(s) detected
  • 3 operation(s) will lock tables

📝 Recommendations:

  ✓ Backup database before running migration
  ✓ Add IF NOT EXISTS / IF EXISTS clauses
  ✓ Fix type mismatches before deploying
  ✓ Run during low-traffic window
```

---

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--migration <file>` | Migration file to analyze (required) | - |
| `--schema <name>` | Schema to analyze (public or tenant_*) | `public` |
| `--dry-run` | Preview analysis without applying | `true` |
| `--generate-rollback` | Generate rollback SQL | `true` |

---

## Integration

### With Other Skills

**Pre-provisioning workflow**:
```bash
# 1. Analyze migration impact
/migration-impact-analyzer --migration 001-create-tenant-tables.sql

# 2. If low risk, provision tenant
/tenant-provisioner --slug acme --name "Acme Corp" --admin-email admin@acme.com

# 3. Verify deployment readiness
/deployment-readiness-checker --app admin
```

**Pre-deployment workflow**:
```bash
# 1. Analyze all pending migrations
for migration in packages/db/migrations/*.sql; do
  /migration-impact-analyzer --migration "$migration"
done

# 2. Check deployment readiness
/deployment-readiness-checker

# 3. Deploy
vercel deploy --prod
```

---

### Pre-Commit Hook (Migration Validation)

```bash
#!/bin/sh
# .husky/pre-commit

# Check staged migration files
staged_migrations=$(git diff --cached --name-only --diff-filter=ACM | grep '\.sql$')

if [ -n "$staged_migrations" ]; then
  echo "🔍 Validating migrations..."

  for migration in $staged_migrations; do
    /migration-impact-analyzer --migration "$migration"

    if [ $? -ne 0 ]; then
      echo "❌ Migration validation failed: $migration"
      exit 1
    fi
  done

  echo "✅ All migrations validated"
fi
```

---

### CI/CD Pattern (GitHub Actions)

```yaml
name: Migration Validation

on:
  pull_request:
    paths:
      - '**/*.sql'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install

      - name: Analyze Migrations
        id: analyze
        run: |
          changed_migrations=$(git diff --name-only origin/main...HEAD | grep '\.sql$' || true)

          if [ -z "$changed_migrations" ]; then
            echo "No migrations changed"
            exit 0
          fi

          for migration in $changed_migrations; do
            echo "Analyzing $migration..."
            /migration-impact-analyzer --migration "$migration" --format json > "${migration}.analysis.json"
          done

      - name: Check Risk Level
        run: |
          for analysis in **/*.analysis.json; do
            risk=$(jq -r '.risk.level' "$analysis")

            if [ "$risk" = "high" ]; then
              echo "❌ High-risk migration detected: $analysis"
              exit 1
            fi
          done

      - name: Upload Analysis Reports
        uses: actions/upload-artifact@v3
        with:
          name: migration-analysis
          path: '**/*.analysis.json'
```

---

## Examples

### Example 1: Safe CREATE TABLE Migration

```bash
/migration-impact-analyzer --migration 025-add-oauth-providers.sql
```

**Output**: See [Success (Low Risk)](#success-low-risk) section

---

### Example 2: Risky ALTER TABLE Migration

```bash
/migration-impact-analyzer --migration 026-add-foreign-keys.sql
```

**Output**: See [Failure (High Risk)](#failure-high-risk) section

---

### Example 3: Tenant Schema Migration

```bash
/migration-impact-analyzer --migration tenant-001-create-orders.sql --schema tenant_rawdog
```

**Output**:
```
🔍 Migration Impact Analyzer

📄 Analyzing: migrations/tenant-001-create-orders.sql

📊 Impact Analysis:

  Schema: tenant_rawdog
  Tables Affected: 1
  Operations:
    - Creates: 1
    - Alters: 0
    - Drops: 0
    - Indexes: 2

📋 Affected Tables:

  • orders
    Operation: CREATE
    Lock Type: ACCESS EXCLUSIVE
    Estimated Downtime: < 1 second

✅ Migration is idempotent

⚠️  Risk Level: LOW

📝 Recommendations:

  ✓ Test on staging environment first
```

---

### Example 4: Migration with Type Issues

```bash
/migration-impact-analyzer --migration 027-add-user-references.sql
```

**Output**:
```
🔍 Migration Impact Analyzer

📄 Analyzing: migrations/027-add-user-references.sql

⚠️  Type Compatibility Issues:

  • users.id
    Issue: Foreign key to users.id must use UUID type
    Suggestion: Ensure column type is UUID, not TEXT

⚠️  Risk Level: MEDIUM

⚠️  Warnings:
  • 1 type compatibility issue(s) detected

📝 Recommendations:

  ✓ Fix type mismatches before deploying
  ✓ Test on staging environment first
```

**Fix**:
```sql
-- BEFORE (wrong)
ALTER TABLE tenant_rawdog.creators
ADD COLUMN user_id TEXT REFERENCES public.users(id);

-- AFTER (correct)
ALTER TABLE tenant_rawdog.creators
ADD COLUMN user_id UUID REFERENCES public.users(id);
```

---

## Troubleshooting

### Issue: "Migration file not found"

**Cause**: Migration file path incorrect or file doesn't exist

**Fix**: Use correct file path
```bash
# Check migration file location
ls packages/db/migrations/

# Use correct path
/migration-impact-analyzer --migration packages/db/migrations/025-add-oauth-providers.sql

# Or just filename (skill searches common paths)
/migration-impact-analyzer --migration 025-add-oauth-providers.sql
```

---

### Issue: Type issues not detected

**Cause**: Foreign key syntax not recognized

**Fix**: Use standard REFERENCES syntax
```sql
-- Detected
user_id UUID REFERENCES public.users(id)
organization_id UUID REFERENCES public.organizations(id)

-- Not detected (non-standard)
user_id UUID,
CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id)
```

---

### Issue: Estimated downtime inaccurate

**Cause**: Row count estimation based on heuristics, not actual table data

**Fix**: Test migration on staging with production-like data
```bash
# 1. Clone production to staging
pg_dump production | psql staging

# 2. Test migration on staging
psql staging < migration.sql

# 3. Measure actual time
time psql staging < migration.sql
```

---

### Issue: Rollback SQL incomplete

**Cause**: ALTER TABLE changes can't be auto-reversed

**Fix**: Write manual rollback SQL
```sql
-- Migration: Add column
ALTER TABLE users ADD COLUMN phone TEXT;

-- Rollback (manual)
ALTER TABLE users DROP COLUMN IF EXISTS phone;
```

---

## Related Documentation

- **CLAUDE.md**: [Schema Layout & ID Types](/CLAUDE.md#schema-layout--id-types-critical-for-migrations)
- **CLAUDE.md**: [Common Migration Pitfalls](/CLAUDE.md#common-migration-pitfalls)
- **Migration Guide**: `packages/db/migrations/README.md`
- **Phase 0B Database Setup**: `/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-0B-DATABASE-SETUP-UX.md`
- **Related Skills**:
  - [deployment-readiness-checker](../deployment-readiness-checker/README.md) - Pre-deployment validation
  - [tenant-provisioner](../tenant-provisioner/README.md) - Automated tenant setup
  - [vercel-config-auditor](../vercel-config-auditor/README.md) - Environment validation

---

## Risk Assessment Details

### Risk Score Calculation

```typescript
let riskScore = 0

// DROP operations (+10)
if (analysis.operations.drops > 0) riskScore += 10

// Non-idempotent (+5)
if (!analysis.idempotent) riskScore += 5

// Type issues (+8)
if (analysis.typeIssues.length > 0) riskScore += 8

// Table locks (+3)
if (lockingOps.length > 0) riskScore += 3

// Determine level
let level = 'low'
if (riskScore >= 10) level = 'high'
else if (riskScore >= 5) level = 'medium'
```

---

### Risk Level Guidelines

| Level | Score | Impact | Approval Required |
|-------|-------|--------|-------------------|
| **Low** | 0-4 | Minimal downtime, reversible | Developer |
| **Medium** | 5-9 | Some downtime, manual rollback | Tech Lead |
| **High** | 10+ | Significant downtime, data loss risk | CTO + Backup |

---

## Performance

**Analysis Time** (Phase 8 benchmark):

| Migration Size | Lines of SQL | Analysis Time |
|----------------|--------------|---------------|
| Small | 1-50 | < 100ms |
| Medium | 50-200 | 100-300ms |
| Large | 200-1000 | 300-800ms |
| Very Large | 1000+ | 1-2s |

**No database queries required** - all analysis is static SQL parsing.

---

## Changelog

### Version 1.0.0 (2026-02-27)
- Initial release
- Table impact analysis (CREATE, ALTER, DROP, INDEX)
- Operation counting and categorization
- Type compatibility check (UUID vs TEXT)
- Idempotency validation (IF NOT EXISTS / IF EXISTS)
- Automatic rollback SQL generation
- Risk assessment with scoring system
- Pre-commit and CI/CD integration examples
- Dry-run mode (default)
- Support for public and tenant schema migrations
