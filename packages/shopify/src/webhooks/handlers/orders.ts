/**
 * Order Webhook Handlers
 *
 * Handles orders/create, orders/updated, orders/paid, orders/cancelled, orders/fulfilled
 */

import { withTenant, sql } from '@cgk/db'
import { createJobQueue } from '@cgk/jobs'
import type { ShopifyOrderPayload } from '../types'
import { parseCents, mapFinancialStatus, mapFulfillmentStatus } from '../utils'

// Create job queue for order-related background jobs
const orderJobQueue = createJobQueue({ name: 'order-webhooks' })

/**
 * Handle orders/create webhook
 *
 * Creates or updates the order in the local database and triggers
 * background jobs for attribution, commission calculation, and A/B test attribution
 */
export async function handleOrderCreate(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  const order = payload as ShopifyOrderPayload
  const shopifyId = order.id.toString()
  const orderName = order.name

  // Upsert order to local database
  await withTenant(tenantId, async () => {
    const discountCodes = order.discount_codes?.map(d => d.code) || []
    const tags = order.tags ? order.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    const shippingCents = order.total_shipping_price_set?.shop_money?.amount
      ? parseCents(order.total_shipping_price_set.shop_money.amount)
      : 0

    await sql`
      INSERT INTO orders (
        shopify_id,
        shopify_order_number,
        created_at,
        customer_email,
        customer_id,
        gross_sales_cents,
        discounts_cents,
        net_sales_cents,
        taxes_cents,
        shipping_cents,
        total_price_cents,
        financial_status,
        fulfillment_status,
        discount_codes,
        tags,
        currency,
        synced_at
      ) VALUES (
        ${shopifyId},
        ${orderName},
        ${order.created_at},
        ${order.email || order.customer?.email || null},
        ${order.customer?.id?.toString() || null},
        ${parseCents(order.subtotal_price)},
        ${parseCents(order.total_discounts)},
        ${parseCents(order.subtotal_price) - parseCents(order.total_discounts)},
        ${parseCents(order.total_tax)},
        ${shippingCents},
        ${parseCents(order.total_price)},
        ${mapFinancialStatus(order.financial_status)},
        ${mapFulfillmentStatus(order.fulfillment_status)},
        ${JSON.stringify(discountCodes)},
        ${JSON.stringify(tags)},
        ${order.currency || 'USD'},
        NOW()
      )
      ON CONFLICT (shopify_id) DO UPDATE SET
        financial_status = EXCLUDED.financial_status,
        fulfillment_status = EXCLUDED.fulfillment_status,
        discounts_cents = EXCLUDED.discounts_cents,
        net_sales_cents = EXCLUDED.net_sales_cents,
        total_price_cents = EXCLUDED.total_price_cents,
        tags = EXCLUDED.tags,
        synced_at = NOW()
    `

    // Also sync line items
    await syncOrderLineItems(shopifyId, order.line_items)
  })

  // Trigger background jobs
  const netSalesCents = parseCents(order.subtotal_price) - parseCents(order.total_discounts)

  await Promise.all([
    // Attribution processing
    orderJobQueue.enqueue('order/attribution', {
      tenantId,
      orderId: shopifyId,
      orderName,
      noteAttributes: order.note_attributes || [],
      discountCodes: order.discount_codes || [],
      customerEmail: order.email || order.customer?.email || null,
    }, { tenantId }),

    // Creator commission check
    orderJobQueue.enqueue('order/commission', {
      tenantId,
      orderId: shopifyId,
      discountCodes: order.discount_codes?.map(d => d.code) || [],
      netSalesCents,
    }, { tenantId }),

    // A/B test attribution
    orderJobQueue.enqueue('order/ab-attribution', {
      tenantId,
      orderId: shopifyId,
      orderName,
      noteAttributes: order.note_attributes || [],
      shippingLines: order.shipping_lines || [],
      totalCents: parseCents(order.total_price),
    }, { tenantId }),
  ])

  console.log(`[Webhook] Order ${orderName} created for tenant ${tenantId}`)
}

