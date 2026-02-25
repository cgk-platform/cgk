'use client'

import { cn } from '@cgk-platform/ui'

interface BarData {
  label: string
  value: number
  detail?: string
}

interface CostBarChartProps {
  title: string
  bars: BarData[]
  formatValue?: (v: number) => string
}

export function CostBarChart({ title, bars, formatValue }: CostBarChartProps) {
  const max = Math.max(...bars.map((b) => b.value), 0.01)
  const format = formatValue || ((v) => `$${v.toFixed(2)}`)

  if (bars.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-1.5">
        {bars.map((bar) => {
          const pct = max > 0 ? (bar.value / max) * 100 : 0
          return (
            <div key={bar.label} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="max-w-40 truncate font-mono text-muted-foreground" title={bar.label}>
                  {bar.label}
                </span>
                <span className={cn('font-medium', bar.value > 0 ? 'text-gold' : 'text-muted-foreground')}>
                  {format(bar.value)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-gold/70 transition-all duration-normal"
                  style={{ width: `${Math.max(pct, 0.5)}%` }}
                />
              </div>
              {bar.detail && (
                <span className="text-2xs text-muted-foreground">{bar.detail}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
