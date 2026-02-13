/**
 * E-Signature Webhook Data Layer
 *
 * Functions for managing webhook configurations and delivery logs.
 */

import { sql, withTenant } from '@cgk-platform/db'
import { createHmac } from 'crypto'
import type {
  EsignWebhook,
  EsignWebhookDelivery,
  EsignWebhookEvent,
  EsignWebhookPayload,
  CreateWebhookInput,
  UpdateWebhookInput,
} from './types'

/**
 * Generate a secure secret key for webhook signing
 */
export function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Create HMAC signature for webhook payload
 */
export function createWebhookSignature(payload: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Create a new webhook configuration
 */
export async function createWebhook(
  tenantSlug: string,
  input: CreateWebhookInput
): Promise<EsignWebhook> {
  const secretKey = generateWebhookSecret()

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO esign_webhooks (
        name,
        endpoint_url,
        secret_key,
        events,
        is_active
      ) VALUES (
        ${input.name},
        ${input.endpointUrl},
        ${secretKey},
        ${JSON.stringify(input.events)},
        true
      )
      RETURNING
        id,
        name,
        endpoint_url as "endpointUrl",
        secret_key as "secretKey",
        events,
        is_active as "isActive",
        last_triggered_at as "lastTriggeredAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create webhook')
    }
    return {
      ...row,
      events: row.events as EsignWebhookEvent[],
    } as unknown as EsignWebhook
  })
}

/**
 * Get webhook by ID
 */
export async function getWebhook(
  tenantSlug: string,
  webhookId: string
): Promise<EsignWebhook | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        name,
        endpoint_url as "endpointUrl",
        secret_key as "secretKey",
        events,
        is_active as "isActive",
        last_triggered_at as "lastTriggeredAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM esign_webhooks
      WHERE id = ${webhookId}
    `
    const row = result.rows[0]
    if (!row) return null
    return {
      ...row,
      events: row.events as EsignWebhookEvent[],
    } as unknown as EsignWebhook
  })
}

/**
 * List all webhooks
 */
export async function listWebhooks(
  tenantSlug: string
): Promise<EsignWebhook[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        name,
        endpoint_url as "endpointUrl",
        secret_key as "secretKey",
        events,
        is_active as "isActive",
        last_triggered_at as "lastTriggeredAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM esign_webhooks
      ORDER BY created_at DESC
    `
    return result.rows.map((row) => ({
      ...row,
      events: row.events as EsignWebhookEvent[],
    })) as unknown as EsignWebhook[]
  })
}

/**
 * Update webhook configuration
 */
export async function updateWebhook(
  tenantSlug: string,
  webhookId: string,
  input: UpdateWebhookInput
): Promise<EsignWebhook | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_webhooks
      SET name = COALESCE(${input.name || null}, name),
          endpoint_url = COALESCE(${input.endpointUrl || null}, endpoint_url),
          events = COALESCE(${input.events ? JSON.stringify(input.events) : null}::jsonb, events),
          is_active = COALESCE(${input.isActive ?? null}, is_active)
      WHERE id = ${webhookId}
      RETURNING
        id,
        name,
        endpoint_url as "endpointUrl",
        secret_key as "secretKey",
        events,
        is_active as "isActive",
        last_triggered_at as "lastTriggeredAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
    const row = result.rows[0]
    if (!row) return null
    return {
      ...row,
      events: row.events as EsignWebhookEvent[],
    } as unknown as EsignWebhook
  })
}

/**
 * Delete webhook
 */
export async function deleteWebhook(
  tenantSlug: string,
  webhookId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM esign_webhooks
      WHERE id = ${webhookId}
      RETURNING id
    `
    return result.rows.length > 0
  })
}

/**
 * Regenerate webhook secret
 */
export async function regenerateWebhookSecret(
  tenantSlug: string,
  webhookId: string
): Promise<string | null> {
  const newSecret = generateWebhookSecret()

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_webhooks
      SET secret_key = ${newSecret}
      WHERE id = ${webhookId}
      RETURNING id
    `
    return result.rows.length > 0 ? newSecret : null
  })
}

