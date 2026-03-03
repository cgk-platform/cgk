/**
 * Refund Webhook Handler
 *
 * Handles refunds/create webhook
 */

import { withTenant, sql } from '@cgk-platform/db'
import { tasks } from '@trigger.dev/sdk/v3'

import type { ShopifyRefundPayload } from '../types'
import { parseCents } from '../utils'
import { createLogger } from "@cgk-platform/logging"
const logger = createLogger({ meta: { service: "shopify" } })

/**
 * Handle refunds/create webhook
 *
 * Creates a refund record and triggers commission adjustment and pixel events
 */
export async function handleRefundCreate(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  const refund = payload as ShopifyRefundPayload
  const shopifyRefundId = refund.id.toString()
  const orderId = refund.order_id.toString()

  // Calculate total refund amount
  const totalRefundCents = refund.transactions.reduce((sum, txn) => {
    if (txn.status === 'success' && txn.kind === 'refund') {
      return sum + parseCents(txn.amount)
    }
    return sum
  }, 0)

  await withTenant(tenantId, async () => {
    // Create refund record and retrieve internal ID for line item FK
    const refundResult = await sql`
      INSERT INTO refunds (
        shopify_refund_id,
        order_shopify_id,
        amount_cents,
        reason,
        processed_at,
        created_at
      ) VALUES (
        ${shopifyRefundId},
        ${orderId},
        ${totalRefundCents},
        ${refund.note || null},
        ${refund.processed_at || null},
        ${refund.created_at}
      )
      ON CONFLICT (shopify_refund_id) DO UPDATE SET
        amount_cents = EXCLUDED.amount_cents,
        reason = EXCLUDED.reason,
        processed_at = EXCLUDED.processed_at
      RETURNING id
    `

    const refundId = refundResult.rows[0]?.id as string | undefined

    // Update order with refund info
    await sql`
      UPDATE orders
      SET
        financial_status = 'partially_refunded',
        refunded_cents = COALESCE(refunded_cents, 0) + ${totalRefundCents},
        synced_at = NOW()
      WHERE shopify_id = ${orderId}
    `

    // Insert refund line items (requires internal refund ID for FK)
    if (refundId) {
      // Delete existing line items for this refund to handle re-processing
      await sql`DELETE FROM refund_line_items WHERE refund_id = ${refundId}`

      for (const item of refund.refund_line_items) {
        await sql`
          INSERT INTO refund_line_items (
            refund_id,
            shopify_line_item_id,
            quantity,
            amount_cents
          ) VALUES (
            ${refundId},
            ${item.line_item_id.toString()},
            ${item.quantity},
            ${parseCents(item.subtotal) + parseCents(item.total_tax)}
          )
        `
      }
    }
  })

  // Trigger background jobs
  await Promise.all([
    // Adjust creator commissions using order commission task
    tasks.trigger('commerce-order-commission', {
      tenantId,
      orderId,
      discountCode: null,
      orderTotal: -(totalRefundCents / 100), // Negative for refund
      currency: 'USD',
    }),

    // Handle order created for pixel events and additional processing
    tasks.trigger('commerce-handle-order-created', {
      tenantId,
      orderId,
      shopifyOrderId: orderId,
      customerId: null,
      totalAmount: -(totalRefundCents / 100), // Negative for refund
      currency: 'USD',
    }),

    // Update analytics using order attribution task
    tasks.trigger('commerce-order-attribution', {
      tenantId,
      orderId,
      customerId: null,
      sessionId: null,
    }),
  ])

  logger.info(
    `[Webhook] Refund ${shopifyRefundId} created for order ${orderId}, amount: ${totalRefundCents} cents, tenant ${tenantId}`
  )
}
