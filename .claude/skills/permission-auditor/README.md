# Permission Auditor

> **Purpose**: Audits @cgk-platform/auth permission patterns across API routes, generates permission reports, and validates permission checks are correctly implemented.

**Version**: 1.0.0
**Type**: Validator
**Invocation**: `/permission-auditor [options]`

---

## Overview

The Permission Auditor is a security validation tool that scans Next.js API routes for correct usage of `@cgk-platform/auth` permission patterns. It ensures all protected routes use `requireAuth()` and `checkPermissionOrRespond()` correctly, preventing unauthorized access vulnerabilities.

**CRITICAL**: This skill validates one of the most critical security layers in the CGK platform - tenant and user access control. Missing permission checks can lead to data leaks between tenants or unauthorized access to admin functions.

---

## Usage

### Basic Usage

```bash
# Audit all API routes
/permission-auditor

# Audit specific app
/permission-auditor --path apps/admin

# Generate detailed report
/permission-auditor --format json > permissions-report.json

# Check for missing permissions only
/permission-auditor --check-missing --strict
```

### CI/CD Integration

```yaml
# .github/workflows/security-audit.yml
name: Security Audit

on:
  pull_request:
    paths:
      - 'apps/**/api/**'
      - 'packages/auth/**'

jobs:
  permission-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - name: Permission Audit
        run: /permission-auditor --strict --format json
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: permission-audit
          path: permissions-report.json
```

### Pre-Commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check staged API route files for permission patterns
staged_routes=$(git diff --cached --name-only --diff-filter=ACM | grep 'app/api/.*/route\.ts$')

if [ -n "$staged_routes" ]; then
  echo "🔒 Auditing permissions in API routes..."
  /permission-auditor --files "$staged_routes" --check-missing --strict

  if [ $? -ne 0 ]; then
    echo "❌ Missing or incorrect permission checks found!"
    exit 1
  fi
fi
```

---

## Validation Rules

### Rule 1: requireAuth Usage

**Pattern to detect**:
```typescript
// WRONG - No auth check
export async function GET(request: Request) {
  const data = await sql`SELECT * FROM orders`
  return Response.json({ data })
}

// WRONG - Incomplete error handling
export async function GET(request: Request) {
  const auth = await requireAuth(request)  // ❌ No try/catch
  // ...
}
```

**Correct pattern**:
```typescript
// CORRECT - Proper auth with error handling
export async function GET(request: Request) {
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use auth.userId and auth.tenantId
}
```

---

### Rule 2: checkPermissionOrRespond Signature

**Pattern to detect**:
```typescript
// WRONG - 4 arguments (request is NOT a parameter)
const permissionDenied = await checkPermissionOrRespond(
  request,           // ❌ Not a parameter!
  auth.tenantId,
  auth.userId,
  'orders.view'
)

// WRONG - Incorrect argument order
const permissionDenied = await checkPermissionOrRespond(
  auth.tenantId,     // ❌ Wrong order
  auth.userId,
  'orders.view'
)
```

**Correct pattern**:
```typescript
// CORRECT - 3 arguments in correct order
const permissionDenied = await checkPermissionOrRespond(
  auth.userId,       // 1. userId
  auth.tenantId,     // 2. tenantId
  'orders.view'      // 3. permission string
)
if (permissionDenied) return permissionDenied
```

---

### Rule 3: Permission Naming Convention

**Pattern to detect**:
```typescript
// WRONG - Inconsistent naming
checkPermissionOrRespond(userId, tenantId, 'view_orders')      // snake_case
checkPermissionOrRespond(userId, tenantId, 'ViewOrders')       // PascalCase
checkPermissionOrRespond(userId, tenantId, 'ORDERS_VIEW')      // SCREAMING_SNAKE_CASE
```

**Correct pattern**:
```typescript
// CORRECT - Dot notation: resource.action
checkPermissionOrRespond(userId, tenantId, 'orders.view')
checkPermissionOrRespond(userId, tenantId, 'orders.create')
checkPermissionOrRespond(userId, tenantId, 'settings.update')
checkPermissionOrRespond(userId, tenantId, 'analytics.export')
```

**Standard permission format**: `<resource>.<action>`

**Common resources**:
- `orders`, `customers`, `products`, `analytics`
- `settings`, `team`, `integrations`
- `creators`, `projects`, `payments`

**Common actions**:
- `view`, `create`, `update`, `delete`
- `export`, `import`, `approve`, `reject`

---

### Rule 4: Permission Not Checked After requireAuth

**Pattern to detect**:
```typescript
// WARNING - Auth but no permission check (may be intentional)
export async function GET(request: Request) {
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ⚠️ No checkPermissionOrRespond call
  // May be public endpoint for authenticated users
  return Response.json({ data: 'public' })
}
```

**Correct pattern** (for protected resources):
```typescript
export async function GET(request: Request) {
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check specific permission
  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId || '',
    'orders.view'
  )
  if (permissionDenied) return permissionDenied

  // Now safe to access protected resource
  return withTenant(auth.tenantId, async () => {
    const orders = await sql`SELECT * FROM orders LIMIT 50`
    return Response.json({ orders })
  })
}
```

---

## Report Formats

### Text Report (Default)

```bash
/permission-auditor --path apps/admin
```

**Output**:
```
🔒 Permission Audit Report
==========================

