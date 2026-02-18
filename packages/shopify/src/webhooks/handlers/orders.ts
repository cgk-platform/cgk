/**
 * Order Webhook Handlers
 *
 * Handles orders/create, orders/updated, orders/paid, orders/cancelled, orders/fulfilled
 */

import { withTenant, sql } from '@cgk-platform/db'
import { tasks } from '@trigger.dev/sdk/v3'
import type { ShopifyOrderPayload } from '../types'
import { parseCents, mapFinancialStatus, mapFulfillmentStatus } from '../utils'

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
    const discountCodes = order.discount_codes?.map((d) => d.code) || []
    const tags = order.tags
      ? order.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : []
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
    tasks.trigger('commerce-order-attribution', {
      tenantId,
      orderId: shopifyId,
      customerId: order.customer?.id?.toString() || null,
      sessionId: null, // Session ID should be extracted from note attributes if available
    }),

    // Creator commission check
    tasks.trigger('commerce-order-commission', {
      tenantId,
      orderId: shopifyId,
      discountCode: order.discount_codes?.[0]?.code || null,
      orderTotal: netSalesCents / 100, // Convert cents to dollars
      currency: order.currency || 'USD',
    }),

    // Handle order created for additional processing (A/B attribution, pixel events)
    tasks.trigger('commerce-handle-order-created', {
      tenantId,
      orderId: shopifyId,
      shopifyOrderId: shopifyId,
      customerId: order.customer?.id?.toString() || null,
      totalAmount: parseCents(order.total_price) / 100,
      currency: order.currency || 'USD',
    }),
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
    // Handle order created for gift card rewards processing
    tasks.trigger('commerce-handle-order-created', {
      tenantId,
      orderId: order.id.toString(),
      shopifyOrderId: order.id.toString(),
      customerId: order.customer?.id?.toString() || null,
      totalAmount: parseCents(order.total_price) / 100,
      currency: order.currency || 'USD',
    }),

    // Send pixel events and additional processing
    tasks.trigger('commerce-order-attribution', {
      tenantId,
      orderId: order.id.toString(),
      customerId: order.customer?.id?.toString() || null,
      sessionId: null, // Session ID should be extracted from note attributes if available
    }),
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
    // Handle order created for A/B test exclusion and other processing
    tasks.trigger('commerce-handle-order-created', {
      tenantId,
      orderId: shopifyId,
      shopifyOrderId: shopifyId,
      customerId: order.customer?.id?.toString() || null,
      totalAmount: parseCents(order.total_price) / 100,
      currency: order.currency || 'USD',
    }),

    // Reverse commissions using order commission task
    tasks.trigger('commerce-order-commission', {
      tenantId,
      orderId: shopifyId,
      discountCode: null,
      orderTotal: 0, // Zero out commission
      currency: order.currency || 'USD',
    }),
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
