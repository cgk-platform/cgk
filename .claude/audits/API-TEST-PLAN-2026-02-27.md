# Comprehensive API & Auth Test Plan

**Date:** 2026-02-27
**Purpose:** Ensure all critical endpoints, auth flows, and SSO work correctly
**Status:** 🟡 In Progress

---

## Executive Summary

Following the SSO audit, we need comprehensive test coverage for:
1. **Authentication flows** (login, logout, session management)
2. **SSO flows** (token generation, verification, consumption)
3. **API endpoints** (orchestrator, admin)
4. **Tenant isolation** (critical security requirement)
5. **Permission checks** (authorization)

---

## Test Categories

### 1. Authentication Core (`packages/auth`)

| Test Suite | Status | Coverage |
|------------|--------|----------|
| JWT signing/verification | ✅ Exists | `__tests__/jwt.test.ts` |
| Session management | ✅ Exists | `__tests__/session.test.ts` |
| Password hashing | ✅ Exists | `__tests__/password.test.ts` |
| Cookie handling | ✅ Exists | `__tests__/cookies.test.ts` |
| Permissions | ✅ Exists | `__tests__/permissions.test.ts` |
| Magic links | ✅ Exists | `__tests__/magic-link.test.ts` |
| SSO | ❌ **MISSING** | Need to create |
| Tenant context | ✅ Exists | `__tests__/tenant-context.test.ts` |

**Action Items:**
- [ ] Create SSO test suite
- [ ] Add integration tests for full auth flows

---

### 2. SSO Flow (Cross-App Authentication)

**Critical Path:** Orchestrator → Admin

| Test | Priority | Status |
|------|----------|--------|
| Generate SSO token (authenticated user) | 🔴 Critical | ❌ Missing |
| Generate SSO token (unauthenticated user) | 🔴 Critical | ❌ Missing |
| Generate SSO token (invalid tenant) | 🔴 Critical | ❌ Missing |
| Verify SSO token (valid, unused) | 🔴 Critical | ❌ Missing |
| Verify SSO token (already used) | 🔴 Critical | ❌ Missing |
| Verify SSO token (expired) | 🔴 Critical | ❌ Missing |
| Verify SSO token (wrong app) | 🔴 Critical | ❌ Missing |
| Session creation after SSO | 🔴 Critical | ❌ Missing |
| Cookie setting after SSO | 🔴 Critical | ❌ Missing |
| Redirect after SSO | 🔴 Critical | ❌ Missing |

**Files to Test:**
- `apps/orchestrator/src/app/api/sso/generate/route.ts`
- `apps/admin/src/app/api/sso/verify/route.ts`
- `packages/auth/src/sso.ts`

**Action Items:**
- [ ] Create `apps/orchestrator/src/app/api/sso/__tests__/generate.test.ts`
- [ ] Create `apps/admin/src/app/api/sso/__tests__/verify.test.ts`
- [ ] Create `packages/auth/src/__tests__/sso.test.ts`

---

### 3. Orchestrator API Endpoints

#### 3.1 Authentication (`/api/auth/*`)

| Endpoint | Method | Test Coverage | Status |
|----------|--------|---------------|--------|
| `/api/auth/login` | POST | ❌ | Missing |
| `/api/auth/logout` | POST | ❌ | Missing |
| `/api/auth/session` | GET | ❌ | Missing |
| `/api/auth/switch-tenant` | POST | ❌ | Missing |

**Test Scenarios:**
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Login with missing credentials
- [ ] Logout clears session
- [ ] Session endpoint returns current user
- [ ] Switch tenant updates context

#### 3.2 Platform Management (`/api/platform/*`)

| Endpoint | Method | Test Coverage | Status |
|----------|--------|---------------|--------|
| `/api/platform/overview` | GET | ❌ | Missing |
| `/api/platform/overview/brands` | GET | ❌ | Missing |
| `/api/platform/users` | GET, POST | ❌ | Missing |
| `/api/platform/users/:id` | GET, PUT, DELETE | ❌ | Missing |
| `/api/platform/health` | GET | ❌ | Missing |
| `/api/platform/errors` | GET | ❌ | Missing |
| `/api/platform/logs` | GET | ❌ | Missing |
| `/api/platform/jobs` | GET | ❌ | Missing |

**Test Scenarios:**
- [ ] Super admin can access all endpoints
- [ ] Non-super admin is denied
- [ ] Pagination works correctly
- [ ] Filtering works correctly
- [ ] Error handling returns proper status codes

---

### 4. Admin API Endpoints

#### 4.1 Auth Context (`/api/auth/context/*`)

