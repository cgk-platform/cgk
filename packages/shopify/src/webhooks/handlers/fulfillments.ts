/**
 * Fulfillment Webhook Handlers
 *
 * Handles fulfillments/create and fulfillments/update webhooks
 */

import { withTenant, sql } from '@cgk-platform/db'
import { tasks } from '@trigger.dev/sdk/v3'
import type { ShopifyFulfillmentPayload } from '../types'

/**
 * Handle fulfillments/create webhook
 *
 * Creates a fulfillment record and triggers review email queue
 */
export async function handleFulfillmentCreate(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  const fulfillment = payload as ShopifyFulfillmentPayload
  const shopifyFulfillmentId = fulfillment.id.toString()
  const orderId = fulfillment.order_id.toString()

  await withTenant(tenantId, async () => {
    // Upsert fulfillment record
    await sql`
      INSERT INTO fulfillments (
        shopify_fulfillment_id,
        order_shopify_id,
        status,
        tracking_company,
        tracking_number,
        tracking_url,
        created_at,
        updated_at
      ) VALUES (
        ${shopifyFulfillmentId},
        ${orderId},
        ${fulfillment.status},
        ${fulfillment.tracking_company || null},
        ${fulfillment.tracking_number || fulfillment.tracking_numbers?.[0] || null},
        ${fulfillment.tracking_url || fulfillment.tracking_urls?.[0] || null},
        ${fulfillment.created_at},
        ${fulfillment.updated_at}
      )
      ON CONFLICT (shopify_fulfillment_id) DO UPDATE SET
        status = EXCLUDED.status,
        tracking_company = EXCLUDED.tracking_company,
        tracking_number = EXCLUDED.tracking_number,
        tracking_url = EXCLUDED.tracking_url,
        updated_at = EXCLUDED.updated_at
    `

    // Update order fulfillment status
    await sql`
      UPDATE orders
      SET
        fulfillment_status = 'fulfilled',
        synced_at = NOW()
      WHERE shopify_id = ${orderId}
    `
  })

  // Trigger background jobs
  await Promise.all([
    // Queue review request email processing
    tasks.trigger('commerce-process-review-email-queue', {
      tenantId,
      limit: 50,
      dryRun: false,
    }),

    // Handle order fulfilled for project linking and other processing
    tasks.trigger('commerce-handle-order-fulfilled', {
      tenantId,
      orderId,
      fulfillmentId: shopifyFulfillmentId,
      trackingNumber: fulfillment.tracking_number || fulfillment.tracking_numbers?.[0] || null,
      carrier: fulfillment.tracking_company || null,
    }),
  ])

  console.log(
    `[Webhook] Fulfillment ${shopifyFulfillmentId} created for order ${orderId}, tenant ${tenantId}`
  )
}

/**
 * Handle fulfillments/update webhook
 *
 * Updates tracking information and triggers notifications if tracking changed
 */
export async function handleFulfillmentUpdate(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  const fulfillment = payload as ShopifyFulfillmentPayload
  const shopifyFulfillmentId = fulfillment.id.toString()
  const orderId = fulfillment.order_id.toString()

  // Get existing fulfillment to check for tracking changes
  let trackingChanged = false

  await withTenant(tenantId, async () => {
    const existing = await sql`
      SELECT tracking_number, status
      FROM fulfillments
      WHERE shopify_fulfillment_id = ${shopifyFulfillmentId}
    `

    const newTrackingNumber =
      fulfillment.tracking_number || fulfillment.tracking_numbers?.[0] || null

    if (existing.rows.length > 0 && existing.rows[0]) {
      const oldTracking = existing.rows[0].tracking_number as string | null
      trackingChanged = oldTracking !== newTrackingNumber
    }

    // Update fulfillment record
    await sql`
      INSERT INTO fulfillments (
        shopify_fulfillment_id,
        order_shopify_id,
        status,
        tracking_company,
        tracking_number,
        tracking_url,
        created_at,
        updated_at
      ) VALUES (
        ${shopifyFulfillmentId},
        ${orderId},
        ${fulfillment.status},
        ${fulfillment.tracking_company || null},
        ${newTrackingNumber},
        ${fulfillment.tracking_url || fulfillment.tracking_urls?.[0] || null},
        ${fulfillment.created_at},
        ${fulfillment.updated_at}
      )
      ON CONFLICT (shopify_fulfillment_id) DO UPDATE SET
        status = EXCLUDED.status,
        tracking_company = EXCLUDED.tracking_company,
        tracking_number = EXCLUDED.tracking_number,
        tracking_url = EXCLUDED.tracking_url,
        updated_at = EXCLUDED.updated_at
    `
  })

  // If tracking info changed, trigger notification
  if (trackingChanged) {
    await tasks.trigger('commerce-handle-order-fulfilled', {
      tenantId,
      orderId,
      fulfillmentId: shopifyFulfillmentId,
      trackingNumber: fulfillment.tracking_number || fulfillment.tracking_numbers?.[0] || null,
      carrier: fulfillment.tracking_company || null,
    })
  }

  console.log(
    `[Webhook] Fulfillment ${shopifyFulfillmentId} updated for order ${orderId}, tenant ${tenantId}`
  )
}
