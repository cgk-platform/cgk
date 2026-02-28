# Type Cast Auditor

> **Purpose**: Validates and auto-fixes TypeScript type casting patterns to enforce single-cast standard, eliminating double casts through `unknown`.

**Version**: 1.0.0
**Type**: Validator
**Invocation**: `/type-cast-auditor [options]`

---

## Overview

The Type Cast Auditor is a code quality validator that scans TypeScript files for incorrect type casting patterns. It enforces the CLAUDE.md standard of **single casts through `unknown`** instead of direct double casts, improving type safety and code readability.

**CRITICAL**: Based on Phase 8 audit findings, the CGK codebase had **806 type cast violations** across 127 files. This skill was created to systematically fix these violations and prevent future occurrences.

---

## Usage

### Basic Usage

```bash
# Scan current directory
/type-cast-auditor

# Scan specific directory
/type-cast-auditor --path apps/admin

# Auto-fix violations
/type-cast-auditor --fix

# Scan and generate report
/type-cast-auditor --path packages/db --format json > type-casts.json
```

### CI/CD Integration

```yaml
# .github/workflows/type-safety.yml
name: Type Safety Audit

on:
  pull_request:
    branches: [main]

jobs:
  type-cast-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - name: Type Cast Audit
        run: /type-cast-auditor --strict
```

### Pre-Commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Scan staged TypeScript files for type cast violations
staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep '\.tsx\?$')

if [ -n "$staged_files" ]; then
  /type-cast-auditor --files "$staged_files" --strict
  if [ $? -ne 0 ]; then
    echo "❌ Type cast violations found. Run '/type-cast-auditor --fix' to auto-fix."
    exit 1
  fi
fi
```

---

## Validation Rules

### Rule 1: No Direct Double Casts

**Pattern to detect**:
```typescript
// WRONG - Direct double cast (violates CLAUDE.md)
const data = result.rows[0] as Record<string, unknown> as MyType
const config = JSON.parse(str) as SomeConfig
const value = getValue() as SpecificType
```

**Correct pattern** (enforced):
```typescript
// CORRECT - Single cast through unknown
const data = result.rows[0] as unknown as MyType
const config = JSON.parse(str) as unknown as SomeConfig
const value = getValue() as unknown as SpecificType
```

**Why**: TypeScript's type system is designed to be sound. Double casts without `unknown` can bypass type checking entirely and hide bugs. Casting through `unknown` makes the unsafe operation explicit.

---

### Rule 2: Database Row Casting Pattern

**Pattern to detect**:
```typescript
// WRONG - Direct cast from QueryResultRow
return toCamelCase(result.rows[0]) as MyType
return result.rows[0] as SomeType
```

**Correct pattern**:
```typescript
// CORRECT - Cast to Record, then through unknown
const row = result.rows[0]
if (!row) throw new Error('Not found')
return toCamelCase(row as Record<string, unknown>) as unknown as MyType
```

**Why**: `QueryResultRow` from `@vercel/postgres` is `Record<string, any>`, which needs explicit type assertion. Going through `unknown` forces you to think about the type conversion.

---

### Rule 3: Config Object Casting

**Pattern to detect**:
```typescript
// WRONG - Direct cast from any/unknown
const config = action.config as ScheduleFollowupConfig
const settings = JSON.parse(data) as Settings
```

**Correct pattern**:
```typescript
// CORRECT - Through unknown
const config = action.config as unknown as ScheduleFollowupConfig
const settings = JSON.parse(data) as unknown as Settings
```

---

## Auto-Fix Behavior

When run with `--fix`, the auditor automatically transforms violations:

### Example 1: Simple Double Cast

**Before**:
```typescript
const user = data as User
```

**After**:
```typescript
const user = data as unknown as User
```

---

### Example 2: Database Row Cast

**Before**:
```typescript
return toCamelCase(result.rows[0]) as MyType
```

**After**:
```typescript
const row = result.rows[0]
if (!row) throw new Error('Record not found')
return toCamelCase(row as Record<string, unknown>) as unknown as MyType
```

---

### Example 3: Nested Casts

**Before**:
```typescript
const items = data.map(item => item as ProcessedItem)
```

**After**:
```typescript
const items = data.map(item => item as unknown as ProcessedItem)
```

---

## Output Format

### Text Report (Default)

```bash
🔍 Type Cast Audit Report
========================

Scanned: 127 files
Violations: 806

By File:
  apps/admin/app/api/orders/route.ts: 24 violations
  packages/db/src/client.ts: 18 violations
  packages/commerce/src/shopify/client.ts: 15 violations
  ...

By Pattern:
  Direct double cast: 512
  Database row cast: 189
  Config object cast: 105

Severity:
  🔴 Critical: 512 (direct double casts)
  🟡 Warning: 294 (missing unknown intermediate)

