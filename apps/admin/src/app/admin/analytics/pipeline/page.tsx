'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, Badge } from '@cgk-platform/ui'

import type { DateRange, PipelineData } from '@/lib/analytics'
import { formatNumber, formatPercent } from '@/lib/format'

import { DateRangePicker } from '../components/date-range-picker'

export default function PipelinePage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: '30d',
    startDate: getDefaultStartDate('30d'),
    endDate: new Date().toISOString().split('T')[0] ?? '',
  })
  const [data, setData] = useState<PipelineData | null>(null)
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
        const res = await fetch(`/api/admin/analytics/pipeline?${params}`)
        const json = await res.json()
        setData(json.data)
      } catch (error) {
        console.error('Failed to fetch pipeline data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [dateRange])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Pipeline</h1>
          <p className="text-muted-foreground">
            Visualize and analyze your sales funnel
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : !data ? (
        <div className="text-muted-foreground">No data available</div>
      ) : (
        <div className="space-y-6">
          {/* Funnel Visualization */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Conversion Funnel</h3>
                <Badge variant="secondary">
                  Overall: {formatPercent(data.funnel.overallConversionRate / 100)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {data.stageBreakdown.map((stage, i) => {
                  const isLast = i === data.stageBreakdown.length - 1
                  const widthPercent = 100 - i * 15
                  return (
                    <div key={stage.stage} className="relative">
                      <div
                        className="mx-auto rounded-lg bg-primary/80 py-4 text-center text-white transition-all hover:bg-primary"
                        style={{ width: `${widthPercent}%` }}
                      >
                        <div className="font-semibold capitalize">{stage.stage}</div>
                        <div className="text-sm opacity-90">
                          {Object.entries(stage.metrics)
                            .map(([key, value]) => `${formatNumber(value)} ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
                            .join(' | ')}
                        </div>
                      </div>
                      {!isLast && (
                        <div className="mx-auto my-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <span className="text-green-600">
                            {formatPercent(stage.conversionToNext / 100)} convert
                          </span>
                          <span className="text-red-600">
                            {formatPercent(stage.dropOffRate / 100)} drop off
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Stage Details */}
          <div className="grid gap-6 lg:grid-cols-2">
            {data.stageBreakdown.map((stage) => (
              <Card key={stage.stage}>
                <CardHeader>
                  <h3 className="font-semibold capitalize">{stage.stage} Stage</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(stage.metrics).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className="text-2xl font-bold">{formatNumber(value)}</div>
                        <div className="text-sm text-muted-foreground">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Conversion to next</span>
                      <span className="font-medium text-green-600">
                        {formatPercent(stage.conversionToNext / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Drop-off rate</span>
                      <span className="font-medium text-red-600">
                        {formatPercent(stage.dropOffRate / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg velocity</span>
                      <span className="font-medium">{stage.avgVelocityDays.toFixed(1)} days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Velocity Analysis */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Stage Velocity Analysis</h3>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Transition</th>
                    <th className="pb-3 font-medium text-right">Avg Days</th>
                    <th className="pb-3 font-medium text-right">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.velocityAnalysis.map((v) => (
                    <tr key={v.transition}>
                      <td className="py-3 font-medium">{v.transition}</td>
                      <td className="py-3 text-right">{v.avgDays.toFixed(1)}</td>
                      <td className="py-3 text-right">
                        <Badge
                          variant={
                            v.trend === 'down'
                              ? 'default'
                              : v.trend === 'up'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {v.trend === 'down' ? 'Faster' : v.trend === 'up' ? 'Slower' : 'Stable'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Conversion Trend */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Conversion Trend</h3>
            </CardHeader>
            <CardContent>
              <div className="flex h-48 items-end gap-1">
                {data.funnel.trend.slice(-30).map((point, i) => {
                  const maxRate = Math.max(...data.funnel.trend.map((p) => p.conversionRate))
                  const height = maxRate > 0 ? (point.conversionRate / maxRate) * 100 : 0
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-primary/80 transition-all hover:bg-primary"
                      style={{ height: `${height}%` }}
                      title={`${point.date}: ${formatPercent(point.conversionRate / 100)}`}
                    />
                  )
                })}
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{data.funnel.trend[0]?.date}</span>
                <span>{data.funnel.trend[data.funnel.trend.length - 1]?.date}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="mx-auto h-16 animate-pulse rounded bg-muted"
                style={{ width: `${100 - i * 15}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getDefaultStartDate(preset: string): string {
  const now = new Date()
  const days = { '7d': 7, '14d': 14, '28d': 28, '30d': 30, '90d': 90 }[preset] || 30
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  return start.toISOString().split('T')[0] ?? ''
}
