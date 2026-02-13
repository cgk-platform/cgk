'use client'

import { FlaskConical, TrendingUp, Calendar, Users } from 'lucide-react'

import { Card, CardContent, cn } from '@cgk-platform/ui'

import type { ABTestQuickStatsData } from '@/lib/ab-tests/types'

interface QuickStatsProps {
  stats: ABTestQuickStatsData
}

export function ABTestQuickStats({ stats }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="ACTIVE TESTS"
        value={stats.activeCount}
        icon={<FlaskConical className="h-5 w-5" />}
        trend={stats.activeChange}
        iconBg="bg-cyan-50"
        iconColor="text-cyan-600"
      />
      <StatCard
        label="AVG. LIFT"
        value={`${stats.avgLift.toFixed(1)}%`}
        icon={<TrendingUp className="h-5 w-5" />}
        description="Winning variants"
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
      />
      <StatCard
        label="TESTS THIS MONTH"
        value={stats.monthlyCount}
        icon={<Calendar className="h-5 w-5" />}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
      />
      <StatCard
        label="TOTAL VISITORS"
        value={formatNumber(stats.totalVisitors)}
        icon={<Users className="h-5 w-5" />}
        description="Last 30 days"
        iconBg="bg-slate-100"
        iconColor="text-slate-600"
      />
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  description?: string
  iconBg: string
  iconColor: string
}

function StatCard({
  label,
  value,
  icon,
  trend,
  description,
  iconBg,
  iconColor,
}: StatCardProps) {
  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <p className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {value}
            </p>
            {trend !== undefined && trend !== 0 && (
              <p
                className={cn(
                  'text-xs font-medium',
                  trend > 0 ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {trend > 0 ? '+' : ''}
                {trend}% vs last period
              </p>
            )}
            {description && (
              <p className="text-xs text-slate-500">{description}</p>
            )}
          </div>
          <div className={cn('rounded-lg p-2.5', iconBg, iconColor)}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export function QuickStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="overflow-hidden border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-100" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toLocaleString()
}
