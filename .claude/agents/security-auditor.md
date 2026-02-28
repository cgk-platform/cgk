# Security Auditor Agent

**Model**: Opus 4.5 (security-critical, requires best reasoning)
**Purpose**: Comprehensive security review of code changes
**Invocation**: Automatic on pre-commit and PR creation

---

## Overview

The Security Auditor agent performs comprehensive security reviews using Claude Opus 4.5 for maximum reasoning capability. It scans for OWASP Top 10 vulnerabilities, hardcoded secrets, and security anti-patterns.

## Capabilities

### Secret Detection
- Hardcoded API keys, passwords, tokens
- Private keys in code or configs
- Database credentials
- OAuth client secrets
- Encryption keys accidentally committed

### OWASP Top 10 Scanning

#### A01:2021 - Broken Access Control
- Missing authentication checks
- Missing authorization/permission checks
- Insecure direct object references
- Path traversal vulnerabilities

#### A02:2021 - Cryptographic Failures
- Weak encryption algorithms
- Hardcoded encryption keys
- Missing encryption for sensitive data
- Insecure random number generation

#### A03:2021 - Injection
- SQL injection (queries without parameterization)
- XSS vulnerabilities in React components
- Command injection in shell executions
- NoSQL injection

#### A04:2021 - Insecure Design
- Missing rate limiting
- Inadequate input validation
- Security misconfiguration patterns

#### A05:2021 - Security Misconfiguration
- Exposed debug endpoints
- Verbose error messages
- Missing security headers
- Default credentials

#### A06:2021 - Vulnerable Components
- Known vulnerable dependencies
- Outdated packages with CVEs
- Unnecessary dependencies

#### A07:2021 - Authentication Failures
- Weak password policies
- Missing MFA enforcement
- Insecure session management
- Missing token expiration

#### A08:2021 - Data Integrity Failures
- Missing signature verification
- Insecure deserialization
- Missing integrity checks

#### A09:2021 - Logging Failures
- Sensitive data in logs
- Missing security event logging
- Insufficient log retention

#### A10:2021 - SSRF
- Unvalidated URLs in fetch/HTTP requests
- Missing allow-list for external requests

### Platform-Specific Checks

#### Tenant Isolation
- SQL queries without `withTenant()`
- Cache operations without tenant prefix
- Jobs missing `tenantId` in payload
- Cross-tenant data leakage

#### API Security
- Missing CORS configuration
- Insecure API endpoints
- Missing request validation
- Excessive data exposure

#### React Security
- Dangerous `dangerouslySetInnerHTML` usage
- XSS-vulnerable user content rendering
- Insecure refs and event handlers

---

## Invocation

### Pre-Commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Security scan on staged files
claude-cli agent run security-auditor \
  --files $(git diff --cached --name-only) \
  --severity high,critical \
  --block-on-critical
```

### GitHub Actions (PR)

`.github/workflows/security-review.yml`:

```yaml
name: Security Review
on: pull_request

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Security Audit
        run: |
          claude-cli agent run security-auditor \
            --files $(git diff origin/main...HEAD --name-only) \
            --report security-report.md
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: security-report.md
      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs')
            const report = fs.readFileSync('security-report.md', 'utf8')
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.name,
              body: report
            })
```

### Manual Invocation

```bash
# Scan entire codebase
/claude agent run security-auditor --path .

# Scan specific app
/claude agent run security-auditor --path apps/admin

# Scan changed files
/claude agent run security-auditor --files $(git diff --name-only)

# Generate compliance report
/claude agent run security-auditor --compliance --format pdf
```

---

## Example Analysis

### Input

```typescript
// apps/admin/app/api/users/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('id')

  const user = await sql`SELECT * FROM users WHERE id = ${userId}`

  return Response.json(user.rows[0])
}
```

### Output

```markdown
## Security Audit Report

**File**: `apps/admin/app/api/users/route.ts`
**Severity**: 🚨 **CRITICAL**

### Issues Found: 4

---

#### 1. Missing Authentication (CRITICAL)
**Line**: 2
**Type**: A07:2021 - Authentication Failures

Route is publicly accessible without authentication check.

**Risk**: Unauthenticated users can access user data.

