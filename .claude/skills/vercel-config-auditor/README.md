# Vercel Config Auditor

> **Purpose**: Validates Vercel project configuration consistency across all apps - compares environment variables, detects missing/undocumented vars, and generates sync commands.

**Version**: 1.0.0
**Type**: Validator / Workflow
**Invocation**: `/vercel-config-auditor [options]`

---

## Overview

The Vercel Config Auditor is a comprehensive validation tool for CGK's Vercel deployment infrastructure. It scans all Vercel projects within the team scope, compares environment variables across apps, detects inconsistencies, validates `.env.example` documentation, and optionally auto-syncs missing variables. This ensures consistent configuration across all deployed applications.

**CRITICAL**: Based on Phase 8 audit findings, environment variable inconsistencies across apps were a major cause of deployment failures. Missing vars in production, undocumented vars in `.env.example`, and scope mismatches caused production incidents. This skill prevents these issues through automated validation.

---

## Usage

### Basic Usage

```bash
# Audit all Vercel projects
/vercel-config-auditor

# Auto-fix inconsistencies
/vercel-config-auditor --fix

# Audit specific environment
/vercel-config-auditor --env preview

# Verbose output (show all vars)
/vercel-config-auditor --verbose
```

### CI/CD Integration

```yaml
# .github/workflows/vercel-audit.yml
name: Vercel Config Audit

on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday
  pull_request:
    paths:
      - 'apps/**/.env.example'
      - 'vercel.json'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install

      - name: Audit Vercel Config
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: /vercel-config-auditor --env production

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: vercel-audit
          path: vercel-audit.json
```

### Pre-Deployment Script

```bash
# scripts/pre-deploy.sh
#!/bin/bash

echo "🔍 Auditing Vercel configuration..."

/vercel-config-auditor --env production

if [ $? -ne 0 ]; then
  echo "❌ Vercel config audit failed"
  echo "Run: /vercel-config-auditor --fix"
  exit 1
fi

echo "✅ Vercel config validated"
```

---

## Validation Checks

### 1. Project Existence Check

**What it checks**: All expected apps have Vercel projects

**Expected apps**:
```typescript
const expectedApps = [
  'admin',
  'storefront',
  'orchestrator',
  'creator-portal',
  'contractor-portal',
  'shopify-app'
]
```

**Example Output**:
```
📊 Scanning Vercel projects...

✅ admin: 47 environment variable(s)
✅ storefront: 42 environment variable(s)
✅ orchestrator: 39 environment variable(s)
✅ creator-portal: 44 environment variable(s)
✅ contractor-portal: 43 environment variable(s)
✅ shopify-app: 51 environment variable(s)
```

---

### 2. Environment Variable Comparison

**What it checks**: All apps have consistent environment variables

**Detection logic**:
1. Build union of all environment variables across apps
2. For each variable, check which apps have it
3. Flag variables present in some apps but missing in others

**Example Output**:
```
🔍 Comparing environment variables...

  Total unique variables: 63

⚠️  Configuration Inconsistencies:

  📌 JWT_SECRET
     Present in: admin, orchestrator, creator-portal, contractor-portal
     Missing in: storefront, shopify-app

  📌 STRIPE_WEBHOOK_SECRET
     Present in: admin, orchestrator
     Missing in: storefront, creator-portal, contractor-portal, shopify-app

  📌 SHOPIFY_CLIENT_SECRET
     Present in: admin, shopify-app
     Missing in: storefront, orchestrator, creator-portal, contractor-portal
```

---

### 3. .env.example Validation

**What it checks**: All apps have up-to-date `.env.example` files

**Validation**:
1. Check `.env.example` exists
2. Parse documented variables
3. Compare with Vercel environment variables
4. Flag undocumented variables

**Example Output**:
```
🔍 Validating .env.example files...

⚠️  admin: 3 undocumented variable(s)
     - RESEND_API_KEY
     - STRIPE_WEBHOOK_SECRET
     - ANTHROPIC_API_KEY

✅ storefront: .env.example is up to date

⚠️  orchestrator: Missing .env.example file

✅ creator-portal: .env.example is up to date
```

---

## Auto-Fix Workflow

When run with `--fix`, the auditor automatically syncs missing variables:

**Command**:
```bash
/vercel-config-auditor --fix
```

**What it does**:
1. Identifies inconsistencies
2. Selects source app (first app with the variable)
3. Copies variable to missing apps
4. Reports success/failure for each sync

