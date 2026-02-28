# Structured Logging Converter

> **Purpose**: Converts console.log/error patterns to structured logging using @cgk-platform/logging, enabling better observability and debugging in production.

**Version**: 1.0.0
**Type**: Validator / Converter
**Invocation**: `/structured-logging-converter [options]`

---

## Overview

The Structured Logging Converter is a code quality tool that scans TypeScript/JavaScript files for `console.log`, `console.error`, `console.warn`, and `console.info` calls, and converts them to structured logging using `@cgk-platform/logging`. Structured logs include context (tenantId, userId, requestId) and are queryable in observability tools.

**CRITICAL**: Based on Phase 8 audit findings, the CGK codebase had **707 console.* calls** across 156 files. These unstructured logs make debugging production issues difficult because they lack context and aren't easily searchable.

---

## Usage

### Basic Usage

```bash
# Scan current directory
/structured-logging-converter

# Scan specific directory
/structured-logging-converter --path apps/admin

# Auto-convert console.* to logger.*
/structured-logging-converter --convert

# Generate report
/structured-logging-converter --format json > logging-report.json
```

### CI/CD Integration

```yaml
# .github/workflows/code-quality.yml
name: Code Quality

on:
  pull_request:
    branches: [main]

jobs:
  logging-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - name: Structured Logging Audit
        run: /structured-logging-converter --strict
```

### Pre-Commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check staged files for console.* usage
staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep '\.tsx\?$\|\.jsx\?$')

if [ -n "$staged_files" ]; then
  echo "📊 Checking logging patterns..."
  /structured-logging-converter --files "$staged_files" --strict

  if [ $? -ne 0 ]; then
    echo "❌ Found console.* calls - use @cgk-platform/logging instead"
    echo "Run: /structured-logging-converter --convert --files \"$staged_files\""
    exit 1
  fi
fi
```

---

## Conversion Patterns

### Pattern 1: Basic console.log → logger.info

**Before**:
```typescript
console.log('User logged in:', userId)
console.log('Processing order', orderId)
```

**After**:
```typescript
import { logger } from '@cgk-platform/logging'

logger.info('User logged in', { userId })
logger.info('Processing order', { orderId })
```

**Why**: Structured logs include context automatically (timestamp, level, metadata) and are searchable by field.

---

### Pattern 2: console.error → logger.error

**Before**:
```typescript
console.error('Failed to create order:', error)
console.error('Database connection error', error.message)
```

**After**:
```typescript
import { logger } from '@cgk-platform/logging'

logger.error('Failed to create order', { error })
logger.error('Database connection error', { error: error.message })
```

**Why**: Structured error logs include stack traces and error metadata, making debugging easier.

---

### Pattern 3: console.warn → logger.warn

**Before**:
```typescript
console.warn('Deprecated API usage in', filename)
console.warn('Rate limit approaching for', userId)
```

**After**:
```typescript
import { logger } from '@cgk-platform/logging'

logger.warn('Deprecated API usage', { filename })
logger.warn('Rate limit approaching', { userId })
```

---

### Pattern 4: console.info → logger.info

**Before**:
```typescript
console.info('Server started on port', port)
console.info('Webhook received:', webhookType)
```

**After**:
```typescript
import { logger } from '@cgk-platform/logging'

logger.info('Server started', { port })
logger.info('Webhook received', { webhookType })
```

---

### Pattern 5: With Tenant Context

**Before**:
```typescript
console.log('Order created for tenant:', tenantId, 'order:', orderId)
```

**After**:
```typescript
import { logger } from '@cgk-platform/logging'

logger.info('Order created', {
  tenantId,
  orderId,
  context: 'order-creation'
})
```

**Why**: Including tenantId in metadata makes logs filterable per tenant in observability tools.

---

### Pattern 6: Debug Logging

**Before**:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Debug: cache key =', cacheKey)
}
```

**After**:
```typescript
import { logger } from '@cgk-platform/logging'

logger.debug('Cache key generated', { cacheKey })
```

**Why**: `logger.debug()` automatically only logs in development (or when DEBUG env var is set).

---

## Logging Configuration

### Logger Levels

| Level | Method | Use Case | Production Logging |
|-------|--------|----------|-------------------|
| **error** | `logger.error()` | Errors, exceptions, failures | ✅ Always logged |
| **warn** | `logger.warn()` | Warnings, deprecated usage | ✅ Always logged |
| **info** | `logger.info()` | Important events (order created, user login) | ✅ Always logged |
| **debug** | `logger.debug()` | Debugging info, cache hits | ❌ Development only |