Scanned: 64 API routes (apps/admin)
Issues found: 12

By Category:
  Missing requireAuth: 3
  Missing permission check: 5
  Incorrect signature: 2
  Naming convention: 2

Critical Issues (3):
  🔴 apps/admin/app/api/orders/export/route.ts:8
     Missing requireAuth - public endpoint exposes sensitive data

  🔴 apps/admin/app/api/settings/integrations/route.ts:12
     Missing permission check after requireAuth

  🔴 apps/admin/app/api/analytics/revenue/route.ts:15
     Missing permission check after requireAuth

Warnings (9):
  ⚠️  apps/admin/app/api/customers/route.ts:22
     Incorrect checkPermissionOrRespond signature (4 args instead of 3)

  ⚠️  apps/admin/app/api/products/route.ts:18
     Permission naming: 'view_products' should be 'products.view'

Permission Coverage:
  ✅ Protected: 52/64 (81%)
  ⚠️  Auth only (no permission): 9/64 (14%)
  ❌ Unprotected: 3/64 (5%)

Run with --fix to auto-fix signature and naming issues.
```

---

### JSON Report

```bash
/permission-auditor --format json
```

**Output**:
```json
{
  "summary": {
    "routesScanned": 64,
    "issuesFound": 12,
    "critical": 3,
    "warnings": 9,
    "coverage": {
      "protected": 52,
      "authOnly": 9,
      "unprotected": 3
    }
  },
  "issues": [
    {
      "file": "apps/admin/app/api/orders/export/route.ts",
      "line": 8,
      "type": "missing-require-auth",
      "severity": "critical",
      "message": "Missing requireAuth - public endpoint exposes sensitive data",
      "suggestion": "Add: let auth: AuthContext; try { auth = await requireAuth(request) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }"
    },
    {
      "file": "apps/admin/app/api/customers/route.ts",
      "line": 22,
      "type": "incorrect-signature",
      "severity": "warning",
      "message": "checkPermissionOrRespond called with 4 arguments (expected 3)",
      "current": "checkPermissionOrRespond(request, auth.tenantId, auth.userId, 'customers.view')",
      "suggestion": "checkPermissionOrRespond(auth.userId, auth.tenantId, 'customers.view')"
    }
  ],
  "permissions": [
    {
      "file": "apps/admin/app/api/orders/route.ts",
      "method": "GET",
      "permission": "orders.view",
      "protected": true
    },
    {
      "file": "apps/admin/app/api/orders/route.ts",
      "method": "POST",
      "permission": "orders.create",
      "protected": true
    }
  ]
}
```

---

### CSV Report

```bash
/permission-auditor --format csv > permissions.csv
```

**Output**:
```csv
File,Method,Permission,Protected,HasAuth,Issue,Severity
apps/admin/app/api/orders/route.ts,GET,orders.view,true,true,,
apps/admin/app/api/orders/route.ts,POST,orders.create,true,true,,
apps/admin/app/api/orders/export/route.ts,GET,,false,false,missing-require-auth,critical
apps/admin/app/api/customers/route.ts,GET,customers.view,true,true,incorrect-signature,warning
apps/admin/app/api/settings/integrations/route.ts,PATCH,,true,true,missing-permission-check,critical
```

---

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--path <dir>` | Directory to scan | Current directory |
| `--files <glob>` | Specific files (comma-separated) | `**/app/api/**/route.ts` |
| `--format <type>` | Output format: text, json, csv | `text` |
| `--check-missing` | Only report missing checks (not signature issues) | `false` |
| `--strict` | Exit with error if any issues found | `false` |
| `--fix` | Auto-fix signature and naming issues | `false` |
| `--exclude <patterns>` | Exclude patterns (comma-separated) | `node_modules,.next` |

