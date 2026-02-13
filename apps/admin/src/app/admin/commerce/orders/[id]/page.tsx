import { withTenant, sql } from '@cgk-platform/db'
import { Badge, Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { ArrowLeft } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { OrderStatusBadge, FulfillmentBadge, FinancialBadge } from '@/components/commerce/status-badge'
import { formatDateTime, formatMoney } from '@/lib/format'

interface LineItem {
  product_id?: string
  variant_id?: string
  title: string
  variant_title?: string
  quantity: number
  price_cents: number
}

interface Address {
  first_name?: string
  last_name?: string
  address1?: string
  address2?: string
  city?: string
  province?: string
  zip?: string
  country?: string
  phone?: string
}

interface OrderDetail {
  id: string
  order_number: string
  customer_id: string | null
  customer_email: string | null
  status: string
  fulfillment_status: string
  financial_status: string
  subtotal_cents: number
  discount_cents: number
  shipping_cents: number
  tax_cents: number
  total_cents: number
  currency: string
  line_items: LineItem[]
  shipping_address: Address | null
  billing_address: Address | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  notes: string | null
  tags: string[] | null
  order_placed_at: string | null
  created_at: string
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const order = await withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, order_number, customer_id, customer_email,
             status, fulfillment_status, financial_status,
             subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents, currency,
             line_items, shipping_address, billing_address,
             utm_source, utm_medium, utm_campaign,
             notes, tags, order_placed_at, created_at
      FROM orders WHERE id = ${id}
    `
    return result.rows[0] as OrderDetail | undefined
  })

  if (!order) notFound()

  const lineItems: LineItem[] = Array.isArray(order.line_items) ? order.line_items : []
  const shippingAddress = order.shipping_address as Address | null
  const billingAddress = order.billing_address as Address | null
  const hasAttribution = order.utm_source || order.utm_medium || order.utm_campaign

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/commerce/orders" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Order #{order.order_number}</h1>
            <OrderStatusBadge status={order.status} />
            <FulfillmentBadge status={order.fulfillment_status} />
            <FinancialBadge status={order.financial_status} />
          </div>
          {order.order_placed_at && (
            <p className="text-sm text-muted-foreground">
              Placed {formatDateTime(order.order_placed_at)}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {lineItems.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Line Items</h2>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Product</th>
                        <th className="pb-2 font-medium">Qty</th>
                        <th className="pb-2 text-right font-medium">Price</th>
                        <th className="pb-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lineItems.map((item, i) => (
                        <tr key={i}>
                          <td className="py-2">
                            <div>{item.title}</div>
                            {item.variant_title && (
                              <div className="text-xs text-muted-foreground">{item.variant_title}</div>
                            )}
                          </td>
                          <td className="py-2">{item.quantity}</td>
                          <td className="py-2 text-right">{formatMoney(item.price_cents, order.currency)}</td>
                          <td className="py-2 text-right font-medium">
                            {formatMoney(item.price_cents * item.quantity, order.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <h2 className="font-semibold">Financial Summary</h2>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatMoney(order.subtotal_cents, order.currency)}</dd>
                </div>
                {order.discount_cents > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className="text-red-600">-{formatMoney(order.discount_cents, order.currency)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd>{formatMoney(order.shipping_cents, order.currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd>{formatMoney(order.tax_cents, order.currency)}</dd>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <dt>Total</dt>
                  <dd>{formatMoney(order.total_cents, order.currency)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {(order.notes || (order.tags && order.tags.length > 0)) && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Notes & Tags</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.notes && <p className="text-sm">{order.notes}</p>}
                {order.tags && order.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {order.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Customer</h2>
            </CardHeader>
            <CardContent>
              {order.customer_email && (
                <p className="text-sm">{order.customer_email}</p>
              )}
              {order.customer_id && (
                <Link
                  href={`/admin/commerce/customers/${order.customer_id}`}
                  className="mt-1 block text-sm text-primary hover:underline"
                >
                  View customer
                </Link>
              )}
              {!order.customer_email && !order.customer_id && (
                <p className="text-sm text-muted-foreground">No customer information</p>
              )}
            </CardContent>
          </Card>

          {shippingAddress && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Shipping Address</h2>
              </CardHeader>
              <CardContent>
                <AddressBlock address={shippingAddress} />
              </CardContent>
            </Card>
          )}

          {billingAddress && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Billing Address</h2>
              </CardHeader>
              <CardContent>
                <AddressBlock address={billingAddress} />
              </CardContent>
            </Card>
          )}

          {hasAttribution && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Attribution</h2>
              </CardHeader>
              <CardContent>
                <dl className="space-y-1 text-sm">
                  {order.utm_source && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Source</dt>
                      <dd>{order.utm_source}</dd>
                    </div>
                  )}
                  {order.utm_medium && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Medium</dt>
                      <dd>{order.utm_medium}</dd>
                    </div>
                  )}
                  {order.utm_campaign && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Campaign</dt>
                      <dd>{order.utm_campaign}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function AddressBlock({ address }: { address: Address }) {
  const name = [address.first_name, address.last_name].filter(Boolean).join(' ')
  const cityLine = [address.city, address.province, address.zip].filter(Boolean).join(', ')

  return (
    <div className="space-y-0.5 text-sm">
      {name && <p>{name}</p>}
      {address.address1 && <p>{address.address1}</p>}
      {address.address2 && <p>{address.address2}</p>}
      {cityLine && <p>{cityLine}</p>}
      {address.country && <p>{address.country}</p>}
      {address.phone && <p className="mt-1 text-muted-foreground">{address.phone}</p>}
    </div>
  )
}
