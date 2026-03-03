'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Card, CardContent, cn } from '@cgk-platform/ui'

import { useAttribution, TimeRangePicker } from '@/components/attribution'
import type { AttributionModel, RoasIndexData, AIConfidence } from '@/lib/attribution'
import { ATTRIBUTION_MODELS } from '@/lib/attribution'

const confidenceColors: Record<AIConfidence, string> = {
  high: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
}

function ModelGrid({ data }: { data: RoasIndexData[] }) {
  const models: AttributionModel[] = [
    'first_touch',
    'last_touch',
    'linear',
    'time_decay',
    'position_based',
    'data_driven',
    'last_non_direct',
  ]

  const modelLabels: Record<AttributionModel, string> = {
    first_touch: 'First Touch',
    last_touch: 'Last Touch',
    linear: 'Linear',
    time_decay: 'Time Decay',
    position_based: 'Position Based',
    data_driven: 'Data Driven',
    last_non_direct: 'Last Non-Direct',
  }

  const getRoasColor = (roas: number, max: number, min: number): string => {
    if (max === min) return 'bg-gray-100'
    const range = max - min
    const normalized = (roas - min) / range

    if (normalized > 0.66) return 'bg-green-100'
    if (normalized > 0.33) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left font-medium sticky left-0 bg-muted/50">Channel</th>
            {models.map((model) => (
              <th key={model} className="p-3 text-center font-medium min-w-[100px]">
                {modelLabels[model]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const roasValues = models.map((m) => row.modelResults[m]?.roas || 0)
            const maxRoas = Math.max(...roasValues)
            const minRoas = Math.min(...roasValues.filter((r) => r > 0))

            return (
              <tr key={row.channel} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium sticky left-0 bg-white capitalize">
                  {row.channel.replace(/_/g, ' ')}
                </td>
                {models.map((model) => {
                  const result = row.modelResults[model]
                  const isMax = result?.roas === maxRoas && maxRoas > 0
                  const isMin = result?.roas === minRoas && result?.roas > 0

                  return (
                    <td
                      key={model}
                      className={cn(
                        'p-3 text-center transition-colors',
                        getRoasColor(result?.roas || 0, maxRoas, minRoas)
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <span className={cn('font-medium', isMax && 'text-green-700', isMin && 'text-red-700')}>
                          {(result?.roas || 0).toFixed(2)}x
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ${((result?.revenue || 0) / 1000).toFixed(0)}k
                        </span>
                      </div>
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

function AIRecommendations({ data }: { data: RoasIndexData[] }) {
  return (
    <div className="space-y-4">
      {data
        .filter((d) => d.aiRecommendation)
        .slice(0, 5)
        .map((row) => {
          const rec = row.aiRecommendation
          if (!rec) return null

          const modelLabel = ATTRIBUTION_MODELS.find((m) => m.value === rec.recommendedModel)?.label || rec.recommendedModel

          return (
            <Card key={row.channel} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-medium capitalize">{row.channel.replace(/_/g, ' ')}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{rec.reasoning}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{modelLabel}</p>
                    <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 border', confidenceColors[rec.confidence])}>
                      {rec.confidence} confidence
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
    </div>
  )
}

function RevenueComparisonChart({ data }: { data: RoasIndexData[] }) {
  const models: AttributionModel[] = ['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based', 'data_driven', 'last_non_direct']
  const modelColors: Record<AttributionModel, string> = {
    first_touch: '#3b82f6',
    last_touch: '#8b5cf6',
    linear: '#ec4899',
    time_decay: '#f97316',
    position_based: '#22c55e',
    data_driven: '#06b6d4',
    last_non_direct: '#6b7280',
  }

  const maxRevenue = Math.max(
    ...data.flatMap((d) => models.map((m) => d.modelResults[m]?.revenue || 0)),
    1
  )

  return (
    <div className="space-y-6">
      {data.slice(0, 8).map((row) => (
        <div key={row.channel}>
          <p className="text-sm font-medium mb-2 capitalize">{row.channel.replace(/_/g, ' ')}</p>
          <div className="flex gap-1 h-8">
            {models.map((model) => {
              const revenue = row.modelResults[model]?.revenue || 0
              const width = (revenue / maxRevenue) * 100

              return (
                <div
                  key={model}
                  className="h-full rounded transition-all hover:opacity-80 relative group"
                  style={{
                    width: `${width}%`,
                    backgroundColor: modelColors[model],
                    minWidth: revenue > 0 ? '8px' : '0px',
                  }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                    {ATTRIBUTION_MODELS.find((m) => m.value === model)?.label}: ${revenue.toLocaleString()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-4 pt-4 border-t">
        {models.map((model) => (
          <div key={model} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: modelColors[model] }} />
            <span>{ATTRIBUTION_MODELS.find((m) => m.value === model)?.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RoasIndexPage() {
  const { window, startDate, endDate } = useAttribution()
  const [data, setData] = useState<RoasIndexData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ window, startDate, endDate })
      const response = await fetch(`/api/admin/attribution/roas-index?${params}`)
      const result = await response.json()
      setData(result.roasIndex || [])
    } catch (error) {
      console.error('Failed to fetch ROAS index:', error)
    } finally {
      setIsLoading(false)
    }
  }, [window, startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExportCsv = () => {
    const models: AttributionModel[] = ['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based', 'data_driven', 'last_non_direct']
    const headers = ['Channel', ...models.map((m) => `${m}_roas`), ...models.map((m) => `${m}_revenue`), 'Recommended Model', 'Confidence']
    const rows = data.map((d) => [
      d.channel,
      ...models.map((m) => d.modelResults[m]?.roas || 0),
      ...models.map((m) => d.modelResults[m]?.revenue || 0),
      d.aiRecommendation?.recommendedModel || '',
      d.aiRecommendation?.confidence || '',
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roas-index-${startDate}-${endDate}.csv`
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
          <h3 className="text-sm font-medium mb-4">ROAS by Attribution Model</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Compare how different attribution models credit each channel. Green = highest ROAS, Red = lowest ROAS for that channel.
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No ROAS data found for the selected period
            </div>
          ) : (
            <ModelGrid data={data} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium mb-4">AI Recommendations</h3>
            <p className="text-xs text-muted-foreground mb-4">
              AI-powered model recommendations based on channel characteristics
            </p>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <AIRecommendations data={data} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium mb-4">Revenue by Model</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Visual comparison of attributed revenue across models
            </p>
            {isLoading ? (
              <div className="space-y-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i}>
                    <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-8 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <RevenueComparisonChart data={data} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
