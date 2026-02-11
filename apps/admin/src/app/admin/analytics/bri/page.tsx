'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, Badge } from '@cgk/ui'

import type { BRIAnalyticsData, DateRange } from '@/lib/analytics'
import { formatNumber, formatPercent } from '@/lib/format'

import { DateRangePicker } from '../components/date-range-picker'

export default function BRIAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: '30d',
    startDate: getDefaultStartDate('30d'),
    endDate: new Date().toISOString().split('T')[0],
  })
  const [data, setData] = useState<BRIAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          preset: dateRange.preset,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        })
        const res = await fetch(`/api/admin/analytics/bri?${params}`)
        const json = await res.json()
        setData(json.data)
      } catch (error) {
        console.error('Failed to fetch BRI analytics:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [dateRange])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BRI Analytics</h1>
          <p className="text-muted-foreground">
            Brand Relationship Intelligence AI performance metrics
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : !data ? (
        <div className="text-muted-foreground">No data available</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Conversation Volume */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Conversation Volume</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Conversations</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {formatNumber(data.conversationVolume.totalConversations.value)}
                  </span>
                  <TrendBadge
                    change={data.conversationVolume.totalConversations.changePercent}
                    trend={data.conversationVolume.totalConversations.trend}
                  />
                </div>
              </div>
              <div className="space-y-2">
                {data.conversationVolume.byChannel.map((channel) => (
                  <div key={channel.channel} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{channel.channel}</span>
                    <span>{formatNumber(channel.count)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Performance Metrics</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricRow
                label="Avg Response Time"
                value={`${data.performance.avgResponseTime.value.toFixed(0)}s`}
                change={data.performance.avgResponseTime.changePercent}
                trend={data.performance.avgResponseTime.trend}
                inverseColor
              />
              <MetricRow
                label="Resolution Rate"
                value={formatPercent(data.performance.resolutionRate.value)}
                change={data.performance.resolutionRate.changePercent}
                trend={data.performance.resolutionRate.trend}
              />
              <MetricRow
                label="Escalation Rate"
                value={formatPercent(data.performance.escalationRate.value)}
                change={data.performance.escalationRate.changePercent}
                trend={data.performance.escalationRate.trend}
                inverseColor
              />
              <MetricRow
                label="CSAT Score"
                value={data.performance.csat.value.toFixed(2)}
                change={data.performance.csat.changePercent}
                trend={data.performance.csat.trend}
              />
            </CardContent>
          </Card>

          {/* AI Efficiency */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">AI Efficiency</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricRow
                label="Automated Resolution Rate"
                value={formatPercent(data.efficiency.automatedResolutionRate.value)}
                change={data.efficiency.automatedResolutionRate.changePercent}
                trend={data.efficiency.automatedResolutionRate.trend}
              />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Avg Confidence Score</span>
                <span className="font-medium">{formatPercent(data.efficiency.avgConfidenceScore)}</span>
              </div>
              <MetricRow
                label="Human Handoff Rate"
                value={formatPercent(data.efficiency.humanHandoffRate.value)}
                change={data.efficiency.humanHandoffRate.changePercent}
                trend={data.efficiency.humanHandoffRate.trend}
                inverseColor
              />
              <MetricRow
                label="Est. Cost Savings"
                value={`$${formatNumber(data.efficiency.estimatedCostSavings.value)}`}
                change={data.efficiency.estimatedCostSavings.changePercent}
                trend={data.efficiency.estimatedCostSavings.trend}
              />
            </CardContent>
          </Card>

          {/* Quality Metrics */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Quality Metrics</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricRow
                label="Accuracy Rate"
                value={formatPercent(data.quality.accuracyRate.value)}
                change={data.quality.accuracyRate.changePercent}
                trend={data.quality.accuracyRate.trend}
              />
              <MetricRow
                label="Hallucination Rate"
                value={formatPercent(data.quality.hallucinationRate.value)}
                change={data.quality.hallucinationRate.changePercent}
                trend={data.quality.hallucinationRate.trend}
                inverseColor
              />
              <div className="pt-2">
                <h4 className="mb-2 text-sm font-medium">Customer Feedback Distribution</h4>
                <div className="flex gap-1">
                  {data.quality.customerFeedback.map((fb) => {
                    const total = data.quality.customerFeedback.reduce((s, f) => s + f.count, 0)
                    const width = total > 0 ? (fb.count / total) * 100 : 0
                    return (
                      <div
                        key={fb.rating}
                        className={`h-8 rounded transition-all ${
                          fb.rating >= 4
                            ? 'bg-green-500'
                            : fb.rating === 3
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${width}%` }}
                        title={`${fb.rating} stars: ${fb.count}`}
                      />
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Topics */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <h3 className="font-semibold">Topic Analysis</h3>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Topic</th>
                    <th className="pb-3 font-medium text-right">Count</th>
                    <th className="pb-3 font-medium text-right">Avg Resolution Time</th>
                    <th className="pb-3 font-medium text-right">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.topics.topics.map((topic) => (
                    <tr key={topic.topic}>
                      <td className="py-3 font-medium">{topic.topic}</td>
                      <td className="py-3 text-right">{formatNumber(topic.count)}</td>
                      <td className="py-3 text-right">{topic.avgResolutionTime}s</td>
                      <td className="py-3 text-right">
                        <Badge
                          variant={
                            topic.trend === 'up'
                              ? 'destructive'
                              : topic.trend === 'down'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {topic.trend === 'up' ? 'Increasing' : topic.trend === 'down' ? 'Decreasing' : 'Stable'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

interface MetricRowProps {
  label: string
  value: string
  change: number
  trend: 'up' | 'down' | 'stable'
  inverseColor?: boolean
}

function MetricRow({ label, value, change, trend, inverseColor }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{value}</span>
        <TrendBadge change={change} trend={trend} inverseColor={inverseColor} />
      </div>
    </div>
  )
}

interface TrendBadgeProps {
  change: number
  trend: 'up' | 'down' | 'stable'
  inverseColor?: boolean
}

function TrendBadge({ change, trend, inverseColor }: TrendBadgeProps) {
  const isPositive = trend === 'up'
  const colorClass = inverseColor
    ? isPositive
      ? 'text-red-600'
      : 'text-green-600'
    : isPositive
      ? 'text-green-600'
      : 'text-red-600'

  return (
    <span className={`text-sm ${trend === 'stable' ? 'text-muted-foreground' : colorClass}`}>
      {trend === 'up' ? '+' : ''}
      {formatPercent(change / 100)}
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className={i >= 4 ? 'lg:col-span-2' : ''}>
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function getDefaultStartDate(preset: string): string {
  const now = new Date()
  const days = { '7d': 7, '14d': 14, '28d': 28, '30d': 30, '90d': 90 }[preset] || 30
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  return start.toISOString().split('T')[0]
}
