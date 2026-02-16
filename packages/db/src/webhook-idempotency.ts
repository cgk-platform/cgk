/**
 * Webhook idempotency utilities
 *
 * Provides duplicate detection for non-Shopify webhooks using
 * event IDs to prevent duplicate processing.
 *
 * @ai-pattern security
 * @ai-required All webhooks MUST check idempotency before processing
 */

import { sql } from './client.js'

/**
 * Check if a webhook event has already been processed
 *
 * @param provider - The webhook provider (e.g., 'mux', 'resend', 'twilio', 'stripe')
 * @param eventId - The unique event ID from the provider
 * @returns True if the event has already been processed
 *
 * @example
 * ```typescript
 * const isDuplicate = await checkWebhookIdempotency('mux', payload.id)
 * if (isDuplicate) {
 *   return new Response('Already processed', { status: 200 })
 * }
 * ```
 */
export async function checkWebhookIdempotency(
  provider: string,
  eventId: string
): Promise<boolean> {
  if (!eventId) {
    return false
  }

  const idempotencyKey = `${provider}:${eventId}`

  const result = await sql`
    SELECT id FROM public.webhook_idempotency_keys
    WHERE idempotency_key = ${idempotencyKey}
    LIMIT 1
  `

  return result.rows.length > 0
}

/**
 * Mark a webhook event as processed
 *
 * @param provider - The webhook provider
 * @param eventId - The unique event ID from the provider
 * @param metadata - Optional metadata about the event
 *
 * @example
 * ```typescript
 * await markWebhookProcessed('mux', payload.id, {
 *   type: payload.type,
 *   assetId: payload.data.id,
 * })
 * ```
 */
export async function markWebhookProcessed(
  provider: string,
  eventId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!eventId) {
    return
  }

  const idempotencyKey = `${provider}:${eventId}`

  await sql`
    INSERT INTO public.webhook_idempotency_keys (
      idempotency_key,
      provider,
      event_id,
      metadata,
      processed_at
    ) VALUES (
      ${idempotencyKey},
      ${provider},
      ${eventId},
      ${metadata ? JSON.stringify(metadata) : null},
      NOW()
    )
    ON CONFLICT (idempotency_key) DO NOTHING
  `
}

/**
 * Check and mark a webhook event atomically
 *
 * Returns true if the event was already processed (duplicate).
 * If not a duplicate, marks the event as processing.
 *
 * @param provider - The webhook provider
 * @param eventId - The unique event ID from the provider
 * @param metadata - Optional metadata about the event
 * @returns True if the event is a duplicate
 *
 * @example
 * ```typescript
 * const isDuplicate = await checkAndMarkWebhook('mux', payload.id)
 * if (isDuplicate) {
 *   return new Response('Already processed', { status: 200 })
 * }
 * // Process webhook...
 * ```
 */
export async function checkAndMarkWebhook(
  provider: string,
  eventId: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  if (!eventId) {
    // No event ID - can't do idempotency check, process anyway
    return false
  }

  const idempotencyKey = `${provider}:${eventId}`

  // Try to insert - if it already exists, it's a duplicate
  const result = await sql`
    INSERT INTO public.webhook_idempotency_keys (
      idempotency_key,
      provider,
      event_id,
      metadata,
      processed_at
    ) VALUES (
      ${idempotencyKey},
      ${provider},
      ${eventId},
      ${metadata ? JSON.stringify(metadata) : null},
      NOW()
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
  `

  // If no rows returned, it was a duplicate
  return result.rows.length === 0
}

/**
 * Clean up old idempotency keys
 *
 * Called periodically to remove keys older than the retention period.
 * Default retention is 7 days.
 *
 * @param retentionDays - Number of days to retain keys (default: 7)
 * @returns Number of keys deleted
 */
export async function cleanupIdempotencyKeys(
  retentionDays = 7
): Promise<number> {
  const result = await sql`
    DELETE FROM public.webhook_idempotency_keys
    WHERE processed_at < NOW() - INTERVAL '1 day' * ${retentionDays}
  `

  return result.rowCount ?? 0
}
