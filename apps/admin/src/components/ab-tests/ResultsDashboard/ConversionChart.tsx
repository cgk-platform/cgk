'use client'

import { useTimeSeriesData } from '@/lib/ab-tests/hooks'
import { Card, CardHeader, CardContent } from '@cgk-platform/ui'

interface ConversionChartProps {
  testId: string
}

export function ConversionChart({ testId }: ConversionChartProps) {
  const { data, isLoading } = useTimeSeriesData(testId)

  if (isLoading) {
    return <ChartSkeleton title="Conversion Rate Over Time" />
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Conversion Rate Over Time
          </h2>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-slate-500">No data available yet</p>
        </CardContent>
      </Card>
    )
  }

  const variantNames = [...new Set(data.map((d) => d.variantName))]
  const dates = [...new Set(data.map((d) => d.date))].sort()

  const chartData = dates.map((date) => {
    const point: Record<string, string | number> = { date }
    variantNames.forEach((name) => {
      const entry = data.find((d) => d.date === date && d.variantName === name)
      point[name] = entry ? entry.conversionRate * 100 : 0
    })
    return point
  })

  const maxValue = Math.max(
    ...data.map((d) => d.conversionRate * 100),
    1
  )

  const colors = ['#64748b', '#06b6d4', '#10b981', '#f59e0b', '#a855f7']

  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Conversion Rate Over Time
          </h2>
          <div className="flex gap-4">
            {variantNames.map((name, i) => (
              <div key={name} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
                <span className="text-xs text-slate-600">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="relative h-64">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 flex h-full w-12 flex-col justify-between text-right text-xs text-slate-500">
            <span>{maxValue.toFixed(1)}%</span>
            <span>{(maxValue / 2).toFixed(1)}%</span>
            <span>0%</span>
          </div>

          {/* Chart area */}
          <div className="ml-14 h-full">
            <svg className="h-full w-full" preserveAspectRatio="none">
              {/* Grid lines */}
              <line
                x1="0"
                y1="0"
                x2="100%"
                y2="0"
                stroke="#e2e8f0"
                strokeDasharray="4"
              />
              <line
                x1="0"
                y1="50%"
                x2="100%"
                y2="50%"
                stroke="#e2e8f0"
                strokeDasharray="4"
              />
              <line
                x1="0"
                y1="100%"
                x2="100%"
                y2="100%"
                stroke="#e2e8f0"
              />

              {/* Lines for each variant */}
              {variantNames.map((name, variantIndex) => {
                const variantData = chartData.map((d) => ({
                  date: d.date as string,
                  value: d[name] as number,
                }))

                const points = variantData
                  .map((d, i) => {
                    const x = (i / Math.max(variantData.length - 1, 1)) * 100
                    const y = 100 - (d.value / maxValue) * 100
                    return `${x},${y}`
                  })
                  .join(' ')

                return (
                  <polyline
                    key={name}
                    points={points}
                    fill="none"
                    stroke={colors[variantIndex % colors.length]}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                )
              })}
            </svg>
          </div>

          {/* X-axis labels */}
          <div className="ml-14 mt-2 flex justify-between text-xs text-slate-500">
            {dates.filter((_, i) => i === 0 || i === dates.length - 1 || i % Math.ceil(dates.length / 5) === 0).map((date) => (
              <span key={date}>{formatDate(date)}</span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChartSkeleton({ title }: { title: string }) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex h-64 animate-pulse items-end gap-2">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-slate-200"
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}
