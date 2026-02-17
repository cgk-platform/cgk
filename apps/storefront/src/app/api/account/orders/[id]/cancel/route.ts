export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type { CancellationReason, Order, OrderLineItem, OrderStatus } from '@/lib/account/types'

interface OrderRow {
  id: string
  order_number: string
  status: OrderStatus
  fulfillment_status: string | null
  created_at: string
  updated_at: string
  total_cents: number
  subtotal_cents: number
  shipping_cents: number
  tax_cents: number
  discount_cents: number
  currency: string
  line_items: OrderLineItem[] | null
  shipping_address: Record<string, unknown> | null
  billing_address: Record<string, unknown> | null
  order_placed_at: string | null
}

interface CancelRequest {
  reason: CancellationReason
  reasonDetails?: string | null
}

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/account/orders/[id]/cancel
 * Cancels an order
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id: orderId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CancelRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.reason) {
    return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 })
  }

  // Get current order
  const orderResult = await withTenant(tenantSlug, async () => {
    return sql<OrderRow>`
      SELECT
        id,
        order_number,
        status,
        fulfillment_status,
        created_at,
        updated_at,
        total_cents,
        subtotal_cents,
        shipping_cents,
        tax_cents,
        discount_cents,
        currency,
        line_items,
        shipping_address,
        billing_address,
        order_placed_at
      FROM orders
      WHERE id = ${orderId}
        AND customer_id = ${session.customerId}
      LIMIT 1
    `
  })

  const order = orderResult.rows[0]
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Check if order can be cancelled
  const now = new Date()
  const orderDate = new Date(order.order_placed_at ?? order.created_at)
  const daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))

  if (order.status !== 'pending') {
    return NextResponse.json(
      { error: 'Only pending orders can be cancelled' },
      { status: 400 }
    )
  }

  if (daysSinceOrder >= 1) {
    return NextResponse.json(
      { error: 'Orders can only be cancelled within 24 hours of placement' },
      { status: 400 }
    )
  }

  // Cancel the order
  const cancelResult = await withTenant(tenantSlug, async () => {
    return sql<OrderRow>`
      UPDATE orders
      SET
        status = 'cancelled',
        cancelled_at = NOW(),
        notes = COALESCE(notes, '') || E'\nCancelled by customer: ' || ${body.reason} ||
          CASE WHEN ${body.reasonDetails ?? ''} != '' THEN ' - ' || ${body.reasonDetails ?? ''} ELSE '' END,
        updated_at = NOW()
      WHERE id = ${orderId}
        AND customer_id = ${session.customerId}
      RETURNING
        id,
        order_number,
        status,
        fulfillment_status,
        created_at,
        updated_at,
        total_cents,
        subtotal_cents,
        shipping_cents,
        tax_cents,
        discount_cents,
        currency,
        line_items,
        shipping_address,
        billing_address,
        order_placed_at
    `
  })

  const updatedOrder = cancelResult.rows[0]
  if (!updatedOrder) {
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 })
  }

  const response: Order = {
    id: updatedOrder.id,
    orderNumber: updatedOrder.order_number ?? updatedOrder.id,
    status: updatedOrder.status,
    createdAt: updatedOrder.created_at,
    updatedAt: updatedOrder.updated_at,
    totalCents: updatedOrder.total_cents ?? 0,
    subtotalCents: updatedOrder.subtotal_cents ?? 0,
    shippingCents: updatedOrder.shipping_cents ?? 0,
    taxCents: updatedOrder.tax_cents ?? 0,
    discountCents: updatedOrder.discount_cents ?? 0,
    currencyCode: updatedOrder.currency ?? 'USD',
    lineItems: updatedOrder.line_items ?? [],
    shippingAddress: updatedOrder.shipping_address
      ? {
          firstName: String(updatedOrder.shipping_address.first_name ?? ''),
          lastName: String(updatedOrder.shipping_address.last_name ?? ''),
          company: updatedOrder.shipping_address.company as string | null,
          address1: String(updatedOrder.shipping_address.address1 ?? ''),
          address2: updatedOrder.shipping_address.address2 as string | null,
          city: String(updatedOrder.shipping_address.city ?? ''),
          province: String(updatedOrder.shipping_address.province ?? ''),
          provinceCode: updatedOrder.shipping_address.province_code as string | null,
          postalCode: String(updatedOrder.shipping_address.zip ?? updatedOrder.shipping_address.postal_code ?? ''),
          country: String(updatedOrder.shipping_address.country ?? ''),
          countryCode: String(updatedOrder.shipping_address.country_code ?? ''),
          phone: updatedOrder.shipping_address.phone as string | null,
        }
      : {
          firstName: '',
          lastName: '',
          company: null,
          address1: '',
          address2: null,
          city: '',
          province: '',
          provinceCode: null,
          postalCode: '',
          country: '',
          countryCode: '',
          phone: null,
        },
    billingAddress: null,
    tracking: null,
    canCancel: false,
    canReturn: false,
    cancellationDeadline: null,
    returnDeadline: null,
  }

  return NextResponse.json(response)
}