**Example Output**:
```
🔧 Fixing inconsistencies...

⏳ Syncing JWT_SECRET to storefront, shopify-app...
✅ Synced JWT_SECRET

⏳ Syncing STRIPE_WEBHOOK_SECRET to storefront, creator-portal, contractor-portal, shopify-app...
✅ Synced STRIPE_WEBHOOK_SECRET

⏳ Syncing SHOPIFY_CLIENT_SECRET to storefront, orchestrator, creator-portal, contractor-portal...
✅ Synced SHOPIFY_CLIENT_SECRET

📊 Sync Summary:
   Fixed: 9
   Failed: 0
```

**IMPORTANT**: `--fix` mode requires `VERCEL_TOKEN` environment variable with write permissions.

---

## Output Format

### Success (No Issues)

```
🔍 Vercel Config Auditor

  Team Scope: cgk-linens-88e79683
  Environment: production

📊 Scanning Vercel projects...

✅ admin: 47 environment variable(s)
✅ storefront: 42 environment variable(s)
✅ orchestrator: 39 environment variable(s)
✅ creator-portal: 44 environment variable(s)
✅ contractor-portal: 43 environment variable(s)
✅ shopify-app: 51 environment variable(s)

🔍 Comparing environment variables...

  Total unique variables: 63

✅ All environment variables are consistent!

🔍 Validating .env.example files...

✅ admin: .env.example is up to date
✅ storefront: .env.example is up to date
✅ orchestrator: .env.example is up to date
✅ creator-portal: .env.example is up to date
✅ contractor-portal: .env.example is up to date
✅ shopify-app: .env.example is up to date
```

---

### Failure (Issues Found)

```
🔍 Vercel Config Auditor

  Team Scope: cgk-linens-88e79683
  Environment: production

📊 Scanning Vercel projects...

✅ admin: 47 environment variable(s)
❌ storefront: Failed to fetch config
✅ orchestrator: 39 environment variable(s)
✅ creator-portal: 44 environment variable(s)
✅ contractor-portal: 43 environment variable(s)
✅ shopify-app: 51 environment variable(s)

🔍 Comparing environment variables...

  Total unique variables: 63

⚠️  Configuration Inconsistencies:

  📌 JWT_SECRET
     Present in: admin, orchestrator, creator-portal, contractor-portal
     Missing in: shopify-app

  📌 STRIPE_WEBHOOK_SECRET
     Present in: admin, orchestrator
     Missing in: creator-portal, contractor-portal, shopify-app

  📌 RESEND_API_KEY
     Present in: admin, orchestrator, creator-portal, contractor-portal, shopify-app
     Missing in: (none)

📝 Run with --fix to sync missing variables

🔍 Validating .env.example files...

⚠️  admin: 3 undocumented variable(s)
     - RESEND_API_KEY
     - STRIPE_WEBHOOK_SECRET
     - ANTHROPIC_API_KEY

⚠️  orchestrator: Missing .env.example file

✅ storefront: .env.example is up to date
✅ creator-portal: .env.example is up to date
```

---

### JSON Output

```bash
/vercel-config-auditor --format json > audit.json
```

**Output**:
```json
{
  "status": "warn",
  "projects": [
    {
      "app": "admin",
      "vars": ["DATABASE_URL", "JWT_SECRET", "STRIPE_SECRET_KEY", ...],
      "varCount": 47
    },
    {
      "app": "storefront",
      "vars": ["DATABASE_URL", "NEXT_PUBLIC_SHOPIFY_DOMAIN", ...],
      "varCount": 42
    }
  ],
  "inconsistencies": [
    {
      "varName": "JWT_SECRET",
      "presentIn": ["admin", "orchestrator", "creator-portal", "contractor-portal"],
      "missingIn": ["storefront", "shopify-app"]
    }
  ],
  "exampleFileIssues": [
    {
      "app": "admin",
      "issue": "undocumented",
      "vars": ["RESEND_API_KEY", "STRIPE_WEBHOOK_SECRET", "ANTHROPIC_API_KEY"]
    },
    {
      "app": "orchestrator",
      "issue": "missing",
      "message": "No .env.example file found"
    }
  ],
  "summary": {
    "totalProjects": 6,
    "totalVars": 63,
    "inconsistencies": 3,
    "exampleFileIssues": 2
  }
}
```

---

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--fix` | Auto-sync missing environment variables | `false` |
| `--scope <team>` | Vercel team scope | `cgk-linens-88e79683` |
| `--env <environment>` | Target environment (production, preview, development) | `production` |
| `--verbose` | Show all variables and detailed output | `false` |

---

## Integration

### With Other Skills

**Pre-deployment workflow**:
```bash
# 1. Audit Vercel config
/vercel-config-auditor --env production

# 2. If issues found, auto-fix
/vercel-config-auditor --fix

# 3. Validate deployment readiness
/deployment-readiness-checker

