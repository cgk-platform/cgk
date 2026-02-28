# Definition of Done

> **Purpose**: Comprehensive completion criteria for all CGK platform development work
>
> **Last Updated**: 2026-02-27
> **Status**: Active
> **Related**: [SESSION-HANDOFF-TEMPLATE.md](./SESSION-HANDOFF-TEMPLATE.md), [CODE-REVIEW-CHECKLIST.md](./CODE-REVIEW-CHECKLIST.md)

---

## Overview

This document defines what "done" means for all CGK platform work. No task, feature, or phase is complete until ALL applicable criteria are met.

**Integration**: This checklist is automatically included in all session handoff documents and used by implementer/reviewer agents.

---

## Code Quality (MUST PASS)

All code must pass these automated checks before being considered complete:

### Type Checking

**Command**:
```bash
pnpm turbo typecheck --filter=[app-name]
```

**Expected Output**:
```
✓ Typecheck completed successfully (no errors)
```

**Failure**: Fix all TypeScript errors before proceeding.

---

### Linting

**Command**:
```bash
pnpm turbo lint --filter=[app-name]
```

**Expected Output**:
```
✓ Lint completed successfully (no errors)
```

**Failure**: Fix all ESLint errors before proceeding. Warnings are acceptable but should be tracked.

---

### Tenant Isolation Validation

**Command**:
```bash
pnpm validate:tenant-isolation --path apps/[app-name]
```

**Expected Output**:
```
✓ No tenant isolation violations found
```

**Common Violations & Fixes**:

```typescript
// VIOLATION: Raw SQL without withTenant()
const orders = await sql`SELECT * FROM orders`

// FIX:
const orders = await withTenant(tenantId, () =>
  sql`SELECT * FROM orders`
)

// VIOLATION: Raw cache without createTenantCache()
await redis.set('key', value)

// FIX:
const cache = createTenantCache(tenantId)
await cache.set('key', value)

// VIOLATION: Job missing tenantId
await jobs.send('order/created', { orderId })

// FIX:
await jobs.send('order/created', { tenantId, orderId })
```

**Auto-fix mode** (for simple violations):
```bash
pnpm validate:tenant-isolation --fix --path apps/[app-name]
```

**Failure**: All violations MUST be fixed. This is a BLOCKING requirement.

---

### Migration Validation (If Applicable)

**When Required**: Any changes to `packages/db/src/migrations/*.sql`

**Command**:
```bash
bash scripts/validate-migration.sh [migration-file]
```

**Expected Output**:
```
✓ Migration validation passed
✓ ID types match (UUID vs TEXT)
✓ Idempotency checks present (IF NOT EXISTS)
✓ pgvector syntax correct
```

**Common Issues & Fixes**:

```sql
-- ISSUE: Missing IF NOT EXISTS
CREATE TABLE tenant_orders (...);

-- FIX:
CREATE TABLE IF NOT EXISTS tenant_orders (...);

-- ISSUE: UUID vs TEXT mismatch
user_id TEXT REFERENCES public.users(id)  -- users.id is UUID!

-- FIX:
user_id UUID REFERENCES public.users(id)

-- ISSUE: pgvector syntax
embedding vector(1536)  -- Missing public schema prefix

-- FIX:
embedding public.vector(1536)
```

**Dry-run test**:
```bash
npx @cgk-platform/cli migrate --dry-run --tenant rawdog
```

**Failure**: All migration syntax errors MUST be fixed before merge.

---

### Environment Variable Validation (If Applicable)

**When Required**: Any changes to `.env.example` or new environment variables added

**Command**:
```bash
bash scripts/verify-env-vars.sh
```

**Expected Output**:
```
✓ All .env.example files in sync
✓ All required variables documented
```

**Common Issues**:
- New var added to one app's `.env.example` but not others
- Production var exists in Vercel but not documented in `.env.example`
- `.env.example` contains real values instead of placeholders

**Fix**: Update ALL `apps/*/. env.example` files with documented placeholders.

**Failure**: All apps' `.env.example` files must be consistent.

---

## Testing (MUST PASS)

### Unit Tests

