'use client'

import { Card, CardContent, cn } from '@cgk-platform/ui'
import { DollarSign, ShoppingCart, TrendingDown, TrendingUp, Target, BarChart3 } from 'lucide-react'

import type { AttributionKPIs } from '@/lib/attribution'

interface KpiCardsProps {
  data: AttributionKPIs
}

const cards = [
  {
    key: 'revenue' as const,
    label: 'Attributed Revenue',
    icon: DollarSign,
    format: (v: number) => `$${v.toLocaleString()}`,
  },
  {
    key: 'conversions' as const,
    label: 'Conversions',
    icon: ShoppingCart,
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'roas' as const,
    label: 'ROAS',
    icon: Target,
    format: (v: number) => `${v.toFixed(2)}x`,
  },
  {
    key: 'mer' as const,
    label: 'MER',
    icon: BarChart3,
    format: (v: number) => `${v.toFixed(2)}x`,
  },
]

export function AttributionKpiCards({ data }: KpiCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const kpiData = data[card.key]
        const Icon = card.icon
        const isPositive = kpiData.change >= 0

        return (
          <Card key={card.key} className="transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-bold">{card.format(kpiData.value)}</div>
              <div className="mt-1 flex items-center gap-1 text-xs">
                {isPositive ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={cn(isPositive ? 'text-emerald-500' : 'text-red-500')}>
                  {isPositive ? '+' : ''}
                  {kpiData.change}%
                </span>
                <span className="text-muted-foreground">vs previous period</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function AttributionKpiCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-3 w-32 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
