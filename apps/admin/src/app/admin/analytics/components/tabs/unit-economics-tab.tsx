'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@cgk-platform/ui'

import type { DateRange, UnitEconomicsData } from '@/lib/analytics'
import { formatCurrency, formatPercent } from '@/lib/format'

interface UnitEconomicsTabProps {
  dateRange: DateRange
}

export function UnitEconomicsTab({ dateRange }: UnitEconomicsTabProps) {
  const [data, setData] = useState<UnitEconomicsData | null>(null)
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
        const res = await fetch(`/api/admin/analytics/unit-economics?${params}`)
        const json = await res.json()
        setData(json.data)
      } catch (error) {
        console.error('Failed to fetch unit economics:', error)
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
      {/* Customer Acquisition */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Customer Acquisition</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetricRow
            label="CAC (Customer Acquisition Cost)"
            value={formatCurrency(data.acquisition.cac.value)}
            change={data.acquisition.cac.changePercent}
            trend={data.acquisition.cac.trend}
            inverseColor
          />
        </CardContent>
      </Card>

      {/* Customer Value */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Customer Value</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetricRow
            label="LTV (Lifetime Value)"
            value={formatCurrency(data.value.ltv.value)}
            change={data.value.ltv.changePercent}
            trend={data.value.ltv.trend}
          />
          <MetricRow
            label="LTV:CAC Ratio"
            value={`${data.value.ltvCacRatio.value.toFixed(1)}:1`}
            change={data.value.ltvCacRatio.changePercent}
            trend={data.value.ltvCacRatio.trend}
            highlight={data.value.ltvCacRatio.value >= 3}
          />
          <MetricRow
            label="Average Order Value"
            value={formatCurrency(data.value.aov.value)}
            change={data.value.aov.changePercent}
            trend={data.value.aov.trend}
          />
          <MetricRow
            label="Purchase Frequency"
            value={`${data.value.purchaseFrequency.value.toFixed(2)}x`}
            change={data.value.purchaseFrequency.changePercent}
            trend={data.value.purchaseFrequency.trend}
          />
          <MetricRow
            label="Retention Rate"
            value={formatPercent(data.value.retentionRate.value)}
            change={data.value.retentionRate.changePercent}
            trend={data.value.retentionRate.trend}
          />
        </CardContent>
      </Card>

      {/* Product Economics */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <h3 className="font-semibold">Product Economics</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium text-right">Revenue</th>
                  <th className="pb-3 font-medium text-right">Units</th>
                  <th className="pb-3 font-medium text-right">COGS</th>
                  <th className="pb-3 font-medium text-right">Gross Margin</th>
                  <th className="pb-3 font-medium text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.products.slice(0, 10).map((product) => (
                  <tr key={product.productId}>
                    <td className="py-3 font-medium">{product.productName}</td>
                    <td className="py-3 text-right">{formatCurrency(product.revenue)}</td>
                    <td className="py-3 text-right">{product.unitsSold}</td>
                    <td className="py-3 text-right">{formatCurrency(product.cogs)}</td>
                    <td className="py-3 text-right">{formatCurrency(product.grossMargin)}</td>
                    <td className="py-3 text-right">
                      <span
                        className={
                          product.grossMarginPercent >= 50
                            ? 'text-green-600'
                            : product.grossMarginPercent >= 30
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }
                      >
                        {formatPercent(product.grossMarginPercent / 100)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cohort Analysis */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <h3 className="font-semibold">Cohort Economics</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Cohort</th>
                  <th className="pb-3 font-medium text-right">Customers</th>
                  <th className="pb-3 font-medium text-right">LTV</th>
                  <th className="pb-3 font-medium text-right">CAC</th>
                  <th className="pb-3 font-medium text-right">LTV:CAC</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.cohorts.map((cohort) => {
                  const ratio = cohort.cac > 0 ? cohort.ltv / cohort.cac : 0
                  return (
                    <tr key={cohort.cohortMonth}>
                      <td className="py-3 font-medium">
                        {new Date(cohort.cohortMonth).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 text-right">{cohort.customerCount}</td>
                      <td className="py-3 text-right">{formatCurrency(cohort.ltv)}</td>
                      <td className="py-3 text-right">{formatCurrency(cohort.cac)}</td>
                      <td className="py-3 text-right">
                        <span
                          className={
                            ratio >= 3 ? 'text-green-600' : ratio >= 2 ? 'text-yellow-600' : 'text-red-600'
                          }
                        >
                          {ratio.toFixed(1)}:1
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface MetricRowProps {
  label: string
  value: string
  change: number
  trend: 'up' | 'down' | 'stable'
  inverseColor?: boolean
  highlight?: boolean
}

function MetricRow({ label, value, change, trend, inverseColor, highlight }: MetricRowProps) {
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
        <span className={highlight ? 'font-bold text-green-600' : 'font-medium'}>{value}</span>
        <span className={`text-sm ${trend === 'stable' ? 'text-muted-foreground' : colorClass}`}>
          {trend === 'up' ? '+' : ''}
          {formatPercent(change / 100)}
        </span>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className={i >= 2 ? 'lg:col-span-2' : ''}>
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: i >= 2 ? 5 : 3 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