**Command**:
```bash
pnpm test --filter=[app-name]
```

**Expected Output**:
```
Test Suites: X passed, X total
Tests:       Y passed, Y total
```

**Coverage Requirements**:
- **Critical paths**: 100% (auth, payments, tenant isolation)
- **Business logic**: 80%+
- **UI components**: 60%+

**Failure**: All tests must pass. Skipped tests are not acceptable unless explicitly approved.

---

### Integration Tests (If Applicable)

**When Required**: API routes, database operations, external integrations

**Command**:
```bash
pnpm test:integration --filter=[app-name]
```

**Expected Output**:
```
✓ All integration tests passed
```

**Examples**:
- API route end-to-end tests (request → response)
- Database transaction tests (INSERT → SELECT → verify)
- Webhook handler tests (signature verification → processing)

**Failure**: Fix failing tests or add missing coverage.

---

### Manual Smoke Test

**When Required**: All feature work, before deployment

**Checklist**:
- [ ] Feature works end-to-end in local development
- [ ] Error states handled gracefully (invalid input, network errors)
- [ ] Loading states display correctly
- [ ] Success messages display correctly
- [ ] Browser console has no errors (critical)
- [ ] Network tab shows expected requests

**Failure**: Document issues as blockers and fix before marking done.

---

## Documentation (MUST COMPLETE)

### CLAUDE.md Updates (If Applicable)

**When Required**: New patterns, architectural changes, critical rules

**Examples**:
- New tenant isolation pattern added
- Auth flow changed
- Environment variable workflow updated
- API route pattern changed

**Update Sections**:
- Add to relevant section (e.g., "## Authentication", "## Multi-Tenancy Patterns")
- Add example code snippets
- Update quick reference tables

**Verification**: Search CLAUDE.md for related keywords to ensure consistency.

---

### ADR Creation (If Applicable)

**When Required**: Architectural decisions, precedent-setting choices, trade-off analysis

**Template**: `.claude/adrs/template.md`

**Examples**:
- Choosing between technologies (Stripe vs PayPal)
- Data modeling decisions (schema-per-tenant vs row-level security)
- Workflow changes (Husky vs GitHub Actions)

**ADR Contents**:
1. **Status**: Proposed/Accepted/Deprecated
2. **Context**: Problem being solved
3. **Decision**: What was chosen
4. **Consequences**: Trade-offs, pros/cons
5. **Alternatives Considered**: What else was evaluated

**Location**: `.claude/adrs/00X-decision-name.md`

**Failure**: Major architectural decisions without ADRs create knowledge loss.

---

### README Updates (If Applicable)

**When Required**: New features, packages, or significant functionality

**Examples**:
- New package created → Update package README
- New API endpoint added → Update API documentation
- New skill created → Update skill README

**README Must Include**:
- Clear description of what it does
- Installation/setup instructions
- Usage examples (code snippets)
- Configuration options
- Common troubleshooting

---

### Code Comments (Complex Logic Only)

**When Required**: Non-obvious logic, algorithm choices, workaround explanations

**Good Comments**:
```typescript
// Use cursor pagination instead of OFFSET to avoid slow queries on large datasets
// (OFFSET 10000 scans and discards 10000 rows every time)

// Stripe webhook signatures expire after 5 minutes for security
// Verify before processing to prevent replay attacks

// Retry with exponential backoff: 1s, 2s, 4s, 8s, 16s (max 5 attempts)
// Shopify API rate limits are 2 requests/second, backoff prevents 429 errors
```

**Bad Comments**:
```typescript
// Get orders (code is self-explanatory)
const orders = await getOrders()

// Increment counter (obvious)
count++
```

**Rule**: Comment **why**, not **what**. Code should be self-documenting.

---

## Deployment Readiness (MUST VERIFY)

### Environment Variables Configured

**Checklist**:
- [ ] All new env vars added to Vercel (production, preview, development)
  ```bash
  cd apps/[app-name]
  vercel env add VAR_NAME production --scope cgk-linens-88e79683
  vercel env add VAR_NAME preview --scope cgk-linens-88e79683
  vercel env add VAR_NAME development --scope cgk-linens-88e79683
  ```

