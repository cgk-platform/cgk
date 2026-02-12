'use client'

import { Card, CardContent, cn } from '@cgk/ui'
import { LogIn, Eye, MousePointer, TrendingUp, BarChart3 } from 'lucide-react'
import { useState } from 'react'

import type { PortalAnalyticsSummary } from '@/lib/customer-portal/types'
import { formatNumber } from '@/lib/format'

interface PortalAnalyticsProps {
  summary: PortalAnalyticsSummary
  dateRange: { start: Date; end: Date }
  onDateRangeChange: (range: { start: Date; end: Date }) => void
}

type DateRangePreset = '7d' | '30d' | '90d'

const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

export function PortalAnalytics({ summary, onDateRangeChange }: PortalAnalyticsProps) {
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('30d')

  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset)
    const end = new Date()
    const start = new Date()

    switch (preset) {
      case '7d':
        start.setDate(start.getDate() - 7)
        break
      case '30d':
        start.setDate(start.getDate() - 30)
        break
      case '90d':
        start.setDate(start.getDate() - 90)
        break
    }

    onDateRangeChange({ start, end })
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Portal Analytics</h3>
        <div className="flex rounded-lg border p-1 bg-muted/50">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePresetChange(preset.value)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                selectedPreset === preset.value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={LogIn}
          label="Unique Logins"
          value={summary.uniqueLogins}
          subLabel={`${formatNumber(summary.totalLogins)} total logins`}
          iconColor="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <KpiCard
          icon={Eye}
          label="Page Views"
          value={summary.pageViews}
          iconColor="text-green-500"
          bgColor="bg-green-500/10"
        />
        <KpiCard
          icon={MousePointer}
          label="Actions"
          value={summary.actions}
          iconColor="text-purple-500"
          bgColor="bg-purple-500/10"
        />
        <KpiCard
          icon={TrendingUp}
          label="Avg. Pages/Session"
          value={
            summary.uniqueLogins > 0
              ? (summary.pageViews / summary.uniqueLogins).toFixed(1)
              : '0'
          }
          iconColor="text-amber-500"
          bgColor="bg-amber-500/10"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Logins Chart */}
        <Card>
          <CardContent className="p-6">
            <h4 className="mb-4 font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Logins Over Time
            </h4>
            <MiniChart data={summary.loginsByDay} color="#3b82f6" />
          </CardContent>
        </Card>

        {/* Page Views Chart */}
        <Card>
          <CardContent className="p-6">
            <h4 className="mb-4 font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Page Views Over Time
            </h4>
            <MiniChart data={summary.pageViewsByDay} color="#22c55e" />
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardContent className="p-6">
            <h4 className="mb-4 font-semibold">Top Pages</h4>
            {summary.topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No page views recorded.</p>
            ) : (
              <div className="space-y-3">
                {summary.topPages.map((page, idx) => (
                  <TopItemRow
                    key={page.path}
                    rank={idx + 1}
                    label={page.path}
                    value={page.views}
                    maxValue={summary.topPages[0]?.views || 1}
                    color="bg-green-500"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Actions */}
        <Card>
          <CardContent className="p-6">
            <h4 className="mb-4 font-semibold">Top Actions</h4>
            {summary.topActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No actions recorded.</p>
            ) : (
              <div className="space-y-3">
                {summary.topActions.map((action, idx) => (
                  <TopItemRow
                    key={action.name}
                    rank={idx + 1}
                    label={formatActionName(action.name)}
                    value={action.count}
                    maxValue={summary.topActions[0]?.count || 1}
                    color="bg-purple-500"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface KpiCardProps {
  icon: typeof LogIn
  label: string
  value: number | string
  subLabel?: string
  iconColor: string
  bgColor: string
}

function KpiCard({ icon: Icon, label, value, subLabel, iconColor, bgColor }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-lg p-2.5', bgColor)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{typeof value === 'number' ? formatNumber(value) : value}</p>
            {subLabel && <p className="text-xs text-muted-foreground">{subLabel}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface MiniChartProps {
  data: Array<{ date: string; count: number }>
  color: string
}

function MiniChart({ data, color }: MiniChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    )
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="h-32">
      <div className="flex h-full items-end gap-1">
        {data.map((item, idx) => {
          const height = (item.count / maxCount) * 100
          return (
            <div
              key={idx}
              className="flex-1 group relative"
              style={{ height: '100%' }}
            >
              <div
                className="absolute bottom-0 w-full rounded-t transition-all hover:opacity-80"
                style={{
                  height: `${Math.max(height, 2)}%`,
                  backgroundColor: color,
                }}
              />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background">
                {item.count} on {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{formatChartDate(data[0]?.date)}</span>
        <span>{formatChartDate(data[data.length - 1]?.date)}</span>
      </div>
    </div>
  )
}

interface TopItemRowProps {
  rank: number
  label: string
  value: number
  maxValue: number
  color: string
}

function TopItemRow({ rank, label, value, maxValue, color }: TopItemRowProps) {
  const percentage = (value / maxValue) * 100

  return (
    <div className="flex items-center gap-3">
      <span className="w-5 text-sm font-medium text-muted-foreground">{rank}.</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">{label}</span>
          <span className="text-sm text-muted-foreground ml-2">{formatNumber(value)}</span>
        </div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', color)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function formatChartDate(date?: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatActionName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
