'use client'

import { cn } from '@cgk-platform/ui'
import { AlertTriangle, Clock, DollarSign, TrendingUp } from 'lucide-react'

import type { PipelineStats } from '@/lib/pipeline/types'

interface StatsBarProps {
  stats: PipelineStats
  isLoading?: boolean
}

export function StatsBar({ stats, isLoading }: StatsBarProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  const statItems = [
    {
      label: 'Active',
      value: stats.activeProjects,
      suffix: 'projects',
      icon: TrendingUp,
      color: 'text-blue-400',
    },
    {
      label: 'At Risk Value',
      value: formatCurrency(stats.atRiskValueCents),
      icon: DollarSign,
      color: stats.atRiskValueCents > 0 ? 'text-red-400' : 'text-emerald-400',
      highlight: stats.atRiskValueCents > 0,
    },
    {
      label: 'Overdue',
      value: stats.overdueCount,
      icon: AlertTriangle,
      color: stats.overdueCount > 0 ? 'text-red-400' : 'text-emerald-400',
      highlight: stats.overdueCount > 0,
    },
    {
      label: 'Due This Week',
      value: stats.dueSoonCount,
      icon: Clock,
      color: stats.dueSoonCount > 5 ? 'text-amber-400' : 'text-slate-400',
    },
  ]

  return (
    <div className="flex items-center gap-6 rounded-lg border border-slate-700/50 bg-slate-900/50 px-4 py-2.5 font-mono text-sm backdrop-blur-sm">
      {statItems.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            'flex items-center gap-2',
            index > 0 && 'border-l border-slate-700/50 pl-6',
            isLoading && 'animate-pulse'
          )}
        >
          <item.icon className={cn('h-4 w-4', item.color)} />
          <span className="text-slate-500">{item.label}:</span>
          <span
            className={cn(
              'font-semibold tabular-nums',
              item.highlight ? 'text-red-400' : 'text-slate-200'
            )}
          >
            {item.value}
            {item.suffix && (
              <span className="ml-1 text-slate-500">{item.suffix}</span>
            )}
          </span>
        </div>
      ))}

      <div className="ml-auto flex items-center gap-4 border-l border-slate-700/50 pl-6">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Avg Cycle:</span>
          <span className="font-semibold tabular-nums text-slate-200">
            {stats.avgCycleTimeDays.toFixed(1)}
            <span className="ml-1 text-slate-500">days</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Throughput:</span>
          <span className="font-semibold tabular-nums text-slate-200">
            {stats.throughputPerWeek.toFixed(1)}
            <span className="ml-1 text-slate-500">/week</span>
          </span>
        </div>
      </div>
    </div>
  )
}
