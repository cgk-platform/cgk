'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, CardContent, cn } from '@cgk/ui'

import { useAttribution, ModelSelector, TimeRangePicker } from '@/components/attribution'
import type { ChannelHierarchy, ChannelTrendPoint, CustomerType, QuickFilter } from '@/lib/attribution'

interface ChannelRowProps {
  channel: ChannelHierarchy
  level: number
  isExpanded: boolean
  isSelected: boolean
  onToggleExpand: (id: string) => void
  onToggleSelect: (id: string) => void
  childChannels?: ChannelHierarchy[]
}

function ChannelRow({
  channel,
  level,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  childChannels,
}: ChannelRowProps) {
  const hasChildren = channel.level !== 'ad'
  const indent = level * 24

  return (
    <>
      <tr
        className={cn(
          'border-b transition-colors hover:bg-muted/50',
          isSelected && 'bg-primary/5'
        )}
      >
        <td className="p-3" style={{ paddingLeft: `${12 + indent}px` }}>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(channel.id)}
              className="h-4 w-4 rounded border-gray-300"
            />
            {hasChildren && (
              <button
                onClick={() => onToggleExpand(channel.id)}
                className="p-1 hover:bg-muted rounded"
              >
                <svg
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isExpanded && 'rotate-90'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <span className="font-medium">{channel.name}</span>
            <span className="text-xs text-muted-foreground capitalize">({channel.level})</span>
          </div>
        </td>
        <td className="p-3 text-right">${channel.spend.toLocaleString()}</td>
        <td className="p-3 text-right">${channel.revenue.toLocaleString()}</td>
        <td className="p-3 text-right">{channel.conversions.toLocaleString()}</td>
        <td className="p-3 text-right">
          <span className={cn(channel.roas >= 3 ? 'text-green-600' : channel.roas >= 1 ? 'text-yellow-600' : 'text-red-600')}>
            {channel.roas.toFixed(2)}x
          </span>
        </td>
        <td className="p-3 text-right">${channel.cpa.toFixed(2)}</td>
        <td className="p-3 text-right">
          <div className="flex gap-2 justify-end text-xs">
            <span className="text-blue-600">${channel.newCustomerRevenue.toLocaleString()}</span>
            <span>/</span>
            <span className="text-gray-500">${channel.existingCustomerRevenue.toLocaleString()}</span>
          </div>
        </td>
      </tr>
      {isExpanded && childChannels && childChannels.map((child) => (
        <ChannelRow
          key={child.id}
          channel={child}
          level={level + 1}
          isExpanded={false}
          isSelected={false}
          onToggleExpand={onToggleExpand}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </>
  )
}

function TrendChart({
  trends,
  selectedChannels,
  metric,
}: {
  trends: Record<string, ChannelTrendPoint[]>
  selectedChannels: string[]
  metric: 'revenue' | 'roas' | 'conversions'
}) {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e']

  const allPoints = useMemo(() => {
    const points: { date: string; [key: string]: number | string }[] = []
    const dates = new Set<string>()

    for (const channel of selectedChannels) {
      const channelTrends = trends[channel] || []
      for (const point of channelTrends) {
        dates.add(point.date)
      }
    }

    const sortedDates = Array.from(dates).sort()
    for (const date of sortedDates) {
      const point: { date: string; [key: string]: number | string } = { date }
      for (const channel of selectedChannels) {
        const channelTrends = trends[channel] || []
        const dayPoint = channelTrends.find((p) => p.date === date)
        point[channel] = dayPoint ? dayPoint[metric] : 0
      }
      points.push(point)
    }

    return points
  }, [trends, selectedChannels, metric])

  if (selectedChannels.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Select channels to compare trends
      </div>
    )
  }

  const maxValue = Math.max(...allPoints.flatMap((p) => selectedChannels.map((c) => Number(p[c]) || 0)), 1)

  return (
    <div className="h-64 relative">
      <svg className="w-full h-full">
        {selectedChannels.map((channel, channelIndex) => {
          const points = allPoints
            .map((p, i) => {
              const value = Number(p[channel]) || 0
              const x = (i / Math.max(allPoints.length - 1, 1)) * 100
              const y = 100 - (value / maxValue) * 100
              return `${x}%,${y}%`
            })
            .join(' ')

          return (
            <polyline
              key={channel}
              points={points}
              fill="none"
              stroke={colors[channelIndex % colors.length]}
              strokeWidth="2"
            />
          )
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-2">
        {allPoints.length > 0 && (
          <>
            <span>{allPoints[0]?.date}</span>
            <span>{allPoints[allPoints.length - 1]?.date}</span>
          </>
        )}
      </div>
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        {selectedChannels.map((channel, i) => (
          <div key={channel} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span>{channel}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ChannelsPage() {
  const { model, window, startDate, endDate } = useAttribution()
  const [channels, setChannels] = useState<ChannelHierarchy[]>([])
  const [trends, setTrends] = useState<Record<string, ChannelTrendPoint[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [customerType, setCustomerType] = useState<CustomerType>('all')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [trendMetric, setTrendMetric] = useState<'revenue' | 'roas' | 'conversions'>('revenue')

  const fetchChannels = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        model,
        window,
        startDate,
        endDate,
        customerType,
        quickFilter,
        trendChannels: Array.from(selectedIds).join(','),
      })
      const response = await fetch(`/api/admin/attribution/channels?${params}`)
      const data = await response.json()
      setChannels(data.channels || [])
      if (data.trends) {
        setTrends(data.trends)
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error)
    } finally {
      setIsLoading(false)
    }
  }, [model, window, startDate, endDate, customerType, quickFilter, selectedIds])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleExportCsv = () => {
    const headers = ['Name', 'Level', 'Spend', 'Revenue', 'Conversions', 'ROAS', 'CPA', 'New Revenue', 'Existing Revenue']
    const rows = channels.map((c) => [
      c.name,
      c.level,
      c.spend,
      c.revenue,
      c.conversions,
      c.roas,
      c.cpa,
      c.newCustomerRevenue,
      c.existingCustomerRevenue,
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `channels-${startDate}-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ModelSelector />
          <TimeRangePicker />
        </div>
        <Button variant="outline" onClick={handleExportCsv}>
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Customer:</span>
          {(['all', 'new', 'existing'] as CustomerType[]).map((type) => (
            <Button
              key={type}
              variant={customerType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCustomerType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-muted-foreground">Filter:</span>
          {(['all', 'top_performers', 'underperformers', 'high_volume', 'efficient'] as QuickFilter[]).map((filter) => (
            <Button
              key={filter}
              variant={quickFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQuickFilter(filter)}
            >
              {filter.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Channel</th>
                    <th className="p-3 text-right font-medium">Spend</th>
                    <th className="p-3 text-right font-medium">Revenue</th>
                    <th className="p-3 text-right font-medium">Conversions</th>
                    <th className="p-3 text-right font-medium">ROAS</th>
                    <th className="p-3 text-right font-medium">CPA</th>
                    <th className="p-3 text-right font-medium">New/Existing</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={7} className="p-3">
                          <div className="h-6 bg-muted animate-pulse rounded" />
                        </td>
                      </tr>
                    ))
                  ) : channels.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        No channel data found for the selected filters
                      </td>
                    </tr>
                  ) : (
                    channels.map((channel) => (
                      <ChannelRow
                        key={channel.id}
                        channel={channel}
                        level={0}
                        isExpanded={expandedIds.has(channel.id)}
                        isSelected={selectedIds.has(channel.id)}
                        onToggleExpand={handleToggleExpand}
                        onToggleSelect={handleToggleSelect}
                        childChannels={channel.children}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Performance Trend</h3>
              <div className="flex gap-1">
                {(['revenue', 'roas', 'conversions'] as const).map((m) => (
                  <Button
                    key={m}
                    variant={trendMetric === m ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTrendMetric(m)}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <TrendChart
              trends={trends}
              selectedChannels={Array.from(selectedIds)}
              metric={trendMetric}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
