'use client'

import { Card, CardContent, CardHeader, CardTitle, Badge, cn } from '@cgk/ui'
import { TrendingUp, TrendingDown, Minus, Star } from 'lucide-react'
import Link from 'next/link'

import type { LeaderboardEntry, PerformanceLeaderboard } from '@/lib/creators/analytics-types'

interface LeaderboardProps {
  leaderboard: PerformanceLeaderboard
  title?: string
  showTrend?: boolean
}

function getRankBadge(rank: number) {
  if (rank === 1) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <Star className="h-3.5 w-3.5 fill-current" />
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
        2
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
        3
      </span>
    )
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center text-sm text-muted-foreground">
      {rank}
    </span>
  )
}

function TrendIndicator({ trend }: { trend: LeaderboardEntry['trend'] }) {
  if (trend === 'up') {
    return <TrendingUp className="h-3 w-3 text-emerald-500" />
  }
  if (trend === 'down') {
    return <TrendingDown className="h-3 w-3 text-red-500" />
  }
  if (trend === 'new') {
    return <Badge variant="outline" className="text-[10px] px-1 py-0">NEW</Badge>
  }
  return <Minus className="h-3 w-3 text-muted-foreground" />
}

function LeaderboardRow({ entry, showTrend }: { entry: LeaderboardEntry; showTrend: boolean }) {
  return (
    <Link
      href={`/admin/creators/${entry.creatorId}`}
      className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
    >
      {getRankBadge(entry.rank)}

      {/* Avatar */}
      {entry.avatarUrl ? (
        <img
          src={entry.avatarUrl}
          alt={entry.creatorName}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {entry.creatorName.slice(0, 2).toUpperCase()}
        </div>
      )}

      {/* Name and tier */}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{entry.creatorName}</div>
        {entry.tier && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] capitalize',
              entry.tier === 'platinum' && 'border-violet-200 text-violet-600',
              entry.tier === 'gold' && 'border-amber-200 text-amber-600',
              entry.tier === 'silver' && 'border-slate-200 text-slate-600',
              entry.tier === 'bronze' && 'border-orange-200 text-orange-600'
            )}
          >
            {entry.tier}
          </Badge>
        )}
      </div>

      {/* Value */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{entry.formattedValue}</span>
        {showTrend && <TrendIndicator trend={entry.trend} />}
      </div>
    </Link>
  )
}

export function Leaderboard({ leaderboard, title, showTrend = true }: LeaderboardProps) {
  const metricLabels: Record<string, string> = {
    earnings: 'Top Earners',
    projects: 'Most Productive',
    response_time: 'Fastest Response',
    delivery_speed: 'Fastest Delivery',
    quality: 'Highest Quality',
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          {title || metricLabels[leaderboard.metric] || 'Leaderboard'}
          <span className="text-xs font-normal text-muted-foreground">
            {leaderboard.period === '7d'
              ? 'Last 7 days'
              : leaderboard.period === '30d'
                ? 'Last 30 days'
                : leaderboard.period === '90d'
                  ? 'Last 90 days'
                  : leaderboard.period === '12m'
                    ? 'Last 12 months'
                    : 'All time'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leaderboard.entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No data available for this period
          </div>
        ) : (
          <div className="space-y-1">
            {leaderboard.entries.map((entry) => (
              <LeaderboardRow key={entry.creatorId} entry={entry} showTrend={showTrend} />
            ))}
          </div>
        )}

        {leaderboard.totalCount > leaderboard.entries.length && (
          <div className="mt-3 border-t pt-3 text-center">
            <Link
              href="/admin/creators?sort=earnings&dir=desc"
              className="text-xs text-primary hover:underline"
            >
              View all {leaderboard.totalCount} creators
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function LeaderboardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
