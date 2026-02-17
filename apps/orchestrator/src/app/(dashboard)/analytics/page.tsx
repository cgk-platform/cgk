'use client'

import {
  Card,
  CardContent,
  cn,
  formatCompact,
  formatCurrency,
  formatPercent,
  Skeleton,
} from '@cgk-platform/ui'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DollarSign,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type { PlatformAnalytics, TenantRevenue, TimeSeriesDataPoint } from '../../../types/platform'

// Date range presets
const DATE_PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
] as const

/**
 * Analytics Page
 *
 * Platform-wide analytics dashboard showing GMV trends, revenue by tenant,
 * order volume, and customer metrics.
 */
export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDays, setSelectedDays] = useState(30)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchAnalytics = useCallback(async (days: number, refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })

      const response = await fetch(`/api/platform/analytics?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const result = await response.json()
      setAnalytics(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics(selectedDays)
  }, [fetchAnalytics, selectedDays])

  const handleDateRangeChange = (days: number) => {
    setSelectedDays(days)
  }

  const handleRefresh = () => {
    fetchAnalytics(selectedDays, true)
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Platform-wide analytics and performance metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date range selector */}
          <div className="flex rounded-lg border bg-card p-1">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.days}
                onClick={() => handleDateRangeChange(preset.days)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  selectedDays === preset.days
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium',
              'transition-colors hover:bg-accent',
              isRefreshing && 'opacity-50'
            )}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && <AnalyticsSkeleton />}

      {/* Analytics content */}
      {!isLoading && analytics && (
        <>
          {/* Summary KPIs */}
          <section>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Summary
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <MetricCard
                title="Total GMV"
                value={formatCurrency(analytics.totals.gmvCents / 100)}
                change={analytics.growth.momGmvChange}
                changeLabel="vs previous period"
                icon={<DollarSign className="h-4 w-4" />}
              />
              <MetricCard
                title="Orders"
                value={formatCompact(analytics.totals.orderCount)}
                change={analytics.growth.momOrderChange}
                changeLabel="vs previous period"
                icon={<ShoppingCart className="h-4 w-4" />}
              />
              <MetricCard
                title="Customers"
                value={formatCompact(analytics.customerMetrics.totalCustomers)}
                change={analytics.growth.momCustomerChange}
                changeLabel="vs previous period"
                icon={<Users className="h-4 w-4" />}
              />
              <MetricCard
                title="Avg Order Value"
                value={formatCurrency(analytics.customerMetrics.aovCents / 100)}
                change={
                  analytics.customerMetrics.previousAovCents > 0
                    ? ((analytics.customerMetrics.aovCents -
                        analytics.customerMetrics.previousAovCents) /
                        analytics.customerMetrics.previousAovCents) *
                      100
                    : 0
                }
                changeLabel="vs previous period"
                icon={<TrendingUp className="h-4 w-4" />}
              />
            </div>
          </section>

          {/* GMV Trend Chart */}
          <section>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              GMV Trend
            </h2>
            <Card>
              <CardContent className="pt-6">
                <SimpleBarChart data={analytics.timeSeries} />
              </CardContent>
            </Card>
          </section>

          {/* Two column layout: Revenue by Tenant + Customer Breakdown */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Revenue by Tenant */}
            <section>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Top Tenants by Revenue
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <TenantRevenueTable tenants={analytics.tenantRevenue} />
                </CardContent>
              </Card>
            </section>

            {/* Customer Metrics */}
            <section>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Customer Metrics
              </h2>
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">Total Customers</p>
                        <p className="text-sm text-muted-foreground">All time</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">
                      {formatCompact(analytics.customerMetrics.totalCustomers)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-success/10 p-2 text-success">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">New Customers</p>
                        <p className="text-sm text-muted-foreground">This period</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">
                      {formatCompact(analytics.customerMetrics.newCustomers)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-info/10 p-2 text-info">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">Returning Customers</p>
                        <p className="text-sm text-muted-foreground">Multiple purchases</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">
                      {formatCompact(analytics.customerMetrics.returningCustomers)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-gold/10 p-2 text-gold">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">Average Order Value</p>
                        <p className="text-sm text-muted-foreground">This period</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(analytics.customerMetrics.aovCents / 100)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface MetricCardProps {
  title: string
  value: string
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
}

function MetricCard({ title, value, change, changeLabel, icon }: MetricCardProps) {
  const hasChange = change !== undefined && change !== 0
  const isPositiveChange = change !== undefined && change > 0

  return (
    <Card className="relative overflow-hidden p-4 transition-all duration-normal hover:shadow-lg hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
        {icon && <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>}
      </div>

      {hasChange && (
        <div className="mt-2 flex items-center gap-1.5">
          <div
            className={cn(
              'flex items-center gap-0.5 rounded-full px-1.5 py-0.5',
              isPositiveChange ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            )}
          >
            {isPositiveChange ? (
              <ArrowUpIcon className="h-3 w-3" />
            ) : (
              <ArrowDownIcon className="h-3 w-3" />
            )}
            <span className="text-xs font-medium">{formatPercent(Math.abs(change) / 100)}</span>
          </div>
          {changeLabel && <span className="text-xs text-muted-foreground">{changeLabel}</span>}
        </div>
      )}
    </Card>
  )
}

interface SimpleBarChartProps {
  data: TimeSeriesDataPoint[]
}

function SimpleBarChart({ data }: SimpleBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  const maxGmv = Math.max(...data.map((d) => d.gmvCents), 1)

  // Show fewer bars on mobile
  const visibleData = data.length > 30 ? data.filter((_, i) => i % 2 === 0) : data

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="flex h-48 items-end gap-1">
        {visibleData.map((point) => {
          const height = (point.gmvCents / maxGmv) * 100

          return (
            <div
              key={point.date}
              className="group relative flex-1 min-w-[4px]"
              style={{ height: '100%' }}
            >
              <div
                className={cn(
                  'absolute bottom-0 w-full rounded-t transition-all duration-fast',
                  'bg-primary hover:bg-primary/80'
                )}
                style={{ height: `${Math.max(height, 2)}%` }}
              />

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 group-hover:block">
                <div className="whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background shadow-lg">
                  <p className="font-medium">{formatCurrency(point.gmvCents / 100)}</p>
                  <p className="text-background/70">{formatDate(point.date)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatDate(data[0]?.date || '')}</span>
        <span>{formatDate(data[data.length - 1]?.date || '')}</span>
      </div>
    </div>
  )
}

interface TenantRevenueTableProps {
  tenants: TenantRevenue[]
}

function TenantRevenueTable({ tenants }: TenantRevenueTableProps) {
  if (tenants.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        No tenant data available
      </div>
    )
  }

  const maxGmv = Math.max(...tenants.map((t) => t.gmvCents), 1)

  return (
    <div className="space-y-3">
      {tenants.map((tenant, index) => {
        const widthPercent = (tenant.gmvCents / maxGmv) * 100

        return (
          <div key={tenant.slug} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">#{index + 1}</span>
                <span className="font-medium">{tenant.name}</span>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>{formatCompact(tenant.orderCount)} orders</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(tenant.gmvCents / 100)}
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-normal"
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Summary KPIs skeleton */}
      <section>
        <Skeleton className="mb-4 h-4 w-24" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="mb-2 h-3 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="mt-2 h-4 w-16" />
            </Card>
          ))}
        </div>
      </section>

      {/* Chart skeleton */}
      <section>
        <Skeleton className="mb-4 h-4 w-24" />
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </section>

      {/* Two column skeleton */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <Skeleton className="mb-4 h-4 w-32" />
          <Card>
            <CardContent className="space-y-4 pt-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section>
          <Skeleton className="mb-4 h-4 w-32" />
          <Card>
            <CardContent className="space-y-4 pt-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="mt-1 h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

// ============================================================================
// Utilities
// ============================================================================

function formatDate(dateStr: string): string {
  if (!dateStr) return ''

  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}
