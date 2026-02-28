# Deployment Readiness Checker

> **Purpose**: Pre-deployment validation skill that runs comprehensive checks before deploying to production, preventing common deployment failures.

**Version**: 1.0.0
**Type**: Validator
**Invocation**: `/deployment-readiness-checker [options]`

---

## Overview

The Deployment Readiness Checker is a critical pre-deployment validation skill that performs 9 comprehensive checks to ensure your application is ready for production deployment. It catches common issues like missing environment variables, build failures, type errors, broken tests, and configuration problems before they reach production.

**CRITICAL**: This skill should be run in CI/CD pipelines before every production deployment. It can prevent deployment failures, downtime, and rollbacks.

---

## Usage

### Basic Usage

```bash
# Run all checks on current directory
/deployment-readiness-checker

# Run on specific app
/deployment-readiness-checker --app admin

# Skip time-consuming checks for faster validation
/deployment-readiness-checker --skip-tests --skip-build
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  readiness-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: /deployment-readiness-checker --app ${{ matrix.app }}
    strategy:
      matrix:
        app: [admin, storefront, orchestrator, creator-portal, contractor-portal]

  deploy:
    needs: readiness-check
    runs-on: ubuntu-latest
    steps:
      - run: vercel deploy --prod
```

### Pre-Deployment Script

```bash
# scripts/pre-deploy.sh
#!/bin/bash
set -e

echo "Running deployment readiness checks..."
/deployment-readiness-checker --app admin
/deployment-readiness-checker --app storefront
/deployment-readiness-checker --app orchestrator

echo "✅ All apps ready for deployment"
```

---

## Validation Checklist

The skill performs these 9 critical checks:

### 1. Environment Variables Validation

**Check**: All required env vars exist in Vercel and `.env.example` files

**Validation**:
- Compares `.env.example` against Vercel environment variables
- Checks for missing vars in production, preview, and development
- Verifies no secrets in `.env.example` (should have placeholders only)

**Example violation**:
```bash
❌ Missing environment variables in Vercel:
   - JWT_SECRET (required in .env.example but missing in production)
   - STRIPE_WEBHOOK_SECRET (missing in preview environment)
```

**Fix**:
```bash
cd apps/admin
vercel env add JWT_SECRET production --scope cgk-linens-88e79683
vercel env add STRIPE_WEBHOOK_SECRET preview --scope cgk-linens-88e79683
```

---

### 2. Type Checking

**Check**: TypeScript compiles without errors

**Validation**:
```bash
npx tsc --noEmit
```

**Example violation**:
```bash
❌ Type errors found:
   apps/admin/app/api/orders/route.ts:42:15
   Type 'string | undefined' is not assignable to type 'string'
```

**Fix**: Resolve type errors before deployment

---

### 3. Build Verification

**Check**: Production build succeeds

**Validation**:
```bash
pnpm build
```

**Example violation**:
```bash
❌ Build failed:
   Error: Module not found: Can't resolve '@cgk-platform/ui/button'
```

**Fix**: Use correct import path `@cgk-platform/ui` (no subpath exports)

---

### 4. Test Suite

**Check**: All tests pass

**Validation**:
```bash
pnpm test
```

**Example violation**:
```bash
❌ Test failures:
   FAIL apps/admin/tests/auth.test.ts
   ✕ should validate JWT tokens (125 ms)
```

**Fix**: Fix failing tests or update test assertions

---

### 5. Database Migrations

**Check**: All migrations applied successfully

**Validation**:
- Runs migration validation script
- Checks for pending migrations
- Verifies migration file syntax (IF NOT EXISTS, correct types)

**Example violation**:
```bash
❌ Migration issues:
   - 003_add_orders_table.sql: Missing IF NOT EXISTS on CREATE TABLE
   - 004_add_foreign_keys.sql: Type mismatch (TEXT → UUID)
```

**Fix**:
```sql
-- Before (wrong)
CREATE TABLE orders (...);

-- After (correct)
CREATE TABLE IF NOT EXISTS orders (...);
```

---

### 6. Vercel Configuration

**Check**: vercel.json and environment setup correct

**Validation**:
- Checks `vercel.json` for required settings
- Verifies team scope matches `cgk-linens-88e79683`
- Checks framework detection
- Validates environment variable configuration

**Example violation**:
```bash
❌ Vercel config issues:
   - Missing team scope in vercel.json
   - Framework not set (should be "nextjs")
```

**Fix**:
```json
{
  "version": 2,
  "framework": "nextjs",
  "scope": "cgk-linens-88e79683"
}
```

---

### 7. Dependency Audit

**Check**: No critical security vulnerabilities

**Validation**:
```bash
pnpm audit --audit-level=high
```

**Example violation**:
```bash
❌ Security vulnerabilities found:
   - next-auth: High severity (CVE-2024-XXXXX)
   - lodash: Critical severity (Prototype Pollution)
```

