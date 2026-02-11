'use client'

import { cn } from '@cgk/ui'
import { AlertTriangle, BarChart3, ChevronDown, Clock, TrendingUp } from 'lucide-react'
import { useState } from 'react'

import type { PipelineAnalytics, RiskLevel } from '@/lib/pipeline/types'
import { getStageLabel, getStageColor } from '@/lib/pipeline/types'

interface AnalyticsPanelProps {
  analytics: PipelineAnalytics
  isLoading?: boolean
}

function formatCurrency(cents: number): string {
  if (cents >= 100000) {
    return `$${(cents / 100).toLocaleString()}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

const RISK_COLORS: Record<RiskLevel, string> = {
  none: '#64748b',
  low: '#eab308',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

export function AnalyticsPanel({ analytics, isLoading }: AnalyticsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const maxThroughput = Math.max(...analytics.throughput.map((t) => t.count), 1)
  const maxCycleCount = Math.max(...analytics.cycleTime.map((c) => c.count), 1)
  const maxStageCount = Math.max(...analytics.stageMetrics.map((s) => s.currentCount), 1)
  const totalRiskCount = analytics.riskDistribution.reduce((sum, r) => sum + r.count, 0)

  return (
    <div className="rounded-lg border border-slate-700/30 bg-slate-900/30 backdrop-blur-sm">
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-400" />
          <span className="font-mono text-sm font-medium text-slate-200">
            Analytics
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-slate-500 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className={cn('border-t border-slate-700/30 p-4', isLoading && 'opacity-50')}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Throughput Chart */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
                <TrendingUp className="h-3.5 w-3.5" />
                Throughput (Projects/Week)
              </h4>
              <div className="flex h-32 items-end gap-1">
                {analytics.throughput.length > 0 ? (
                  analytics.throughput.map((week, i) => (
                    <div
                      key={week.week}
                      className="group relative flex flex-1 flex-col items-center"
                    >
                      <div
                        className="w-full rounded-t bg-blue-500/80 transition-all group-hover:bg-blue-400"
                        style={{
                          height: `${(week.count / maxThroughput) * 100}%`,
                          minHeight: week.count > 0 ? '4px' : '0',
                        }}
                      />
                      <div className="absolute -top-6 hidden rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 group-hover:block">
                        {week.count}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-1 items-center justify-center text-xs text-slate-600">
                    No data
                  </div>
                )}
              </div>
              {analytics.throughput.length > 0 && (
                <div className="mt-1 flex justify-between text-[10px] text-slate-600">
                  <span>
                    {new Date(analytics.throughput[0]?.week || '').toLocaleDateString(
                      'en-US',
                      { month: 'short', day: 'numeric' }
                    )}
                  </span>
                  <span>
                    {new Date(
                      analytics.throughput[analytics.throughput.length - 1]?.week || ''
                    ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            {/* Cycle Time Distribution */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                Cycle Time Distribution (Days)
              </h4>
              <div className="flex h-32 items-end gap-0.5">
                {analytics.cycleTime.length > 0 ? (
                  analytics.cycleTime.slice(0, 20).map((bucket) => (
                    <div
                      key={bucket.days}
                      className="group relative flex flex-1 flex-col items-center"
                    >
                      <div
                        className="w-full rounded-t bg-emerald-500/80 transition-all group-hover:bg-emerald-400"
                        style={{
                          height: `${(bucket.count / maxCycleCount) * 100}%`,
                          minHeight: bucket.count > 0 ? '4px' : '0',
                        }}
                      />
                      <div className="absolute -top-6 hidden rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 group-hover:block">
                        {bucket.days}d: {bucket.count}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-1 items-center justify-center text-xs text-slate-600">
                    No data
                  </div>
                )}
              </div>
              {analytics.cycleTime.length > 0 && (
                <div className="mt-1 flex justify-between text-[10px] text-slate-600">
                  <span>0 days</span>
                  <span>
                    {analytics.cycleTime[Math.min(analytics.cycleTime.length - 1, 19)]?.days || 0}+ days
                  </span>
                </div>
              )}
            </div>

            {/* Stage Metrics */}
            <div>
              <h4 className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
                Current Stage Distribution
              </h4>
              <div className="space-y-2">
                {analytics.stageMetrics.map((metric) => (
                  <div key={metric.stage} className="flex items-center gap-3">
                    <span
                      className="w-24 truncate font-mono text-xs"
                      style={{ color: getStageColor(metric.stage) }}
                    >
                      {getStageLabel(metric.stage)}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(metric.currentCount / maxStageCount) * 100}%`,
                          backgroundColor: getStageColor(metric.stage),
                        }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-xs text-slate-400">
                      {metric.currentCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Distribution */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
                <AlertTriangle className="h-3.5 w-3.5" />
                Risk Distribution
              </h4>
              <div className="space-y-2">
                {analytics.riskDistribution.map((risk) => (
                  <div key={risk.level} className="flex items-center gap-3">
                    <span
                      className="w-16 font-mono text-xs font-medium uppercase"
                      style={{ color: RISK_COLORS[risk.level] }}
                    >
                      {risk.level}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${totalRiskCount > 0 ? (risk.count / totalRiskCount) * 100 : 0}%`,
                          backgroundColor: RISK_COLORS[risk.level],
                        }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-xs text-slate-400">
                      {risk.count}
                    </span>
                    <span className="w-16 text-right font-mono text-xs text-slate-500">
                      {formatCurrency(risk.valueCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottlenecks */}
            {analytics.bottlenecks.length > 0 && (
              <div className="lg:col-span-2">
                <h4 className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
                  Potential Bottlenecks
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analytics.bottlenecks.slice(0, 5).map((bottleneck) => (
                    <div
                      key={bottleneck.stage}
                      className={cn(
                        'rounded border px-3 py-2 font-mono text-xs',
                        bottleneck.wipViolation
                          ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                          : 'border-slate-700/50 bg-slate-800/50 text-slate-400'
                      )}
                    >
                      <span style={{ color: getStageColor(bottleneck.stage) }}>
                        {getStageLabel(bottleneck.stage)}
                      </span>
                      <span className="ml-2 text-slate-500">
                        avg {bottleneck.avgDuration.toFixed(1)} days
                      </span>
                      {bottleneck.wipViolation && (
                        <span className="ml-2 text-amber-400">WIP exceeded</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