Run with --fix to auto-fix all violations.
```

---

### JSON Report

```bash
/type-cast-auditor --format json
```

**Output**:
```json
{
  "summary": {
    "filesScanned": 127,
    "violationsFound": 806,
    "criticalCount": 512,
    "warningCount": 294
  },
  "violations": [
    {
      "file": "apps/admin/app/api/orders/route.ts",
      "line": 42,
      "column": 15,
      "pattern": "direct-double-cast",
      "severity": "critical",
      "code": "const data = result.rows[0] as MyType",
      "suggestion": "const row = result.rows[0]\nif (!row) throw new Error('Not found')\nreturn row as unknown as MyType"
    }
  ],
  "byPattern": {
    "direct-double-cast": 512,
    "database-row-cast": 189,
    "config-object-cast": 105
  }
}
```

---

### CSV Report

```bash
/type-cast-auditor --format csv > violations.csv
```

**Output**:
```csv
File,Line,Column,Pattern,Severity,Code,Suggestion
apps/admin/app/api/orders/route.ts,42,15,direct-double-cast,critical,"const data = result.rows[0] as MyType","const row = result.rows[0]; if (!row) throw new Error('Not found'); return row as unknown as MyType"
packages/db/src/client.ts,78,22,database-row-cast,warning,"return result.rows[0] as User","const row = result.rows[0]; return row as unknown as User"
```

---

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--path <dir>` | Directory to scan | Current directory |
| `--files <glob>` | Specific files to scan (comma-separated) | `**/*.ts,**/*.tsx` |
| `--fix` | Auto-fix violations | `false` |
| `--format <type>` | Output format: text, json, csv | `text` |
| `--strict` | Exit with error code if violations found | `false` |
| `--exclude <patterns>` | Exclude patterns (comma-separated) | `node_modules,dist,.next` |
| `--dry-run` | Show what would be fixed without applying | `false` |

---

## Integration

### With Other Skills

**Before deployment**:
```bash
# 1. Fix type casts
/type-cast-auditor --fix

# 2. Type check
npx tsc --noEmit

# 3. Deploy
/deployment-readiness-checker
```

**With permission-auditor**:
```bash
# Audit both type safety and permissions
/type-cast-auditor --path apps/admin
/permission-auditor --path apps/admin
```

---

### Pre-Commit Hook (Strict Mode)

```bash
#!/bin/sh
# .husky/pre-commit

# Get staged TypeScript files
files=$(git diff --cached --name-only --diff-filter=ACM | grep '\.tsx\?$' | tr '\n' ',')

if [ -n "$files" ]; then
  echo "🔍 Checking type casts in staged files..."
  /type-cast-auditor --files "$files" --strict

  if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Type cast violations found!"
    echo "Run: /type-cast-auditor --files \"$files\" --fix"
    echo "Then stage the fixed files and commit again."
    exit 1
  fi
fi
```

---

### CI/CD Pattern (GitHub Actions)

```yaml
name: Type Safety Audit

on:
  pull_request:
    paths:
      - '**.ts'
      - '**.tsx'

jobs:
  type-cast-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install

      - name: Run Type Cast Audit
        run: /type-cast-auditor --strict --format json > audit-results.json

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: type-cast-audit
          path: audit-results.json

      - name: Comment on PR
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs')
            const results = JSON.parse(fs.readFileSync('audit-results.json', 'utf8'))

            const comment = `## Type Cast Audit Results

            ❌ Found ${results.summary.violationsFound} violations

            - Critical: ${results.summary.criticalCount}
            - Warnings: ${results.summary.warningCount}

            Run \`/type-cast-auditor --fix\` to auto-fix.`

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            })
```

---

## Examples

### Example 1: Scan and Report

```bash
/type-cast-auditor --path apps/admin
```

**Output**:
```
🔍 Type Cast Audit Report
========================

Scanned: 47 files (apps/admin)
Violations: 143

Top Violators:
  1. app/api/orders/route.ts (24 violations)
  2. app/api/customers/route.ts (18 violations)
  3. app/dashboard/page.tsx (15 violations)

By Pattern:
  Direct double cast: 89
  Database row cast: 38
  Config object cast: 16

🔴 143 violations found
Run with --fix to auto-fix.
```

---

### Example 2: Auto-Fix All Violations

```bash
/type-cast-auditor --path apps/admin --fix
```

**Output**:
```
🔧 Type Cast Auto-Fix
=====================

Processing: apps/admin

Fixed:
  ✅ app/api/orders/route.ts (24 fixes)
  ✅ app/api/customers/route.ts (18 fixes)
  ✅ app/dashboard/page.tsx (15 fixes)
  ...

Total fixes applied: 143

Summary:
  - Direct double casts → single cast through unknown: 89
  - Database row casts → added null checks: 38
  - Config object casts → through unknown: 16

✅ All violations fixed
Run 'npx tsc --noEmit' to verify type safety.
```

---

### Example 3: Dry-Run Mode

```bash
/type-cast-auditor --path packages/db --fix --dry-run
```

**Output**:
```
🔍 Dry-Run Mode (no changes will be applied)
============================================

Would fix:
  📝 packages/db/src/client.ts:42
     - const user = row as User
     + const user = row as unknown as User

  📝 packages/db/src/client.ts:78
     - return result.rows[0] as Order
     + const row = result.rows[0]
     + if (!row) throw new Error('Order not found')
     + return row as unknown as Order

  📝 packages/db/src/migrations/runner.ts:123
     - const config = data as MigrationConfig
     + const config = data as unknown as MigrationConfig

