// Valid: SQL wrapped in withTenant
import { withTenant, sql } from '@cgk-platform/db'

export async function getOrders(tenantId: string) {
  return withTenant(tenantId, async () => {
    const orders = await sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`
    return orders
  })
}

// Valid: Cache with createTenantCache
import { createTenantCache } from '@cgk-platform/cache'

export async function getCachedConfig(tenantId: string) {
  const cache = createTenantCache(tenantId)
  const config = await cache.get('pricing-config')
  return config
}

// Valid: Job with tenantId in payload
import { jobs } from '@cgk-platform/jobs'

export async function sendOrderNotification(tenantId: string, orderId: string) {
  await jobs.send('order/created', {
    tenantId,
    orderId,
  })
}
