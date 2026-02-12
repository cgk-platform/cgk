'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@cgk/ui'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

interface BreakdownItem {
  type: string
  totalCents: number
  percentage: number
}

interface EarningsBreakdownChartProps {
  data: BreakdownItem[]
}

// Color palette for breakdown segments
const COLORS = [
  'hsl(var(--primary))',
  'hsl(142 76% 36%)', // Green
  'hsl(217 91% 60%)', // Blue
  'hsl(45 93% 47%)', // Yellow
  'hsl(280 67% 52%)', // Purple
]

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
 * Format type label for display
 */
function formatTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    commission: 'Commissions',
    project: 'Projects',
    bonus: 'Bonuses',
    adjustment: 'Adjustments',
    refund: 'Refunds',
  }
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1)
}

interface CustomLegendPayloadItem {
  value: string
  color: string
}

interface CustomLegendProps {
  payload?: CustomLegendPayloadItem[]
}

function CustomLegend({ payload }: CustomLegendProps): React.JSX.Element | null {
  if (!payload) return null

  return (
    <ul className="flex flex-wrap justify-center gap-4">
      {payload.map((entry, index) => (
        <li key={`legend-${index}`} className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-muted-foreground">{entry.value}</span>
        </li>
      ))}
    </ul>
  )
}

interface TooltipPayloadItem {
  name: string
  value: number
  payload: {
    name: string
    value: number
    percentage: number
    totalCents: number
  }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps): React.JSX.Element | null {
  if (!active || !payload?.length || !payload[0]) return null

  const data = payload[0].payload

  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg">
      <p className="font-medium">{data.name}</p>
      <p className="text-lg font-bold">{formatCurrency(data.totalCents)}</p>
      <p className="text-sm text-muted-foreground">{data.percentage}% of total</p>
    </div>
  )
}

export function EarningsBreakdownChart({ data }: EarningsBreakdownChartProps): React.JSX.Element {
  // Filter out zero values and transform for chart
  const chartData = data
    .filter((d) => d.totalCents > 0)
    .map((d) => ({
      name: formatTypeLabel(d.type),
      value: d.totalCents / 100, // For chart proportions
      totalCents: d.totalCents,
      percentage: d.percentage,
    }))

  const totalEarnings = data.reduce((sum, d) => sum + d.totalCents, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Earnings Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No earnings data for this period
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">Total Earnings</p>
              <p className="text-2xl font-bold">{formatCurrency(totalEarnings)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
