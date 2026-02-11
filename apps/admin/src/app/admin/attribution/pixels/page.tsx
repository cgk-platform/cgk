'use client'

import {
  Button,
  Card,
  CardContent,
  Badge,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
} from '@cgk/ui'
import { cn } from '@cgk/ui'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Loader2,
  Bell,
  Settings,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

import type { PixelHealthMetrics, PixelEvent, MetaEMQMetrics, PixelPlatform } from '@/lib/attribution'

interface PixelStats {
  health: PixelHealthMetrics[]
  emq: MetaEMQMetrics
}

export default function PixelsPage() {
  const [stats, setStats] = useState<PixelStats | null>(null)
  const [events, setEvents] = useState<PixelEvent[]>([])
  const [eventsTotal, setEventsTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 20

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [statsRes, eventsRes] = await Promise.all([
        fetch('/api/admin/attribution/pixels/stats'),
        fetch(`/api/admin/attribution/pixels/events?` + new URLSearchParams({
          ...(platformFilter !== 'all' ? { platform: platformFilter } : {}),
          ...(eventTypeFilter !== 'all' ? { eventType: eventTypeFilter } : {}),
          ...(statusFilter !== 'all' ? { matchStatus: statusFilter } : {}),
          ...(searchQuery ? { search: searchQuery } : {}),
          limit: String(pageSize),
          offset: String(currentPage * pageSize),
        })),
      ])

      const statsData = await statsRes.json()
      const eventsData = await eventsRes.json()

      setStats(statsData)
      setEvents(eventsData.events)
      setEventsTotal(eventsData.total)
    } catch (err) {
      setError('Failed to load pixel data')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [platformFilter, eventTypeFilter, statusFilter, searchQuery, currentPage])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getPlatformIcon = (platform: PixelPlatform) => {
    switch (platform) {
      case 'ga4':
        return <Activity className="h-5 w-5" />
      case 'meta':
        return <Activity className="h-5 w-5" />
      case 'tiktok':
        return <Activity className="h-5 w-5" />
      default:
        return <Activity className="h-5 w-5" />
    }
  }

  const getStatusIcon = (accuracy: number) => {
    if (accuracy >= 90) return <CheckCircle className="h-5 w-5 text-green-500" />
    if (accuracy >= 70) return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    return <XCircle className="h-5 w-5 text-red-500" />
  }

  const getStatusColor = (accuracy: number) => {
    if (accuracy >= 90) return 'bg-green-100 text-green-800'
    if (accuracy >= 70) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-green-100 text-green-800">Matched</Badge>
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
      case 'unmatched':
        return <Badge className="bg-red-100 text-red-800">Unmatched</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (isLoading && !stats) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-64 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="error">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Accuracy Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats?.health.map((platform) => (
          <Card key={platform.platform}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getPlatformIcon(platform.platform)}
                  <div>
                    <h3 className="font-medium capitalize">{platform.platform}</h3>
                    <p className="text-sm text-muted-foreground">
                      Last 24 hours
                    </p>
                  </div>
                </div>
                {getStatusIcon(platform.accuracy24h)}
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Accuracy</span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-sm font-medium',
                      getStatusColor(platform.accuracy24h)
                    )}>
                      {platform.accuracy24h}%
                    </span>
                    {platform.accuracyTrend !== 0 && (
                      <span className={cn(
                        'flex items-center text-xs',
                        platform.accuracyTrend > 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {platform.accuracyTrend > 0 ? (
                          <TrendingUp className="mr-0.5 h-3 w-3" />
                        ) : (
                          <TrendingDown className="mr-0.5 h-3 w-3" />
                        )}
                        {Math.abs(platform.accuracyTrend)}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Session Stitching</span>
                  <span className="text-sm font-medium">{platform.sessionStitchingRate}%</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Events (24h)</span>
                  <span className="text-sm font-medium">
                    {platform.eventCount24h.toLocaleString()}
                  </span>
                </div>

                {platform.lastEvent && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Event</span>
                    <span className="text-sm">
                      {new Date(platform.lastEvent).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Meta EMQ Section */}
      {stats?.emq && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Meta Event Match Quality (EMQ)</h3>
                <p className="text-sm text-muted-foreground">
                  Quality score for Meta Conversions API events
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{stats.emq.overallScore}</div>
                <div className="text-sm text-muted-foreground">/ 10</div>
              </div>
            </div>

            {Object.keys(stats.emq.parameterScores).length > 0 && (
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-medium">Parameter Scores</h4>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(stats.emq.parameterScores).map(([param, score]) => (
                    <div
                      key={param}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm capitalize">{param.replace(/_/g, ' ')}</span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        score >= 8 ? 'bg-green-100 text-green-800' :
                        score >= 5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      )}>
                        {score}/10
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alert Configuration Quick Access */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              <div>
                <h3 className="font-medium">Alert Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Configure accuracy thresholds and notification channels
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Configure Alerts
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Event Stream Table */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-medium">Event Stream</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by Order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="ga4">GA4</SelectItem>
                <SelectItem value="meta">Meta</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>

            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="add_to_cart">Add to Cart</SelectItem>
                <SelectItem value="page_view">Page View</SelectItem>
                <SelectItem value="checkout">Checkout</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unmatched">Unmatched</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Events Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 pr-4">Timestamp</th>
                  <th className="pb-3 pr-4">Event Type</th>
                  <th className="pb-3 pr-4">Platform</th>
                  <th className="pb-3 pr-4">Order ID</th>
                  <th className="pb-3 pr-4">Match Status</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No events found
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="border-b">
                      <td className="py-3 pr-4 text-sm">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="capitalize text-sm">
                          {event.eventType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="uppercase text-sm font-medium">
                          {event.platform}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm font-mono">
                        {event.orderId ?? '-'}
                      </td>
                      <td className="py-3 pr-4">
                        {getMatchStatusBadge(event.matchStatus)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {eventsTotal > pageSize && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {currentPage * pageSize + 1} to{' '}
                {Math.min((currentPage + 1) * pageSize, eventsTotal)} of {eventsTotal}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={(currentPage + 1) * pageSize >= eventsTotal}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
