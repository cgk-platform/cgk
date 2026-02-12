'use client'

import { Card, CardContent, CardHeader, CardTitle, Badge, Progress, cn } from '@cgk/ui'
import { AlertTriangle, CheckCircle, Minus, XCircle, Users } from 'lucide-react'
import Link from 'next/link'

import type { CreatorHealthDashboard, HealthCategory, HealthScore } from '@/lib/creators/analytics-types'

interface HealthDashboardProps {
  health: CreatorHealthDashboard
}

const categoryConfig: Record<HealthCategory, { label: string; color: string; icon: React.ElementType }> = {
  champions: {
    label: 'Champions',
    color: 'text-emerald-600 bg-emerald-100',
    icon: CheckCircle,
  },
  healthy: {
    label: 'Healthy',
    color: 'text-blue-600 bg-blue-100',
    icon: CheckCircle,
  },
  at_risk: {
    label: 'At Risk',
    color: 'text-amber-600 bg-amber-100',
    icon: AlertTriangle,
  },
  inactive: {
    label: 'Inactive',
    color: 'text-slate-600 bg-slate-100',
    icon: Minus,
  },
  churned: {
    label: 'Churned',
    color: 'text-red-600 bg-red-100',
    icon: XCircle,
  },
}

function HealthDistributionChart({ distribution }: { distribution: Record<HealthCategory, number> }) {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)
  const categories: HealthCategory[] = ['champions', 'healthy', 'at_risk', 'inactive', 'churned']

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const config = categoryConfig[cat]
        const count = distribution[cat]
        const percent = total > 0 ? (count / total) * 100 : 0
        const Icon = config.icon

        return (
          <div key={cat} className="flex items-center gap-3">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', config.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{config.label}</span>
                <span className="text-muted-foreground">
                  {count} ({percent.toFixed(0)}%)
                </span>
              </div>
              <Progress value={percent} className="h-2" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AtRiskCreatorRow({ creator }: { creator: HealthScore }) {
  return (
    <Link
      href={`/admin/creators/${creator.creatorId}`}
      className="flex items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted/50"
    >
      {creator.avatarUrl ? (
        <img
          src={creator.avatarUrl}
          alt={creator.creatorName}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700">
          {creator.creatorName.slice(0, 2).toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{creator.creatorName}</div>
        <div className="truncate text-xs text-muted-foreground">{creator.email}</div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <Badge variant="outline" className="text-amber-600 border-amber-200">
          Score: {creator.score}
        </Badge>
        {creator.indicators.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {creator.indicators[0]}
          </span>
        )}
      </div>
    </Link>
  )
}

function PendingActionsCard({ pendingActions }: { pendingActions: CreatorHealthDashboard['pendingActions'] }) {
  const items = [
    { label: 'Onboarding Incomplete', count: pendingActions.onboardingIncomplete, href: '/admin/creators?status=onboarding' },
    { label: 'Tax Forms Missing', count: pendingActions.taxFormsMissing, href: '/admin/creators?filter=tax_missing' },
    { label: 'Payout Setup Missing', count: pendingActions.payoutSetupMissing, href: '/admin/creators?filter=payout_missing' },
  ]

  const hasActions = items.some((item) => item.count > 0)

  if (!hasActions) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pending Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
            All caught up!
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Pending Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items
            .filter((item) => item.count > 0)
            .map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <span className="text-sm">{item.label}</span>
                <Badge variant="secondary">{item.count}</Badge>
              </Link>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function HealthDashboard({ health }: HealthDashboardProps) {
  const total = Object.values(health.distribution).reduce((sum, count) => sum + count, 0)

  return (
    <div className="space-y-6">
      {/* Distribution overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Creator Health Distribution
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {total} total creators
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HealthDistributionChart distribution={health.distribution} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* At-risk creators */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              At-Risk Creators
              {health.atRiskCreators.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {health.atRiskCreators.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health.atRiskCreators.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No at-risk creators identified
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {health.atRiskCreators.slice(0, 10).map((creator) => (
                  <AtRiskCreatorRow key={creator.creatorId} creator={creator} />
                ))}
                {health.atRiskCreators.length > 10 && (
                  <Link
                    href="/admin/creators?health=at_risk"
                    className="block pt-2 text-center text-xs text-primary hover:underline"
                  >
                    View all {health.atRiskCreators.length} at-risk creators
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending actions */}
        <PendingActionsCard pendingActions={health.pendingActions} />
      </div>

      {/* Churn prediction */}
      {health.churnPrediction.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Churn Prediction (Next 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {health.churnPrediction.map((pred) => (
                <Link
                  key={pred.creatorId}
                  href={`/admin/creators/${pred.creatorId}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-muted/50"
                >
                  <span className="text-sm font-medium">{pred.creatorName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {pred.factors.slice(0, 2).join(', ')}
                    </span>
                    <Badge variant="destructive">{pred.probability}%</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function HealthDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="mb-1 flex justify-between">
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
