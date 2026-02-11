'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, Badge } from '@cgk/ui'

import type { BurnRateData, DateRange } from '@/lib/analytics'
import { formatCurrency, formatPercent } from '@/lib/format'

interface BurnRateTabProps {
  dateRange: DateRange
}

export function BurnRateTab({ dateRange }: BurnRateTabProps) {
  const [data, setData] = useState<BurnRateData | null>(null)
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
        const res = await fetch(`/api/admin/analytics/burn-rate?${params}`)
        const json = await res.json()
        setData(json.data)
      } catch (error) {
        console.error('Failed to fetch burn rate data:', error)
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

  const runwayStatus =
    data.burnRate.runwayMonths >= 12
      ? 'healthy'
      : data.burnRate.runwayMonths >= 6
        ? 'warning'
        : 'critical'

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Cash Position */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Cash Position</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current Balance</span>
            <span className="text-2xl font-bold">
              {formatCurrency(data.cashPosition.currentBalance)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Cash In</div>
              <div className="font-semibold text-green-600">
                +{formatCurrency(data.cashPosition.cashIn)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Cash Out</div>
              <div className="font-semibold text-red-600">
                -{formatCurrency(data.cashPosition.cashOut)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Net Flow</div>
              <div
                className={`font-semibold ${data.cashPosition.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {data.cashPosition.netCashFlow >= 0 ? '+' : ''}
                {formatCurrency(data.cashPosition.netCashFlow)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Runway */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="font-semibold">Runway</h3>
          <Badge
            variant={
              runwayStatus === 'healthy'
                ? 'default'
                : runwayStatus === 'warning'
                  ? 'secondary'
                  : 'destructive'
            }
          >
            {runwayStatus.toUpperCase()}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-center gap-2 py-4">
            <span className="text-6xl font-bold">{Math.floor(data.burnRate.runwayMonths)}</span>
            <span className="mb-2 text-2xl text-muted-foreground">months</span>
          </div>
          <div className="mt-4 h-4 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${
                runwayStatus === 'healthy'
                  ? 'bg-green-500'
                  : runwayStatus === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, (data.burnRate.runwayMonths / 24) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>0 months</span>
            <span>24+ months</span>
          </div>
        </CardContent>
      </Card>

      {/* Burn Rate Details */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Burn Rate</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Monthly Burn Rate</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {formatCurrency(data.burnRate.monthlyBurnRate.value)}
              </span>
              <span
                className={`text-sm ${
                  data.burnRate.monthlyBurnRate.trend === 'down'
                    ? 'text-green-600'
                    : data.burnRate.monthlyBurnRate.trend === 'up'
                      ? 'text-red-600'
                      : 'text-muted-foreground'
                }`}
              >
                {data.burnRate.monthlyBurnRate.trend === 'up' ? '+' : ''}
                {formatPercent(data.burnRate.monthlyBurnRate.changePercent / 100)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fixed Costs</span>
            <span className="font-medium">{formatCurrency(data.burnRate.fixedCosts)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Variable Costs</span>
            <span className="font-medium">{formatCurrency(data.burnRate.variableCosts)}</span>
          </div>

          {/* Burn Rate Trend */}
          <div className="pt-4">
            <h4 className="mb-2 text-sm font-medium">Burn Rate Trend</h4>
            <div className="flex h-20 items-end gap-1">
              {data.burnRate.burnRateTrend.slice(-12).map((point, i) => {
                const maxRate = Math.max(...data.burnRate.burnRateTrend.map((p) => p.burnRate))
                const height = maxRate > 0 ? (point.burnRate / maxRate) * 100 : 0
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-red-400/80 transition-all hover:bg-red-500"
                    style={{ height: `${height}%` }}
                    title={`${point.date}: ${formatCurrency(point.burnRate)}`}
                  />
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Break-Even Analysis */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Break-Even Analysis</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current Revenue</span>
            <span className="font-medium">{formatCurrency(data.breakEven.currentRevenue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Break-Even Revenue</span>
            <span className="font-medium">{formatCurrency(data.breakEven.breakEvenRevenue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Gap to Break-Even</span>
            <span
              className={`font-medium ${data.breakEven.gapToBreakEven <= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {data.breakEven.gapToBreakEven <= 0
                ? 'Profitable!'
                : formatCurrency(data.breakEven.gapToBreakEven)}
            </span>
          </div>
          {data.breakEven.gapToBreakEven > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Orders Needed</span>
              <span className="font-medium">{data.breakEven.ordersNeeded.toLocaleString()}</span>
            </div>
          )}

          {/* Progress to break-even */}
          <div className="pt-2">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to Break-Even</span>
              <span className="font-medium">
                {Math.min(100, (data.breakEven.currentRevenue / data.breakEven.breakEvenRevenue) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.min(100, (data.breakEven.currentRevenue / data.breakEven.breakEvenRevenue) * 100)}%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
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
