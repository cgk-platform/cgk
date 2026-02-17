'use client'

import { Button, Card, CardContent, CardHeader, cn, Skeleton, StatusDot } from '@cgk-platform/ui'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  RefreshCw,
  XCircle,
  HelpCircle,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

interface BrandHealthData {
  id: string
  name: string
  slug: string
  status: string
  overallHealth: HealthStatus
  healthScore: number
  serviceStatuses: Record<string, HealthStatus>
  issueCount: number
  lastCheckedAt: string | null
  commonIssues: string[]
}

interface CommonIssue {
  issue: string
  count: number
  affectedBrands: string[]
}

interface HealthSummary {
  total: number
  healthy: number
  degraded: number
  unhealthy: number
  unknown: number
  averageHealthScore: number
}

interface HealthResponse {
  brands: BrandHealthData[]
  summary: HealthSummary
  commonIssues: CommonIssue[]
  checkedAt: string
}

/**
 * Brands Health Overview page
 *
 * Displays aggregated health metrics and issues across all brands.
 * Allows quick triage and drill-down to specific brand details.
 */
export default function BrandsHealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<HealthStatus | 'all'>('all')

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      params.set('sortBy', 'health')
      params.set('sortOrder', 'asc')

      const response = await fetch(`/api/platform/brands/health?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else if (response.status === 403) {
        setError('Super admin access required')
      } else {
        setError('Failed to fetch health data')
      }
    } catch (err) {
      console.error('Failed to fetch brand health:', err)
      setError('Failed to fetch health data')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchHealth()
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchHealth, 120000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  const getHealthIcon = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-success" />
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-warning" />
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-destructive" />
      default:
        return <HelpCircle className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getHealthBgClass = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return 'bg-success/10 border-success/20'
      case 'degraded':
        return 'bg-warning/10 border-warning/20'
      case 'unhealthy':
        return 'bg-destructive/10 border-destructive/20'
      default:
        return 'bg-muted border-muted'
    }
  }

  const filteredBrands = data?.brands || []

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader onRefresh={fetchHealth} loading={loading} />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-destructive/50" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">{error}</p>
            <Button onClick={fetchHealth} variant="outline" className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        onRefresh={fetchHealth}
        loading={loading}
        lastChecked={data?.checkedAt}
      />

      {/* Summary Cards */}
      {loading && !data ? (
        <SummarySkeleton />
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            label="Total Brands"
            value={data.summary.total}
            icon={<Activity className="h-5 w-5" />}
            variant="default"
          />
          <SummaryCard
            label="Healthy"
            value={data.summary.healthy}
            icon={<CheckCircle className="h-5 w-5" />}
            variant="success"
            onClick={() => setStatusFilter(statusFilter === 'healthy' ? 'all' : 'healthy')}
            active={statusFilter === 'healthy'}
          />
          <SummaryCard
            label="Degraded"
            value={data.summary.degraded}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant="warning"
            onClick={() => setStatusFilter(statusFilter === 'degraded' ? 'all' : 'degraded')}
            active={statusFilter === 'degraded'}
          />
          <SummaryCard
            label="Unhealthy"
            value={data.summary.unhealthy}
            icon={<XCircle className="h-5 w-5" />}
            variant="destructive"
            onClick={() => setStatusFilter(statusFilter === 'unhealthy' ? 'all' : 'unhealthy')}
            active={statusFilter === 'unhealthy'}
          />
          <SummaryCard
            label="Avg Score"
            value={data.summary.averageHealthScore}
            suffix="%"
            icon={
              data.summary.averageHealthScore >= 80 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )
            }
            variant={
              data.summary.averageHealthScore >= 80
                ? 'success'
                : data.summary.averageHealthScore >= 50
                  ? 'warning'
                  : 'destructive'
            }
          />
        </div>
      ) : null}

      {/* Common Issues */}
      {data && data.commonIssues.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Common Issues</h2>
              <span className="text-sm text-muted-foreground">
                {data.commonIssues.length} issue type{data.commonIssues.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.commonIssues.slice(0, 5).map((issue, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <div>
                      <p className="text-sm font-medium">{issue.issue}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Affecting: {issue.affectedBrands.slice(0, 3).join(', ')}
                        {issue.affectedBrands.length > 3 &&
                          ` +${issue.affectedBrands.length - 3} more`}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {issue.count} occurrence{issue.count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border bg-muted p-1">
          {(['all', 'healthy', 'degraded', 'unhealthy', 'unknown'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                statusFilter === status
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {status}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredBrands.length} brand{filteredBrands.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Brands Grid */}
      {loading && !data ? (
        <BrandsGridSkeleton />
      ) : filteredBrands.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              {statusFilter === 'all'
                ? 'No brands found'
                : `No ${statusFilter} brands`}
            </p>
            {statusFilter !== 'all' && (
              <Button
                onClick={() => setStatusFilter('all')}
                variant="outline"
                className="mt-4"
              >
                Show all brands
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBrands.map((brand) => (
            <Link key={brand.id} href={`/brands/${brand.id}`}>
              <Card
                className={cn(
                  'group cursor-pointer transition-all duration-normal hover:-translate-y-0.5 hover:shadow-lg',
                  getHealthBgClass(brand.overallHealth)
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background text-sm font-bold shadow-sm">
                        {brand.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{brand.name}</p>
                          <StatusDot
                            status={
                              brand.overallHealth === 'unhealthy'
                                ? 'critical'
                                : brand.overallHealth === 'degraded'
                                  ? 'degraded'
                                  : 'healthy'
                            }
                            size="sm"
                            animate={brand.overallHealth === 'healthy'}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{brand.slug}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        {getHealthIcon(brand.overallHealth)}
                        <span className="text-sm font-medium capitalize">
                          {brand.overallHealth}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Score: <span className="font-medium">{brand.healthScore}%</span>
                      </div>
                    </div>
                    {brand.issueCount > 0 && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        {brand.issueCount} issue{brand.issueCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Service status indicators */}
                  {Object.keys(brand.serviceStatuses).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Object.entries(brand.serviceStatuses).slice(0, 5).map(([service, status]) => (
                        <span
                          key={service}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                            status === 'healthy' && 'bg-success/10 text-success',
                            status === 'degraded' && 'bg-warning/10 text-warning',
                            status === 'unhealthy' && 'bg-destructive/10 text-destructive',
                            status === 'unknown' && 'bg-muted text-muted-foreground'
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              status === 'healthy' && 'bg-success',
                              status === 'degraded' && 'bg-warning',
                              status === 'unhealthy' && 'bg-destructive',
                              status === 'unknown' && 'bg-muted-foreground'
                            )}
                          />
                          {formatServiceName(service)}
                        </span>
                      ))}
                      {Object.keys(brand.serviceStatuses).length > 5 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          +{Object.keys(brand.serviceStatuses).length - 5}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Common issues preview */}
                  {brand.commonIssues.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Issues
                      </p>
                      <div className="mt-1 space-y-1">
                        {brand.commonIssues.slice(0, 2).map((issue, idx) => (
                          <p key={idx} className="truncate text-xs text-muted-foreground">
                            {issue}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Last checked */}
                  {brand.lastCheckedAt && (
                    <p className="mt-3 text-[10px] text-muted-foreground">
                      Last checked: {formatRelativeTime(brand.lastCheckedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function PageHeader({
  onRefresh,
  loading,
  lastChecked,
}: {
  onRefresh: () => void
  loading: boolean
  lastChecked?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brand Health</h1>
        <p className="text-muted-foreground">
          Monitor health status across all platform brands.
        </p>
      </div>
      <div className="flex items-center gap-4">
        {lastChecked && (
          <p className="text-sm text-muted-foreground">
            Updated: {new Date(lastChecked).toLocaleTimeString()}
          </p>
        )}
        <Link href="/ops/health">
          <Button variant="outline" size="sm">
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Health Matrix
          </Button>
        </Link>
        <Button onClick={onRefresh} disabled={loading} variant="outline">
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  suffix,
  icon,
  variant,
  onClick,
  active,
}: {
  label: string
  value: number
  suffix?: string
  icon: React.ReactNode
  variant: 'default' | 'success' | 'warning' | 'destructive'
  onClick?: () => void
  active?: boolean
}) {
  return (
    <Card
      className={cn(
        'transition-all duration-normal',
        onClick && 'cursor-pointer hover:shadow-md',
        active && 'ring-2 ring-primary',
        variant === 'success' && 'border-success/30',
        variant === 'warning' && 'border-warning/30',
        variant === 'destructive' && 'border-destructive/30'
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">
            {value}
            {suffix}
          </p>
        </div>
        <div
          className={cn(
            'rounded-full p-2',
            variant === 'default' && 'bg-muted text-muted-foreground',
            variant === 'success' && 'bg-success/10 text-success',
            variant === 'warning' && 'bg-warning/10 text-warning',
            variant === 'destructive' && 'bg-destructive/10 text-destructive'
          )}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function SummarySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function BrandsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="mt-3 flex gap-1.5">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function formatServiceName(service: string): string {
  return service.charAt(0).toUpperCase() + service.slice(1)
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffSec < 60) {
    return 'just now'
  } else if (diffMin < 60) {
    return `${diffMin}m ago`
  } else if (diffHour < 24) {
    return `${diffHour}h ago`
  } else {
    return date.toLocaleDateString()
  }
}