/**
 * Handle orders/paid webhook
 *
 * Updates the order status and triggers paid-specific actions like
 * gift card rewards and pixel events
 */
export async function handleOrderPaid(
  tenantId: string,
  payload: unknown,
  eventId: string
): Promise<void> {
  const order = payload as ShopifyOrderPayload

  // First do standard order update
  await handleOrderUpdate(tenantId, payload, eventId)

  // Then process paid-specific actions
  await Promise.all([
    // Gift card rewards
    orderJobQueue.enqueue('order/gift-card-rewards', {
      tenantId,
      orderId: order.id.toString(),
      lineItems: order.line_items,
      customerEmail: order.email || order.customer?.email || null,
      customerId: order.customer?.id?.toString() || null,
    }, { tenantId }),

    // Send pixel events
    orderJobQueue.enqueue('order/pixel-events', {
      tenantId,
      orderId: order.id.toString(),
      orderName: order.name,
      totalPrice: order.total_price,
      subtotalPrice: order.subtotal_price,
      totalTax: order.total_tax,
      shippingPrice: order.total_shipping_price_set?.shop_money?.amount || '0',
      lineItems: order.line_items,
      customerEmail: order.email || order.customer?.email || null,
      customerPhone: order.customer?.phone || null,
      noteAttributes: order.note_attributes || [],
      shippingAddress: order.shipping_address || null,
    }, { tenantId }),
  ])

  console.log(`[Webhook] Order ${order.name} paid for tenant ${tenantId}`)
}

/**
 * Handle orders/updated webhook
 *
 * Updates the order status in the local database
 */
export async function handleOrderUpdate(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  const order = payload as ShopifyOrderPayload
  const shopifyId = order.id.toString()

  await withTenant(tenantId, async () => {
    await sql`
      UPDATE orders
      SET
        financial_status = ${mapFinancialStatus(order.financial_status)},
        fulfillment_status = ${mapFulfillmentStatus(order.fulfillment_status)},
        cancelled_at = ${order.cancelled_at || null},
        synced_at = NOW()
      WHERE shopify_id = ${shopifyId}
    `
  })

  console.log(`[Webhook] Order ${order.name} updated for tenant ${tenantId}`)
}

/**
 * Handle orders/cancelled webhook
 *
 * Updates the order as cancelled and triggers exclusion from A/B tests
 * and commission reversal
 */
export async function handleOrderCancelled(
  tenantId: string,
  payload: unknown,
  eventId: string
): Promise<void> {
  const order = payload as ShopifyOrderPayload
  const shopifyId = order.id.toString()

  // Update order status
  await handleOrderUpdate(tenantId, payload, eventId)

  // Trigger cancellation-specific jobs
  await Promise.all([
    // Exclude from A/B tests
    orderJobQueue.enqueue('order/ab-test-exclusion', {
      tenantId,
      orderId: shopifyId,
      orderName: order.name,
      reason: 'cancelled',
    }, { tenantId }),

    // Reverse commissions
    orderJobQueue.enqueue('order/commission-reversal', {
      tenantId,
      orderId: shopifyId,
      reason: 'order_cancelled',
    }, { tenantId }),
  ])

  console.log(`[Webhook] Order ${order.name} cancelled for tenant ${tenantId}`)
}

/**
 * Sync order line items to local database
 */
async function syncOrderLineItems(
  orderId: string,
  lineItems: ShopifyOrderPayload['line_items']
): Promise<void> {
  // Delete existing line items
  await sql`DELETE FROM order_line_items WHERE order_shopify_id = ${orderId}`

  // Insert new line items
  for (const item of lineItems) {
    await sql`
      INSERT INTO order_line_items (
        order_shopify_id,
        shopify_line_item_id,
        product_id,
        variant_id,
        title,
        quantity,
        price_cents,
        sku,
        variant_title
      ) VALUES (
        ${orderId},
        ${item.id.toString()},
        ${item.product_id?.toString() || null},
        ${item.variant_id?.toString() || null},
        ${item.title},
        ${item.quantity},
        ${parseCents(item.price)},
        ${item.sku || null},
        ${item.variant_title || null}
      )
    `
  }
}