Total: 18 violations would be fixed

Run without --dry-run to apply changes.
```

---

### Example 4: Scan Specific Files

```bash
/type-cast-auditor --files "apps/admin/app/api/*/route.ts"
```

**Output**:
```
🔍 Scanning specific files...

Files matched: 12
Violations: 67

apps/admin/app/api/orders/route.ts: 24
apps/admin/app/api/customers/route.ts: 18
apps/admin/app/api/products/route.ts: 12
apps/admin/app/api/analytics/route.ts: 8
apps/admin/app/api/settings/route.ts: 5

Run with --fix to auto-fix.
```

---

## Troubleshooting

### Issue: "No violations found" but TypeScript shows errors

**Cause**: Auditor scans for specific patterns, not all type errors

**Fix**: Run `npx tsc --noEmit` for comprehensive type checking

```bash
# This catches cast patterns
/type-cast-auditor

# This catches ALL type errors
npx tsc --noEmit
```

---

### Issue: Auto-fix breaks code logic

**Cause**: Edge cases where `null` check isn't appropriate

**Fix**: Review auto-fixes and manually adjust

```bash
# Use dry-run first
/type-cast-auditor --fix --dry-run

# Review changes
git diff

# Manually adjust edge cases
```

**Example edge case**:
```typescript
// Auto-fix adds null check
const row = result.rows[0]
if (!row) throw new Error('Not found')  // ← May not be appropriate
return row as unknown as User

// You might want:
const row = result.rows[0]
if (!row) return null  // ← Return null instead of throwing
return row as unknown as User
```

---

### Issue: "Command not found: /type-cast-auditor"

**Cause**: Skill not registered

**Fix**:
```bash
# Verify skill exists
ls .claude/skills/type-cast-auditor/

# Make executable
chmod +x .claude/skills/type-cast-auditor/index.js

# Refresh skills
claude skills refresh
```

---

### Issue: Too many false positives

**Cause**: Some patterns are intentionally direct casts (e.g., primitives)

**Fix**: Exclude specific patterns or files

```bash
# Exclude test files
/type-cast-auditor --exclude "**/*.test.ts,**/*.spec.ts"

# Exclude specific directories
/type-cast-auditor --exclude "apps/admin/tests/**"
```

---

## Related Documentation

- **CLAUDE.md**: [@vercel/postgres SQL Patterns](/CLAUDE.md#vercelpostgres-sql-patterns-critical)
- **CLAUDE.md**: [Type Conversion with toCamelCase](/CLAUDE.md#3-type-conversion-with-tocamelcase)
- **Phase 8 Audit**: See `.claude/audits/phase-8-type-casts.md` for original 806 violations
- **Related Skills**:
  - [deployment-readiness-checker](../deployment-readiness-checker/README.md) - Pre-deployment validation
  - [permission-auditor](../permission-auditor/README.md) - Permission pattern auditing
  - [structured-logging-converter](../structured-logging-converter/README.md) - Logging pattern conversion

---

## Implementation Details

### Detection Patterns (Regex)

The auditor uses these patterns to detect violations:

```typescript
// Pattern 1: Direct double cast (no 'unknown')
const directCastPattern = /as\s+(?!unknown)\w+(\[\])?$/

// Pattern 2: Database row cast without null check
const dbRowPattern = /result\.rows\[0\]\s+as\s+\w+/

// Pattern 3: JSON.parse direct cast
const jsonCastPattern = /JSON\.parse\([^)]+\)\s+as\s+(?!unknown)\w+/

// Pattern 4: Config object cast
const configCastPattern = /\.config\s+as\s+(?!unknown)\w+/
```

### Auto-Fix Transformations

```typescript
// Transformation 1: Add 'unknown' intermediate
'as SomeType' → 'as unknown as SomeType'

// Transformation 2: Add null check for DB rows
'result.rows[0] as T' → 'const row = result.rows[0]\nif (!row) throw...\nreturn row as unknown as T'

// Transformation 3: Config objects through unknown
'.config as T' → '.config as unknown as T'
```

---

## Performance

**Benchmark** (Phase 8 audit results):

| Codebase Size | Files | Violations | Scan Time | Fix Time |
|---------------|-------|------------|-----------|----------|
| Small (1 app) | 30-50 | ~100 | 2-3s | 5-8s |
| Medium (3 apps) | 100-150 | ~300 | 8-12s | 20-30s |
| Large (entire CGK) | 400+ | 806 | 30-45s | 90-120s |

**Optimization tips**:
- Use `--path` to scan specific directories
- Use `--files` for targeted scans (e.g., staged files)
- Exclude test files if not needed: `--exclude "**/*.test.ts"`

---

## Changelog

### Version 1.0.0 (2026-02-27)
- Initial release
- Detects 4 common type cast violation patterns
- Auto-fix support with null check insertion
- Multiple output formats (text, JSON, CSV)
- Pre-commit and CI/CD integration examples
- Dry-run mode for safe previewing
- Based on Phase 8 audit findings (806 violations across CGK codebase)
