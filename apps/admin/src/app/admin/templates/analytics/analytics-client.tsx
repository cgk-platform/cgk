'use client'

import { Button, cn } from '@cgk/ui'
import { ArrowLeft, RefreshCw, TrendingUp, Mail, MousePointerClick, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState, useTransition } from 'react'

import {
  AnalyticsSummaryCard,
  TemplateAnalyticsChart,
  TemplateAnalyticsChartSkeleton,
  type TrendData,
} from '@/components/templates'

type Period = '7d' | '30d' | '90d'

interface TemplateAnalyticsItem {
  notificationType: string
  templateKey: string
  displayName: string
  sends: number
  openRate: number
  clickRate: number
  bounceRate: number
}

interface TemplateAnalyticsData {
  period: Period
  summary: {
    totalSends: number
    avgOpenRate: number
    avgClickRate: number
    avgBounceRate: number
  }
  byTemplate: TemplateAnalyticsItem[]
  trends: TrendData[]
}

export function TemplateAnalyticsContent() {
  const [data, setData] = useState<TemplateAnalyticsData | null>(null)
  const [period, setPeriod] = useState<Period>('30d')
  const [chartMetric, setChartMetric] = useState<'sends' | 'opens' | 'clicks'>('sends')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async (selectedPeriod: Period) => {
    try {
      const response = await fetch(
        `/api/admin/templates/analytics?period=${selectedPeriod}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const result = await response.json()
      setData(result as TemplateAnalyticsData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      fetchAnalytics(period)
    })
  }, [fetchAnalytics, period])

  const handlePeriodChange = useCallback((newPeriod: Period) => {
    setPeriod(newPeriod)
  }, [])

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      fetchAnalytics(period)
    })
  }, [fetchAnalytics, period])

  if (error) {
    return (
      <div className="rounded-lg border bg-destructive/10 p-6 text-center">
        <p className="text-destructive">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="mt-4"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      </div>
    )
  }

  const periodLabels: Record<Period, string> = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
  }

  return (
    <div className="space-y-6">
      {/* Header with back link and period selector */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/templates"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Template Library
        </Link>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {(['7d', '30d', '90d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  period === p
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isPending && !data ? (
        <TemplateAnalyticsSkeleton />
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnalyticsSummaryCard
              label="Total Sends"
              value={data.summary.totalSends}
            />
            <AnalyticsSummaryCard
              label="Avg Open Rate"
              value={`${data.summary.avgOpenRate}%`}
            />
            <AnalyticsSummaryCard
              label="Avg Click Rate"
              value={`${data.summary.avgClickRate}%`}
            />
            <AnalyticsSummaryCard
              label="Avg Bounce Rate"
              value={`${data.summary.avgBounceRate}%`}
            />
          </div>

          {/* Tracking notice */}
          {data.summary.avgOpenRate === 0 && data.summary.avgClickRate === 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Email tracking not enabled</p>
                <p className="text-yellow-700 mt-1">
                  Open and click rates require Resend webhook integration.
                  Configure webhooks to track email engagement metrics.
                </p>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="rounded-lg border bg-card p-6">
            {/* Metric selector */}
            <div className="flex items-center gap-2 mb-6">
              {(['sends', 'opens', 'clicks'] as const).map((metric) => (
                <button
                  key={metric}
                  onClick={() => setChartMetric(metric)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                    chartMetric === metric
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {metric === 'sends' && <Mail className="h-3 w-3" />}
                  {metric === 'opens' && <TrendingUp className="h-3 w-3" />}
                  {metric === 'clicks' && <MousePointerClick className="h-3 w-3" />}
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>

            <TemplateAnalyticsChart
              data={data.trends}
              metric={chartMetric}
              period={period}
            />
          </div>

          {/* Per-template table */}
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Performance by Template</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Template</th>
                    <th className="text-right p-4 font-medium">Sends</th>
                    <th className="text-right p-4 font-medium">Open Rate</th>
                    <th className="text-right p-4 font-medium">Click Rate</th>
                    <th className="text-right p-4 font-medium">Bounce Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byTemplate.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No email sends in this period
                      </td>
                    </tr>
                  ) : (
                    data.byTemplate.map((template) => (
                      <tr
                        key={`${template.notificationType}:${template.templateKey}`}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="p-4">
                          <div className="font-medium">{template.displayName}</div>
                          <div className="text-xs text-muted-foreground">
                            {template.notificationType}
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono">
                          {template.sends.toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-mono">
                          {template.openRate > 0 ? `${template.openRate}%` : '-'}
                        </td>
                        <td className="p-4 text-right font-mono">
                          {template.clickRate > 0 ? `${template.clickRate}%` : '-'}
                        </td>
                        <td className="p-4 text-right font-mono">
                          {template.bounceRate > 0 ? (
                            <span
                              className={cn(
                                template.bounceRate > 5 && 'text-destructive'
                              )}
                            >
                              {template.bounceRate}%
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export function TemplateAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 animate-pulse">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-8 w-32 bg-muted rounded mt-2" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-lg border bg-card p-6">
        <TemplateAnalyticsChartSkeleton />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card animate-pulse">
        <div className="p-4 border-b">
          <div className="h-5 w-48 bg-muted rounded" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="flex gap-8">
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