**Fix**:
```bash
pnpm update next-auth
pnpm remove lodash
```

---

### 8. Git Status Check

**Check**: No uncommitted changes, on correct branch

**Validation**:
- Ensures working tree is clean
- Verifies on `main` branch (or configured deploy branch)
- Checks for unpushed commits

**Example violation**:
```bash
❌ Git issues:
   - Uncommitted changes in apps/admin/app/api/orders/route.ts
   - Current branch: feature/new-api (expected: main)
   - 3 unpushed commits
```

**Fix**:
```bash
git add .
git commit -m "feat: ..."
git checkout main
git push origin main
```

---

### 9. Package.json Consistency

**Check**: All `package.json` files have correct versions and dependencies

**Validation**:
- Checks for workspace protocol usage
- Verifies no version conflicts
- Ensures all internal packages use `workspace:*`

**Example violation**:
```bash
❌ Package.json issues:
   - apps/admin/package.json: @cgk-platform/db should be "workspace:*" not "^1.0.0"
   - Version conflict: @radix-ui/react-dialog (1.0.5 in admin, 1.1.0 in storefront)
```

**Fix**:
```json
{
  "dependencies": {
    "@cgk-platform/db": "workspace:*"
  }
}
```

---

## Output Format

### Success

```bash
🚀 Deployment Readiness Check
============================

App: apps/admin
Environment: production
Branch: main
Commit: 5bb8a1c

✅ 1/9 Environment variables validated
✅ 2/9 Type checking passed
✅ 3/9 Build successful
✅ 4/9 All tests passed (247 tests, 0 failures)
✅ 5/9 Database migrations validated
✅ 6/9 Vercel configuration correct
✅ 7/9 No security vulnerabilities
✅ 8/9 Git working tree clean
✅ 9/9 Package.json files consistent

============================
✅ READY FOR DEPLOYMENT
============================

Estimated build time: 2m 34s
Estimated deploy time: 45s
Total: 3m 19s
```

### Failure

```bash
🚀 Deployment Readiness Check
============================

App: apps/admin
Environment: production
Branch: main
Commit: 5bb8a1c

✅ 1/9 Environment variables validated
❌ 2/9 Type checking failed
   apps/admin/app/api/orders/route.ts:42:15
   Type 'string | undefined' is not assignable to type 'string'

❌ 3/9 Build failed
   Error: Type errors prevent build

⏭️  4/9 Tests skipped (build failed)
✅ 5/9 Database migrations validated
✅ 6/9 Vercel configuration correct
⚠️  7/9 Security vulnerabilities found (2 high, 0 critical)
❌ 8/9 Git working tree dirty (3 uncommitted files)
✅ 9/9 Package.json files consistent

============================
❌ NOT READY FOR DEPLOYMENT
============================

Issues found: 4
Critical: 2
Warnings: 1

Fix these issues before deploying.
```

---

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--app <name>` | Specific app to check (admin, storefront, etc.) | Current directory |
| `--skip-tests` | Skip test suite (faster validation) | `false` |
| `--skip-build` | Skip build verification (faster validation) | `false` |
| `--env <environment>` | Target environment (production, preview, development) | `production` |
| `--fix` | Auto-fix issues where possible | `false` |
| `--json` | Output results as JSON | `false` |
| `--strict` | Fail on warnings (not just errors) | `false` |

---

## Integration

### With Other Skills

**Chain with deployment-readiness-checker**:
```bash
# 1. Fix type casts
/type-cast-auditor --fix

# 2. Check deployment readiness
/deployment-readiness-checker

# 3. Deploy if ready
vercel deploy --prod
```

**Combine with migration-impact-analyzer**:
```bash
# Analyze migration impact before checking readiness
/migration-impact-analyzer apps/admin/migrations/003_add_orders.sql

# Then check overall readiness
/deployment-readiness-checker --app admin
```

---

### Pre-Commit Hook Integration

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Quick pre-commit checks (skip slow tests/build)
/deployment-readiness-checker --skip-tests --skip-build --skip-env

if [ $? -ne 0 ]; then
  echo "❌ Pre-commit deployment checks failed"
  exit 1
fi
```

---

### CI/CD Patterns

#### GitHub Actions

```yaml
name: Deployment Readiness

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  check-admin:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: pnpm install
      - name: Deployment Readiness Check
        run: /deployment-readiness-checker --app admin --json > readiness-report.json
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: readiness-report
          path: readiness-report.json
```

#### Vercel Build Command Override

```json
{
  "buildCommand": "/deployment-readiness-checker --skip-tests && pnpm build"
}
```

---

## Advanced Usage

### Custom Check Scripts

Create custom checks by extending the base validation:

```typescript
// scripts/custom-deployment-checks.ts
import { runDeploymentChecks } from '@cgk-platform/cli'

export async function customChecks() {
  const baseChecks = await runDeploymentChecks()

  // Add custom checks
  const customResults = {
    ...baseChecks,
    customCheck: await validateCustomLogic()
  }

  return customResults
}
```

