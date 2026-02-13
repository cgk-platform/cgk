'use client'

import { Card, CardContent, CardHeader, CardTitle, cn } from '@cgk-platform/ui'

import type { ApplicationFunnel, FunnelStage } from '@/lib/creators/analytics-types'

interface FunnelChartProps {
  funnel: ApplicationFunnel
}

function FunnelBar({ stage, maxCount, index }: { stage: FunnelStage; maxCount: number; index: number }) {
  const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
  const colors = [
    'bg-blue-500',
    'bg-blue-400',
    'bg-emerald-500',
    'bg-emerald-400',
    'bg-purple-500',
  ]

  return (
    <div className="group relative">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{stage.name}</span>
        <span className="text-muted-foreground">{stage.count.toLocaleString()}</span>
      </div>
      <div className="relative h-8 w-full overflow-hidden rounded-md bg-muted">
        <div
          className={cn(
            'absolute inset-y-0 left-0 transition-all duration-500',
            colors[index % colors.length]
          )}
          style={{ width: `${widthPercent}%` }}
        />
        {index > 0 && (
          <div className="absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
            <span
              className={cn(
                'rounded px-1.5 py-0.5',
                stage.conversionRate >= 70
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : stage.conversionRate >= 50
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-red-500/10 text-red-500'
              )}
            >
              {stage.conversionRate.toFixed(0)}% conv
            </span>
          </div>
        )}
      </div>
      {/* Drop-off indicator */}
      {index > 0 && stage.dropOffRate > 0 && (
        <div className="absolute -top-1 right-0 text-xs text-red-500">
          -{stage.dropOffRate.toFixed(0)}%
        </div>
      )}
    </div>
  )
}

export function FunnelChart({ funnel }: FunnelChartProps) {
  const maxCount = Math.max(...funnel.stages.map((s) => s.count), 1)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          Application Funnel
          <span className="text-sm font-normal text-muted-foreground">
            {funnel.overallConversionRate.toFixed(1)}% overall conversion
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {funnel.stages.map((stage, index) => (
            <FunnelBar key={stage.name} stage={stage} maxCount={maxCount} index={index} />
          ))}
        </div>

        {/* Summary stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 border-t pt-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{funnel.totalApplications}</div>
            <div className="text-xs text-muted-foreground">Total Applications</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{funnel.totalConverted}</div>
            <div className="text-xs text-muted-foreground">Converted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{funnel.overallConversionRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Conversion Rate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function FunnelChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <div className="mb-1 flex justify-between">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-8 animate-pulse rounded-md bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