- [ ] All new env vars documented in `.env.example` (ALL apps if shared)
  ```bash
  # Example documentation
  # ===================
  # OAUTH CONFIGURATION
  # ===================
  # Google OAuth credentials from Google Cloud Console
  # Create at: https://console.cloud.google.com/apis/credentials
  GOOGLE_CLIENT_ID=your-google-client-id
  GOOGLE_CLIENT_SECRET=your-google-client-secret
  ```

- [ ] Local `.env.local` synced from Vercel
  ```bash
  cd apps/[app-name]
  vercel env pull .env.local --scope cgk-linens-88e79683
  ```

**Failure**: Missing env vars cause production failures. All vars MUST be configured.

---

### Database Migrations Tested

**Checklist**:
- [ ] Migrations run successfully in local development
  ```bash
  npx @cgk-platform/cli migrate --tenant rawdog
  ```

- [ ] Dry-run test passed (no errors)
  ```bash
  npx @cgk-platform/cli migrate --dry-run --tenant rawdog
  ```

- [ ] Rollback plan exists (for complex migrations)
  ```sql
  -- packages/db/src/migrations/XXX_feature_rollback.sql
  DROP TABLE IF EXISTS tenant_new_table;
  ALTER TABLE tenant_existing DROP COLUMN IF EXISTS new_column;
  ```

- [ ] Migration impact analyzed (see `.claude/skills/migration-impact-analyzer/`)
  ```bash
  /migration-impact-analyzer packages/db/src/migrations/XXX_feature.sql
  ```

**Failure**: Untested migrations can corrupt production data. Always test locally first.

---

### No Hardcoded Secrets or Credentials

**Scan for violations**:
```bash
# Search for common secret patterns
grep -r "sk_live_" apps/
grep -r "pk_live_" apps/
grep -r "api_key" apps/ --exclude-dir=node_modules
grep -r "client_secret" apps/ --exclude-dir=node_modules
```

**Expected Output**: Only references in `.env.example` (placeholders) or environment variable usage.

**Violations**:
```typescript
// ❌ CRITICAL VIOLATION
const stripe = new Stripe('sk_live_abc123xyz')

// ✅ CORRECT
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
```

**Failure**: Hardcoded secrets MUST be moved to environment variables immediately.

---

### Vercel Configuration Correct

**Checklist**:
- [ ] Vercel project linked to correct team
  ```bash
  vercel link --scope cgk-linens-88e79683
  ```

- [ ] Build command correct in `package.json`
  ```json
  {
    "scripts": {
      "build": "next build"  // Standard Next.js build
    }
  }
  ```

- [ ] Framework detection correct (Next.js 15+)
  ```bash
  vercel inspect [deployment-url]
  # Verify: Framework: Next.js
  ```

- [ ] No `.env.production` files exist (security risk)
  ```bash
  find . -name ".env.production" -type f
  # Expected output: (empty)
  ```

**Failure**: Incorrect Vercel config causes deployment failures.

---

### Git Working Tree Clean

**Command**:
```bash
git status
```

**Expected Output**:
```
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

**Violations**:
- Uncommitted changes
- Untracked files (except intentional exclusions)
- Merge conflicts

**Fix**: Commit all changes before marking work complete.

---

## Handoff Preparation (MUST CREATE)

### Handoff Document Created

**When Required**: All session transitions, phase completions, agent handoffs

**Template**: `.claude/SESSION-HANDOFF-TEMPLATE.md`

**Location**: `.claude/session-handoffs/[PHASE]-[TASK]-HANDOFF-[DATE].md`

**Must Include**:
1. **Executive Summary** - 1-3 sentence overview
2. **Completed Tasks** - Deliverables with checkboxes
3. **Files Modified** - New + modified files listed
4. **Next Steps** - Priority-ordered tasks (Priority 1/2/3)
5. **Critical State** - Env vars, schema changes, decisions
6. **Cost Tracking** - Tokens used, cost, budget status
7. **Verification Results** - Output of all validation commands

**Failure**: Without handoff documents, context is lost and work must be redone.

---

### Modified Files Listed

**Format**:
```markdown
## Files Modified