### Parallel App Checking

```bash
# Check all apps in parallel
apps=("admin" "storefront" "orchestrator" "creator-portal" "contractor-portal")

for app in "${apps[@]}"; do
  /deployment-readiness-checker --app "$app" &
done

wait
echo "All apps checked"
```

---

## Examples

### Example 1: Pre-Deployment Check for Admin App

```bash
/deployment-readiness-checker --app admin
```

**Output**:
```
✅ READY FOR DEPLOYMENT
All 9 checks passed
Estimated deploy time: 3m 19s
```

---

### Example 2: Fast Pre-Commit Validation

```bash
/deployment-readiness-checker --skip-tests --skip-build
```

**Output** (30 seconds vs 5 minutes):
```
✅ 1/9 Environment variables validated
✅ 2/9 Type checking passed
⏭️  3/9 Build skipped
⏭️  4/9 Tests skipped
✅ 5/9 Database migrations validated
✅ 6/9 Vercel configuration correct
✅ 7/9 No security vulnerabilities
✅ 8/9 Git working tree clean
✅ 9/9 Package.json files consistent

⚠️  Some checks skipped (use --skip-tests=false for full validation)
```

---

### Example 3: Strict Mode for Production

```bash
/deployment-readiness-checker --strict --env production
```

**Output** (fails on warnings):
```
❌ NOT READY FOR DEPLOYMENT

⚠️  7/9 Security vulnerabilities found (2 high, 0 critical)
   - Strict mode enabled, treating warnings as errors

Issues found: 1
Critical: 0
Warnings: 1 (treated as critical in strict mode)
```

---

### Example 4: JSON Output for Automation

```bash
/deployment-readiness-checker --json > readiness.json
```

**Output**:
```json
{
  "ready": true,
  "app": "apps/admin",
  "environment": "production",
  "branch": "main",
  "commit": "5bb8a1c",
  "checks": {
    "envVars": { "status": "pass", "duration": 234 },
    "typeCheck": { "status": "pass", "duration": 12456 },
    "build": { "status": "pass", "duration": 154789 },
    "tests": { "status": "pass", "duration": 45678, "testCount": 247 },
    "migrations": { "status": "pass", "duration": 567 },
    "vercelConfig": { "status": "pass", "duration": 123 },
    "securityAudit": { "status": "pass", "duration": 3456 },
    "gitStatus": { "status": "pass", "duration": 89 },
    "packageJson": { "status": "pass", "duration": 456 }
  },
  "duration": 217848,
  "estimatedDeployTime": 199000
}
```

---

## Troubleshooting

### Issue: "Command not found: /deployment-readiness-checker"

**Cause**: Skill not registered or not in PATH

**Fix**:
```bash
# Verify skill exists
ls .claude/skills/deployment-readiness-checker/

# Make executable
chmod +x .claude/skills/deployment-readiness-checker/index.js

# Re-register skill
claude skills refresh
```

---

### Issue: Type checking passes locally but fails in CI

**Cause**: Different TypeScript versions or node_modules out of sync

**Fix**:
```bash
# In CI, use exact same versions
pnpm install --frozen-lockfile

# Clear cache and reinstall
rm -rf node_modules .turbo
pnpm install
```

---

### Issue: Build passes but deployment fails

**Cause**: Environment variables not set in Vercel or runtime issues

**Fix**:
```bash
# Verify all env vars in Vercel
vercel env ls --scope cgk-linens-88e79683

# Pull and compare
vercel env pull .env.local
diff .env.example .env.local
```

---

### Issue: "Vercel configuration invalid" error

**Cause**: Missing or incorrect `vercel.json`

**Fix**:
```bash
# Run Vercel config auditor
/vercel-config-auditor --fix

# Or manually create vercel.json
cat > vercel.json <<EOF
{
  "version": 2,
  "framework": "nextjs",
  "scope": "cgk-linens-88e79683"
}
EOF
```

---

## Related Documentation

- **CLAUDE.md**: [Pre-Commit Validations](/CLAUDE.md#pre-commit-validations)
- **Vercel Team Configuration**: [CLAUDE.md Vercel Section](/CLAUDE.md#vercel-team-configuration)
- **Environment Variables Strategy**: [CLAUDE.md Env Vars](/CLAUDE.md#environment-variables-strategy)
- **Related Skills**:
  - [vercel-config-auditor](../vercel-config-auditor/README.md) - Validate Vercel configuration
  - [migration-impact-analyzer](../migration-impact-analyzer/README.md) - Analyze migration risks
  - [type-cast-auditor](../type-cast-auditor/README.md) - Fix TypeScript type issues

---

## Changelog

### Version 1.0.0 (2026-02-27)
- Initial release
- 9 comprehensive deployment checks
- CI/CD integration support
- JSON output for automation
- Strict mode for zero-tolerance deployments
- Auto-fix support for common issues
