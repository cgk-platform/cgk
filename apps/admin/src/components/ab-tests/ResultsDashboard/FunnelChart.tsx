'use client'

import { useFunnelData } from '@/lib/ab-tests/hooks'
import { Card, CardHeader, CardContent, cn } from '@cgk/ui'

interface FunnelChartProps {
  testId: string
}

export function FunnelChart({ testId }: FunnelChartProps) {
  const { data, isLoading } = useFunnelData(testId)

  if (isLoading) {
    return <ChartSkeleton />
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">Conversion Funnel</h2>
        </CardHeader>
        <CardContent className="flex h-48 items-center justify-center">
          <p className="text-sm text-slate-500">No funnel data available yet</p>
        </CardContent>
      </Card>
    )
  }

  const variantNames = [...new Set(data.map((d) => d.variantName))]
  const steps = ['visitors', 'page_views', 'add_to_carts', 'begin_checkouts', 'purchases']
  const stepLabels: Record<string, string> = {
    visitors: 'Visitors',
    page_views: 'Page Views',
    add_to_carts: 'Add to Cart',
    begin_checkouts: 'Checkout',
    purchases: 'Purchase',
  }

  const colors = ['#64748b', '#06b6d4', '#10b981', '#f59e0b', '#a855f7']

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Conversion Funnel</h2>
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
      <CardContent className="p-6">
        <div className="space-y-4">
          {steps.map((step) => {
            const stepData = data.filter((d) => d.step === step)

            return (
              <div key={step} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {stepLabels[step]}
                  </span>
                </div>
                <div className="space-y-1">
                  {variantNames.map((variantName, variantIndex) => {
                    const entry = stepData.find((d) => d.variantName === variantName)
                    const count = entry?.count || 0
                    const width = (count / maxCount) * 100

                    return (
                      <div key={variantName} className="flex items-center gap-3">
                        <div className="h-6 flex-1 overflow-hidden rounded bg-slate-100">
                          <div
                            className="h-full rounded transition-all duration-500"
                            style={{
                              width: `${width}%`,
                              backgroundColor: colors[variantIndex % colors.length],
                            }}
                          />
                        </div>
                        <span className="w-20 text-right font-mono text-sm text-slate-600">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Funnel Summary */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
          {variantNames.map((variantName, variantIndex) => {
            const visitors = data.find(
              (d) => d.variantName === variantName && d.step === 'visitors'
            )?.count || 0
            const purchases = data.find(
              (d) => d.variantName === variantName && d.step === 'purchases'
            )?.count || 0
            const convRate = visitors > 0 ? (purchases / visitors) * 100 : 0

            return (
              <div
                key={variantName}
                className="rounded-lg bg-slate-50 p-3 text-center"
              >
                <div
                  className="mb-1 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: colors[variantIndex % colors.length] }}
                />
                <p className="text-xs text-slate-500">{variantName}</p>
                <p className="font-mono text-lg font-bold text-slate-900">
                  {convRate.toFixed(2)}%
                </p>
                <p className="text-xs text-slate-500">Overall Conv.</p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />
      </CardHeader>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="h-6 rounded bg-slate-100" style={{ width: `${100 - i * 15}%` }} />
              <div className="h-6 rounded bg-slate-100" style={{ width: `${95 - i * 15}%` }} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
