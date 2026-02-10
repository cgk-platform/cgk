# Phase 7: Data Migration & Testing

**Duration**: 3 weeks
**Focus**: Migrate RAWDOG data, comprehensive testing, production cutover

---

## Required Reading Before Starting

**Planning docs location**: `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/`
**Codebase analysis**: `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/`

| Document | Full Path |
|----------|-----------|
| **ALL CODEBASE-ANALYSIS docs** | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/*.md` |
| DATABASE-SCHEMA | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/DATABASE-SCHEMA-2025-02-10.md` |
| AUTOMATIONS-TRIGGER-DEV | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/AUTOMATIONS-TRIGGER-DEV-2025-02-10.md` |

---

## Required Skills for This Phase

**CRITICAL**: This phase REQUIRES testing skills for E2E test creation.

| Skill | Usage |
|-------|-------|
| `/webapp-testing` | **REQUIRED** - Playwright-based E2E testing |
| Context7 MCP | Playwright and testing library documentation |
| `obra/superpowers@test-driven-development` | TDD for migration validation |

### Pre-Phase Checklist
```bash
# Verify skills are installed
npx skills list | grep -E "(webapp-testing|documentation-lookup|test-driven)"

# If missing, install:
npx skills add anthropics/skills@webapp-testing -g -y
npx skills add upstash/context7@documentation-lookup -g -y
npx skills add obra/superpowers@test-driven-development -g -y
```

### E2E Testing Workflow
1. **Invoke `/webapp-testing`** before writing any Playwright tests
2. Use the `scripts/with_server.py` helper for server lifecycle management
3. Follow reconnaissance-then-action pattern:
   - Navigate and wait for `networkidle`
   - Take screenshot or inspect DOM
   - Identify selectors from rendered state
   - Execute actions with discovered selectors
4. Use Context7 MCP to look up Playwright API

### Testing Guidelines from webapp-testing Skill
```python
# Always wait for networkidle before DOM inspection
page.wait_for_load_state('networkidle')

# Use descriptive selectors
page.locator('text=Submit')
page.locator('role=button[name="Save"]')
page.locator('[data-testid="order-table"]')

# Reconnaissance-then-action pattern
page.screenshot(path='/tmp/inspect.png', full_page=True)
content = page.content()  # Inspect for selectors
```

---

## Objectives

1. Migrate existing RAWDOG data to new schema
2. Validate feature parity
3. Comprehensive testing (unit, integration, E2E)
4. Production cutover with zero downtime
5. Documentation and training

---

## Week 1: Data Migration

### Migration Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION APPROACH                            │
├─────────────────────────────────────────────────────────────────┤
│  1. Create new database with multi-tenant schema                │
│  2. Run parallel systems (old + new)                            │
│  3. Sync data continuously via replication                      │
│  4. Validate data integrity                                     │
│  5. Cutover with minimal downtime                               │
└─────────────────────────────────────────────────────────────────┘
```

### Migration Scripts

```typescript
// tooling/migrations/migrate-rawdog.ts
import { sql as oldDb } from '@/lib/old-postgres'
import { sql as newDb, withTenant } from '@repo/db'

const BATCH_SIZE = 1000

async function migrateRawdog() {
  console.log('Starting RAWDOG migration...')

  // 1. Create tenant schema
  await newDb`CREATE SCHEMA IF NOT EXISTS tenant_rawdog`

  // 2. Create organization record
  const [org] = await newDb`
    INSERT INTO public.organizations (
      slug, name, domain, shopify_store_domain, shopify_access_token_encrypted
    ) VALUES (
      'rawdog', 'RAWDOG Skincare', 'www.justrawdogit.com',
      ${process.env.SHOPIFY_STORE_DOMAIN},
      ${await encrypt(process.env.SHOPIFY_ACCESS_TOKEN)}
    )
    ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
    RETURNING id
  `

  // 3. Migrate tables in order (respecting foreign keys)
  await migrateTable('customers', org.id)
  await migrateTable('products', org.id)
  await migrateTable('orders', org.id)
  await migrateTable('line_items', org.id)
  await migrateTable('reviews', org.id)
  await migrateTable('creators', org.id)
  await migrateTable('creator_projects', org.id)
  await migrateTable('balance_transactions', org.id)
  await migrateTable('withdrawal_requests', org.id)
  await migrateTable('landing_pages', org.id)
  await migrateTable('blog_posts', org.id)
  await migrateTable('ab_tests', org.id)
  await migrateTable('attribution_touchpoints', org.id)
  await migrateTable('esign_documents', org.id)

  console.log('Migration complete!')
}

async function migrateTable(tableName: string, orgId: string) {
  console.log(`Migrating ${tableName}...`)

  let offset = 0
  let totalMigrated = 0

  while (true) {
    // Fetch batch from old database
    const rows = await oldDb`
      SELECT * FROM ${oldDb.identifier([tableName])}
      ORDER BY created_at
      LIMIT ${BATCH_SIZE}
      OFFSET ${offset}
    `

    if (rows.length === 0) break

    // Transform and insert into new schema
    await withTenant('rawdog', async () => {
      for (const row of rows) {
        const transformed = transformRow(tableName, row)
        await insertRow(tableName, transformed)
      }
    })

    offset += BATCH_SIZE
    totalMigrated += rows.length
    console.log(`  ${tableName}: ${totalMigrated} rows migrated`)
  }

  return totalMigrated
}

function transformRow(tableName: string, row: Record<string, unknown>) {
  // Apply any necessary transformations
  switch (tableName) {
    case 'orders':
      return {
        ...row,
        // Ensure consistent types
        gross_sales_cents: parseInt(row.gross_sales_cents as string) || 0,
        // Add any missing columns
        migrated_at: new Date(),
      }

    case 'creators':
      return {
        ...row,
        // Convert from old commission format
        commission_percent: parseFloat(row.commission_percent as string) || 10,
      }

    default:
      return row
  }
}
```

### Data Validation

```typescript
// tooling/migrations/validate-migration.ts
async function validateMigration() {
  const validations = []

  // Count comparisons
  validations.push(await validateCount('orders'))
  validations.push(await validateCount('customers'))
  validations.push(await validateCount('creators'))
  validations.push(await validateCount('reviews'))

  // Sum comparisons
  validations.push(await validateSum('orders', 'total_cents'))
  validations.push(await validateSum('balance_transactions', 'amount_cents'))

  // Sample data comparisons
  validations.push(await validateSampleData('orders', 100))
  validations.push(await validateSampleData('customers', 100))

  // Foreign key integrity
  validations.push(await validateForeignKeys())

  // Report results
  const failures = validations.filter(v => !v.success)

  if (failures.length > 0) {
    console.error('Validation failures:')
    failures.forEach(f => console.error(`  - ${f.table}: ${f.message}`))
    process.exit(1)
  }

  console.log('All validations passed!')
}

async function validateCount(table: string) {
  const [oldCount] = await oldDb`SELECT COUNT(*) FROM ${oldDb.identifier([table])}`
  const [newCount] = await withTenant('rawdog', () =>
    newDb`SELECT COUNT(*) FROM ${newDb.identifier([table])}`
  )

  const success = oldCount.count === newCount.count

  return {
    table,
    success,
    message: success
      ? `Count match: ${oldCount.count}`
      : `Count mismatch: old=${oldCount.count}, new=${newCount.count}`,
  }
}
```

---

## Week 2: Testing

### Unit Tests

```typescript
// packages/db/src/__tests__/tenant.test.ts
describe('Tenant Context', () => {
  it('should isolate queries to tenant schema', async () => {
    await withTenant('test', async () => {
      const result = await sql`SELECT current_schema()`
      expect(result[0].current_schema).toBe('tenant_test')
    })
  })

  it('should prevent cross-tenant data access', async () => {
    // Create data in tenant A
    await withTenant('tenant_a', async () => {
      await sql`INSERT INTO orders (id, email) VALUES ('order-1', 'a@test.com')`
    })

    // Verify not visible in tenant B
    await withTenant('tenant_b', async () => {
      const orders = await sql`SELECT * FROM orders WHERE id = 'order-1'`
      expect(orders.length).toBe(0)
    })
  })
})
```

### Integration Tests

```typescript
// apps/admin/src/__tests__/orders.test.ts
import { createTestClient } from '@/test-utils'

describe('Orders API', () => {
  const client = createTestClient({ tenant: 'test' })

  beforeAll(async () => {
    await seedTestData('test')
  })

  afterAll(async () => {
    await cleanupTestData('test')
  })

  it('should list orders for tenant', async () => {
    const response = await client.get('/api/admin/orders')

    expect(response.status).toBe(200)
    expect(response.data.orders).toHaveLength(10)
    expect(response.data.orders[0]).toHaveProperty('id')
    expect(response.data.orders[0]).toHaveProperty('total_cents')
  })

  it('should filter orders by status', async () => {
    const response = await client.get('/api/admin/orders?status=paid')

    expect(response.status).toBe(200)
    expect(response.data.orders.every(o => o.financial_status === 'paid')).toBe(true)
  })

  it('should not return orders from other tenants', async () => {
    // Create order in different tenant
    await withTenant('other', async () => {
      await sql`INSERT INTO orders (id, email) VALUES ('other-order', 'other@test.com')`
    })

    const response = await client.get('/api/admin/orders?search=other@test.com')

    expect(response.data.orders).toHaveLength(0)
  })
})
```

### E2E Tests

```typescript
// apps/admin/e2e/admin-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Admin Portal', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[name="email"]', 'admin@test.com')
    await page.click('button[type="submit"]')

    // Verify magic link (in test mode)
    await page.goto('/auth/verify?token=test-token&email=admin@test.com')
  })

  test('should display dashboard', async ({ page }) => {
    await page.goto('/admin')

    await expect(page.locator('h1')).toHaveText('Dashboard')
    await expect(page.locator('[data-testid="revenue-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="orders-card"]')).toBeVisible()
  })

  test('should list orders', async ({ page }) => {
    await page.goto('/admin/orders')

    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('tbody tr')).toHaveCount(10)
  })

  test('should filter orders by date', async ({ page }) => {
    await page.goto('/admin/orders')

    await page.click('[data-testid="date-filter"]')
    await page.click('text=Last 7 days')

    await expect(page.locator('tbody tr')).toHaveCount.greaterThan(0)
  })
})
```

### Performance Tests

```typescript
// tooling/perf/load-test.ts
import { check } from 'k6'
import http from 'k6/http'

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp to 100
    { duration: '3m', target: 100 }, // Stay at 100
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failure rate
  },
}

export default function () {
  const responses = {
    dashboard: http.get(`${BASE_URL}/api/admin/dashboard`),
    orders: http.get(`${BASE_URL}/api/admin/orders`),
    customers: http.get(`${BASE_URL}/api/admin/customers`),
  }

  check(responses.dashboard, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard response time < 500ms': (r) => r.timings.duration < 500,
  })

  check(responses.orders, {
    'orders status is 200': (r) => r.status === 200,
    'orders response time < 500ms': (r) => r.timings.duration < 500,
  })
}
```

---

## Week 3: Production Cutover

### Cutover Checklist

```markdown
## Pre-Cutover (Day -1)

- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Data migration complete
- [ ] Data validation passing
- [ ] DNS TTL lowered to 5 minutes
- [ ] Team notified of maintenance window
- [ ] Rollback plan documented

## Cutover Day (Hour 0)

- [ ] Enable maintenance mode on old site
- [ ] Final data sync
- [ ] Validate final sync
- [ ] Update DNS records
- [ ] Disable maintenance mode on new site
- [ ] Smoke test all critical paths
- [ ] Monitor error rates

## Post-Cutover (Hour 1-24)

- [ ] Monitor performance metrics
- [ ] Check error logging
- [ ] Validate webhook processing
- [ ] Confirm email delivery
- [ ] Test checkout flow
- [ ] Verify creator portal access
- [ ] Check MCP connectivity

## Rollback Triggers

- Error rate > 5%
- API latency p95 > 2s
- Checkout failures > 1%
- Payment processing errors
- Data integrity issues
```

### Zero-Downtime Strategy

```typescript
// Blue-Green Deployment

// 1. Deploy new version to "green" environment
await deploy('green', newVersion)

// 2. Run health checks
const healthy = await runHealthChecks('green')
if (!healthy) {
  throw new Error('Green environment unhealthy')
}

// 3. Run smoke tests
const smokesPassed = await runSmokeTests('green')
if (!smokesPassed) {
  throw new Error('Smoke tests failed')
}

// 4. Switch traffic
await updateLoadBalancer({
  from: 'blue',
  to: 'green',
  strategy: 'gradual', // 10% -> 50% -> 100%
})

// 5. Monitor for issues
const monitorDuration = 30 * 60 * 1000 // 30 minutes
const issues = await monitorForIssues('green', monitorDuration)

if (issues.length > 0) {
  // Rollback
  await updateLoadBalancer({
    from: 'green',
    to: 'blue',
    strategy: 'immediate',
  })
  throw new Error(`Issues detected: ${issues.join(', ')}`)
}

// 6. Complete cutover
await decommission('blue')
```

### Monitoring Dashboard

```typescript
// tooling/monitoring/dashboard.ts
export const dashboardConfig = {
  panels: [
    {
      name: 'Request Rate',
      query: 'rate(http_requests_total[5m])',
      thresholds: { warning: 1000, critical: 2000 },
    },
    {
      name: 'Error Rate',
      query: 'rate(http_errors_total[5m]) / rate(http_requests_total[5m])',
      thresholds: { warning: 0.01, critical: 0.05 },
    },
    {
      name: 'Latency P95',
      query: 'histogram_quantile(0.95, http_request_duration_seconds)',
      thresholds: { warning: 0.5, critical: 2 },
    },
    {
      name: 'Database Connections',
      query: 'pg_stat_activity_count',
      thresholds: { warning: 80, critical: 95 },
    },
    {
      name: 'Redis Memory',
      query: 'redis_memory_used_bytes / redis_memory_max_bytes',
      thresholds: { warning: 0.7, critical: 0.9 },
    },
  ],
  alerts: [
    {
      name: 'High Error Rate',
      condition: 'error_rate > 0.05 for 5m',
      severity: 'critical',
      channels: ['slack', 'pagerduty'],
    },
    {
      name: 'Slow Responses',
      condition: 'latency_p95 > 2s for 5m',
      severity: 'warning',
      channels: ['slack'],
    },
  ],
}
```

---

## Success Criteria

- [ ] All RAWDOG data migrated successfully
- [ ] Data validation passing 100%
- [ ] Feature parity confirmed
- [ ] Performance benchmarks met
- [ ] Zero-downtime cutover complete
- [ ] No data loss
- [ ] All integrations working

---

## Post-Migration Tasks

- [ ] Archive old database
- [ ] Update documentation
- [ ] Train team on new system
- [ ] Set up ongoing monitoring
- [ ] Schedule retrospective
