'use client'

import { Card, CardContent, cn } from '@cgk/ui'
import {
  TrendingUp,
  TrendingDown,
  Users,
  UserCheck,
  FileText,
  Clock,
  AlertTriangle,
  DollarSign,
} from 'lucide-react'
import Link from 'next/link'

import type { CreatorOverviewKPIs } from '@/lib/creators/analytics-types'

interface AnalyticsKPICardsProps {
  kpis: CreatorOverviewKPIs
}

interface KPIConfig {
  key: keyof CreatorOverviewKPIs
  label: string
  icon: React.ElementType
  format: (value: number) => string
  href?: string
  invertTrend?: boolean // For metrics where lower is better
}

const kpiConfigs: KPIConfig[] = [
  {
    key: 'totalCreators',
    label: 'Total Creators',
    icon: Users,
    format: (v) => v.toLocaleString(),
    href: '/admin/creators',
  },
  {
    key: 'activeCreators',
    label: 'Active Creators',
    icon: UserCheck,
    format: (v) => v.toLocaleString(),
    href: '/admin/creators?status=active',
  },
  {
    key: 'newApplicationsWeek',
    label: 'New Apps (Week)',
    icon: FileText,
    format: (v) => v.toLocaleString(),
    href: '/admin/creators/applications',
  },
  {
    key: 'approvalRate',
    label: 'Approval Rate',
    icon: UserCheck,
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: 'avgTimeToApproval',
    label: 'Avg Days to Approve',
    icon: Clock,
    format: (v) => `${v.toFixed(1)}d`,
    invertTrend: true,
  },
  {
    key: 'churnRate',
    label: 'Churn Rate (90d)',
    icon: AlertTriangle,
    format: (v) => `${v.toFixed(1)}%`,
    invertTrend: true,
  },
  {
    key: 'avgCreatorLTV',
    label: 'Avg Creator LTV',
    icon: DollarSign,
    format: (v) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
  },
]

export function AnalyticsKPICards({ kpis }: AnalyticsKPICardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpiConfigs.slice(0, 8).map((config) => {
        const kpi = kpis[config.key]
        const Icon = config.icon
        const isPositive = config.invertTrend
          ? kpi.changePercent <= 0
          : kpi.changePercent >= 0

        const content = (
          <Card className={cn('transition-shadow', config.href && 'hover:shadow-md cursor-pointer')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {config.label}
                </span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-bold">
                {config.format(kpi.value)}
              </div>
              {kpi.changePercent !== 0 && (
                <div className="mt-1 flex items-center gap-1 text-xs">
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={cn(isPositive ? 'text-emerald-500' : 'text-red-500')}>
                    {kpi.changePercent > 0 ? '+' : ''}{kpi.changePercent.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs prev period</span>
                </div>
              )}
            </CardContent>
          </Card>
        )

        if (config.href) {
          return (
            <Link key={config.key} href={config.href}>
              {content}
            </Link>
          )
        }

        return <div key={config.key}>{content}</div>
      })}
    </div>
  )
}

export function AnalyticsKPICardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-3 w-24 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
