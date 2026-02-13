import { withTenant, sql } from '@cgk-platform/db'
import { Badge, Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { ArrowLeft, Mail, Phone, ShoppingCart, DollarSign, Calendar } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { OrderStatusBadge } from '@/components/commerce/status-badge'
import { formatDate, formatDateTime, formatMoney } from '@/lib/format'

interface CustomerDetail {
  id: string
  email: string | null
  phone: string | null
  first_name: string | null
  last_name: string | null
  default_address: Address | null
  accepts_marketing: boolean
  orders_count: number
  total_spent_cents: number
  currency: string
  tags: string[] | null
  notes: string | null
  created_at: string
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

interface OrderSummary {
  id: string
  order_number: string
  status: string
  total_cents: number
  currency: string
  order_placed_at: string | null
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const { customer, orders } = await withTenant(tenantSlug, async () => {
    const customerResult = await sql`
      SELECT id, email, phone, first_name, last_name, default_address,
             accepts_marketing, orders_count, total_spent_cents, currency,
             tags, notes, created_at
      FROM customers WHERE id = ${id}
    `
    const cust = customerResult.rows[0] as CustomerDetail | undefined
    if (!cust) return { customer: null, orders: [] }

    const ordersResult = await sql`
      SELECT id, order_number, status, total_cents, currency, order_placed_at
      FROM orders WHERE customer_id = ${id}
      ORDER BY order_placed_at DESC NULLS LAST
      LIMIT 20
    `

    return {
      customer: cust,
      orders: ordersResult.rows as OrderSummary[],
    }
  })

  if (!customer) notFound()

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Unknown Customer'
  const address = customer.default_address as Address | null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/commerce/customers" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{fullName}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {customer.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {customer.email}
              </span>
            )}
            {customer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {customer.phone}
              </span>
            )}
            {customer.accepts_marketing && (
              <Badge variant="info">Marketing</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="h-4 w-4" />
              Orders
            </div>
            <p className="mt-1 text-2xl font-bold">{customer.orders_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Lifetime Value
            </div>
            <p className="mt-1 text-2xl font-bold">
              {formatMoney(customer.total_spent_cents, customer.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Member Since
            </div>
            <p className="mt-1 text-2xl font-bold">{formatDate(customer.created_at)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Order History</h2>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Order</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 text-right font-medium">Total</th>
                        <th className="pb-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-muted/50">
                          <td className="py-2">
                            <Link
                              href={`/admin/commerce/orders/${order.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              #{order.order_number}
                            </Link>
                          </td>
                          <td className="py-2">
                            <OrderStatusBadge status={order.status} />
                          </td>
                          <td className="py-2 text-right font-medium">
                            {formatMoney(order.total_cents, order.currency)}
                          </td>
                          <td className="py-2">
                            {order.order_placed_at ? formatDateTime(order.order_placed_at) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {(customer.notes || (customer.tags && customer.tags.length > 0)) && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Notes & Tags</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.notes && <p className="text-sm">{customer.notes}</p>}
                {customer.tags && customer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {address && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Default Address</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5 text-sm">
                  {address.first_name && <p>{[address.first_name, address.last_name].filter(Boolean).join(' ')}</p>}
                  {address.address1 && <p>{address.address1}</p>}
                  {address.address2 && <p>{address.address2}</p>}
                  {(address.city || address.province || address.zip) && (
                    <p>{[address.city, address.province, address.zip].filter(Boolean).join(', ')}</p>
                  )}
                  {address.country && <p>{address.country}</p>}
                  {address.phone && <p className="mt-1 text-muted-foreground">{address.phone}</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
