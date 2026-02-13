'use client'

import { Spinner } from '@cgk-platform/ui'
import { useCallback, useEffect, useState } from 'react'

import {
  EarningsBreakdownChart,
  EarningsTrendChart,
  ExportActions,
  MetricsCards,
  PeriodSelector,
  TaxSummaryCard,
  type PeriodOption,
} from '@/components/analytics'

/**
 * API response types
 */
interface EarningsData {
  period: {
    type: string
    start: string
    end: string
  }
  summary: {
    totalEarnedCents: number
    totalWithdrawnCents: number
    pendingCommissionsCents: number
    avgPerMonthCents: number
    bestMonthCents: number
    bestMonthDate: string | null
    transactionCount: number
  }
  balance: {
    availableCents: number
    pendingCents: number
    lifetimeCents: number
  }
  breakdown: {
    commissions: number
    projects: number
    bonuses: number
    adjustments: number
  }
}

interface TrendsData {
  period: {
    type: string
    start: string
    end: string
    granularity: 'day' | 'week' | 'month'
  }
  trend: Array<{
    period: string
    totalCents: number
    commissionsCents: number
    projectsCents: number
    bonusesCents: number
    transactionCount: number
  }>
  comparison: {
    currentPeriodCents: number
    previousPeriodCents: number
    changePercent: number
    direction: 'up' | 'down' | 'flat'
  }
  performance: {
    totalOrders: number
    totalSalesCents: number
    avgOrderValueCents: number
  }
}

interface BreakdownData {
  byType: Array<{
    type: string
    totalCents: number
    transactionCount: number
    percentage: number
  }>
  byBrand: Array<{
    brandId: string
    brandName: string
    balanceCents: number
    pendingCents: number
    lifetimeEarningsCents: number
    activeProjects: number
  }>
  monthly: Array<{
    month: string
    earningsCents: number
    withdrawalsCents: number
  }>
  topPromoCodes: Array<{
    code: string
    orderCount: number
    totalSalesCents: number
    commissionCents: number
  }>
}

interface TaxData {
  year: number
  ytd: {
    totalEarnedCents: number
    commissionsCents: number
    projectsCents: number
    bonusesCents: number
  }
  threshold1099Cents: number
  meetsThreshold: boolean
  progressToThreshold: number
  w9: {
    status: string
    submittedAt: string | null
    needsSubmission: boolean
    taxIdLastFour: string | null
    taxClassification: string | null
  }
  annualSummaries: Array<{
    year: number
    totalEarnedCents: number
    requires1099: boolean
    form1099Status: string
  }>
  quarterlyBreakdown: Array<{
    quarter: string
    totalCents: number
  }>
}

export default function AnalyticsPage(): React.JSX.Element {
  const [period, setPeriod] = useState<PeriodOption>('year')
  const [customDates, setCustomDates] = useState<{ start?: string; end?: string }>({})

  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null)
  const [taxData, setTaxData] = useState<TaxData | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Build query params for API calls
   */
  const buildQueryParams = useCallback((): string => {
    const params = new URLSearchParams({ period })
    if (period === 'custom' && customDates.start && customDates.end) {
      params.set('startDate', customDates.start)
      params.set('endDate', customDates.end)
    }
    return params.toString()
  }, [period, customDates])

  /**
   * Fetch all analytics data
   */
  const fetchData = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    const queryParams = buildQueryParams()

    try {
      const [earningsRes, trendsRes, breakdownRes, taxRes] = await Promise.all([
        fetch(`/api/creator/analytics/earnings?${queryParams}`),
        fetch(`/api/creator/analytics/trends?${queryParams}`),
        fetch(`/api/creator/analytics/breakdown?${queryParams}`),
        fetch('/api/creator/tax/summary'),
      ])

      if (!earningsRes.ok || !trendsRes.ok || !breakdownRes.ok || !taxRes.ok) {
        if (earningsRes.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error('Failed to load analytics data')
      }

      const [earningsData, trendsData, breakdownData, taxDataResponse] = await Promise.all([
        earningsRes.json(),
        trendsRes.json(),
        breakdownRes.json(),
        taxRes.json(),
      ])

      setEarnings(earningsData)
      setTrends(trendsData)
      setBreakdown(breakdownData)
      setTaxData(taxDataResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [buildQueryParams])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /**
   * Handle period change
   */
  const handlePeriodChange = (
    newPeriod: PeriodOption,
    startDate?: string,
    endDate?: string
  ): void => {
    setPeriod(newPeriod)
    if (newPeriod === 'custom' && startDate && endDate) {
      setCustomDates({ start: startDate, end: endDate })
    } else {
      setCustomDates({})
    }
  }

  /**
   * Export transactions as CSV
   */
  const handleExportTransactions = async (): Promise<void> => {
    try {
      const response = await fetch('/api/creator/export/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: customDates.start,
          endDate: customDates.end,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to export transactions')
      }

      // Download the CSV
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export transactions. Please try again.')
    }
  }

  /**
   * Export annual summary
   */
  const handleExportAnnualSummary = async (year: number): Promise<void> => {
    try {
      const response = await fetch('/api/creator/export/annual-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()

      // For now, download as JSON (can be enhanced to PDF later)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `annual-summary-${year}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to generate annual summary. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <button
          type="button"
          onClick={() => fetchData()}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Track your earnings, performance, and tax information
        </p>
      </div>

      {/* Period Selector */}
      <PeriodSelector value={period} onChange={handlePeriodChange} />

      {/* Metrics Cards */}
      {earnings && trends && (
        <MetricsCards
          totalEarnedCents={earnings.summary.totalEarnedCents}
          avgPerMonthCents={earnings.summary.avgPerMonthCents}
          bestMonthCents={earnings.summary.bestMonthCents}
          bestMonthDate={earnings.summary.bestMonthDate}
          pendingCents={earnings.balance.pendingCents}
          availableCents={earnings.balance.availableCents}
          changePercent={trends.comparison.changePercent}
        />
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend Chart */}
        {trends && (
          <EarningsTrendChart data={trends.trend} granularity={trends.period.granularity} />
        )}

        {/* Breakdown Chart */}
        {breakdown && <EarningsBreakdownChart data={breakdown.byType} />}
      </div>

      {/* Commission Performance (if applicable) */}
      {trends && trends.performance.totalOrders > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Commission Performance</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{trends.performance.totalOrders}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Sales Attributed</p>
              <p className="text-2xl font-bold">
                ${(trends.performance.totalSalesCents / 100).toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              <p className="text-2xl font-bold">
                ${(trends.performance.avgOrderValueCents / 100).toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Promo Codes */}
      {breakdown && breakdown.topPromoCodes.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Top Promo Codes</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Code</th>
                  <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Orders</th>
                  <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Sales</th>
                  <th className="pb-3 text-sm font-medium text-muted-foreground">Commission</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.topPromoCodes.map((code) => (
                  <tr key={code.code} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-mono text-sm">{code.code}</td>
                    <td className="py-3 pr-4">{code.orderCount}</td>
                    <td className="py-3 pr-4">${(code.totalSalesCents / 100).toFixed(0)}</td>
                    <td className="py-3">${(code.commissionCents / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tax Summary */}
      {taxData && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Tax Information</h2>
          <TaxSummaryCard data={taxData} onDownloadSummary={handleExportAnnualSummary} />
        </div>
      )}

      {/* Export Actions */}
      <ExportActions
        onExportTransactions={handleExportTransactions}
        onExportAnnualSummary={handleExportAnnualSummary}
      />
    </div>
  )
}
