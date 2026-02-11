'use client'

import { Card, CardContent, cn } from '@cgk/ui'
import {
  BarChart3,
  CheckCircle,
  Clock,
  MessageSquare,
} from 'lucide-react'

import type { SurveyStats } from '@/lib/surveys'

interface SurveyStatsCardsProps {
  stats: SurveyStats
}

export function SurveyStatsCards({ stats }: SurveyStatsCardsProps) {
  const cards = [
    {
      label: 'Total Responses',
      value: stats.totalResponses.toLocaleString(),
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: `${stats.completedResponses} completed`,
    },
    {
      label: 'Completion Rate',
      value: `${stats.completionRate.toFixed(1)}%`,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      description: `${stats.completedResponses} of ${stats.totalResponses}`,
    },
    {
      label: 'Avg. Completion Time',
      value: formatDuration(stats.avgCompletionTime),
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      description: 'From start to finish',
    },
    {
      label: 'Responses Today',
      value: (stats.responsesByDay[0]?.count || 0).toLocaleString(),
      icon: BarChart3,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      description: stats.responsesByDay[0]?.date || 'No data',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <Card
            key={card.label}
            className="group relative overflow-hidden transition-all hover:shadow-lg"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-muted/30" />

            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-bold tracking-tight">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </div>

                <div
                  className={cn(
                    'rounded-xl p-3 transition-transform group-hover:scale-110',
                    card.bgColor
                  )}
                >
                  <Icon className={cn('h-5 w-5', card.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${Math.round(seconds / 3600)}h`
}

export function SurveyStatsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-9 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-11 w-11 animate-pulse rounded-xl bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
