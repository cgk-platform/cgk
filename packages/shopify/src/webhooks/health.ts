/**
 * Webhook Health Monitoring
 *
 * Functions to check webhook health and retrieve event statistics
 */

import { withTenant, sql } from '@cgk-platform/db'
import type {
  WebhookHealthStatus,
  WebhookRegistration,
  WebhookEvent,
  WebhookEventStatus,
  WebhookTopic,
} from './types'

/**
 * Get webhook health status for a shop
 *
 * Returns registration status and recent event statistics
 */
export async function getWebhookHealth(
  tenantId: string,
  shop: string
): Promise<WebhookHealthStatus> {
  return withTenant(tenantId, async () => {
    // Get registration status
    const registrations = await sql`
      SELECT
        topic,
        status,
        last_success_at as "lastSuccessAt",
        failure_count as "failureCount"
      FROM webhook_registrations
      WHERE shop = ${shop}
      ORDER BY topic
    `

    // Get recent event statistics (last 24 hours)
    const eventStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE true) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
      FROM webhook_events
      WHERE shop = ${shop}
      AND received_at > NOW() - INTERVAL '24 hours'
    `

    const stats = eventStats.rows[0] as {
      total: string
      completed: string
      failed: string
      pending: string
    }

    return {
      shop,
      registrations: registrations.rows as Array<{
        topic: WebhookTopic
        status: WebhookRegistration['status']
        lastSuccessAt: Date | null
        failureCount: number
      }>,
      recentEvents: {
        total: parseInt(stats.total, 10),
        completed: parseInt(stats.completed, 10),
        failed: parseInt(stats.failed, 10),
        pending: parseInt(stats.pending, 10),
      },
    }
  })
}

/**
 * Get recent webhook events for a shop
 */
export async function getRecentWebhookEvents(
  tenantId: string,
  shop: string,
  options: {
    limit?: number
    offset?: number
    status?: WebhookEventStatus
    topic?: string
  } = {}
): Promise<{ events: WebhookEvent[]; total: number }> {
  const { limit = 50, offset = 0, status, topic } = options

  return withTenant(tenantId, async () => {
    // Build the query based on filters
    let countResult
    let events

    if (status && topic) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM webhook_events
        WHERE shop = ${shop} AND status = ${status} AND topic = ${topic}
      `
      events = await sql`
        SELECT id, shop, topic, shopify_webhook_id as "shopifyWebhookId",
          payload, hmac_verified as "hmacVerified", status,
          processed_at as "processedAt", error_message as "errorMessage",
          retry_count as "retryCount", idempotency_key as "idempotencyKey",
          received_at as "receivedAt", headers
        FROM webhook_events
        WHERE shop = ${shop} AND status = ${status} AND topic = ${topic}
        ORDER BY received_at DESC LIMIT ${limit} OFFSET ${offset}
      `
    } else if (status) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM webhook_events
        WHERE shop = ${shop} AND status = ${status}
      `
      events = await sql`
        SELECT id, shop, topic, shopify_webhook_id as "shopifyWebhookId",
          payload, hmac_verified as "hmacVerified", status,
          processed_at as "processedAt", error_message as "errorMessage",
          retry_count as "retryCount", idempotency_key as "idempotencyKey",
          received_at as "receivedAt", headers
        FROM webhook_events
        WHERE shop = ${shop} AND status = ${status}
        ORDER BY received_at DESC LIMIT ${limit} OFFSET ${offset}
      `
    } else if (topic) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM webhook_events
        WHERE shop = ${shop} AND topic = ${topic}
      `
      events = await sql`
        SELECT id, shop, topic, shopify_webhook_id as "shopifyWebhookId",
          payload, hmac_verified as "hmacVerified", status,
          processed_at as "processedAt", error_message as "errorMessage",
          retry_count as "retryCount", idempotency_key as "idempotencyKey",
          received_at as "receivedAt", headers
        FROM webhook_events
        WHERE shop = ${shop} AND topic = ${topic}
        ORDER BY received_at DESC LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      countResult = await sql`
        SELECT COUNT(*) as count FROM webhook_events WHERE shop = ${shop}
      `
      events = await sql`
        SELECT id, shop, topic, shopify_webhook_id as "shopifyWebhookId",
          payload, hmac_verified as "hmacVerified", status,
          processed_at as "processedAt", error_message as "errorMessage",
          retry_count as "retryCount", idempotency_key as "idempotencyKey",
          received_at as "receivedAt", headers
        FROM webhook_events WHERE shop = ${shop}
        ORDER BY received_at DESC LIMIT ${limit} OFFSET ${offset}
      `
    }

    const countRow = countResult.rows[0] as { count: string } | undefined
    return {
      events: events.rows as unknown as WebhookEvent[],
      total: countRow ? parseInt(countRow.count, 10) : 0,
    }
  })
}

/**
 * Get failed webhook events that need retry
 */
export async function getFailedWebhooksForRetry(
  tenantId: string,
  options: {
    maxRetries?: number
    hoursAgo?: number
    limit?: number
  } = {}
): Promise<WebhookEvent[]> {
  const { maxRetries = 3, hoursAgo = 24, limit = 50 } = options

  return withTenant(tenantId, async () => {
    // Calculate the cutoff time
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo)

    const result = await sql`
      SELECT
        id,
        shop,
        topic,
        shopify_webhook_id as "shopifyWebhookId",
        payload,
        hmac_verified as "hmacVerified",
        status,
        processed_at as "processedAt",
        error_message as "errorMessage",
        retry_count as "retryCount",
        idempotency_key as "idempotencyKey",
        received_at as "receivedAt",
        headers
      FROM webhook_events
      WHERE status = 'failed'
      AND retry_count < ${maxRetries}
      AND received_at > ${cutoffDate.toISOString()}
      ORDER BY received_at ASC
      LIMIT ${limit}
    `

    return result.rows as unknown as WebhookEvent[]
  })
}

/**
 * Update webhook registration success timestamp
 */
export async function recordWebhookSuccess(
  tenantId: string,
  shop: string,
  topic: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE webhook_registrations
      SET
        last_success_at = NOW(),
        failure_count = 0,
        status = 'active',
        updated_at = NOW()
      WHERE shop = ${shop} AND topic = ${topic}
    `
  })
}

/**
 * Record a webhook registration failure
 */
export async function recordWebhookFailure(
  tenantId: string,
  shop: string,
  topic: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE webhook_registrations
      SET
        last_failure_at = NOW(),
        failure_count = failure_count + 1,
        status = CASE
          WHEN failure_count >= 5 THEN 'failed'
          ELSE status
        END,
        updated_at = NOW()
      WHERE shop = ${shop} AND topic = ${topic}
    `
  })
}

/**
 * Get webhook event counts by topic for the last N days
 */
export async function getWebhookEventsByTopic(
  tenantId: string,
  shop: string,
  days: number = 7
): Promise<Array<{ topic: string; count: number; failedCount: number }>> {
  return withTenant(tenantId, async () => {
    // Calculate the cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const result = await sql`
      SELECT
        topic,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'failed') as "failedCount"
      FROM webhook_events
      WHERE shop = ${shop}
      AND received_at > ${cutoffDate.toISOString()}
      GROUP BY topic
      ORDER BY count DESC
    `

    return result.rows.map(row => ({
      topic: row.topic as string,
      count: parseInt(row.count as string, 10),
      failedCount: parseInt(row.failedCount as string, 10),
    }))
  })
}
