'use client'

import { Card, CardContent } from '@cgk-platform/ui'

/**
 * Format cents to currency string
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

/**
 * Format date to readable month/year
 */
function formatMonth(date: string | null): string {
  if (!date) return 'N/A'
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

interface MetricsCardsProps {
  totalEarnedCents: number
  avgPerMonthCents: number
  bestMonthCents: number
  bestMonthDate: string | null
  pendingCents: number
  availableCents: number
  changePercent?: number
}

export function MetricsCards({
  totalEarnedCents,
  avgPerMonthCents,
  bestMonthCents,
  bestMonthDate,
  pendingCents,
  availableCents,
  changePercent,
}: MetricsCardsProps): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Earnings */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
        <CardContent className="pt-6">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">Total Earnings</span>
            <span className="mt-1 text-3xl font-bold">{formatCurrency(totalEarnedCents)}</span>
            {changePercent !== undefined && changePercent !== 0 && (
              <span
                className={`mt-1 text-xs font-medium ${
                  changePercent > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {changePercent > 0 ? '+' : ''}
                {changePercent}% vs previous period
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Average per Month */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">Avg per Month</span>
            <span className="mt-1 text-2xl font-bold">{formatCurrency(avgPerMonthCents)}</span>
            <span className="mt-1 text-xs text-muted-foreground">Selected period</span>
          </div>
        </CardContent>
      </Card>

      {/* Best Month */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">Best Month</span>
            <span className="mt-1 text-2xl font-bold">{formatCurrency(bestMonthCents)}</span>
            <span className="mt-1 text-xs text-muted-foreground">
              {bestMonthDate ? formatMonth(bestMonthDate) : 'All time'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Pending & Available */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-green-500" />
        <CardContent className="pt-6">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">Available Balance</span>
            <span className="mt-1 text-2xl font-bold text-green-600 dark:text-green-500">
              {formatCurrency(availableCents)}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              + {formatCurrency(pendingCents)} pending
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
