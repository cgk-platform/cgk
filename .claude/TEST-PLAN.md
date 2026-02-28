# CGK Platform - Skills Testing Plan

**Date**: 2026-02-27
**Purpose**: Comprehensive testing checklist for 10 new skills + 2 specialized agents
**Status**: Ready for execution

---

## Overview

This test plan covers smoke testing, integration testing, and validation of all newly implemented skills and agent definitions.

**Total tests**: 45 tests
- Smoke tests: 30 (3 per skill × 10 skills)
- Integration tests: 10 (1 per skill)
- Pre-commit hook tests: 3 (validators)
- CI/CD integration tests: 1 (deployment-readiness-checker)
- Agent definition validation: 2

---

## 1. Smoke Testing (30 tests)

Test basic functionality for each skill without modifying any code.

### 1.1 api-route-scaffolder

- [ ] **Test 1.1.1**: Help flag works
  ```bash
  /api-route-scaffolder --help
  # Expected: Usage guide with examples
  ```

- [ ] **Test 1.1.2**: Dry-run mode works
  ```bash
  /api-route-scaffolder test-resource --methods GET --dry-run
  # Expected: Preview of generated route without creating file
  ```

- [ ] **Test 1.1.3**: Error handling (missing required args)
  ```bash
  /api-route-scaffolder
  # Expected: Error message "Resource name required"
  ```

---

### 1.2 deployment-readiness-checker

- [ ] **Test 1.2.1**: Help flag works
  ```bash
  /deployment-readiness-checker --help
  # Expected: Usage guide with 9 check descriptions
  ```

- [ ] **Test 1.2.2**: Fast mode (skip tests/build)
  ```bash
  /deployment-readiness-checker --skip-tests --skip-build
  # Expected: Completes in <30 seconds, shows skipped checks
  ```

- [ ] **Test 1.2.3**: Error handling (invalid app name)
  ```bash
  /deployment-readiness-checker --app invalid-app
  # Expected: Error message "App not found: invalid-app"
  ```

---

### 1.3 encryption-keys-manager

- [ ] **Test 1.3.1**: Help flag works
  ```bash
  /encryption-keys-manager --help
  # Expected: Usage guide with 4 actions (generate, rotate, verify, history)
  ```

- [ ] **Test 1.3.2**: Generate key (preview only, no save)
  ```bash
  /encryption-keys-manager generate
  # Expected: Displays 64-char hex key, warns to save manually
  ```

- [ ] **Test 1.3.3**: Error handling (invalid action)
  ```bash
  /encryption-keys-manager invalid-action
  # Expected: Error message "Unknown action: invalid-action"
  ```

---

### 1.4 type-cast-auditor

- [ ] **Test 1.4.1**: Help flag works
  ```bash
  /type-cast-auditor --help
  # Expected: Usage guide with validation rules
  ```

- [ ] **Test 1.4.2**: Dry-run mode works
  ```bash
  /type-cast-auditor --path apps/admin --fix --dry-run
  # Expected: Shows proposed fixes without applying
  ```

- [ ] **Test 1.4.3**: Error handling (invalid path)
  ```bash
  /type-cast-auditor --path /invalid/path
  # Expected: Error message "Path not found"
  ```

---

### 1.5 permission-auditor

- [ ] **Test 1.5.1**: Help flag works
  ```bash
  /permission-auditor --help
  # Expected: Usage guide with validation rules
  ```

- [ ] **Test 1.5.2**: Dry-run mode works
  ```bash
  /permission-auditor --path apps/admin --fix --dry-run
  # Expected: Shows proposed fixes without applying
  ```

- [ ] **Test 1.5.3**: Error handling (invalid format)
  ```bash
  /permission-auditor --format invalid
  # Expected: Error message "Invalid format: invalid"
  ```

---

### 1.6 structured-logging-converter

- [ ] **Test 1.6.1**: Help flag works
  ```bash
  /structured-logging-converter --help
  # Expected: Usage guide with conversion patterns
  ```

- [ ] **Test 1.6.2**: Dry-run mode works
  ```bash
  /structured-logging-converter --path apps/admin --convert --dry-run
  # Expected: Shows proposed conversions without applying
  ```

- [ ] **Test 1.6.3**: Error handling (invalid path)
  ```bash
  /structured-logging-converter --path /invalid/path
  # Expected: Error message "Path not found"
  ```

---

### 1.7 todo-tracker

- [ ] **Test 1.7.1**: Help flag works
  ```bash
  /todo-tracker --help
  # Expected: Usage guide with 4 actions
  ```