### Environment Configuration

```bash
# .env.local
LOG_LEVEL=info                    # Minimum level to log (error, warn, info, debug)
LOG_FORMAT=json                   # Output format (json, pretty, text)
LOG_DESTINATION=stdout            # Where to log (stdout, file, observability)
OBSERVABILITY_ENDPOINT=https://... # Optional: Send to observability tool
```

---

## Output Format

### Text Report (Default)

```bash
/structured-logging-converter --path apps/admin
```

**Output**:
```
📊 Structured Logging Audit
===========================

Scanned: 156 files
Console calls found: 707

By Type:
  console.log: 423
  console.error: 189
  console.warn: 67
  console.info: 28

By Location:
  apps/admin/app/api: 342
  apps/admin/components: 156
  apps/admin/lib: 89
  packages/db: 78
  packages/commerce: 42

Top Offenders:
  1. apps/admin/app/api/orders/route.ts (34 calls)
  2. packages/db/src/client.ts (28 calls)
  3. apps/admin/lib/analytics.ts (24 calls)

Run with --convert to auto-convert to structured logging.
```

---

### JSON Report

```bash
/structured-logging-converter --format json
```

**Output**:
```json
{
  "summary": {
    "filesScanned": 156,
    "consoleCalls": 707,
    "byType": {
      "log": 423,
      "error": 189,
      "warn": 67,
      "info": 28
    },
    "byLocation": {
      "apps/admin/app/api": 342,
      "apps/admin/components": 156,
      "apps/admin/lib": 89,
      "packages/db": 78,
      "packages/commerce": 42
    }
  },
  "violations": [
    {
      "file": "apps/admin/app/api/orders/route.ts",
      "line": 42,
      "type": "console.log",
      "code": "console.log('Order created:', orderId)",
      "suggestion": "logger.info('Order created', { orderId })"
    },
    {
      "file": "apps/admin/app/api/orders/route.ts",
      "line": 58,
      "type": "console.error",
      "code": "console.error('Failed to create order:', error)",
      "suggestion": "logger.error('Failed to create order', { error })"
    }
  ]
}
```

---

### CSV Report

```bash
/structured-logging-converter --format csv > console-calls.csv
```

**Output**:
```csv
File,Line,Type,Code,Suggestion
apps/admin/app/api/orders/route.ts,42,console.log,"console.log('Order created:', orderId)","logger.info('Order created', { orderId })"
apps/admin/app/api/orders/route.ts,58,console.error,"console.error('Failed to create order:', error)","logger.error('Failed to create order', { error })"
packages/db/src/client.ts,123,console.warn,"console.warn('Query slow:', duration)","logger.warn('Query slow', { duration })"
```

---

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--path <dir>` | Directory to scan | Current directory |
| `--files <glob>` | Specific files (comma-separated) | `**/*.ts,**/*.tsx,**/*.js,**/*.jsx` |
| `--convert` | Auto-convert console.* to logger.* | `false` |
| `--format <type>` | Output format: text, json, csv | `text` |
| `--strict` | Exit with error if console calls found | `false` |
| `--exclude <patterns>` | Exclude patterns (comma-separated) | `node_modules,.next,dist` |
| `--dry-run` | Show conversions without applying | `false` |

---

## Integration

### With Other Skills

**Code quality workflow**:
```bash
# 1. Convert logging
/structured-logging-converter --convert

# 2. Fix type casts
/type-cast-auditor --fix

# 3. Check deployment readiness
/deployment-readiness-checker
```

**With deployment-readiness-checker**:
```bash
# Ensure structured logging before deployment
/structured-logging-converter --strict
/deployment-readiness-checker --app admin
```

---

### Pre-Commit Hook (Prevent New Console Calls)

```bash
#!/bin/sh
# .husky/pre-commit

# Get staged TypeScript/JavaScript files
staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep '\.tsx\?$\|\.jsx\?$' | tr '\n' ',')