| Endpoint | Method | Test Coverage | Status |
|----------|--------|---------------|--------|
| `/api/auth/context` | GET | ❌ | Missing |
| `/api/auth/context/tenants` | GET | ❌ | Missing |
| `/api/auth/context/switch` | POST | ❌ | Missing |
| `/api/auth/context/default` | GET | ❌ | Missing |
| `/api/auth/permissions` | GET | ❌ | Missing |

**Test Scenarios:**
- [ ] Context returns current tenant
- [ ] Tenants endpoint lists accessible orgs
- [ ] Switch updates tenant context
- [ ] Permissions returns user capabilities

#### 4.2 Dashboard Data

| Endpoint | Test | Status |
|----------|------|--------|
| `/admin` page | Revenue query uses `total_cents` | ✅ **FIXED** |
| Dashboard metrics | No SQL errors | ❌ Need test |
| Escalations | Query succeeds | ❌ Need test |
| Activity feed | Query succeeds | ❌ Need test |

---

### 5. Tenant Isolation Tests

**CRITICAL:** These tests ensure multi-tenancy security

| Test | Priority | Status |
|------|----------|--------|
| Query without tenant context fails | 🔴 Critical | ❌ Missing |
| withTenant() sets correct schema | 🔴 Critical | ✅ Exists |
| Cache keys are tenant-prefixed | 🔴 Critical | ✅ Exists |
| User can't access other tenant data | 🔴 Critical | ❌ Missing |
| SSO token tied to specific tenant | 🔴 Critical | ❌ Missing |
| API endpoints enforce tenant headers | 🔴 Critical | ❌ Missing |

**Action Items:**
- [ ] Create integration tests for cross-tenant access attempts
- [ ] Test tenant switching doesn't leak data
- [ ] Validate all API endpoints check tenant context

---

### 6. Permission & Authorization Tests

| Test | Status |
|------|--------|
| Super admin can access all endpoints | ❌ Missing |
| Owner can access tenant endpoints | ❌ Missing |
| Admin has limited access | ❌ Missing |
| Member has read-only access | ❌ Missing |
| Permission checks return 403 | ❌ Missing |
| Missing permissions return clear errors | ❌ Missing |

---

### 7. Database Query Tests

**Prevent schema mismatch errors like `total_amount` vs `total_cents`**

| Test | Status |
|------|--------|
| Dashboard queries use correct columns | ❌ Need to create |
| All `_cents` columns referenced correctly | ❌ Need to create |
| No references to non-existent columns | ❌ Need to create |
| Foreign key types match | ✅ Validated |

**Approach:**
- Static analysis of SQL queries
- Integration tests against test database
- Schema validation tests

---

## Test Implementation Strategy

### Phase 1: Critical SSO Tests (HIGH PRIORITY)

**Files to create:**

1. `packages/auth/src/__tests__/sso.test.ts` - Core SSO logic
2. `apps/orchestrator/src/app/api/sso/__tests__/generate.test.ts` - Token generation
3. `apps/admin/src/app/api/sso/__tests__/verify.test.ts` - Token verification

**Estimated time:** 2-3 hours

### Phase 2: Auth Flow Integration Tests

**Files to create:**

1. `apps/orchestrator/src/app/api/auth/__tests__/login.test.ts`
2. `apps/orchestrator/src/app/api/auth/__tests__/session.test.ts`
3. `apps/admin/src/app/api/auth/__tests__/context.test.ts`

**Estimated time:** 2 hours

### Phase 3: Tenant Isolation Integration Tests

**Files to create:**

1. `apps/admin/src/__tests__/tenant-isolation.integration.test.ts`
2. `apps/orchestrator/src/__tests__/tenant-isolation.integration.test.ts`

**Estimated time:** 1-2 hours

### Phase 4: Endpoint Coverage

**Files to create:**

1. `apps/orchestrator/src/app/api/platform/__tests__/overview.test.ts`
2. `apps/admin/src/app/admin/__tests__/page.test.ts` (dashboard)
3. Add tests for top 10 most-used endpoints

**Estimated time:** 3-4 hours

---

## Test Setup Requirements

### 1. Test Database

**Options:**
- **In-memory SQLite** (fast, no setup, limited compatibility)
- **Docker PostgreSQL** (accurate, requires Docker)
- **Neon branch** (cloud, requires API keys)

**Recommendation:** Docker PostgreSQL for integration tests

### 2. Test Utilities

**Create shared test helpers:**

```typescript
// __tests__/helpers/test-database.ts
export async function setupTestDatabase() {
  // Run migrations
  // Seed test data
}

export async function cleanupTestDatabase() {
  // Drop test schemas
}

// __tests__/helpers/test-auth.ts
export function createTestUser(role = 'admin') {
  // Create test user with session
}

export function createTestJWT(userId: string, orgId: string) {
  // Generate test JWT
}

// __tests__/helpers/test-requests.ts
export function createAuthenticatedRequest(jwt: string) {
  // Create Request with auth cookie
}
```

