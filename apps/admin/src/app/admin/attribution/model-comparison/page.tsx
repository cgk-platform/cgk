'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Card, CardContent, cn } from '@cgk/ui'

import { useAttribution, TimeRangePicker } from '@/components/attribution'
import type { AttributionModel, ModelComparisonData } from '@/lib/attribution'
import { ATTRIBUTION_MODELS } from '@/lib/attribution'

const modelColors: Record<AttributionModel, string> = {
  first_touch: '#3b82f6',
  last_touch: '#8b5cf6',
  linear: '#ec4899',
  time_decay: '#f97316',
  position_based: '#22c55e',
  data_driven: '#06b6d4',
  last_non_direct: '#6b7280',
}

function ComparisonTable({ models }: { models: ModelComparisonData[] }) {
  const metrics: Array<{ key: string; label: string; format: (v: number | string) => string }> = [
    { key: 'totalRevenue', label: 'Total Revenue', format: (v) => `$${Number(v).toLocaleString()}` },
    { key: 'totalConversions', label: 'Conversions', format: (v) => Number(v).toLocaleString() },
    { key: 'totalSpend', label: 'Total Spend', format: (v) => `$${Number(v).toLocaleString()}` },
    { key: 'roas', label: 'ROAS', format: (v) => `${Number(v).toFixed(2)}x` },
    { key: 'topChannel', label: 'Top Channel', format: (v) => String(v).replace(/_/g, ' ') },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left font-medium sticky left-0 bg-muted/50">Metric</th>
            {models.map((model) => (
              <th key={model.model} className="p-3 text-right font-medium min-w-[120px]">
                <div className="flex items-center justify-end gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: modelColors[model.model] }}
                  />
                  {ATTRIBUTION_MODELS.find((m) => m.value === model.model)?.label}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => {
            const values = models.map((m) => {
              const val = m[metric.key as keyof ModelComparisonData]
              return typeof val === 'number' ? val : 0
            })
            const maxVal = Math.max(...values)
            const minVal = Math.min(...values)

            return (
              <tr key={metric.key} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium sticky left-0 bg-white">{metric.label}</td>
                {models.map((model, i) => {
                  const value = model[metric.key as keyof ModelComparisonData]
                  const isMax = metric.key !== 'topChannel' && values[i] === maxVal
                  const isMin = metric.key !== 'topChannel' && values[i] === minVal && values[i] !== maxVal

                  return (
                    <td
                      key={model.model}
                      className={cn(
                        'p-3 text-right',
                        isMax && 'bg-green-50 text-green-700 font-medium',
                        isMin && 'bg-red-50 text-red-700'
                      )}
                    >
                      {metric.format(value as string | number)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ModelDescriptions({ models }: { models: ModelComparisonData[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const modelInfo: Record<AttributionModel, { pros: string[]; cons: string[]; useCase: string }> = {
    first_touch: {
      pros: ['Best for understanding discovery', 'Simple to implement', 'Good for brand awareness campaigns'],
      cons: ['Ignores conversion touchpoints', 'Overvalues top-of-funnel'],
      useCase: 'Measuring brand awareness and top-of-funnel marketing effectiveness',
    },
    last_touch: {
      pros: ['Easy to understand', 'Good for conversion-focused campaigns', 'Matches GA4 default'],
      cons: ['Ignores awareness touchpoints', 'Overvalues bottom-of-funnel'],
      useCase: 'Measuring direct conversion drivers and retargeting effectiveness',
    },
    linear: {
      pros: ['Fair credit distribution', 'Good for complex journeys', 'Easy to explain'],
      cons: ['May undervalue key touchpoints', "Doesn't account for timing"],
      useCase: 'Understanding full customer journey when all touchpoints matter equally',
    },
    time_decay: {
      pros: ['Balances journey and recency', 'More realistic for most businesses', 'Configurable half-life'],
      cons: ['More complex to explain', 'May undervalue early touchpoints'],
      useCase: 'General-purpose attribution that values recent interactions more',
    },
    position_based: {
      pros: ['Values both discovery and conversion', 'Good for longer journeys', 'Intuitive splits'],
      cons: ['Arbitrary weight distribution', 'May undervalue middle touchpoints'],
      useCase: 'When first and last touchpoints are most important to your strategy',
    },
    data_driven: {
      pros: ['Most accurate when data is sufficient', 'Learns from your specific patterns', 'Adapts over time'],
      cons: ['Requires significant data', 'Can be a black box', 'May take time to calibrate'],
      useCase: 'High-volume businesses with enough conversion data for ML modeling',
    },
    last_non_direct: {
      pros: ['Avoids crediting direct visits', 'Better for paid media analysis', 'Common industry standard'],
      cons: ['Still single-touch', 'May miss true last touchpoint'],
      useCase: 'Understanding true marketing impact when many conversions come from direct',
    },
  }

  return (
    <div className="space-y-3">
      {models.map((model) => {
        const info = modelInfo[model.model]
        const isExpanded = expanded === model.model
        const modelLabel = ATTRIBUTION_MODELS.find((m) => m.value === model.model)?.label || model.model

        return (
          <Card key={model.model} className="overflow-hidden">
            <button
              className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
              onClick={() => setExpanded(isExpanded ? null : model.model)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: modelColors[model.model] }}
                />
                <span className="font-medium">{modelLabel}</span>
              </div>
              <svg
                className={cn('w-5 h-5 transition-transform', isExpanded && 'rotate-180')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <CardContent className="p-4 pt-0 border-t">
                <p className="text-sm text-muted-foreground mb-4">{model.description}</p>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-green-700 mb-2">Pros</p>
                    <ul className="text-xs space-y-1">
                      {info.pros.map((pro, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-green-600">+</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-red-700 mb-2">Cons</p>
                    <ul className="text-xs space-y-1">
                      {info.cons.map((con, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-red-600">-</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-blue-700 mb-2">Best For</p>
                    <p className="text-xs">{info.useCase}</p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function CreditDistributionCharts({ models }: { models: ModelComparisonData[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {models.slice(0, 6).map((model) => {
        const modelLabel = ATTRIBUTION_MODELS.find((m) => m.value === model.model)?.label || model.model
        const topDistributions = model.creditDistribution
          .filter((d) => d.percentage > 0)
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 5)

        return (
          <Card key={model.model}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: modelColors[model.model] }}
                />
                <h4 className="font-medium text-sm">{modelLabel}</h4>
              </div>

              <div className="relative aspect-square max-w-[150px] mx-auto mb-4">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {topDistributions.reduce(
                    (acc, dist, i) => {
                      const startAngle = acc.offset
                      const angle = (dist.percentage / 100) * 360
                      const endAngle = startAngle + angle
                      const largeArc = angle > 180 ? 1 : 0

                      const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180)
                      const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180)
                      const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180)
                      const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180)

                      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e']

                      acc.paths.push(
                        <path
                          key={dist.channel}
                          d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={colors[i % colors.length]}
                        />
                      )
                      acc.offset = endAngle

                      return acc
                    },
                    { paths: [] as React.ReactNode[], offset: 0 }
                  ).paths}
                </svg>
              </div>

              <div className="space-y-1">
                {topDistributions.map((dist, i) => {
                  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e']
                  return (
                    <div key={dist.channel} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded" style={{ backgroundColor: colors[i % colors.length] }} />
                        <span className="capitalize">{dist.channel.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="font-medium">{dist.percentage.toFixed(1)}%</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default function ModelComparisonPage() {
  const { window, startDate, endDate } = useAttribution()
  const [models, setModels] = useState<ModelComparisonData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchModels = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ window, startDate, endDate })
      const response = await fetch(`/api/admin/attribution/model-comparison?${params}`)
      const result = await response.json()
      setModels(result.models || [])
    } catch (error) {
      console.error('Failed to fetch model comparison:', error)
    } finally {
      setIsLoading(false)
    }
  }, [window, startDate, endDate])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  const handleExportCsv = () => {
    const headers = ['Model', 'Total Revenue', 'Total Conversions', 'Total Spend', 'ROAS', 'Top Channel']
    const rows = models.map((m) => [
      m.model,
      m.totalRevenue,
      m.totalConversions,
      m.totalSpend,
      m.roas,
      m.topChannel,
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `model-comparison-${startDate}-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <TimeRangePicker />
        <Button variant="outline" onClick={handleExportCsv}>
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium mb-4">Model Comparison Table</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Side-by-side comparison of key metrics across all attribution models
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No model data found for the selected period
            </div>
          ) : (
            <ComparisonTable models={models} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium mb-4">Model Descriptions</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Click each model to learn about its methodology, pros, cons, and best use cases
          </p>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <ModelDescriptions models={models} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium mb-4">Credit Distribution by Model</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Visual comparison of how each model distributes credit across channels
          </p>
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <CreditDistributionCharts models={models} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
