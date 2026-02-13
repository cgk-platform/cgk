'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@cgk-platform/ui'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface TrendDataPoint {
  period: string
  totalCents: number
  commissionsCents: number
  projectsCents: number
  bonusesCents: number
}

interface EarningsTrendChartProps {
  data: TrendDataPoint[]
  granularity: 'day' | 'week' | 'month'
}

/**
 * Format cents to currency string
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/**
 * Format period label based on granularity
 */
function formatPeriodLabel(period: string, granularity: string): string {
  const date = new Date(period)

  switch (granularity) {
    case 'day':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    case 'week':
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    case 'month':
    default:
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }
}

interface TooltipPayloadItem {
  value: number
  name: string
  color: string
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps): React.JSX.Element | null {
  if (!active || !payload?.length) return null

  const total = payload[0]?.value || 0

  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg">
      <p className="mb-2 text-sm font-medium">{label}</p>
      <p className="text-lg font-bold">{formatCurrency(total)}</p>
    </div>
  )
}

export function EarningsTrendChart({
  data,
  granularity,
}: EarningsTrendChartProps): React.JSX.Element {
  // Transform data for chart
  const chartData = data.map((d) => ({
    ...d,
    label: formatPeriodLabel(d.period, granularity),
    total: d.totalCents / 100, // Convert to dollars for display
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Earnings Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No earnings data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `$${value}`}
                className="fill-muted-foreground"
              />
              <Tooltip
                content={<CustomTooltip />}
                formatter={(value: number) => formatCurrency(value * 100)}
              />
              <Area
                type="monotone"
                dataKey="totalCents"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorTotal)"
                name="Total Earnings"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
