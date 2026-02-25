'use client'

import { Button, Card, CardContent, CardHeader, CardTitle } from '@cgk-platform/ui'
import { Download } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { CostBarChart } from '@/components/analytics/cost-bar-chart'
import { DateRangePicker } from '@/components/analytics/date-range-picker'
import { RefreshButton } from '@/components/ui/refresh-button'
import { exportToCsv } from '@/lib/export-csv'

const PROFILE_LABELS: Record<string, string> = {
  cgk: 'CGK Linens',
  rawdog: 'RAWDOG',
  vitahustle: 'VitaHustle',
}

interface CostData {
  profiles: Record<string, {
    totalSessions: number
    activeSessions: number
    totalTokens: number
    totalCost: number
    byModel: Record<string, { tokens: number; cost: number }>
  } | null>
  totals: { cost: number; tokens: number }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<CostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('all')

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (range !== 'all') {
        const now = new Date()
        const start = new Date()
        if (range === 'today') {
          start.setHours(0, 0, 0, 0)
        } else if (range === '7d') {
          start.setDate(now.getDate() - 7)
        } else if (range === '30d') {
          start.setDate(now.getDate() - 30)
        }
        params.set('startDate', start.toISOString())
        params.set('endDate', now.toISOString())
      }
      const res = await fetch(`/api/openclaw/analytics/costs?${params}`)
      const json = await res.json()
      setData(json)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    setLoading(true)
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Aggregate per-model costs across all profiles for bar chart
  const modelBars = useMemo(() => {
    if (!data) return []
    const models: Record<string, { cost: number; tokens: number }> = {}
    for (const usage of Object.values(data.profiles)) {
      if (!usage) continue
      for (const [model, stats] of Object.entries(usage.byModel)) {
        if (!models[model]) models[model] = { cost: 0, tokens: 0 }
        models[model].cost += stats.cost
        models[model].tokens += stats.tokens
      }
    }
    return Object.entries(models)
      .sort(([, a], [, b]) => b.cost - a.cost)
      .map(([label, { cost, tokens }]) => ({
        label,
        value: cost,
        detail: `${tokens.toLocaleString()} tokens`,
      }))
  }, [data])

  const handleExport = useCallback(() => {
    if (!data) return
    const headers = ['Profile', 'Model', 'Cost', 'Tokens', 'Sessions']
    const rows: (string | number)[][] = []
    for (const [slug, usage] of Object.entries(data.profiles)) {
      if (!usage) continue
      if (Object.keys(usage.byModel).length > 0) {
        for (const [model, stats] of Object.entries(usage.byModel)) {
          rows.push([PROFILE_LABELS[slug] || slug, model, stats.cost, stats.tokens, ''])
        }
      }
      rows.push([PROFILE_LABELS[slug] || slug, 'TOTAL', usage.totalCost, usage.totalTokens, usage.totalSessions])
    }
    rows.push(['ALL', 'TOTAL', data.totals.cost, data.totals.tokens, ''])
    exportToCsv(`openclaw-analytics-${range}.csv`, headers, rows)
  }, [data, range])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Cost and usage across all profiles</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />
          {data && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </Button>
          )}
          <RefreshButton onRefresh={fetchData} />
        </div>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : data ? (
        <>
          {/* Totals */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gold">
                  ${data.totals.cost.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Tokens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {data.totals.tokens.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cost breakdown bar chart */}
          {modelBars.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cost by Model</CardTitle>
              </CardHeader>
              <CardContent>
                <CostBarChart title="" bars={modelBars} />
              </CardContent>
            </Card>
          )}

          {/* Per-profile breakdown */}
          <div className="grid gap-6 md:grid-cols-3">
            {Object.entries(data.profiles).map(([slug, usage]) => (
              <Card key={slug}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {PROFILE_LABELS[slug] || slug}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {usage ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cost</span>
                        <span className="font-semibold text-gold">
                          ${usage.totalCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tokens</span>
                        <span className="font-mono text-xs">
                          {usage.totalTokens.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sessions</span>
                        <span>
                          {usage.activeSessions}/{usage.totalSessions}
                        </span>
                      </div>

                      {Object.keys(usage.byModel).length > 0 && (
                        <CostBarChart
                          title="Per-Model"
                          bars={Object.entries(usage.byModel)
                            .sort(([, a], [, b]) => b.cost - a.cost)
                            .map(([model, stats]) => ({
                              label: model,
                              value: stats.cost,
                              detail: `${stats.tokens.toLocaleString()} tokens`,
                            }))}
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Unavailable</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No data available
          </CardContent>
        </Card>
      )}
    </div>
  )
}