---

## Integration

### With Other Skills

**Security audit workflow**:
```bash
# 1. Check permissions
/permission-auditor --path apps/admin

# 2. Check deployment readiness
/deployment-readiness-checker --app admin

# 3. Deploy
vercel deploy --prod
```

**With security-auditor agent**:
```bash
# Use security-auditor agent for comprehensive security review
Task({
  subagent_type: 'reviewer',
  prompt: 'Security audit apps/admin focusing on permission patterns',
  model: 'opus'
})

# Then validate with permission-auditor
/permission-auditor --path apps/admin --strict
```

---

### Pre-Commit Hook (Strict Mode)

```bash
#!/bin/sh
# .husky/pre-commit

staged_routes=$(git diff --cached --name-only --diff-filter=ACM | grep 'app/api/.*/route\.ts$')

if [ -n "$staged_routes" ]; then
  echo "🔒 Checking permissions..."

  for file in $staged_routes; do
    /permission-auditor --files "$file" --strict
    if [ $? -ne 0 ]; then
      echo "❌ Permission issues in $file"
      exit 1
    fi
  done

  echo "✅ All permission checks valid"
fi
```

---

### CI/CD Pattern with Auto-Comment

```yaml
name: Permission Audit

on:
  pull_request:
    paths:
      - 'apps/**/api/**/*.ts'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install

      - name: Run Permission Audit
        id: audit
        run: |
          /permission-auditor --format json > audit.json
          echo "report=$(cat audit.json)" >> $GITHUB_OUTPUT

      - name: Comment on PR
        if: always()
        uses: actions/github-script@v6
        with:
          script: |
            const results = JSON.parse('${{ steps.audit.outputs.report }}')

            if (results.summary.issuesFound === 0) {
              await github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: '✅ Permission audit passed - all routes properly protected'
              })
            } else {
              const critical = results.summary.critical
              const warnings = results.summary.warnings

              await github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `## 🔒 Permission Audit Results

❌ Found ${results.summary.issuesFound} issues

- Critical: ${critical}
- Warnings: ${warnings}

**Coverage**: ${results.summary.coverage.protected}/${results.summary.routesScanned} routes protected (${Math.round(results.summary.coverage.protected / results.summary.routesScanned * 100)}%)

[View full report](${context.payload.pull_request.html_url}/checks)`
              })

              if (critical > 0) {
                core.setFailed(\`Found \${critical} critical permission issues\`)
              }
            }
```

---

## Examples

### Example 1: Full Audit Report

```bash
/permission-auditor --path apps/admin
```

**Output**:
```
🔒 Permission Audit Report
==========================

Scanned: 64 API routes
Issues: 12 (3 critical, 9 warnings)

Coverage: 81% protected

Top Issues:
  1. Missing requireAuth (3 routes)
  2. Missing permission checks (5 routes)
  3. Incorrect signatures (2 routes)
  4. Naming convention (2 routes)

Run --format json for detailed breakdown.
```

---

### Example 2: Check Specific Route

```bash
/permission-auditor --files "apps/admin/app/api/orders/route.ts"
```

**Output**:
```
🔒 Checking: apps/admin/app/api/orders/route.ts

Methods found: GET, POST, PATCH, DELETE

✅ GET /api/orders
   - Has requireAuth: Yes
   - Has permission check: Yes
   - Permission: orders.view

✅ POST /api/orders
   - Has requireAuth: Yes
   - Has permission check: Yes
   - Permission: orders.create

⚠️  PATCH /api/orders/[id]
   - Has requireAuth: Yes
   - Has permission check: Yes (INCORRECT SIGNATURE)
   - Current: checkPermissionOrRespond(request, tenantId, userId, 'orders.update')
   - Should be: checkPermissionOrRespond(userId, tenantId, 'orders.update')

✅ DELETE /api/orders/[id]
   - Has requireAuth: Yes
   - Has permission check: Yes
   - Permission: orders.delete

Issues: 1 warning
Run with --fix to auto-correct signature.
```

---

### Example 3: Auto-Fix Mode

