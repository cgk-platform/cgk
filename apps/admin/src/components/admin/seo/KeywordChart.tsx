'use client'

import { Card, CardContent, CardHeader } from '@cgk/ui'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

import type { KeywordHistory, TrendStatus } from '@/lib/seo/types'

interface KeywordChartProps {
  keyword: string
  history: KeywordHistory[]
  trend: TrendStatus
}

export function KeywordChart({ keyword, history, trend }: KeywordChartProps) {
  // Calculate chart dimensions
  const width = 600
  const height = 200
  const padding = 40

  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Get position values (filter out nulls)
  const positions = history
    .filter((h) => h.position !== null)
    .map((h) => h.position as number)
    .reverse()

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-medium">{keyword}</h3>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No position data available</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate scale
  const minPosition = Math.min(...positions)
  const maxPosition = Math.max(...positions)
  const range = maxPosition - minPosition || 1

  // Generate points for the line
  const points = positions.map((pos, i) => {
    const x = (i / (positions.length - 1)) * chartWidth + padding
    // Invert Y because lower position is better
    const y = ((pos - minPosition) / range) * chartHeight + padding
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`

  // Get trend icon and color
  const TrendIcon = trend === 'improving' ? TrendingDown : trend === 'declining' ? TrendingUp : Minus
  const trendColor = trend === 'improving' ? 'text-green-500' : trend === 'declining' ? 'text-red-500' : 'text-gray-500'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <h3 className="font-medium">{keyword}</h3>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="h-4 w-4" />
          <span className="text-sm capitalize">{trend}</span>
        </div>
      </CardHeader>
      <CardContent>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
            <line
              key={i}
              x1={padding}
              y1={p * chartHeight + padding}
              x2={width - padding}
              y2={p * chartHeight + padding}
              stroke="currentColor"
              strokeOpacity={0.1}
            />
          ))}

          {/* Y-axis labels */}
          <text
            x={padding - 10}
            y={padding}
            textAnchor="end"
            alignmentBaseline="middle"
            className="fill-muted-foreground text-xs"
          >
            {Math.round(minPosition)}
          </text>
          <text
            x={padding - 10}
            y={height - padding}
            textAnchor="end"
            alignmentBaseline="middle"
            className="fill-muted-foreground text-xs"
          >
            {Math.round(maxPosition)}
          </text>

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-primary"
          />

          {/* Points */}
          {positions.map((pos, i) => {
            const x = (i / (positions.length - 1)) * chartWidth + padding
            const y = ((pos - minPosition) / range) * chartHeight + padding
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={3}
                className="fill-primary"
              />
            )
          })}
        </svg>

        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{history[history.length - 1]?.recorded_at || ''}</span>
          <span>{history[0]?.recorded_at || ''}</span>
        </div>
      </CardContent>
    </Card>
  )
}

interface TrendBadgeProps {
  trend: TrendStatus
  change: number | null
}

export function TrendBadge({ trend, change }: TrendBadgeProps) {
  const Icon = trend === 'improving' ? TrendingDown : trend === 'declining' ? TrendingUp : Minus
  const color = trend === 'improving' ? 'text-green-600 bg-green-50' :
                trend === 'declining' ? 'text-red-600 bg-red-50' :
                'text-gray-600 bg-gray-50'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {change !== null && (
        <span>{change > 0 ? '+' : ''}{change.toFixed(1)}</span>
      )}
    </span>
  )
}