- [ ] **Test 1.7.2**: Scan action works
  ```bash
  /todo-tracker scan --path apps/admin
  # Expected: Report of TODOs with severity categorization
  ```

- [ ] **Test 1.7.3**: Error handling (invalid action)
  ```bash
  /todo-tracker invalid-action
  # Expected: Error message "Unknown action: invalid-action"
  ```

---

### 1.8 tenant-provisioner

- [ ] **Test 1.8.1**: Help flag works
  ```bash
  /tenant-provisioner --help
  # Expected: Usage guide with provisioning steps
  ```

- [ ] **Test 1.8.2**: Dry-run mode works
  ```bash
  /tenant-provisioner --dry-run test-tenant "Test Tenant" admin@test.com
  # Expected: Shows provisioning steps without executing
  ```

- [ ] **Test 1.8.3**: Error handling (invalid slug format)
  ```bash
  /tenant-provisioner "Invalid Slug!" "Test" admin@test.com
  # Expected: Error message "Invalid slug format (use lowercase, hyphens only)"
  ```

---

### 1.9 migration-impact-analyzer

- [ ] **Test 1.9.1**: Help flag works
  ```bash
  /migration-impact-analyzer --help
  # Expected: Usage guide with validation checklist
  ```

- [ ] **Test 1.9.2**: Analyze existing migration
  ```bash
  /migration-impact-analyzer packages/db/migrations/001_init.sql
  # Expected: Impact report with risk assessment
  ```

- [ ] **Test 1.9.3**: Error handling (file not found)
  ```bash
  /migration-impact-analyzer /invalid/migration.sql
  # Expected: Error message "Migration file not found"
  ```

---

### 1.10 vercel-config-auditor

- [ ] **Test 1.10.1**: Help flag works
  ```bash
  /vercel-config-auditor --help
  # Expected: Usage guide with validation checks
  ```

- [ ] **Test 1.10.2**: Read-only audit
  ```bash
  /vercel-config-auditor
  # Expected: Report of env var consistency across apps
  ```

- [ ] **Test 1.10.3**: Error handling (missing VERCEL_TOKEN)
  ```bash
  unset VERCEL_TOKEN
  /vercel-config-auditor
  # Expected: Error message "VERCEL_TOKEN required"
  ```

---

## 2. Integration Testing (10 tests)

Test each skill with real data in read-only or dry-run mode.

### Integration Test 2.1: api-route-scaffolder

- [ ] **Test 2.1**: Generate test route in apps/admin
  ```bash
  cd apps/admin
  /api-route-scaffolder test-orders --methods GET,POST --dry-run
  # Expected: Valid Next.js route code with auth, tenant context, types
  # Verify: Includes requireAuth(), checkPermissionOrRespond(), withTenant()
  ```

---

### Integration Test 2.2: deployment-readiness-checker

- [ ] **Test 2.2**: Run on apps/admin
  ```bash
  /deployment-readiness-checker --app admin --skip-tests
  # Expected: Report of all 9 checks (some may fail, that's OK for test)
  # Verify: Checks run in correct order, no crashes
  ```

---

### Integration Test 2.3: encryption-keys-manager

- [ ] **Test 2.3**: Generate key only (no Vercel changes)
  ```bash
  /encryption-keys-manager generate --output hex
  # Expected: 64-character hex string
  # Verify: Valid hex characters, correct length
  ```

---

### Integration Test 2.4: type-cast-auditor

- [ ] **Test 2.4**: Scan apps/admin (read-only)
  ```bash
  /type-cast-auditor --path apps/admin --format json > type-casts.json
  # Expected: JSON report of violations
  # Verify: JSON valid, includes file paths, line numbers, suggestions
  ```

---

### Integration Test 2.5: permission-auditor

- [ ] **Test 2.5**: Generate report for apps/admin
  ```bash
  /permission-auditor --path apps/admin --format csv > permissions.csv
  # Expected: CSV report of API routes
  # Verify: CSV valid, includes protected/unprotected status
  ```

---

### Integration Test 2.6: structured-logging-converter

- [ ] **Test 2.6**: Scan apps/admin (read-only)
  ```bash
  /structured-logging-converter --path apps/admin
  # Expected: Report of console.* calls
  # Verify: Categorized by type (log/error/warn), includes suggestions
  ```

---

### Integration Test 2.7: todo-tracker