# 4. Deploy
vercel deploy --prod
```

**Environment variable setup**:
```bash
# 1. Add new variable to one app
cd apps/admin
vercel env add NEW_VAR production --scope cgk-linens-88e79683

# 2. Audit to detect inconsistency
/vercel-config-auditor

# 3. Sync to all apps
/vercel-config-auditor --fix

# 4. Update .env.example files
echo "NEW_VAR=placeholder" >> apps/admin/.env.example
# (repeat for all apps)
```

---

### Pre-Commit Hook (Detect .env.example Changes)

```bash
#!/bin/sh
# .husky/pre-commit

# Check if .env.example files changed
env_example_changed=$(git diff --cached --name-only --diff-filter=ACM | grep '\.env\.example$')

if [ -n "$env_example_changed" ]; then
  echo "📊 Validating .env.example files..."

  /vercel-config-auditor

  if [ $? -ne 0 ]; then
    echo "❌ .env.example validation failed"
    echo "Ensure all apps have consistent environment variables"
    exit 1
  fi

  echo "✅ .env.example files validated"
fi
```

---

### Weekly Audit (GitHub Actions)

```yaml
name: Weekly Vercel Audit

on:
  schedule:
    - cron: '0 9 * * 1'  # Monday 9am

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install

      - name: Audit Vercel Config
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: /vercel-config-auditor --format json > audit.json

      - name: Create Issue if Problems Found
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs')
            const audit = JSON.parse(fs.readFileSync('audit.json', 'utf8'))

            const body = `## Weekly Vercel Config Audit

            ⚠️ Found ${audit.summary.inconsistencies} inconsistencies

            ### Inconsistencies

            ${audit.inconsistencies.map(inc => `
            - **${inc.varName}**
              - Present in: ${inc.presentIn.join(', ')}
              - Missing in: ${inc.missingIn.join(', ')}
            `).join('\n')}

            ### .env.example Issues

            ${audit.exampleFileIssues.map(issue => `
            - **${issue.app}**: ${issue.issue}
            `).join('\n')}

            Run \`/vercel-config-auditor --fix\` to auto-sync missing variables.`

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Weekly Vercel Config Audit - Issues Found',
              body,
              labels: ['infrastructure', 'priority-medium']
            })
```

---

## Examples

### Example 1: Basic Audit (No Issues)

```bash
/vercel-config-auditor
```

**Output**: See [Success (No Issues)](#success-no-issues) section

---

### Example 2: Audit with Issues Found

```bash
/vercel-config-auditor
```

**Output**: See [Failure (Issues Found)](#failure-issues-found) section

---

### Example 3: Auto-Fix Inconsistencies

```bash
/vercel-config-auditor --fix
```

**Output**: See [Auto-Fix Workflow](#auto-fix-workflow) section

---

### Example 4: Audit Preview Environment

```bash
/vercel-config-auditor --env preview
```

**Output**:
```
🔍 Vercel Config Auditor

  Team Scope: cgk-linens-88e79683
  Environment: preview

📊 Scanning Vercel projects...

✅ admin: 47 environment variable(s)
✅ storefront: 42 environment variable(s)
✅ orchestrator: 39 environment variable(s)
✅ creator-portal: 44 environment variable(s)
✅ contractor-portal: 43 environment variable(s)
✅ shopify-app: 51 environment variable(s)

🔍 Comparing environment variables...

  Total unique variables: 63

✅ All environment variables are consistent!
```

---

## Troubleshooting

### Issue: "Failed to fetch config" for all apps

**Cause**: Missing or invalid `VERCEL_TOKEN` environment variable

**Fix**:
```bash
# Get token from Vercel dashboard
# Settings → Tokens → Create Token

# Set environment variable
export VERCEL_TOKEN=your-token-here

# Or add to .env.local
echo "VERCEL_TOKEN=your-token-here" >> .env.local

# Re-run audit
/vercel-config-auditor
```

---

### Issue: "Incorrect team scope" error

**Cause**: Vercel CLI not configured with correct team

**Fix**:
```bash
# Login to Vercel
vercel login

# Link to correct team
vercel link --scope cgk-linens-88e79683

# Verify team
vercel teams list

# Re-run audit
/vercel-config-auditor
```

---

### Issue: Auto-fix syncs wrong values

**Cause**: First app with variable may not have correct value

**Fix**: Manually verify and sync
```bash
# 1. Check which app has correct value
vercel env ls production --scope cgk-linens-88e79683 | grep JWT_SECRET

# 2. Manually sync from correct source
cd apps/admin  # Source app
vercel env pull .env.local

