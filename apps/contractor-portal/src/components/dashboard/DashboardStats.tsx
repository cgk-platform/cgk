'use client'

import { Card, CardContent } from '@cgk-platform/ui'
import {
  DollarSign,
  Clock,
  FolderKanban,
  AlertCircle,
} from 'lucide-react'

import type { ContractorDashboardStats } from '@/lib/types'

interface DashboardStatsProps {
  stats: ContractorDashboardStats
}

/**
 * Format cents to currency string
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

/**
 * Dashboard statistics cards for contractor portal
 */
export function DashboardStats({ stats }: DashboardStatsProps): React.JSX.Element {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Pending Payout - Primary stat */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-success" />
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">
                Pending Payout
              </span>
              <span className="mt-1 text-3xl font-bold text-success">
                {formatCurrency(stats.pendingPayoutCents)}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                Ready to withdraw
              </span>
            </div>
            <div className="rounded-lg bg-success/10 p-2.5">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Earned */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">
                Total Earned
              </span>
              <span className="mt-1 text-2xl font-bold">
                {formatCurrency(stats.totalEarnedCents)}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                All time earnings
              </span>
            </div>
            <div className="rounded-lg bg-gold/10 p-2.5">
              <DollarSign className="h-5 w-5 text-gold" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Projects */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">
                Active Projects
              </span>
              <span className="mt-1 text-2xl font-bold">
                {stats.activeProjectsCount}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {stats.upcomingProjectsCount} upcoming
              </span>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Review / Revisions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">
                Pending Review
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold">{stats.pendingReviewCount}</span>
                {stats.revisionRequestedCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                    <AlertCircle className="h-3 w-3" />
                    {stats.revisionRequestedCount} revisions
                  </span>
                )}
              </div>
              <span className="mt-1 text-xs text-muted-foreground">
                Awaiting approval
              </span>
            </div>
            <div className="rounded-lg bg-muted p-2.5">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
