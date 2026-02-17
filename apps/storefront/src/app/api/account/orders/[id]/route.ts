export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type { Order, OrderLineItem, OrderStatus, OrderTracking, TrackingEvent } from '@/lib/account/types'

interface OrderRow {
  id: string
  order_number: string
  status: OrderStatus
  fulfillment_status: string | null
  financial_status: string | null
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
  cancelled_at: string | null
}

function mapOrderRowToOrder(row: OrderRow, tracking: OrderTracking | null): Order {
  const now = new Date()
  const orderDate = new Date(row.order_placed_at ?? row.created_at)
  const daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))

  const canCancel = row.status === 'pending' && daysSinceOrder < 1
  const canReturn = ['shipped', 'delivered'].includes(row.status) && daysSinceOrder <= 30

  return {
    id: row.id,
    orderNumber: row.order_number ?? row.id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalCents: row.total_cents ?? 0,
    subtotalCents: row.subtotal_cents ?? 0,
    shippingCents: row.shipping_cents ?? 0,
    taxCents: row.tax_cents ?? 0,
    discountCents: row.discount_cents ?? 0,
    currencyCode: row.currency ?? 'USD',
    lineItems: row.line_items ?? [],
    shippingAddress: row.shipping_address
      ? {
          firstName: String(row.shipping_address.first_name ?? ''),
          lastName: String(row.shipping_address.last_name ?? ''),
          company: row.shipping_address.company as string | null,
          address1: String(row.shipping_address.address1 ?? ''),
          address2: row.shipping_address.address2 as string | null,
          city: String(row.shipping_address.city ?? ''),
          province: String(row.shipping_address.province ?? ''),
          provinceCode: row.shipping_address.province_code as string | null,
          postalCode: String(row.shipping_address.zip ?? row.shipping_address.postal_code ?? ''),
          country: String(row.shipping_address.country ?? ''),
          countryCode: String(row.shipping_address.country_code ?? ''),
          phone: row.shipping_address.phone as string | null,
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
    billingAddress: row.billing_address
      ? {
          firstName: String(row.billing_address.first_name ?? ''),
          lastName: String(row.billing_address.last_name ?? ''),
          company: row.billing_address.company as string | null,
          address1: String(row.billing_address.address1 ?? ''),
          address2: row.billing_address.address2 as string | null,
          city: String(row.billing_address.city ?? ''),
          province: String(row.billing_address.province ?? ''),
          provinceCode: row.billing_address.province_code as string | null,
          postalCode: String(row.billing_address.zip ?? row.billing_address.postal_code ?? ''),
          country: String(row.billing_address.country ?? ''),
          countryCode: String(row.billing_address.country_code ?? ''),
          phone: row.billing_address.phone as string | null,
        }
      : null,
    tracking,
    canCancel,
    canReturn,
    cancellationDeadline: canCancel
      ? new Date(orderDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
      : null,
    returnDeadline: canReturn
      ? new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null,
  }
}

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/account/orders/[id]
 * Returns a single order by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id: orderId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get order
  const result = await withTenant(tenantSlug, async () => {
    return sql<OrderRow>`
      SELECT
        id,
        order_number,
        status,
        fulfillment_status,
        financial_status,
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
        order_placed_at,
        cancelled_at
      FROM orders
      WHERE id = ${orderId}
        AND customer_id = ${session.customerId}
      LIMIT 1
    `
  })

  const orderRow = result.rows[0]
  if (!orderRow) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Try to get tracking info if the order has been fulfilled
  let tracking: OrderTracking | null = null

  if (orderRow.fulfillment_status === 'fulfilled' || orderRow.fulfillment_status === 'partial') {
    try {
      const fulfillmentResult = await withTenant(tenantSlug, async () => {
        return sql<{
          tracking_company: string | null
          tracking_number: string | null
          tracking_url: string | null
          tracking_info: TrackingEvent[] | null
          estimated_delivery_at: string | null
        }>`
          SELECT
            tracking_company,
            tracking_number,
            tracking_url,
            tracking_info,
            estimated_delivery_at
          FROM order_fulfillments
          WHERE order_id = ${orderId}
          ORDER BY created_at DESC
          LIMIT 1
        `
      })

      const fulfillment = fulfillmentResult.rows[0]
      if (fulfillment?.tracking_number) {
        tracking = {
          carrier: fulfillment.tracking_company ?? 'Unknown',
          trackingNumber: fulfillment.tracking_number,
          trackingUrl: fulfillment.tracking_url,
          estimatedDelivery: fulfillment.estimated_delivery_at,
          events: fulfillment.tracking_info ?? [],
        }
      }
    } catch {
      // Fulfillments table might not exist, continue without tracking
    }
  }

  const order = mapOrderRowToOrder(orderRow, tracking)
  return NextResponse.json(order)
}