- [ ] **Test 2.7**: Scan entire codebase
  ```bash
  /todo-tracker scan --format json > todos.json
  # Expected: JSON report of all TODOs
  # Verify: Severity categorization, module categorization
  ```

---

### Integration Test 2.8: tenant-provisioner

- [ ] **Test 2.8**: Dry-run mode only (no DB changes)
  ```bash
  /tenant-provisioner --dry-run test-smoke "Test Smoke" test@example.com
  # Expected: Shows 6 provisioning steps
  # Verify: Input validation passes, steps outlined correctly
  ```

---

### Integration Test 2.9: migration-impact-analyzer

- [ ] **Test 2.9**: Analyze an existing migration
  ```bash
  /migration-impact-analyzer packages/db/migrations/002_add_tenants.sql
  # Expected: Impact analysis report
  # Verify: Table impact, type compatibility, idempotency checks
  ```

---

### Integration Test 2.10: vercel-config-auditor

- [ ] **Test 2.10**: Read-only scan
  ```bash
  /vercel-config-auditor --format json > vercel-audit.json
  # Expected: JSON report of env var consistency
  # Verify: Covers all 6 apps, identifies missing vars
  ```

---

## 3. Pre-Commit Hook Testing (3 tests)

Test validators in pre-commit hook context.

### Test 3.1: type-cast-auditor

- [ ] **Test 3.1**: Add to .husky/pre-commit, make deliberate violation
  ```bash
  # 1. Add to .husky/pre-commit:
  echo "/type-cast-auditor --files \"\$(git diff --cached --name-only | grep '.tsx\?$')\" --strict" >> .husky/pre-commit

  # 2. Create violation
  echo "const x = data as MyType" > test-violation.ts
  git add test-violation.ts

  # 3. Attempt commit
  git commit -m "test"

  # Expected: Commit blocked with error message
  # Cleanup: git reset HEAD test-violation.ts && rm test-violation.ts
  ```

---

### Test 3.2: permission-auditor

- [ ] **Test 3.2**: Add to .husky/pre-commit, make deliberate violation
  ```bash
  # 1. Add to .husky/pre-commit:
  echo "/permission-auditor --files \"\$(git diff --cached --name-only | grep 'route.ts$')\" --strict" >> .husky/pre-commit

  # 2. Create violation (API route without requireAuth)
  mkdir -p apps/admin/app/api/test
  cat > apps/admin/app/api/test/route.ts <<EOF
  export async function GET() {
    return Response.json({ data: 'unprotected' })
  }
  EOF
  git add apps/admin/app/api/test/route.ts

  # 3. Attempt commit
  git commit -m "test"

  # Expected: Commit blocked with error message
  # Cleanup: git reset HEAD apps/admin/app/api/test/route.ts && rm -rf apps/admin/app/api/test
  ```

---

### Test 3.3: structured-logging-converter

- [ ] **Test 3.3**: Add to .husky/pre-commit, make deliberate violation
  ```bash
  # 1. Add to .husky/pre-commit:
  echo "/structured-logging-converter --files \"\$(git diff --cached --name-only | grep '.tsx\?$')\" --strict" >> .husky/pre-commit

  # 2. Create violation
  echo "console.log('test')" > test-console.ts
  git add test-console.ts

  # 3. Attempt commit
  git commit -m "test"

  # Expected: Commit blocked with error message
  # Cleanup: git reset HEAD test-console.ts && rm test-console.ts
  ```

---

## 4. CI/CD Integration Testing (1 test)

Test deployment-readiness-checker in GitHub Actions.

### Test 4.1: GitHub Actions Workflow

- [ ] **Test 4.1**: Create test workflow
  ```yaml
  # .github/workflows/test-deployment-checker.yml
  name: Test Deployment Checker

  on:
    workflow_dispatch:

  jobs:
    check:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
        - run: pnpm install
        - name: Run Deployment Checker
          run: /deployment-readiness-checker --app admin --skip-tests --skip-build

  # Expected: Workflow runs successfully, shows check results
  # Verify: All checks execute, no crashes
  # Cleanup: Delete workflow file
  ```

---

## 5. Agent Definition Validation (2 tests)

Verify specialized agent definitions are complete and usable.

### Test 5.1: build-optimizer agent

- [ ] **Test 5.1**: Verify agent definition file exists and is complete
  ```bash
  # 1. Check file exists
  ls .claude/agents/build-optimizer.md

  # 2. Verify sections present:
  grep -E "^## (Purpose|Responsibilities|Tools|When to Invoke)" .claude/agents/build-optimizer.md

  # Expected: All 4 sections present
  # Verify: Model assignment (Sonnet 4.5), cost documented, example invocations
  ```

