# PHASE-7B: Migration Testing

**Duration**: 1 week (Week 25)
**Depends On**: PHASE-7A (Data Migration complete)
**Parallel With**: None
**Blocks**: PHASE-7C (Migration Cutover)

---

## Goal

Comprehensive testing of the migrated platform covering unit tests for tenant isolation, integration tests for API routes, E2E tests with Playwright, and performance tests with k6 to ensure production readiness.

---

## Success Criteria

- [ ] Unit tests verify tenant schema isolation
- [ ] Unit tests confirm cross-tenant data access prevented
- [ ] Integration tests cover all admin API endpoints
- [ ] Integration tests verify tenant filtering in responses
- [ ] E2E tests pass for critical user flows (login, dashboard, orders)
- [ ] Performance tests meet thresholds: p95 < 500ms, error rate < 1%
- [ ] Load test handles 100 concurrent users
- [ ] All test suites pass in CI/CD pipeline

---

## Deliverables

### Unit Tests
- `packages/db/src/__tests__/tenant.test.ts` - Tenant isolation tests
- `packages/db/src/__tests__/context.test.ts` - withTenant context tests
- `packages/auth/src/__tests__/jwt.test.ts` - Authentication tests

### Integration Tests
- `apps/admin/src/__tests__/orders.test.ts` - Orders API tests
- `apps/admin/src/__tests__/customers.test.ts` - Customers API tests
- `apps/admin/src/__tests__/creators.test.ts` - Creators API tests
- `apps/admin/src/test-utils/` - Test client, seed data, cleanup helpers

### E2E Tests
- `apps/admin/e2e/admin-flow.spec.ts` - Admin portal flows
- `apps/admin/e2e/login.spec.ts` - Authentication flows
- `apps/admin/e2e/orders.spec.ts` - Order management flows
- `apps/admin/playwright.config.ts` - Playwright configuration

### Performance Tests
- `tooling/perf/load-test.ts` - k6 load test script
- `tooling/perf/k6.config.ts` - Test configuration and thresholds
- `tooling/perf/scenarios/` - Specific test scenarios

---

## Constraints

- MUST use Playwright for E2E tests (not Cypress)
- MUST wait for `networkidle` before DOM inspection
- MUST use reconnaissance-then-action pattern (screenshot, inspect, act)
- MUST clean up test data after each test suite
- MUST NOT use production data for testing
- k6 thresholds: p95 < 500ms, http_req_failed < 0.01

---

## Pattern References

**Skills to invoke:**
- `/webapp-testing` - REQUIRED for Playwright E2E tests; contains server lifecycle, selectors, patterns

**MCPs to consult:**
- Context7 MCP: "Playwright test async await patterns"
- Context7 MCP: "k6 load testing stages thresholds"

**RAWDOG code to reference:**
- `playwright.config.ts` - Existing Playwright configuration
- `e2e/` - Existing E2E test patterns

**Spec documents:**
- `ARCHITECTURE.md` - API route structure for integration tests

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Test data seeding strategy (fixtures vs factories)
2. Parallel test execution configuration
3. Screenshot capture strategy for debugging
4. k6 scenario duration and user ramp-up profile
5. CI integration approach (GitHub Actions vs other)

---

## Tasks

### [PARALLEL] Unit Test Suite
- [ ] Create tenant isolation tests:
  - Test: queries scoped to tenant schema
  - Test: `current_schema()` returns `tenant_{slug}`
- [ ] Create cross-tenant access prevention tests:
  - Test: data created in tenant A not visible in tenant B
  - Test: withTenant() properly switches context
- [ ] Create authentication tests:
  - Test: JWT token validation
  - Test: session creation and verification

### [PARALLEL] Integration Test Suite
- [ ] Create test utilities:
  - createTestClient({ tenant }) helper
  - seedTestData(tenant) function
  - cleanupTestData(tenant) function
- [ ] Create Orders API tests:
  - Test: list orders returns 200 with data
  - Test: filter by status works
  - Test: orders from other tenants not returned
- [ ] Create Customers API tests:
  - Test: search by email works
  - Test: tenant isolation enforced
- [ ] Create Creators API tests:
  - Test: CRUD operations work
  - Test: payout calculations correct

### [SEQUENTIAL after Unit + Integration] E2E Test Suite
- [ ] Configure Playwright with base URL and authentication
- [ ] Create login flow tests:
  - Navigate to /login
  - Fill email, submit
  - Verify magic link redirect
- [ ] Create dashboard tests:
  - Navigate to /admin
  - Verify h1 contains "Dashboard"
  - Verify revenue-card and orders-card visible
- [ ] Create orders tests:
  - Navigate to /admin/orders
  - Verify table renders with rows
  - Test date filter interaction
  - Verify row click opens detail

### [SEQUENTIAL after E2E] Performance Test Suite
- [ ] Create k6 load test configuration:
  ```
  stages:
    - 1m ramp to 50 users
    - 3m hold at 50 users
    - 1m ramp to 100 users
    - 3m hold at 100 users
    - 1m ramp down
  ```
- [ ] Define thresholds:
  - http_req_duration p95 < 500ms
  - http_req_failed rate < 0.01
- [ ] Create test scenarios:
  - Dashboard API load
  - Orders list API load
  - Customers search API load
- [ ] Add response validation checks in k6 script

### [SEQUENTIAL after all above] CI Integration
- [ ] Add test commands to package.json
- [ ] Create GitHub Actions workflow for test suite
- [ ] Configure test database provisioning
- [ ] Add test result reporting

---

## Definition of Done

- [ ] Unit tests: 100% pass rate for tenant isolation
- [ ] Integration tests: all API endpoints covered
- [ ] E2E tests: critical flows pass consistently
- [ ] Performance tests: all thresholds met
- [ ] Test coverage report generated
- [ ] CI pipeline runs all tests on PR
- [ ] `npx tsc --noEmit` passes
- [ ] No flaky tests (3 consecutive green runs)