/**
 * Get active webhooks for an event
 */
export async function getActiveWebhooksForEvent(
  tenantSlug: string,
  event: EsignWebhookEvent
): Promise<EsignWebhook[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        name,
        endpoint_url as "endpointUrl",
        secret_key as "secretKey",
        events,
        is_active as "isActive",
        last_triggered_at as "lastTriggeredAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM esign_webhooks
      WHERE is_active = true
        AND events ? ${event}
    `
    return result.rows.map((row) => ({
      ...row,
      events: row.events as EsignWebhookEvent[],
    })) as unknown as EsignWebhook[]
  })
}

/**
 * Log a webhook delivery
 */
export async function logWebhookDelivery(
  tenantSlug: string,
  delivery: {
    webhookId: string
    documentId?: string
    event: EsignWebhookEvent
    payload: EsignWebhookPayload
    requestHeaders?: Record<string, string>
    responseStatus?: number
    responseBody?: string
    responseHeaders?: Record<string, string>
    success: boolean
    durationMs?: number
    retryCount?: number
    nextRetryAt?: Date
  }
): Promise<EsignWebhookDelivery> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO esign_webhook_deliveries (
        webhook_id,
        document_id,
        event,
        payload,
        request_headers,
        response_status,
        response_body,
        response_headers,
        success,
        duration_ms,
        retry_count,
        next_retry_at
      ) VALUES (
        ${delivery.webhookId},
        ${delivery.documentId || null},
        ${delivery.event},
        ${JSON.stringify(delivery.payload)},
        ${delivery.requestHeaders ? JSON.stringify(delivery.requestHeaders) : null},
        ${delivery.responseStatus || null},
        ${delivery.responseBody || null},
        ${delivery.responseHeaders ? JSON.stringify(delivery.responseHeaders) : null},
        ${delivery.success},
        ${delivery.durationMs || null},
        ${delivery.retryCount || 0},
        ${delivery.nextRetryAt?.toISOString() || null}
      )
      RETURNING
        id,
        webhook_id as "webhookId",
        document_id as "documentId",
        event,
        payload,
        request_headers as "requestHeaders",
        response_status as "responseStatus",
        response_body as "responseBody",
        response_headers as "responseHeaders",
        success,
        duration_ms as "durationMs",
        retry_count as "retryCount",
        next_retry_at as "nextRetryAt",
        delivered_at as "deliveredAt"
    `

    // Update last_triggered_at on webhook
    await sql`
      UPDATE esign_webhooks
      SET last_triggered_at = NOW()
      WHERE id = ${delivery.webhookId}
    `

    return result.rows[0] as unknown as EsignWebhookDelivery
  })
}

/**
 * Get webhook deliveries
 */
export async function getWebhookDeliveries(
  tenantSlug: string,
  webhookId: string,
  page = 1,
  limit = 20
): Promise<{ deliveries: EsignWebhookDelivery[]; total: number }> {
  const offset = (page - 1) * limit

  return withTenant(tenantSlug, async () => {
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM esign_webhook_deliveries
      WHERE webhook_id = ${webhookId}
    `
    const total = Number(countResult.rows[0]?.count || 0)

    const result = await sql`
      SELECT
        id,
        webhook_id as "webhookId",
        document_id as "documentId",
        event,
        payload,
        request_headers as "requestHeaders",
        response_status as "responseStatus",
        response_body as "responseBody",
        response_headers as "responseHeaders",
        success,
        duration_ms as "durationMs",
        retry_count as "retryCount",
        next_retry_at as "nextRetryAt",
        delivered_at as "deliveredAt"
      FROM esign_webhook_deliveries
      WHERE webhook_id = ${webhookId}
      ORDER BY delivered_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return {
      deliveries: result.rows as unknown as EsignWebhookDelivery[],
      total,
    }
  })
}

