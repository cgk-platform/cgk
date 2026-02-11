'use client'

import { Trophy, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

import { Button, cn } from '@cgk/ui'

import type { TestResults } from '@/lib/ab-tests/types'

interface SignificanceBannerProps {
  results: TestResults
}

export function SignificanceBanner({ results }: SignificanceBannerProps) {
  const winnerVariant = results.variants.find((v) => v.isWinner)

  const status = results.isSignificant
    ? results.winnerVariantId
      ? 'winner'
      : 'significant'
    : results.currentProgress >= 100
      ? 'inconclusive'
      : 'in_progress'

  const config = {
    winner: {
      icon: Trophy,
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      title: `${winnerVariant?.variantName || 'Variant'} is the winner!`,
      description: `${winnerVariant?.improvement?.toFixed(1)}% improvement at ${results.confidenceLevel * 100}% confidence`,
    },
    significant: {
      icon: CheckCircle,
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      iconColor: 'text-cyan-600',
      title: 'Statistical significance reached',
      description: 'Review the results and declare a winner',
    },
    inconclusive: {
      icon: AlertTriangle,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconColor: 'text-amber-600',
      title: 'Test complete - no clear winner',
      description: 'The difference between variants is not statistically significant',
    },
    in_progress: {
      icon: Clock,
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      iconColor: 'text-slate-500',
      title: `${Math.round(results.currentProgress)}% to significance`,
      description: `${results.totalVisitors.toLocaleString()} visitors so far`,
    },
  }

  const { icon: Icon, bg, border, iconColor, title, description } = config[status]

  return (
    <div className={cn('rounded-lg border p-4', bg, border)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn('rounded-full p-2', bg.replace('50', '100'))}>
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
        </div>

        {status === 'winner' && (
          <Button>Implement Winner</Button>
        )}

        {status === 'in_progress' && (
          <ProgressMeter progress={results.currentProgress} />
        )}
      </div>
    </div>
  )
}

function ProgressMeter({ progress }: { progress: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-cyan-500 transition-all duration-500"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      <span className="font-mono text-sm font-semibold text-slate-700">
        {Math.round(progress)}%
      </span>
    </div>
  )
}

export function SignificanceBannerSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex animate-pulse items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-slate-200" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-slate-200" />
          <div className="h-4 w-32 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  )
}