---

### Test 5.2: security-auditor agent

- [ ] **Test 5.2**: Verify agent definition file exists and is complete
  ```bash
  # 1. Check file exists
  ls .claude/agents/security-auditor.md

  # 2. Verify sections present:
  grep -E "^## (Purpose|Responsibilities|Tools|When to Invoke)" .claude/agents/security-auditor.md

  # Expected: All 4 sections present
  # Verify: Model assignment (Opus 4.5), cost documented, OWASP Top 10 coverage
  ```

---

## 6. Documentation Validation

### Test 6.1: README.md Completeness

- [ ] **Test 6.1**: All 10 skills have complete READMEs
  ```bash
  # Check all README files exist
  for skill in api-route-scaffolder deployment-readiness-checker encryption-keys-manager \
               type-cast-auditor permission-auditor structured-logging-converter \
               todo-tracker tenant-provisioner migration-impact-analyzer vercel-config-auditor; do
    if [ ! -f ".claude/skills/$skill/README.md" ]; then
      echo "❌ Missing README: $skill"
    else
      echo "✅ Found README: $skill"
    fi
  done

  # Expected: All 10 ✅
  ```

---

### Test 6.2: SKILL-REGISTRY.md Updated

- [ ] **Test 6.2**: SKILL-REGISTRY.md reflects all new skills
  ```bash
  # Verify count updated
  grep "## 1. Executable Skills (15 Total)" .claude/SKILL-REGISTRY.md

  # Verify all 10 new skills documented
  grep -E "(api-route-scaffolder|deployment-readiness-checker|encryption-keys-manager|type-cast-auditor|permission-auditor|structured-logging-converter|todo-tracker|tenant-provisioner|migration-impact-analyzer|vercel-config-auditor)" .claude/SKILL-REGISTRY.md

  # Expected: All skills found in registry
  ```

---

### Test 6.3: CLAUDE.md Updated

- [ ] **Test 6.3**: CLAUDE.md Skills System section updated
  ```bash
  # Verify count updated
  grep "## Skills System" -A 20 CLAUDE.md | grep "15 Total"

  # Verify tier structure exists
  grep -E "Tier (1|2|3|4):" CLAUDE.md

  # Expected: Shows 15 total skills, organized by tier
  ```

---

## 7. Test Execution Summary

**Test Progress Tracker**:

| Category | Total Tests | Passed | Failed | Skipped |
|----------|-------------|--------|--------|---------|
| Smoke Tests | 30 | 0 | 0 | 0 |
| Integration Tests | 10 | 0 | 0 | 0 |
| Pre-Commit Hooks | 3 | 0 | 0 | 0 |
| CI/CD Integration | 1 | 0 | 0 | 0 |
| Agent Validation | 2 | 0 | 0 | 0 |
| Documentation | 3 | 0 | 0 | 0 |
| **TOTAL** | **49** | **0** | **0** | **0** |

---

## 8. Success Criteria

**Definition of Done**:
- [ ] All 30 smoke tests pass
- [ ] All 10 integration tests complete without errors
- [ ] At least 2 pre-commit hook tests pass (demonstrating blocking behavior)
- [ ] CI/CD integration test runs successfully
- [ ] Both agent definitions validated
- [ ] All 3 documentation tests pass

**Acceptance**:
- ≥90% of tests passing = PASS
- <90% of tests passing = FAIL (investigate failures)

---

## 9. Known Issues / Expected Failures

Document any expected failures here during test execution:

1. **Test 2.2** (deployment-readiness-checker): May fail some checks (env vars missing, build errors) - this is expected and acceptable as long as the skill runs without crashing.

2. **Test 3.x** (pre-commit hooks): Requires manual cleanup after each test - expected behavior.

3. **Test 4.1** (CI/CD): Requires GitHub Actions runner - may need to be run separately or skipped if testing locally.

---

## 10. Post-Test Actions

After completing all tests:

1. [ ] Update test progress tracker with results
2. [ ] Document any bugs found in GitHub issues
3. [ ] Update README files if any documentation gaps found
4. [ ] Add test results to `.claude/audits/skills-testing-report.md`
5. [ ] Mark skills as "production-ready" in SKILL-REGISTRY.md

---

**Test Plan Version**: 1.0.0
**Created**: 2026-02-27
**Last Updated**: 2026-02-27
**Status**: Ready for execution