if [ -n "$staged_files" ]; then
  echo "📊 Checking for console.* calls..."

  /structured-logging-converter --files "$staged_files" --strict

  if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Found console.* calls in staged files!"
    echo "Use @cgk-platform/logging instead:"
    echo "  - console.log → logger.info"
    echo "  - console.error → logger.error"
    echo "  - console.warn → logger.warn"
    echo ""
    echo "Auto-convert: /structured-logging-converter --convert --files \"$staged_files\""
    exit 1
  fi

  echo "✅ No console.* calls found"
fi
```

---

### CI/CD Pattern with Observability

```yaml
name: Logging Audit

on:
  pull_request:
    paths:
      - '**.ts'
      - '**.tsx'
      - '**.js'
      - '**.jsx'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install

      - name: Logging Audit
        run: /structured-logging-converter --format json > audit.json

      - name: Check Results
        run: |
          violations=$(jq '.summary.consoleCalls' audit.json)
          if [ "$violations" -gt 0 ]; then
            echo "❌ Found $violations console.* calls"
            exit 1
          fi

      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: logging-audit
          path: audit.json
```

---

## Examples

### Example 1: Scan and Report

```bash
/structured-logging-converter --path apps/admin
```

**Output**:
```
📊 Structured Logging Audit
===========================

Scanned: 47 files
Console calls: 143

By Type:
  console.log: 89
  console.error: 38
  console.warn: 12
  console.info: 4

Top Files:
  1. app/api/orders/route.ts (24 calls)
  2. app/api/customers/route.ts (18 calls)
  3. lib/analytics.ts (15 calls)

Run --convert to auto-fix.
```

---

### Example 2: Auto-Convert

```bash
/structured-logging-converter --path apps/admin --convert
```

**Output**:
```
🔧 Structured Logging Converter
===============================

Processing: apps/admin

Converted:
  ✅ app/api/orders/route.ts
     - 14 console.log → logger.info
     - 8 console.error → logger.error
     - 2 console.warn → logger.warn

  ✅ app/api/customers/route.ts
     - 12 console.log → logger.info
     - 4 console.error → logger.error
     - 2 console.warn → logger.warn

  ✅ lib/analytics.ts
     - 10 console.log → logger.info
     - 3 console.error → logger.error
     - 2 console.info → logger.info

Total conversions: 143

Summary:
  - console.log → logger.info: 89
  - console.error → logger.error: 38
  - console.warn → logger.warn: 12
  - console.info → logger.info: 4

✅ All console.* calls converted to structured logging

Next steps:
  1. Review changes with 'git diff'
  2. Run tests: 'pnpm test'
  3. Commit: 'git add . && git commit -m "refactor: convert to structured logging"'
```

---

### Example 3: Dry-Run Mode

```bash
/structured-logging-converter --path packages/db --convert --dry-run
```

**Output**:
```
🔍 Dry-Run Mode (no changes applied)
====================================

Would convert:
  📝 packages/db/src/client.ts:42
     - console.log('Query executed:', query)
     + logger.info('Query executed', { query })

  📝 packages/db/src/client.ts:78
     - console.error('Query failed:', error)
     + logger.error('Query failed', { error })

  📝 packages/db/src/migrations/runner.ts:123
     - console.warn('Migration slow:', duration)
     + logger.warn('Migration slow', { duration })

Total: 28 conversions would be made

Run without --dry-run to apply changes.
```

---

### Example 4: Scan Specific Files

```bash
/structured-logging-converter --files "apps/admin/app/api/*/route.ts"
```

**Output**:
```
📊 Scanning specific files...

Files matched: 12
Console calls: 67

apps/admin/app/api/orders/route.ts: 24
apps/admin/app/api/customers/route.ts: 18
apps/admin/app/api/products/route.ts: 12
apps/admin/app/api/analytics/route.ts: 8
apps/admin/app/api/settings/route.ts: 5

Run --convert to auto-fix.
```

---

## Observability Integration

### Structured Logs in DataDog

```typescript
// After conversion, logs are automatically sent to DataDog (if configured)
import { logger } from '@cgk-platform/logging'

// This log includes:
// - timestamp
// - level (info)
// - message
// - tenantId, userId, orderId (searchable fields)
// - requestId (for distributed tracing)
logger.info('Order created', {
  tenantId: 'rawdog',
  userId: 'user_123',
  orderId: 'order_456',
  amount: 99.99
})

// Query in DataDog:
// - tenantId:rawdog
// - orderId:order_456
// - level:info
```

### Structured Logs in Vercel Logs

Vercel automatically captures structured logs:

```bash
# View logs in Vercel dashboard
vercel logs --follow

