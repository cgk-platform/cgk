'use client'

import { TrendingDown, TrendingUp, Minus, HelpCircle } from 'lucide-react'

import { Badge, Card, CardHeader, CardContent, cn } from '@cgk/ui'

import type { ABTest, NoveltyAnalysis } from '@/lib/ab-tests/types'

interface NoveltyDashboardProps {
  tests: Array<{
    test: ABTest
    analysis?: NoveltyAnalysis
  }>
}

export function NoveltyDashboard({ tests }: NoveltyDashboardProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Novelty Effect Detection
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Identifies temporary lift that may decay over time
            </p>
          </div>
          <NoveltyInfoTooltip />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {tests.length === 0 ? (
          <div className="text-center py-8">
            <TrendingDown className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              No novelty effects detected in running tests
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Tests need at least 7 days of data to detect novelty effects
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tests.map(({ test, analysis }) => (
              <NoveltyRow key={test.id} test={test} analysis={analysis} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function NoveltyRow({
  test,
  analysis,
}: {
  test: ABTest
  analysis?: NoveltyAnalysis
}) {
  if (!analysis) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-900">{test.name}</span>
          <Badge variant="outline" className="text-xs text-slate-500">
            Insufficient data
          </Badge>
        </div>
      </div>
    )
  }

  const trendConfig = {
    increasing: {
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      label: 'Increasing',
    },
    decreasing: {
      icon: TrendingDown,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      label: 'Decreasing',
    },
    stable: {
      icon: Minus,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
      label: 'Stable',
    },
    unknown: {
      icon: HelpCircle,
      color: 'text-slate-400',
      bg: 'bg-slate-50',
      label: 'Unknown',
    },
  }

  const trend = trendConfig[analysis.trend]
  const TrendIcon = trend.icon

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        analysis.hasNoveltyEffect
          ? 'border-amber-200 bg-amber-50'
          : 'border-slate-200 bg-slate-50'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-full p-2', trend.bg)}>
            <TrendIcon className={cn('h-4 w-4', trend.color)} />
          </div>
          <div>
            <span className="font-medium text-slate-900">{test.name}</span>
            <p className="text-sm text-slate-500">
              {analysis.daysSinceStart} days since start
            </p>
          </div>
        </div>
        <div className="text-right">
          <Badge className={cn('text-xs', trend.bg, trend.color)}>
            {trend.label}
          </Badge>
          <p className="mt-1 text-xs text-slate-500">
            Confidence: {(analysis.confidenceScore * 100).toFixed(0)}%
          </p>
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

function NoveltyInfoTooltip() {
  return (
    <div className="group relative">
      <HelpCircle className="h-5 w-5 text-slate-400 hover:text-slate-600" />
      <div className="absolute right-0 top-full z-10 mt-2 hidden w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg group-hover:block">
        <p className="text-sm text-slate-600">
          Novelty effect occurs when users behave differently simply because something is new.
          This can cause inflated results early in a test that normalize over time.
        </p>
      </div>
    </div>
  )
}
