'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, Badge } from '@cgk/ui'

import type { DateRange, SpendSensitivityData } from '@/lib/analytics'
import { formatCurrency, formatPercent } from '@/lib/format'

interface SpendSensitivityTabProps {
  dateRange: DateRange
}

export function SpendSensitivityTab({ dateRange }: SpendSensitivityTabProps) {
  const [data, setData] = useState<SpendSensitivityData | null>(null)
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
        const res = await fetch(`/api/admin/analytics/spend-sensitivity?${params}`)
        const json = await res.json()
        setData(json.data)
      } catch (error) {
        console.error('Failed to fetch spend sensitivity:', error)
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
      {/* Spend Overview */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Spend Overview</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Ad Spend</span>
            <span className="text-xl font-bold">
              {formatCurrency(data.overview.totalSpend.value)}
            </span>
          </div>
          <div className="space-y-2">
            {data.overview.spendByChannel.map((channel) => (
              <div key={channel.channel} className="flex items-center justify-between text-sm">
                <span className="capitalize">{channel.channel}</span>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(channel.spend)}</span>
                  <span
                    className={`text-xs ${channel.change >= 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {channel.change >= 0 ? '+' : ''}
                    {channel.change}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Efficiency Metrics */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Efficiency Metrics</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetricRow
            label="ROAS"
            value={`${data.efficiency.roas.value.toFixed(2)}x`}
            change={data.efficiency.roas.changePercent}
            trend={data.efficiency.roas.trend}
          />
          <MetricRow
            label="Blended ROAS"
            value={`${data.efficiency.blendedRoas.value.toFixed(2)}x`}
            change={data.efficiency.blendedRoas.changePercent}
            trend={data.efficiency.blendedRoas.trend}
          />
          <MetricRow
            label="Cost Per Order"
            value={formatCurrency(data.efficiency.cpo.value)}
            change={data.efficiency.cpo.changePercent}
            trend={data.efficiency.cpo.trend}
            inverseColor
          />
          <MetricRow
            label="Cost Per Acquisition"
            value={formatCurrency(data.efficiency.cpa.value)}
            change={data.efficiency.cpa.changePercent}
            trend={data.efficiency.cpa.trend}
            inverseColor
          />
        </CardContent>
      </Card>

      {/* Sensitivity Analysis */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Sensitivity Analysis</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current Position</span>
            <Badge
              variant={
                data.sensitivity.currentPosition === 'optimal'
                  ? 'default'
                  : data.sensitivity.currentPosition === 'below_optimal'
                    ? 'secondary'
                    : 'destructive'
              }
            >
              {data.sensitivity.currentPosition.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Optimal Spend Range</span>
            <span className="font-medium">
              {formatCurrency(data.sensitivity.optimalSpendRange.min)} -{' '}
              {formatCurrency(data.sensitivity.optimalSpendRange.max)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Diminishing Returns</span>
            <span className="font-medium">
              {formatCurrency(data.sensitivity.diminishingReturnsThreshold)}
            </span>
          </div>
          <div className="pt-4">
            <h4 className="mb-2 text-sm font-medium">Marginal ROAS Curve</h4>
            <div className="flex h-24 items-end gap-1">
              {data.sensitivity.marginalRoasCurve.map((point, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-primary/80 transition-all hover:bg-primary"
                  style={{ height: `${Math.min(100, point.marginalRoas * 20)}%` }}
                  title={`Spend: ${formatCurrency(point.spend)}, ROAS: ${point.marginalRoas.toFixed(2)}x`}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Low Spend</span>
              <span>High Spend</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channel Comparison */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Channel Comparison</h3>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Channel</th>
                <th className="pb-3 font-medium text-right">Spend</th>
                <th className="pb-3 font-medium text-right">ROAS</th>
                <th className="pb-3 font-medium text-right">CPA</th>
                <th className="pb-3 font-medium text-right">Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.channelComparison.map((channel) => (
                <tr key={channel.channel}>
                  <td className="py-3 font-medium capitalize">{channel.channel}</td>
                  <td className="py-3 text-right">{formatCurrency(channel.spend)}</td>
                  <td className="py-3 text-right">
                    <span
                      className={
                        channel.roas >= 3
                          ? 'text-green-600'
                          : channel.roas >= 2
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }
                    >
                      {channel.roas.toFixed(2)}x
                    </span>
                  </td>
                  <td className="py-3 text-right">{formatCurrency(channel.cpa)}</td>
                  <td className="py-3 text-right">#{channel.efficiencyRank}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
