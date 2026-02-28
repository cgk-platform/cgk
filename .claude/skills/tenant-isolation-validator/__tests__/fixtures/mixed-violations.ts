// Mixed: Some valid, some invalid patterns
import { withTenant, sql } from '@cgk-platform/db'
import { cache } from '@cgk-platform/cache'
import { jobs } from '@cgk-platform/jobs'

// Valid
export async function validQuery(tenantId: string) {
  return withTenant(tenantId, async () => {
    return sql`SELECT * FROM orders`
  })
}

// Invalid - SQL without withTenant
export async function invalidQuery() {
  return sql`SELECT * FROM customers WHERE id = ${'123'}`
}

// Invalid - Direct cache
export async function invalidCache() {
  await cache.set('key', 'value')
}

// Valid - Job with tenantId
export async function validJob(tenantId: string) {
  await jobs.send('task/process', {
    tenantId,
    taskId: '456'
  })
}

// Invalid - Job without tenantId
export async function invalidJob() {
  await jobs.send('task/process', {
    taskId: '789'
  })
}