# Or query via CLI
vercel logs --since 1h --filter "tenantId:rawdog"
```

---

## Troubleshooting

### Issue: "Conversion breaks code logic"

**Cause**: Edge cases where console.* has side effects

**Fix**: Review auto-conversions with dry-run first

```bash
# Preview changes
/structured-logging-converter --convert --dry-run

# Review diffs
git diff

# Manually adjust edge cases
```

**Example edge case**:
```typescript
// BEFORE - console.log used for debugging (may have side effects)
const result = console.log(data) || defaultValue

// AFTER (incorrect) - logger.info returns void
const result = logger.info('data', { data }) || defaultValue

// MANUAL FIX - Keep console for this case or refactor
const result = data || defaultValue
logger.info('Using data', { data: result })
```

---

### Issue: "Too many structured logs - performance impact"

**Cause**: Excessive logging in hot paths

**Fix**: Use `logger.debug()` for verbose logs, configure LOG_LEVEL

```typescript
// WRONG - logger.info in hot loop
for (const item of items) {
  logger.info('Processing item', { item })  // ❌ Logs 1000s of times
}

// CORRECT - Use debug for verbose logs
for (const item of items) {
  logger.debug('Processing item', { item })  // ✅ Only in development
}
logger.info('Processed items', { count: items.length })  // ✅ Summary
```

Then set `LOG_LEVEL=info` in production to skip debug logs.

---

### Issue: "Command not found: /structured-logging-converter"

**Cause**: Skill not registered

**Fix**:
```bash
# Verify skill exists
ls .claude/skills/structured-logging-converter/

# Make executable
chmod +x .claude/skills/structured-logging-converter/index.js

# Refresh skills
claude skills refresh
```

---

## Related Documentation

- **@cgk-platform/logging**: `packages/logging/README.md` - Full logging package docs
- **Observability Setup**: `.claude/knowledge-bases/observability-patterns/README.md`
- **CLAUDE.md**: [Tech Debt Prevention](/CLAUDE.md#tech-debt-prevention)
- **Related Skills**:
  - [deployment-readiness-checker](../deployment-readiness-checker/README.md) - Pre-deployment validation
  - [type-cast-auditor](../type-cast-auditor/README.md) - Type safety validation
  - [permission-auditor](../permission-auditor/README.md) - Permission pattern auditing

---

## Performance Impact

**Benchmark** (Phase 8 audit results):

| Codebase Size | Files | Console Calls | Scan Time | Convert Time |
|---------------|-------|---------------|-----------|--------------|
| Small (1 app) | 30-50 | ~100 | 1-2s | 3-5s |
| Medium (3 apps) | 100-150 | ~300 | 5-8s | 12-18s |
| Large (entire CGK) | 400+ | 707 | 15-25s | 45-60s |

**Logging performance impact**:
- Structured logging: ~0.1ms per call (negligible)
- JSON serialization: ~0.05ms per object
- Observability forwarding: Async (no blocking)

**Total overhead**: <1% CPU in production for typical workloads.

---

## Benefits of Structured Logging

### Before (Unstructured)

```typescript
console.log('Order created:', orderId, 'for user:', userId, 'in tenant:', tenantId)
```

**Problems**:
- Hard to parse programmatically
- Can't filter by field
- Missing context (timestamp, level)
- Not queryable in observability tools

---

### After (Structured)

```typescript
logger.info('Order created', {
  orderId,
  userId,
  tenantId,
  amount: 99.99,
  status: 'pending'
})
```

**Benefits**:
- Searchable by any field
- Filterable by tenant, user, order
- Automatic context (timestamp, level, requestId)
- Queryable in DataDog, Vercel Logs
- Supports distributed tracing

**Example queries**:
```
# All orders for tenant
tenantId:rawdog level:info message:"Order created"

# Failed orders
level:error message:"Failed to create order"

# Slow operations
duration:>1000 level:warn
```

---

## Changelog

### Version 1.0.0 (2026-02-27)
- Initial release
- Converts console.log/error/warn/info to structured logging
- Auto-conversion with --convert flag
- Multiple output formats (text, JSON, CSV)
- Dry-run mode for safe previewing
- Pre-commit and CI/CD integration examples
- Observability integration (DataDog, Vercel Logs)
- Based on Phase 8 audit findings (707 console calls across CGK codebase)