# Extract value
JWT_SECRET=$(grep JWT_SECRET .env.local | cut -d '=' -f2)

# Sync to other apps
for app in storefront orchestrator creator-portal contractor-portal shopify-app; do
  cd apps/$app
  echo $JWT_SECRET | vercel env add JWT_SECRET production --scope cgk-linens-88e79683
done
```

---

### Issue: ".env.example undocumented vars" false positive

**Cause**: Variable is intentionally app-specific

**Fix**: Add comment to `.env.example`
```bash
# apps/shopify-app/.env.example

# App-specific (not shared with other apps)
SHOPIFY_CLIENT_ID=your-client-id
SHOPIFY_CLIENT_SECRET=shpss_your-secret
```

---

## Related Documentation

- **CLAUDE.md**: [Environment Variables Strategy](/CLAUDE.md#environment-variables-strategy)
- **CLAUDE.md**: [Vercel Team Configuration](/CLAUDE.md#vercel-team-configuration)
- **Vercel CLI Docs**: https://vercel.com/docs/cli
- **Related Skills**:
  - [deployment-readiness-checker](../deployment-readiness-checker/README.md) - Pre-deployment validation
  - [tenant-provisioner](../tenant-provisioner/README.md) - Automated tenant setup

---

## Best Practices

### 1. Shared vs App-Specific Variables

**Shared across all apps** (should be consistent):
```
DATABASE_URL
JWT_SECRET
SESSION_SECRET
INTEGRATION_ENCRYPTION_KEY
SHOPIFY_TOKEN_ENCRYPTION_KEY
```

**App-specific** (inconsistency is OK):
```
NEXT_PUBLIC_APP_NAME
SHOPIFY_CLIENT_ID (shopify-app only)
STRIPE_WEBHOOK_SECRET (admin + orchestrator only)
```

---

### 2. Environment Variable Naming

**Use consistent prefixes**:
- `NEXT_PUBLIC_*` - Public client-side vars
- `DATABASE_*` - Database connection
- `STRIPE_*` - Stripe integration
- `SHOPIFY_*` - Shopify integration
- `RESEND_*` - Resend email
- `ANTHROPIC_*` / `OPENAI_*` - AI APIs

---

### 3. Documentation in .env.example

**GOOD** (documented):
```bash
# Database Connection (Neon PostgreSQL)
# Get from: Vercel Project Settings → Database
DATABASE_URL=postgresql://user:password@host/db

# JWT Secret (64-character hex string)
# Generate with: openssl rand -hex 32
JWT_SECRET=your-64-character-hex-string-here
```

**BAD** (undocumented):
```bash
DATABASE_URL=
JWT_SECRET=
```

---

### 4. Regular Audits

**Schedule**:
- Weekly automated audits (CI/CD)
- Before major deployments
- After adding new apps
- After environment variable changes

**Automation**:
```yaml
# .github/workflows/vercel-audit.yml
on:
  schedule:
    - cron: '0 9 * * 1'  # Weekly
```

---

## Security Implications

### Why This Matters

**Missing environment variables**:
- App fails to start
- Features silently fail
- Security features disabled (e.g., JWT validation)

**Inconsistent environment variables**:
- Cross-app communication breaks
- Authentication fails
- Database connections use wrong credentials

**Undocumented variables**:
- New developers can't set up local environment
- Onboarding friction
- Deployment failures

### Defense in Depth

Environment variable validation is **one layer** in CGK's infrastructure:

1. **Documentation**: `.env.example` files with comments
2. **Validation**: Vercel config auditor (this skill)
3. **CI/CD**: Automated checks before deployment
4. **Deployment**: Vercel's environment variable UI
5. **Runtime**: App startup validation

**CRITICAL**: All layers must be maintained for reliable deployments.

---

## Performance

**Audit Time** (Phase 8 benchmark):

| Apps Audited | Variables | Audit Time |
|--------------|-----------|------------|
| 1 app | ~40 | 1-2s |
| 3 apps | ~60 | 3-5s |
| 6 apps (all CGK) | ~63 | 8-12s |

**Network calls**: 1 API call per app per environment

**Auto-fix time**: +500ms per variable synced (Vercel API rate limited)

---

## Changelog

### Version 1.0.0 (2026-02-27)
- Initial release
- Scans all Vercel projects in team scope
- Compares environment variables across apps
- Detects inconsistencies (present in some, missing in others)
- Validates `.env.example` files (missing, undocumented vars)
- Auto-fix mode to sync missing variables
- JSON output format for automation
- Verbose mode for detailed inspection
- CI/CD integration examples (GitHub Actions)
- Pre-commit hook for `.env.example` validation
- Weekly audit workflow for continuous monitoring