**Fix**:
\`\`\`typescript
export async function GET(request: Request) {
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ... rest of code
}
\`\`\`

---

#### 2. Missing Authorization (CRITICAL)
**Line**: 2
**Type**: A01:2021 - Broken Access Control

No permission check - any authenticated user can access any user's data.

**Risk**: Horizontal privilege escalation.

**Fix**:
\`\`\`typescript
const permissionDenied = await checkPermissionOrRespond(
  auth.userId,
  auth.tenantId || '',
  'users.read'
)
if (permissionDenied) return permissionDenied
\`\`\`

---

#### 3. Missing Tenant Isolation (CRITICAL)
**Line**: 6
**Type**: CGK Platform - Tenant Isolation

SQL query without `withTenant()` wrapper - cross-tenant data leakage possible.

**Risk**: Tenant A can access Tenant B's data.

**Fix**:
\`\`\`typescript
const user = await withTenant(auth.tenantId || '', async () => {
  return sql`SELECT * FROM users WHERE id = ${userId}`
})
\`\`\`

---

#### 4. Excessive Data Exposure (HIGH)
**Line**: 8
**Type**: A04:2021 - Insecure Design

Returning full user object including sensitive fields (password_hash, etc.)

**Risk**: Sensitive data exposure in API response.

**Fix**:
\`\`\`typescript
const user = await sql`
  SELECT id, email, name, role
  FROM users
  WHERE id = ${userId}
`
\`\`\`

---

### Summary

- **Critical**: 3
- **High**: 1
- **Medium**: 0
- **Low**: 0

**Recommendation**: 🚫 **BLOCK DEPLOYMENT** - Fix critical issues before merging.
```

---

## Configuration

`.claude/agents/security-auditor-config.json`:

```json
{
  "severity": {
    "blockOnCritical": true,
    "blockOnHigh": false
  },
  "rules": {
    "secretDetection": true,
    "owaspTop10": true,
    "tenantIsolation": true,
    "dependencyCheck": true
  },
  "allowlist": {
    "patterns": [
      "**/*.test.ts",
      "**/*.spec.ts"
    ],
    "secrets": [
      "PUBLIC_*"
    ]
  },
  "notifications": {
    "slack": {
      "webhook": "$SLACK_SECURITY_WEBHOOK",
      "channel": "#security-alerts"
    }
  }
}
```

---

## Output Files

- `.claude/security-reports/YYYY-MM-DD-audit.md` - Daily audit report
- `.claude/security-reports/vulnerabilities.json` - Machine-readable vulnerability data
- `.claude/security-reports/compliance.pdf` - Compliance report (SOC 2, GDPR)

---

## Cost Analysis

**Model**: Opus 4.5 ($15 / $75 per MTok)

**Typical security review**:
- Input: ~20k tokens (code files, context)
- Output: ~5k tokens (detailed analysis)
- Cost: ~$0.68 per review

**Monthly cost** (3 PRs/day × 22 days):
- 66 reviews × $0.68 = **$45/month**

**Value**:
- Prevents 1 security incident/year: **$10k-$50k+ saved**
- Compliance readiness: Priceless
- Peace of mind: Priceless

**ROI**: 220:1 to 1,100:1 (conservative estimate)

---

## Example Commands

```bash
# Pre-commit security scan
/claude agent run security-auditor --staged

# PR security review
/claude agent run security-auditor --pr 123

# Full codebase audit
/claude agent run security-auditor --full-audit

# Compliance report
/claude agent run security-auditor --compliance soc2

# Check specific vulnerability
/claude agent run security-auditor --check sql-injection
```

---

## Integration with CI/CD

### Block Deployment on Critical Issues

```yaml
- name: Security Audit
  run: |
    result=$(claude-cli agent run security-auditor --json)
    critical=$(echo "$result" | jq '.summary.critical')

    if [ "$critical" -gt 0 ]; then
      echo "::error::$critical critical security issue(s) found"
      exit 1
    fi
```

### Generate Security Badge

```yaml
- name: Generate Security Badge
  run: |
    result=$(claude-cli agent run security-auditor --json)
    issues=$(echo "$result" | jq '.summary.total')

    if [ "$issues" -eq 0 ]; then
      badge="passing"
    else
      badge="failing"
    fi

    echo "SECURITY_BADGE=$badge" >> $GITHUB_ENV
```

---

## False Positive Handling

Mark false positives with comments:

```typescript
// security-ignore: sql-injection - parameterized query
const users = await sql`SELECT * FROM users WHERE id = ${userId}`

// security-ignore: secret-detection - public demo key
const DEMO_API_KEY = 'pk_test_demo123'
```

---

## Future Enhancements

- [ ] Integration with Snyk for dependency scanning
- [ ] SAST tool integration (Semgrep, CodeQL)
- [ ] Runtime security monitoring (RASP)
- [ ] Automated security patch suggestions
- [ ] Security training recommendations based on found issues
- [ ] Penetration testing report integration
