/**
 * Order Confirmation Page
 *
 * Displays order details after successful checkout.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { sql, withTenant } from '@cgk-platform/db'
import { notFound } from 'next/navigation'
import { CheckCircle, Package, Truck, Mail } from 'lucide-react'

import { getTenantConfig, getTenantSlug } from '@/lib/tenant'
import { formatMoney } from '@/lib/cart/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface OrderLineItem {
  id: string
  quantity: number
  merchandise: {
    id: string
    title: string
    price: { amount: string; currencyCode: string }
    image?: { url: string }
  }
}

interface OrderRow {
  id: string
  order_number: string
  customer_email: string
  status: string
  total_cents: number
  subtotal_cents: number
  shipping_cents: number
  tax_cents: number
  currency: string
  line_items: OrderLineItem[]
  shipping_address: Record<string, string> | null
  created_at: string
}

interface PageProps {
  params: Promise<{ orderId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tenant = await getTenantConfig()
  const { orderId } = await params

  return {
    title: `Order Confirmed | ${tenant?.name ?? 'Store'}`,
    description: `Your order ${orderId} has been confirmed`,
    robots: { index: false, follow: false },
  }
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderId } = await params
  const tenantSlug = await getTenantSlug()
  const tenant = await getTenantConfig()

  if (!tenantSlug) {
    notFound()
  }

  // Get order details
  const result = await withTenant(tenantSlug, async () => {
    return sql<OrderRow>`
      SELECT
        id,
        order_number,
        customer_email,
        status,
        total_cents,
        subtotal_cents,
        shipping_cents,
        tax_cents,
        currency,
        line_items,
        shipping_address,
        created_at
      FROM orders
      WHERE id = ${orderId}
      LIMIT 1
    `
  })

  const order = result.rows[0]
  if (!order) {
    notFound()
  }

  const shippingAddress = order.shipping_address

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            {tenant?.name ?? 'Store'}
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          {/* Success Message */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold">Thank you for your order!</h1>
            <p className="mt-2 text-muted-foreground">
              Order #{order.order_number}
            </p>
          </div>

          {/* Order Details Card */}
          <div className="rounded-xl border bg-background p-6 shadow-sm">
            {/* Email confirmation notice */}
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-muted/50 p-4">
              <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Confirmation sent</p>
                <p className="text-sm text-muted-foreground">
                  We've sent a confirmation email to {order.customer_email}
                </p>
              </div>
            </div>

            {/* Order status */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium capitalize">{order.status}</p>
                <p className="text-sm text-muted-foreground">
                  Placed on {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Shipping info */}
            {shippingAddress && (
              <div className="mb-6 rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">Shipping to</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {shippingAddress.firstName} {shippingAddress.lastName}<br />
                  {shippingAddress.address1}<br />
                  {shippingAddress.address2 && <>{shippingAddress.address2}<br /></>}
                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
                </p>
              </div>
            )}

            {/* Items */}
            <div className="mb-6">
              <h3 className="mb-3 font-medium">Items ordered</h3>
              <div className="space-y-3">
                {order.line_items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    {item.merchandise.image?.url && (
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        <img
                          src={item.merchandise.image.url}
                          alt={item.merchandise.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.merchandise.title}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">
                      {formatMoney(item.merchandise.price)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>
                    {formatMoney({
                      amount: (order.subtotal_cents / 100).toFixed(2),
                      currencyCode: order.currency,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    {formatMoney({
                      amount: (order.shipping_cents / 100).toFixed(2),
                      currencyCode: order.currency,
                    })}
                  </span>
                </div>
                {order.tax_cents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>
                      {formatMoney({
                        amount: (order.tax_cents / 100).toFixed(2),
                        currencyCode: order.currency,
                      })}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-between border-t pt-4 text-lg font-bold">
                <span>Total</span>
                <span>
                  {formatMoney({
                    amount: (order.total_cents / 100).toFixed(2),
                    currencyCode: order.currency,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/account/orders"
              className="btn-secondary inline-flex items-center justify-center"
            >
              View Order History
            </Link>
            <Link
              href="/"
              className="btn-primary inline-flex items-center justify-center"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