/**
 * Get failed deliveries needing retry
 */
export async function getPendingRetryDeliveries(
  tenantSlug: string,
  limit = 10
): Promise<EsignWebhookDelivery[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        d.id,
        d.webhook_id as "webhookId",
        d.document_id as "documentId",
        d.event,
        d.payload,
        d.request_headers as "requestHeaders",
        d.response_status as "responseStatus",
        d.response_body as "responseBody",
        d.response_headers as "responseHeaders",
        d.success,
        d.duration_ms as "durationMs",
        d.retry_count as "retryCount",
        d.next_retry_at as "nextRetryAt",
        d.delivered_at as "deliveredAt"
      FROM esign_webhook_deliveries d
      JOIN esign_webhooks w ON w.id = d.webhook_id
      WHERE d.success = false
        AND d.next_retry_at IS NOT NULL
        AND d.next_retry_at <= NOW()
        AND w.is_active = true
        AND d.retry_count < 5
      ORDER BY d.next_retry_at ASC
      LIMIT ${limit}
    `
    return result.rows as unknown as EsignWebhookDelivery[]
  })
}

/**
 * Update delivery retry info
 */
export async function updateDeliveryRetry(
  tenantSlug: string,
  deliveryId: string,
  success: boolean,
  responseStatus?: number,
  responseBody?: string,
  nextRetryAt?: Date
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE esign_webhook_deliveries
      SET success = ${success},
          response_status = COALESCE(${responseStatus || null}, response_status),
          response_body = COALESCE(${responseBody || null}, response_body),
          retry_count = retry_count + 1,
          next_retry_at = ${nextRetryAt?.toISOString() || null}
      WHERE id = ${deliveryId}
    `
  })
}

/**
 * Test a webhook by sending a test payload
 */
export async function testWebhook(
  tenantSlug: string,
  webhookId: string
): Promise<{
  success: boolean
  statusCode?: number
  responseBody?: string
  durationMs?: number
  error?: string
}> {
  const webhook = await getWebhook(tenantSlug, webhookId)
  if (!webhook) {
    return { success: false, error: 'Webhook not found' }
  }

  const testPayload: EsignWebhookPayload = {
    event: 'document.completed',
    timestamp: new Date().toISOString(),
    data: {
      documentId: 'test_doc_123',
      documentName: 'Test Document',
      templateId: null,
      creatorId: null,
      signers: [
        {
          email: 'test@example.com',
          name: 'Test User',
          status: 'signed',
          signedAt: new Date().toISOString(),
        },
      ],
    },
  }

  const payloadString = JSON.stringify(testPayload)
  const signature = createWebhookSignature(payloadString, webhook.secretKey)

  const startTime = Date.now()

  try {
    const response = await fetch(webhook.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Esign-Signature': signature,
        'X-Esign-Event': 'document.completed',
        'X-Esign-Test': 'true',
      },
      body: payloadString,
    })

    const durationMs = Date.now() - startTime
    const responseBody = await response.text()

    await logWebhookDelivery(tenantSlug, {
      webhookId,
      event: 'document.completed',
      payload: testPayload,
      requestHeaders: {
        'Content-Type': 'application/json',
        'X-Esign-Signature': signature,
        'X-Esign-Test': 'true',
      },
      responseStatus: response.status,
      responseBody: responseBody.substring(0, 1000),
      success: response.ok,
      durationMs,
    })

    return {
      success: response.ok,
      statusCode: response.status,
      responseBody: responseBody.substring(0, 500),
      durationMs,
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await logWebhookDelivery(tenantSlug, {
      webhookId,
      event: 'document.completed',
      payload: testPayload,
      success: false,
      durationMs,
    })

    return {
      success: false,
      durationMs,
      error: errorMessage,
    }
  }
}
