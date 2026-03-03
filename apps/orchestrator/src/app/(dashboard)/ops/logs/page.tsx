'use client'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  cn,
  Input,
  Label,
  Select,
  SelectOption,
  Switch,
} from '@cgk-platform/ui'
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  Play,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Log entry structure
 */
interface LogEntry {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  action: string
  tenantId: string | null
  tenantName: string
  tenantSlug: string | null
  userId: string | null
  userEmail: string | null
  message: string
  metadata: Record<string, unknown> | null
  service: string
  traceId: string | null
  spanId: string | null
}

/**
 * Error aggregate pattern
 */
interface ErrorPattern {
  patternHash: string
  errorType: string
  message: string
  severity: 'p1' | 'p2' | 'p3'
  occurrenceCount: number
  affectedTenants: number
  firstOccurrence: string
  lastOccurrence: string
  openCount: number
  resolvedCount: number
}

/**
 * Tenant for filters
 */
interface Tenant {
  id: string
  name: string
  slug: string
}

/**
 * Log Explorer page
 *
 * Browse and search structured logs with real-time streaming support.
 */
export default function LogsPage() {
  // Log data state
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [errorPatterns, setErrorPatterns] = useState<ErrorPattern[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  // Filter state
  const [tenantFilter, setTenantFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingLogs, setStreamingLogs] = useState<LogEntry[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)

  // Pagination
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const limit = 100

  // Stats
  const [stats, setStats] = useState<{
    levelCounts: Record<string, number>
    total24h: number
  } | null>(null)

  /**
   * Fetch logs from API
   */
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (tenantFilter) params.set('tenantId', tenantFilter)
      if (levelFilter) params.set('level', levelFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      params.set('limit', String(limit))
      params.set('offset', String(offset))

      const response = await fetch(`/api/platform/logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
        setTotal(data.total)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }, [tenantFilter, levelFilter, searchQuery, startDate, endDate, offset])

  /**
   * Fetch error patterns for sidebar
   */
  const fetchErrorPatterns = useCallback(async () => {
    try {
      const response = await fetch('/api/platform/errors/aggregate?limit=10')
      if (response.ok) {
        const data = await response.json()
        setErrorPatterns(data.patterns)
      }
    } catch (error) {
      console.error('Failed to fetch error patterns:', error)
    }
  }, [])

  /**
   * Fetch tenants for filter
   */
  const fetchTenants = useCallback(async () => {
    try {
      const response = await fetch('/api/platform/overview/brands')
      if (response.ok) {
        const data = await response.json()
        setTenants(
          data.brands.map((b: { id: string; name: string; slug: string }) => ({
            id: b.id,
            name: b.name,
            slug: b.slug,
          }))
        )
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error)
    }
  }, [])

  /**
   * Start real-time log streaming
   */
  const startStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const params = new URLSearchParams()
    if (levelFilter) params.set('level', levelFilter)
    if (tenantFilter) params.set('tenantId', tenantFilter)

    const eventSource = new EventSource(`/api/platform/logs/stream?${params}`)
    eventSourceRef.current = eventSource

    eventSource.addEventListener('connected', () => {
      setIsStreaming(true)
    })

    eventSource.addEventListener('log', (event) => {
      const data = JSON.parse(event.data)
      if (data.log) {
        setStreamingLogs((prev) => {
          // Keep last 500 streaming logs
          const newLogs = [data.log, ...prev].slice(0, 500)
          return newLogs
        })
      }
    })

    eventSource.addEventListener('error', () => {
      console.error('SSE connection error')
      setIsStreaming(false)
    })
  }, [levelFilter, tenantFilter])

  /**
   * Stop real-time log streaming
   */
  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsStreaming(false)
  }, [])

  /**
   * Toggle log expansion
   */
  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setTenantFilter('')
    setLevelFilter('')
    setSearchQuery('')
    setStartDate('')
    setEndDate('')
    setOffset(0)
  }

  // Initial data fetch
  useEffect(() => {
    fetchLogs()
    fetchErrorPatterns()
    fetchTenants()
  }, [fetchLogs, fetchErrorPatterns, fetchTenants])

  // Cleanup streaming on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  /**
   * Get level icon
   */
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'debug':
        return <Bug className="h-4 w-4 text-gray-500" />
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  /**
   * Get level badge color
   */
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'debug':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      case 'info':
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    }
  }

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  /**
   * Format relative time
   */
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  // Display logs (streaming takes priority when active)
  const displayLogs = isStreaming ? streamingLogs : logs

  const hasFilters = tenantFilter || levelFilter || searchQuery || startDate || endDate

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Main Log Viewer */}
      <div className="flex flex-1 flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Log Explorer</h1>
            <p className="text-muted-foreground">
              Browse structured logs across all services.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Streaming Toggle */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Label htmlFor="streaming" className="text-sm font-medium">
                Live
              </Label>
              <Switch
                id="streaming"
                checked={isStreaming}
                onCheckedChange={(checked) => {
                  if (checked) {
                    startStreaming()
                  } else {
                    stopStreaming()
                  }
                }}
              />
              {isStreaming && (
                <span className="ml-1 flex h-2 w-2 animate-pulse rounded-full bg-green-500" />
              )}
            </div>

            {/* Refresh Button */}
            <Button
              onClick={fetchLogs}
              disabled={loading || isStreaming}
              variant="outline"
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold">{stats.total24h}</p>
                <p className="text-xs text-muted-foreground">Total (24h)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-red-600">
                  {Object.entries(stats.levelCounts)
                    .filter(([k]) => k.includes('error') || k.includes('fail'))
                    .reduce((sum, [, v]) => sum + v, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-yellow-600">
                  {Object.entries(stats.levelCounts)
                    .filter(([k]) => k.includes('warn'))
                    .reduce((sum, [, v]) => sum + v, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-blue-600">
                  {Object.entries(stats.levelCounts)
                    .filter(([k]) => k.includes('api') || k.includes('request'))
                    .reduce((sum, [, v]) => sum + v, 0)}
                </p>
                <p className="text-xs text-muted-foreground">API Calls</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-gray-600">{total}</p>
                <p className="text-xs text-muted-foreground">Total Logs</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Search */}
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setOffset(0)
                  }}
                  className="pl-9"
                />
              </div>

              {/* Tenant Filter */}
              <div className="w-[180px]">
                <Label className="mb-1 block text-xs text-muted-foreground">
                  Tenant
                </Label>
                <Select
                  value={tenantFilter}
                  onChange={(e) => {
                    setTenantFilter(e.target.value)
                    setOffset(0)
                  }}
                >
                  <SelectOption value="">All Tenants</SelectOption>
                  {tenants.map((tenant) => (
                    <SelectOption key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectOption>
                  ))}
                </Select>
              </div>

              {/* Level Filter */}
              <div className="w-[140px]">
                <Label className="mb-1 block text-xs text-muted-foreground">
                  Level
                </Label>
                <Select
                  value={levelFilter}
                  onChange={(e) => {
                    setLevelFilter(e.target.value)
                    setOffset(0)
                  }}
                >
                  <SelectOption value="">All Levels</SelectOption>
                  <SelectOption value="error">Error</SelectOption>
                  <SelectOption value="warn">Warning</SelectOption>
                  <SelectOption value="info">Info</SelectOption>
                  <SelectOption value="debug">Debug</SelectOption>
                </Select>
              </div>

              {/* Date Range */}
              <div className="flex items-end gap-2">
                <div className="w-[160px]">
                  <Label className="mb-1 block text-xs text-muted-foreground">
                    <Calendar className="mr-1 inline h-3 w-3" />
                    From
                  </Label>
                  <Input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setOffset(0)
                    }}
                    className="text-sm"
                  />
                </div>
                <div className="w-[160px]">
                  <Label className="mb-1 block text-xs text-muted-foreground">
                    To
                  </Label>
                  <Input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setOffset(0)
                    }}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Log List */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="border-b py-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {isStreaming ? (
                  <span className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-green-500" />
                    Streaming Logs ({streamingLogs.length})
                  </span>
                ) : (
                  `Logs (${displayLogs.length} of ${total})`
                )}
              </h2>
              {isStreaming && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStreamingLogs([])}
                >
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <div className="h-[calc(100%-3.5rem)] overflow-auto">
            {loading && !isStreaming ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayLogs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {hasFilters ? 'No logs match your filters' : 'No logs found'}
              </div>
            ) : (
              <div className="divide-y divide-border font-mono text-sm">
                {displayLogs.map((log) => {
                  const isExpanded = expandedLogs.has(log.id)
                  return (
                    <div
                      key={log.id}
                      className={cn(
                        'transition-colors hover:bg-muted/50',
                        log.level === 'error' && 'bg-red-50/50 dark:bg-red-950/20',
                        log.level === 'warn' &&
                          'bg-yellow-50/50 dark:bg-yellow-950/20'
                      )}
                    >
                      {/* Log Row */}
                      <div
                        className="flex cursor-pointer items-start gap-3 px-4 py-2"
                        onClick={() => toggleLogExpansion(log.id)}
                      >
                        {/* Expand Icon */}
                        <button className="mt-0.5 flex-shrink-0 text-muted-foreground">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>

                        {/* Level Icon */}
                        <div className="flex-shrink-0 pt-0.5">
                          {getLevelIcon(log.level)}
                        </div>

                        {/* Timestamp */}
                        <div className="w-[140px] flex-shrink-0 text-muted-foreground">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {formatTimestamp(log.timestamp)}
                        </div>

                        {/* Level Badge */}
                        <Badge
                          className={cn(
                            'w-[60px] flex-shrink-0 justify-center',
                            getLevelColor(log.level)
                          )}
                        >
                          {log.level.toUpperCase()}
                        </Badge>

                        {/* Tenant */}
                        <div className="w-[100px] flex-shrink-0 truncate text-muted-foreground">
                          {log.tenantName}
                        </div>

                        {/* Message */}
                        <div className="min-w-0 flex-1 truncate">
                          {log.message}
                        </div>

                        {/* Service */}
                        <div className="w-[80px] flex-shrink-0 text-right text-muted-foreground">
                          {log.service}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/30 px-4 py-3">
                          <div className="grid gap-3 text-sm md:grid-cols-2">
                            {/* Left Column - Basic Info */}
                            <div className="space-y-2">
                              <div>
                                <span className="text-muted-foreground">
                                  Log ID:{' '}
                                </span>
                                <span className="select-all">{log.id}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Timestamp:{' '}
                                </span>
                                <span>{new Date(log.timestamp).toISOString()}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Action:{' '}
                                </span>
                                <span>{log.action}</span>
                              </div>
                              {log.tenantId && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Tenant ID:{' '}
                                  </span>
                                  <span className="select-all">{log.tenantId}</span>
                                </div>
                              )}
                              {log.userId && (
                                <div>
                                  <span className="text-muted-foreground">
                                    User:{' '}
                                  </span>
                                  <span>{log.userEmail || log.userId}</span>
                                </div>
                              )}
                              {log.traceId && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Trace ID:{' '}
                                  </span>
                                  <span className="select-all">{log.traceId}</span>
                                </div>
                              )}
                            </div>

                            {/* Right Column - Metadata */}
                            <div>
                              <span className="text-muted-foreground">
                                Metadata:
                              </span>
                              <pre className="mt-1 max-h-[200px] overflow-auto rounded bg-background p-2 text-xs">
                                {JSON.stringify(log.metadata, null, 2) || 'null'}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Pagination */}
        {!isStreaming && total > limit && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Error Aggregates Sidebar */}
      <div className="hidden w-80 flex-shrink-0 lg:block">
        <Card className="sticky top-0 h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Error Patterns</h2>
              <Badge variant="destructive" className="text-xs">
                {errorPatterns.reduce((sum, p) => sum + p.openCount, 0)} open
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Top error patterns in the last 24 hours
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            {errorPatterns.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No error patterns found
              </p>
            ) : (
              errorPatterns.map((pattern) => (
                <div
                  key={pattern.patternHash}
                  className="rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <Badge
                      className={cn(
                        'text-xs',
                        pattern.severity === 'p1' &&
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                        pattern.severity === 'p2' &&
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                        pattern.severity === 'p3' &&
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      )}
                    >
                      {pattern.severity.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {pattern.occurrenceCount}x
                    </span>
                  </div>
                  <p className="mb-1 line-clamp-2 text-sm font-medium">
                    {pattern.errorType}
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {pattern.message}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{pattern.affectedTenants} tenants</span>
                    <span>{formatRelativeTime(pattern.lastOccurrence)}</span>
                  </div>
                </div>
              ))
            )}

            {/* View All Link */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => (window.location.href = '/ops/errors')}
            >
              View All Errors
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
