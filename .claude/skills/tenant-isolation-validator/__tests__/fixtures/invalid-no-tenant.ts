// Invalid: SQL without withTenant
import { sql } from '@cgk-platform/db'

export async function getOrders() {
  // WRONG - No tenant context
  const orders = await sql`SELECT * FROM orders ORDER BY created_at DESC`
  return orders
}

// Invalid: Direct cache access
import { redis } from '@cgk-platform/cache'

export async function getConfig() {
  // WRONG - No tenant isolation
  const config = await redis.get('pricing-config')
  return config
}

// Invalid: Job without tenantId
import { jobs } from '@cgk-platform/jobs'

export async function sendNotification(orderId: string) {
  // WRONG - Missing tenantId
  await jobs.send('order/created', {
    orderId,
  })
}
