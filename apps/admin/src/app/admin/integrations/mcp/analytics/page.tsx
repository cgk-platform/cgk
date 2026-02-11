'use client'

import { Button, Card, CardContent, Badge, cn } from '@cgk/ui'
import {
  ChevronLeft,
  BarChart3,
  Zap,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { McpAnalyticsSummary } from '@/lib/integrations/types'

interface ToolUsage {
  name: string
  calls: number
  category: string
}

interface RecentActivity {
  id: string
  tool: string
  status: 'success' | 'error'
  duration: number
  timestamp: string
}

interface McpAnalyticsData {
  summary: McpAnalyticsSummary
  toolUsage: ToolUsage[]
  categoryUsage: { category: string; calls: number }[]
  tokenUsage: { eventType: string; tokens: number }[]
  recentActivity: RecentActivity[]
  topErrors: { error: string; count: number }[]
  unusedTools: string[]
}

const TIME_RANGES = [
  { label: '24h', value: 1 },
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
]

export default function McpAnalyticsPage() {
  const [data, setData] = useState<McpAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(7)

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/mcp/analytics?days=${timeRange}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch MCP analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-8 w-48 rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const maxToolCalls = Math.max(...(data?.toolUsage.map(t => t.calls) || [1]))
  const maxCategoryCalls = Math.max(...(data?.categoryUsage.map(c => c.calls) || [1]))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/integrations/mcp">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-semibold">MCP Analytics</h2>
            <p className="text-sm text-muted-foreground">
              Tool usage metrics and performance
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-1 rounded-lg border p-1">
          {TIME_RANGES.map((range) => (
            <Button
              key={range.value}
              variant={timeRange === range.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span className="text-xs">Tool Calls</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{data?.summary.totalToolCalls || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">Unique Tools</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{data?.summary.uniqueTools || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span className="text-xs">Sessions</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{data?.summary.uniqueSessions || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Total Tokens</span>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {((data?.summary.totalTokens || 0) / 1000).toFixed(1)}k
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Avg Tokens/Session</span>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {data?.summary.avgTokensPerSession || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">Error Rate</span>
            </div>
            <p className={cn(
              'mt-1 text-2xl font-bold',
              (data?.summary.errorRate || 0) > 5 ? 'text-rose-500' : 'text-emerald-500'
            )}>
              {data?.summary.errorRate || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tool Usage */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Tool Usage</h3>
            <div className="space-y-3">
              {data?.toolUsage.slice(0, 10).map((tool) => (
                <div key={tool.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs">{tool.name}</span>
                    <span className="text-muted-foreground">{tool.calls}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(tool.calls / maxToolCalls) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {(!data?.toolUsage || data.toolUsage.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No tool usage data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Usage */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Usage by Category</h3>
            <div className="space-y-3">
              {data?.categoryUsage.map((category) => (
                <div key={category.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{category.category}</span>
                    <span className="text-muted-foreground">{category.calls}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${(category.calls / maxCategoryCalls) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {(!data?.categoryUsage || data.categoryUsage.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No category data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Errors */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-2">
              {data?.recentActivity.slice(0, 10).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-lg border p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        activity.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                      )}
                    />
                    <span className="font-mono text-xs">{activity.tool}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{activity.duration}ms</span>
                    <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
              {(!data?.recentActivity || data.recentActivity.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Errors */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Top Errors</h3>
            <div className="space-y-2">
              {data?.topErrors.map((error, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/5 p-2"
                >
                  <span className="text-sm text-rose-500">{error.error}</span>
                  <Badge variant="destructive">{error.count}</Badge>
                </div>
              ))}
              {(!data?.topErrors || data.topErrors.length === 0) && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-emerald-500">
                  <AlertTriangle className="h-4 w-4" />
                  No errors in this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unused Tools */}
      {data?.unusedTools && data.unusedTools.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Unused Tools</h3>
            <p className="text-sm text-muted-foreground mb-3">
              These tools haven't been called in the selected time period
            </p>
            <div className="flex flex-wrap gap-2">
              {data.unusedTools.map((tool) => (
                <Badge key={tool} variant="secondary" className="font-mono text-xs">
                  {tool}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