```bash
/permission-auditor --path apps/admin --fix
```

**Output**:
```
🔧 Permission Auto-Fix
======================

Processing: apps/admin

Fixed:
  ✅ apps/admin/app/api/customers/route.ts:22
     - checkPermissionOrRespond(request, auth.tenantId, auth.userId, 'customers.view')
     + checkPermissionOrRespond(auth.userId, auth.tenantId, 'customers.view')

  ✅ apps/admin/app/api/products/route.ts:18
     - Permission: 'view_products'
     + Permission: 'products.view'

Total fixes: 4

Still requires manual fixes (3):
  ❌ apps/admin/app/api/orders/export/route.ts:8
     Missing requireAuth - add manually

  ❌ apps/admin/app/api/settings/integrations/route.ts:12
     Missing permission check - add manually

Run audit again to verify.
```

---

### Example 4: Permission Coverage Report

```bash
/permission-auditor --format json | jq '.summary.coverage'
```

**Output**:
```json
{
  "protected": 52,
  "authOnly": 9,
  "unprotected": 3,
  "percentage": 81.25
}
```

---

## Troubleshooting

### Issue: "False positive - route is intentionally public"

**Cause**: Auditor flags routes without requireAuth

**Fix**: Add comment to exclude from audit

```typescript
// Permission audit: intentionally public
export async function GET(request: Request) {
  // Public health check endpoint
  return Response.json({ status: 'ok' })
}
```

Or exclude file:
```bash
/permission-auditor --exclude "**/health/route.ts,**/status/route.ts"
```

---

### Issue: "Incorrect signature detected but code looks correct"

**Cause**: May be using different import or wrapper function

**Fix**: Ensure using exact `@cgk-platform/auth` signature

```typescript
// WRONG - Custom wrapper
import { checkPermission } from './lib/auth'
checkPermission(request, userId, tenantId, 'orders.view')

// CORRECT - Official package
import { checkPermissionOrRespond } from '@cgk-platform/auth'
checkPermissionOrRespond(userId, tenantId, 'orders.view')
```

---

### Issue: "Permission naming false positive"

**Cause**: Using valid permission that doesn't match standard pattern

**Fix**: Document exception or update permission name

```typescript
// If 'admin.super_admin' is a valid permission, add comment:
// Permission audit: exception - admin.super_admin is valid

// Or rename to match convention:
checkPermissionOrRespond(userId, tenantId, 'admin.superadmin')
```

---

## Related Documentation

- **CLAUDE.md**: [@cgk-platform/auth Permission Patterns](/CLAUDE.md#cgk-platformauth-permission-patterns-critical)
- **@cgk-platform/auth**: `packages/auth/README.md` - Full auth package docs
- **Security Best Practices**: `.claude/knowledge-bases/security-patterns/README.md`
- **Related Skills**:
  - [deployment-readiness-checker](../deployment-readiness-checker/README.md) - Pre-deployment validation
  - [type-cast-auditor](../type-cast-auditor/README.md) - Type safety validation

---

## Security Implications

### Why This Matters

**Missing requireAuth**:
- Exposes endpoints to unauthenticated users
- Can leak sensitive data (orders, customers, analytics)
- Violates security principle of "default deny"

**Missing permission checks**:
- Any authenticated user can access any tenant's data
- Breaks multi-tenancy isolation
- Allows privilege escalation (regular user → admin)

**Incorrect signatures**:
- May result in permission checks that always pass
- Can cause runtime errors that bypass security
- Leads to unpredictable authorization behavior

### Defense in Depth

Permission checks are **one layer** in CGK's security model:

1. **Network**: Vercel edge network, DDoS protection
2. **Authentication**: JWT validation via `requireAuth()`
3. **Authorization**: Permission checks via `checkPermissionOrRespond()` ← **THIS SKILL**
4. **Tenant Isolation**: `withTenant()` enforces schema isolation
5. **Data Validation**: Zod schemas, input sanitization

**CRITICAL**: All layers must be present for complete security.

---

## Changelog

### Version 1.0.0 (2026-02-27)
- Initial release
- Validates requireAuth usage
- Checks checkPermissionOrRespond signatures (3 args, correct order)
- Enforces permission naming convention (resource.action)
- Detects missing permission checks after auth
- Multiple output formats (text, JSON, CSV)
- Auto-fix for signature and naming issues
- Coverage reporting
- CI/CD and pre-commit hook examples