### 3. Mock Strategies

**What to mock:**
- ✅ External APIs (Stripe, Shopify, Resend)
- ✅ Background jobs (Trigger.dev)
- ❌ Database (use real test DB for integration tests)
- ❌ Auth package (test real flows)

### 4. Test Data

**Fixtures:**

```typescript
// __tests__/fixtures/users.ts
export const testUsers = {
  superAdmin: { id: 'user_super', email: 'super@test.com', role: 'super_admin' },
  owner: { id: 'user_owner', email: 'owner@test.com', role: 'owner' },
  admin: { id: 'user_admin', email: 'admin@test.com', role: 'admin' },
  member: { id: 'user_member', email: 'member@test.com', role: 'member' },
}

// __tests__/fixtures/tenants.ts
export const testTenants = {
  rawdog: { id: 'org_rawdog', slug: 'rawdog', name: 'Rawdog' },
  meliusly: { id: 'org_meliusly', slug: 'meliusly', name: 'Meliusly' },
}
```

---

## Running Tests

### Package Tests (Existing)

```bash
# Run all package tests
pnpm test

# Run specific package
pnpm --filter @cgk-platform/auth test

# Watch mode
pnpm --filter @cgk-platform/auth test:watch

# Coverage
pnpm test -- --coverage
```

### App Integration Tests (To Create)

```bash
# Run all integration tests
pnpm test:integration

# Run specific app
pnpm --filter admin test:integration

# Run specific suite
pnpm --filter admin test -- sso
```

### CI Configuration

**Add to `.github/workflows/ci.yml`:**

```yaml
test:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_PASSWORD: testpassword
        POSTGRES_DB: cgk_test
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
    - uses: actions/setup-node@v4
    - run: pnpm install
    - run: pnpm test
    - run: pnpm test:integration
      env:
        DATABASE_URL: postgres://postgres:testpassword@localhost:5432/cgk_test
```

---

## Test Checklist

### Before Marking Complete

- [ ] All critical SSO tests passing
- [ ] Auth flow tests passing
- [ ] Tenant isolation validated
- [ ] Permission checks enforced
- [ ] Database queries use correct columns
- [ ] Integration tests run in CI
- [ ] Coverage > 80% for auth package
- [ ] Coverage > 60% for API routes
- [ ] No failing tests
- [ ] Test documentation updated

---

## Known Issues & Edge Cases

### 1. SSO Token Cleanup

**Issue:** Old tokens accumulate in database
**Test:** Verify cleanup function works
**Status:** ❌ No test exists

### 2. Concurrent SSO Attempts

**Issue:** User generates multiple tokens rapidly
**Test:** Verify all tokens work independently
**Status:** ❌ No test exists

### 3. Session Expiry

**Issue:** Expired sessions should reject API calls
**Test:** Verify 401 returned for expired sessions
**Status:** ❌ No test exists

### 4. Tenant Switching Mid-Request

**Issue:** User switches tenant while request in flight
**Test:** Verify tenant context stable per request
**Status:** ❌ No test exists

### 5. Database Connection Pooling

**Issue:** Neon pooler requires specific SQL patterns
**Test:** Verify queries work with pooler
**Status:** ✅ Exists (`pooler-compat.test.ts`)

---

## Maintenance

### When to Update Tests

- **New API endpoint added** → Add test suite
- **Auth flow changed** → Update integration tests
- **Database schema changed** → Update query tests
- **Bug discovered** → Add regression test
- **Security fix** → Add security test

### Test Review Checklist

- [ ] Tests follow TDD principles (written before code)
- [ ] Tests are isolated (no dependencies on order)
- [ ] Tests use real code (mocks only when necessary)
- [ ] Test names describe behavior clearly
- [ ] Edge cases covered (empty, null, invalid)
- [ ] Error cases tested (401, 403, 404, 500)
- [ ] Async operations handled correctly
- [ ] Cleanup performed (database, mocks)

---

## References

- [SSO Flow Audit](.claude/audits/SSO-FLOW-AUDIT-2026-02-27.md)
- [Tenant Isolation Docs](../MULTI-TENANT-PLATFORM-PLAN/TENANT-ISOLATION.md)
- [Auth Package Tests](../../packages/auth/src/__tests__/)
- [DB Package Tests](../../packages/db/src/__tests__/)

---

**Next Steps:**

1. ✅ Create this test plan
2. ⏳ Implement Phase 1 (SSO tests)
3. ⏳ Implement Phase 2 (Auth integration tests)
4. ⏳ Implement Phase 3 (Tenant isolation tests)
5. ⏳ Set up CI integration
6. ⏳ Document results

---

**Mr. Tinkleberry**, this plan covers all critical test scenarios. Shall I proceed with Phase 1 (SSO tests)?
