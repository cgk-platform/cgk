'use client'

import { Card, CardContent, cn } from '@cgk/ui'
import { DollarSign, TrendingUp, Users } from 'lucide-react'

import type { AttributionBreakdown } from '@/lib/surveys'

interface AttributionBreakdownChartProps {
  data: AttributionBreakdown[]
}

// Channel colors mapped by attribution category
const categoryColors: Record<string, { bg: string; bar: string; text: string }> = {
  social: {
    bg: 'bg-pink-50',
    bar: 'bg-gradient-to-r from-pink-500 to-rose-500',
    text: 'text-pink-700',
  },
  search: {
    bg: 'bg-emerald-50',
    bar: 'bg-gradient-to-r from-emerald-500 to-green-500',
    text: 'text-emerald-700',
  },
  ads: {
    bg: 'bg-blue-50',
    bar: 'bg-gradient-to-r from-blue-500 to-blue-600',
    text: 'text-blue-700',
  },
  referral: {
    bg: 'bg-amber-50',
    bar: 'bg-gradient-to-r from-amber-500 to-orange-500',
    text: 'text-amber-700',
  },
  offline: {
    bg: 'bg-purple-50',
    bar: 'bg-gradient-to-r from-purple-500 to-violet-500',
    text: 'text-purple-700',
  },
  other: {
    bg: 'bg-gray-50',
    bar: 'bg-gradient-to-r from-gray-400 to-gray-500',
    text: 'text-gray-600',
  },
}

function getCategoryColors(category: string | null): { bg: string; bar: string; text: string } {
  return (
    categoryColors[category || 'other'] || {
      bg: 'bg-gray-50',
      bar: 'bg-gray-400',
      text: 'text-gray-600',
    }
  )
}

// Source label formatting
function formatSourceLabel(source: string): string {
  return source
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function AttributionBreakdownChart({ data }: AttributionBreakdownChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-[400px] items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <TrendingUp className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p className="text-sm">No attribution data yet</p>
            <p className="mt-1 text-xs">
              Data will appear here as customers complete surveys
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="border-b px-6 py-4">
          <h3 className="text-base font-semibold">Attribution Breakdown</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            How customers discovered your brand
          </p>
        </div>

        <div className="divide-y">
          {data.map((item, index) => {
            const colors = getCategoryColors(item.category)
            const barWidth = (item.count / maxCount) * 100

            return (
              <div
                key={item.source}
                className={cn(
                  'group relative px-6 py-4 transition-colors hover:bg-muted/30',
                  index === 0 && 'bg-muted/20'
                )}
              >
                {/* Rank indicator for top 3 */}
                {index < 3 && (
                  <div
                    className={cn(
                      'absolute left-0 top-0 h-full w-1',
                      index === 0 && 'bg-yellow-400',
                      index === 1 && 'bg-gray-400',
                      index === 2 && 'bg-amber-600'
                    )}
                  />
                )}

                <div className="flex items-center gap-4">
                  {/* Source badge */}
                  <div
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium',
                      colors.bg,
                      colors.text
                    )}
                  >
                    {formatSourceLabel(item.source)}
                  </div>

                  {/* Category tag */}
                  {item.category && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {item.category}
                    </span>
                  )}

                  {/* Stats */}
                  <div className="ml-auto flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="font-semibold text-foreground">{item.count}</span>
                      <span>({item.percentage.toFixed(1)}%)</span>
                    </div>
                    {item.revenue > 0 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold text-foreground">
                          ${item.revenue.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {item.avgOrderValue > 0 && (
                      <div className="w-20 text-right text-muted-foreground">
                        AOV:{' '}
                        <span className="font-medium text-foreground">
                          ${item.avgOrderValue.toFixed(0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500 ease-out',
                      colors.bar
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function AttributionBreakdownSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b px-6 py-4">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-muted" />
        </div>
        <div className="divide-y">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
                <div className="ml-auto flex gap-6">
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
              <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
