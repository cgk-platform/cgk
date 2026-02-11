'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, Badge } from '@cgk/ui'

import type { DateRange, PlatformData } from '@/lib/analytics'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'

interface PlatformDataTabProps {
  dateRange: DateRange
}

export function PlatformDataTab({ dateRange }: PlatformDataTabProps) {
  const [data, setData] = useState<PlatformData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          preset: dateRange.preset,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        })
        const res = await fetch(`/api/admin/analytics/platform-data?${params}`)
        const json = await res.json()
        setData(json.data)
      } catch (error) {
        console.error('Failed to fetch platform data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [dateRange])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (!data) {
    return <div className="text-muted-foreground">No data available</div>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Store Health */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Store Health</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetricRow
            label="Total Orders"
            value={formatNumber(data.storeHealth.totalOrders.value)}
            change={data.storeHealth.totalOrders.changePercent}
            trend={data.storeHealth.totalOrders.trend}
          />
          <MetricRow
            label="Total Revenue"
            value={formatCurrency(data.storeHealth.totalRevenue.value)}
            change={data.storeHealth.totalRevenue.changePercent}
            trend={data.storeHealth.totalRevenue.trend}
          />
          <MetricRow
            label="Average Order Value"
            value={formatCurrency(data.storeHealth.aov.value)}
            change={data.storeHealth.aov.changePercent}
            trend={data.storeHealth.aov.trend}
          />
          <MetricRow
            label="Conversion Rate"
            value={formatPercent(data.storeHealth.conversionRate.value)}
            change={data.storeHealth.conversionRate.changePercent}
            trend={data.storeHealth.conversionRate.trend}
          />
        </CardContent>
      </Card>

      {/* Customer Metrics */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Customer Metrics</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetricRow
            label="New Customers"
            value={formatNumber(data.customers.newCustomers.value)}
            change={data.customers.newCustomers.changePercent}
            trend={data.customers.newCustomers.trend}
          />
          <MetricRow
            label="Returning Customers"
            value={formatNumber(data.customers.returningCustomers.value)}
            change={data.customers.returningCustomers.changePercent}
            trend={data.customers.returningCustomers.trend}
          />
          <MetricRow
            label="Retention Rate"
            value={formatPercent(data.customers.retentionRate.value)}
            change={data.customers.retentionRate.changePercent}
            trend={data.customers.retentionRate.trend}
          />
          <MetricRow
            label="Repeat Purchase Rate"
            value={formatPercent(data.customers.repeatPurchaseRate.value)}
            change={data.customers.repeatPurchaseRate.changePercent}
            trend={data.customers.repeatPurchaseRate.trend}
          />
        </CardContent>
      </Card>

      {/* Cart & Checkout */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Cart & Checkout</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetricRow
            label="Cart Abandonment Rate"
            value={formatPercent(data.cartCheckout.cartAbandonmentRate.value)}
            change={data.cartCheckout.cartAbandonmentRate.changePercent}
            trend={data.cartCheckout.cartAbandonmentRate.trend}
            inverseColor
          />
          <MetricRow
            label="Checkout Completion Rate"
            value={formatPercent(data.cartCheckout.checkoutCompletionRate.value)}
            change={data.cartCheckout.checkoutCompletionRate.changePercent}
            trend={data.cartCheckout.checkoutCompletionRate.trend}
          />
          <MetricRow
            label="Payment Success Rate"
            value={formatPercent(data.cartCheckout.paymentSuccessRate.value)}
            change={data.cartCheckout.paymentSuccessRate.changePercent}
            trend={data.cartCheckout.paymentSuccessRate.trend}
          />
          <MetricRow
            label="Average Cart Size"
            value={`${data.cartCheckout.avgCartSize.value.toFixed(1)} items`}
            change={data.cartCheckout.avgCartSize.changePercent}
            trend={data.cartCheckout.avgCartSize.trend}
          />
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Data Sources</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataSourceRow
            name="Shopify"
            connected={data.dataSources.shopify.connected}
            lastSync={data.dataSources.shopify.lastSync}
          />
          <DataSourceRow
            name="Stripe"
            connected={data.dataSources.stripe.connected}
            lastSync={data.dataSources.stripe.lastSync}
          />
          <DataSourceRow
            name="Google Analytics"
            connected={data.dataSources.googleAnalytics.connected}
            lastSync={data.dataSources.googleAnalytics.lastSync}
          />
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <h3 className="font-semibold">Top Products</h3>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium text-right">Revenue</th>
                <th className="pb-3 font-medium text-right">Units</th>
                <th className="pb-3 font-medium text-right">Inventory</th>
                <th className="pb-3 font-medium text-right">Velocity/Day</th>
                <th className="pb-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.topProducts.map((product) => (
                <tr key={product.productId}>
                  <td className="py-3 font-medium">{product.productName}</td>
                  <td className="py-3 text-right">{formatCurrency(product.revenue)}</td>
                  <td className="py-3 text-right">{product.units}</td>
                  <td className="py-3 text-right">{product.inventoryLevel}</td>
                  <td className="py-3 text-right">{product.velocityPerDay.toFixed(1)}</td>
                  <td className="py-3 text-right">
                    {product.isLowStock ? (
                      <Badge variant="destructive">
                        {product.daysUntilStockout
                          ? `${product.daysUntilStockout}d left`
                          : 'Low Stock'}
                      </Badge>
                    ) : (
                      <Badge variant="default">In Stock</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Low Stock Alerts */}
      {data.lowStockProducts.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold text-red-600">Low Stock Alerts</h3>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.lowStockProducts.map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4"
                >
                  <div>
                    <div className="font-medium">{product.productName}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.inventoryLevel} units remaining
                    </div>
                  </div>
                  <Badge variant="destructive">
                    {product.daysUntilStockout
                      ? `${product.daysUntilStockout} days`
                      : 'Reorder Now'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface MetricRowProps {
  label: string
  value: string
  change: number
  trend: 'up' | 'down' | 'stable'
  inverseColor?: boolean
}

function MetricRow({ label, value, change, trend, inverseColor }: MetricRowProps) {
  const isPositive = trend === 'up'
  const colorClass = inverseColor
    ? isPositive
      ? 'text-red-600'
      : 'text-green-600'
    : isPositive
      ? 'text-green-600'
      : 'text-red-600'

  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{value}</span>
        <span className={`text-sm ${trend === 'stable' ? 'text-muted-foreground' : colorClass}`}>
          {trend === 'up' ? '+' : ''}
          {formatPercent(change / 100)}
        </span>
      </div>
    </div>
  )
}

interface DataSourceRowProps {
  name: string
  connected: boolean
  lastSync: string | null
}

function DataSourceRow({ name, connected, lastSync }: DataSourceRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-medium">{name}</span>
      <div className="flex items-center gap-2">
        <Badge variant={connected ? 'default' : 'secondary'}>
          {connected ? 'Connected' : 'Not Connected'}
        </Badge>
        {connected && lastSync && (
          <span className="text-xs text-muted-foreground">
            Last sync: {new Date(lastSync).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className={i >= 4 ? 'lg:col-span-2' : ''}>
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
