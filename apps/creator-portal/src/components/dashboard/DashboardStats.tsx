'use client'

import { Card, CardContent } from '@cgk/ui'

interface DashboardStatsProps {
  totalBalanceCents: number
  totalPendingCents: number
  totalLifetimeEarningsCents: number
  activeProjectsCount: number
  completedProjectsCount: number
  unreadMessagesCount: number
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

export function DashboardStats({
  totalBalanceCents,
  totalPendingCents,
  totalLifetimeEarningsCents,
  activeProjectsCount,
  completedProjectsCount,
  unreadMessagesCount,
}: DashboardStatsProps): React.JSX.Element {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Balance - Primary stat */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-green-500" />
        <CardContent className="pt-6">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">
              Available Balance
            </span>
            <span className="mt-1 text-3xl font-bold text-green-600 dark:text-green-500">
              {formatCurrency(totalBalanceCents)}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(totalPendingCents)} pending
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Lifetime Earnings */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">
              Total Earned
            </span>
            <span className="mt-1 text-2xl font-bold">
              {formatCurrency(totalLifetimeEarningsCents)}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              All time earnings
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Active Projects */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">
              Active Projects
            </span>
            <span className="mt-1 text-2xl font-bold">{activeProjectsCount}</span>
            <span className="mt-1 text-xs text-muted-foreground">
              {completedProjectsCount} completed
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">
              Unread Messages
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-bold">{unreadMessagesCount}</span>
              {unreadMessagesCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                  !
                </span>
              )}
            </div>
            <span className="mt-1 text-xs text-muted-foreground">
              Check your inbox
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