### New Files (X total)
- `apps/admin/app/api/orders/route.ts` - GET/POST handlers for orders
- `packages/db/src/migrations/025_orders.sql` - Orders table schema
- `apps/admin/__tests__/api/orders.test.ts` - Integration tests

### Modified Files (Y total)
- `CLAUDE.md` (+15, -2) - Added orders API documentation
- `apps/admin/app/layout.tsx` (+3, -0) - Added orders nav link

**Total Line Changes**: +X additions, -Y deletions
```

**Tool**:
```bash
git diff --stat origin/main
```

**Failure**: Unlisted changes create confusion for next agent.

---

### Next Steps Prioritized

**Format**:
```markdown
## Next Steps

### Priority 1 (Critical Path)
1. Implement order detail page at `/admin/orders/[id]`
2. Add order filtering by status (pending, shipped, delivered)
3. Create order export to CSV functionality

### Priority 2 (Supporting Work)
4. Add tests for order filtering
5. Add tests for CSV export
6. Update admin dashboard to show order count

### Priority 3 (Documentation/Polish)
7. Add screenshots to README
8. Update CLAUDE.md with order workflow
9. Create ADR for CSV export library choice
```

**Rule**: Priority 1 tasks are the **critical path** - must be done next. Priority 2/3 are supporting work.

**Failure**: Without prioritized next steps, next agent wastes time deciding what to do.

---

### Cost Tracked

**Format**:
```markdown
## Cost Tracking

### This Session
- **Model**: sonnet-4.5
- **Input Tokens**: 80,000
- **Output Tokens**: 12,000
- **Total Cost**: ~$3.24
- **Duration**: 2 hours

### Phase Budget Status
- **Phase 2B Budget**: $50
- **Spent So Far**: $28.50 (this session + previous)
- **Remaining**: $21.50
- **Status**: ✅ On track (57% of budget used, 70% of phase complete)
- **Efficiency**: $0.41/file modified (8 files in this session)
```

**Tool**: Track tokens shown in Claude Code CLI after each turn

**Failure**: Without cost tracking, budget overruns go unnoticed.

---

## Success Verification

Before marking ANY work as complete, verify ALL of the following:

```markdown
## Definition of Done Checklist

### Code Quality ✅
- [ ] `pnpm turbo typecheck --filter=[app]` - PASSED
- [ ] `pnpm turbo lint --filter=[app]` - PASSED
- [ ] `pnpm validate:tenant-isolation --path apps/[app]` - PASSED
- [ ] `bash scripts/validate-migration.sh` - PASSED (if migrations changed)
- [ ] `bash scripts/verify-env-vars.sh` - PASSED (if env vars changed)

### Testing ✅
- [ ] `pnpm test --filter=[app]` - PASSED (all tests)
- [ ] Integration tests passed (if applicable)
- [ ] Manual smoke test completed successfully
- [ ] No browser console errors (critical)

### Documentation ✅
- [ ] CLAUDE.md updated (if patterns changed)
- [ ] ADR created (if architectural decision)
- [ ] README updated (if feature added)
- [ ] Code comments added (complex logic only)

### Deployment Readiness ✅
- [ ] Environment variables added to Vercel (production, preview, development)
- [ ] Environment variables documented in .env.example (all apps if shared)
- [ ] Database migrations tested (dry-run + actual)
- [ ] No hardcoded secrets or credentials
- [ ] Vercel config correct (team scope, framework)
- [ ] Git working tree clean

### Handoff Preparation ✅
- [ ] Handoff document created at `.claude/session-handoffs/`
- [ ] Modified files listed with line counts
- [ ] Next steps prioritized (Priority 1/2/3)
- [ ] Cost tracked (tokens, cost, budget status)
- [ ] Verification command outputs included
```

**All checkboxes must be checked** before work is considered complete.

---

## Escalation

If ANY of these criteria cannot be met:

1. **Document blockers** in handoff document
2. **Create GitHub issues** for unresolved items
3. **Mark status as `BLOCKED`** (not `COMPLETE`)
4. **Escalate to appropriate agent**:
   - Security issues → `security-auditor` agent (Opus 4.5)
   - Architecture decisions → `architect` agent (Opus 4.5)
   - Complex bugs → `debugger` agent (Sonnet 4.5)

---

## Examples

### Example 1: Feature Implementation Complete

```markdown
# OAuth Integration Handoff

