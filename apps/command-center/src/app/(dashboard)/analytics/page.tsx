'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@cgk-platform/ui'
import { useCallback, useEffect, useState } from 'react'

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

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/analytics/costs')
      const json = await res.json()
      setData(json)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Cost and usage across all profiles</p>
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
                        <div className="space-y-1 border-t pt-2">
                          {Object.entries(usage.byModel).map(([model, modelData]) => (
                            <div
                              key={model}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="max-w-32 truncate font-mono text-muted-foreground">
                                {model}
                              </span>
                              <span className="text-gold">
                                ${modelData.cost.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
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
