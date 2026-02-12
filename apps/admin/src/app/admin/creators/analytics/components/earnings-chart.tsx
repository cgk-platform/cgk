'use client'

import { Card, CardContent, CardHeader, CardTitle, cn } from '@cgk/ui'
import { DollarSign, TrendingUp, CreditCard, PiggyBank } from 'lucide-react'

import type { EarningsAnalytics } from '@/lib/creators/analytics-types'

interface EarningsChartProps {
  earnings: EarningsAnalytics
}

function StatCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string
  value: string
  icon: React.ElementType
  className?: string
}) {
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  )
}

function DistributionBar({ distribution }: { distribution: EarningsAnalytics['distribution'] }) {
  const maxCount = Math.max(...distribution.map((b) => b.count), 1)

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Earnings Distribution</div>
      {distribution.map((bracket) => (
        <div key={bracket.label} className="flex items-center gap-3">
          <div className="w-16 text-xs text-muted-foreground">{bracket.label}</div>
          <div className="flex-1">
            <div className="relative h-5 w-full overflow-hidden rounded bg-muted">
              <div
                className="absolute inset-y-0 left-0 bg-primary/70 transition-all"
                style={{ width: `${(bracket.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
          <div className="w-12 text-right text-xs">
            {bracket.count} <span className="text-muted-foreground">({bracket.percentage.toFixed(0)}%)</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function PayoutMethodBreakdown({
  breakdown,
}: {
  breakdown: EarningsAnalytics['payoutMethodBreakdown']
}) {
  const total = breakdown.reduce((sum, m) => sum + m.count, 0) || 1

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Payout Methods</div>
      <div className="flex gap-2">
        {breakdown.map((method) => {
          const percent = (method.count / total) * 100
          return (
            <div
              key={method.method}
              className="flex-1 rounded-lg border p-3 text-center"
            >
              <div className="text-lg font-bold">{percent.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">{method.method}</div>
              <div className="mt-1 text-xs">
                {method.count} creators
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SimpleLineChart({ data }: { data: EarningsAnalytics['timeSeries'] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No data available
      </div>
    )
  }

  const maxEarnings = Math.max(...data.map((d) => d.totalEarnings), 1)
  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * 100
    const y = 100 - (d.totalEarnings / maxEarnings) * 100
    return `${x},${y}`
  })

  return (
    <div className="relative h-40">
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0%"
            y1={`${y}%`}
            x2="100%"
            y2={`${y}%`}
            stroke="currentColor"
            strokeOpacity={0.1}
          />
        ))}

        {/* Area fill */}
        <polygon
          points={`0,100 ${points.join(' ')} 100,100`}
          fill="currentColor"
          fillOpacity={0.1}
          className="text-primary"
        />

        {/* Line */}
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-primary"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = (i / Math.max(data.length - 1, 1)) * 100
          const y = 100 - (d.totalEarnings / maxEarnings) * 100
          return (
            <circle
              key={i}
              cx={`${x}%`}
              cy={`${y}%`}
              r={3}
              fill="currentColor"
              className="text-primary"
            />
          )
        })}
      </svg>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 flex h-full flex-col justify-between text-[10px] text-muted-foreground">
        <span>${(maxEarnings / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        <span>$0</span>
      </div>
    </div>
  )
}

export function EarningsChart({ earnings }: EarningsChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Earnings Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total Payouts"
            value={`$${earnings.totalPayouts.toLocaleString()}`}
            icon={CreditCard}
          />
          <StatCard
            label="Total Pending"
            value={`$${earnings.totalPending.toLocaleString()}`}
            icon={PiggyBank}
          />
          <StatCard
            label="Avg per Creator"
            value={`$${earnings.avgEarningsPerCreator.toLocaleString()}`}
            icon={DollarSign}
          />
          <StatCard
            label="ROAS"
            value={`${earnings.roas.toFixed(1)}x`}
            icon={TrendingUp}
          />
        </div>

        {/* Time series chart */}
        <div>
          <div className="mb-2 text-sm font-medium">Earnings Over Time</div>
          <SimpleLineChart data={earnings.timeSeries} />
        </div>

        {/* Distribution */}
        <DistributionBar distribution={earnings.distribution} />

        {/* Payout methods */}
        <PayoutMethodBreakdown breakdown={earnings.payoutMethodBreakdown} />

        {/* Top creators share */}
        <div className="rounded-lg bg-muted/50 p-4 text-center">
          <div className="text-2xl font-bold">{earnings.topCreatorsShare}%</div>
          <div className="text-sm text-muted-foreground">
            of total earnings from top 10% of creators
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function EarningsChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-8 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="h-40 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  )
}