**Status**: ✅ COMPLETE (all DoD criteria met)

## Definition of Done Verification

### Code Quality ✅
- [x] `pnpm turbo typecheck --filter=admin` - PASSED
- [x] `pnpm turbo lint --filter=admin` - PASSED
- [x] `pnpm validate:tenant-isolation --path apps/admin` - PASSED
- [x] `bash scripts/validate-migration.sh` - PASSED

### Testing ✅
- [x] `pnpm test --filter=admin` - PASSED (12 new tests, all passing)
- [x] Manual smoke test - Google OAuth flow works end-to-end
- [x] Browser console - No errors

### Documentation ✅
- [x] CLAUDE.md updated - Added OAuth setup section
- [x] ADR-007 created - OAuth provider choice (Google vs Auth0)
- [x] apps/admin/README.md updated - OAuth configuration steps

### Deployment Readiness ✅
- [x] Env vars added to Vercel (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- [x] Env vars documented in .env.example (all 5 apps)
- [x] Migration tested - oauth_providers table created successfully
- [x] No hardcoded secrets (verified with grep)
- [x] Git clean - all changes committed

### Handoff Preparation ✅
- [x] Handoff document created at `.claude/session-handoffs/PHASE-2B-OAUTH-HANDOFF.md`
- [x] 8 files modified (5 new, 3 modified) - all listed
- [x] Next steps prioritized (add GitHub provider next)
- [x] Cost tracked - $3.24 spent, $21.50 remaining

**Result**: Feature is COMPLETE and ready for production deployment.
```

---

### Example 2: Work Blocked (Incomplete)

```markdown
# Payment Webhook Handler Handoff

**Status**: 🔴 BLOCKED (DoD criteria NOT met)

## Definition of Done Verification

### Code Quality ⚠️
- [x] `pnpm turbo typecheck --filter=admin` - PASSED
- [x] `pnpm turbo lint --filter=admin` - PASSED
- [x] `pnpm validate:tenant-isolation --path apps/admin` - PASSED

### Testing ❌
- [ ] `pnpm test --filter=admin` - FAILED (signature verification test failing)
- [x] Manual smoke test - Works in development
- [x] Browser console - No errors

### Documentation ⚠️
- [x] CLAUDE.md updated - Added webhook handler section
- [ ] ADR created - NOT NEEDED (following existing patterns)
- [x] README updated - Webhook setup instructions

### Deployment Readiness ❌
- [x] Env vars added to Vercel
- [x] Env vars documented
- [ ] Stripe webhook secret - MISSING (need production value from user)
- [x] No hardcoded secrets
- [x] Git clean

### Handoff Preparation ✅
- [x] Handoff document created
- [x] Files listed
- [x] Next steps prioritized
- [x] Cost tracked

## Blockers

1. **Test failure**: Signature verification test failing with mock webhook
   - Issue: Test uses incorrect HMAC format
   - Owner: Tester agent should fix

2. **Missing env var**: STRIPE_WEBHOOK_SECRET not configured in Vercel production
   - Issue: Need production webhook secret from Stripe Dashboard
   - Owner: User must provide value

**Result**: Work is BLOCKED until blockers resolved. Escalating test issue to tester agent.
```

---

## Related Documentation

- [SESSION-HANDOFF-TEMPLATE.md](./SESSION-HANDOFF-TEMPLATE.md) - Handoff document template
- [CODE-REVIEW-CHECKLIST.md](./CODE-REVIEW-CHECKLIST.md) - Review criteria
- [CONTEXT-MGMT.md](./CONTEXT-MGMT.md) - Context management strategies
- [CLAUDE.md](../CLAUDE.md) - Platform instructions

---

## Changelog

- **2026-02-27**: Initial Definition of Done created based on existing validation scripts and best practices

---

**End of Document**

_No work is complete until ALL applicable criteria are met. Use this checklist systematically. Don't skip steps._
