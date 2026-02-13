'use client'

import { Activity, HelpCircle } from 'lucide-react'

import { Badge, Card, CardHeader, CardContent, cn } from '@cgk-platform/ui'

import type { ABTest, DriftAnalysis } from '@/lib/ab-tests/types'

interface DriftDashboardProps {
  tests: Array<{
    test: ABTest
    analysis?: DriftAnalysis
  }>
}

export function DriftDashboard({ tests }: DriftDashboardProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Population Drift</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Monitors for changes in visitor composition during tests
            </p>
          </div>
          <DriftInfoTooltip />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {tests.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              No population drift detected
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Visitor composition is stable across all running tests
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tests.map(({ test, analysis }) => (
              <DriftRow key={test.id} test={test} analysis={analysis} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DriftRow({
  test,
  analysis,
}: {
  test: ABTest
  analysis?: DriftAnalysis
}) {
  if (!analysis) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-900">{test.name}</span>
          <Badge variant="outline" className="text-xs text-slate-500">
            Monitoring
          </Badge>
        </div>
      </div>
    )
  }

  const driftLevel =
    analysis.driftScore < 0.1
      ? 'low'
      : analysis.driftScore < 0.3
        ? 'medium'
        : 'high'

  const levelConfig = {
    low: { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Low' },
    medium: { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Medium' },
    high: { color: 'text-red-600', bg: 'bg-red-50', label: 'High' },
  }

  const config = levelConfig[driftLevel]

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        analysis.hasDrift
          ? 'border-amber-200 bg-amber-50'
          : 'border-slate-200 bg-slate-50'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-slate-900">{test.name}</span>
          {analysis.affectedSegments.length > 0 && (
            <div className="mt-1 flex gap-2">
              {analysis.affectedSegments.map((segment) => (
                <Badge key={segment} variant="outline" className="text-xs">
                  {segment}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="text-right">
          <Badge className={cn('text-xs', config.bg, config.color)}>
            Drift: {config.label}
          </Badge>
          <p className="mt-1 text-xs text-slate-500">
            Score: {(analysis.driftScore * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Drift Meter */}
      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              driftLevel === 'low'
                ? 'bg-emerald-500'
                : driftLevel === 'medium'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            )}
            style={{ width: `${Math.min(100, analysis.driftScore * 100)}%` }}
          />
        </div>
      </div>

      {analysis.recommendation && (
        <div className="mt-3 rounded bg-white/50 p-2 text-sm text-slate-600">
          <strong>Recommendation:</strong> {analysis.recommendation}
        </div>
      )}
    </div>
  )
}

function DriftInfoTooltip() {
  return (
    <div className="group relative">
      <HelpCircle className="h-5 w-5 text-slate-400 hover:text-slate-600" />
      <div className="absolute right-0 top-full z-10 mt-2 hidden w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg group-hover:block">
        <p className="text-sm text-slate-600">
          Population drift occurs when the characteristics of visitors change over time
          (e.g., different devices, regions, or traffic sources). This can affect test validity.
        </p>
      </div>
    </div>
  )
}
