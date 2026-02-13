/**
 * Escalations Card
 *
 * Shows items requiring immediate attention with animated indicators.
 */

import { Card, CardContent, StatusBadge, SkeletonList, cn } from '@cgk-platform/ui'
import { AlertTriangle, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export interface EscalationData {
  pendingReviews: number
  failedPayouts: number
  unresolvedErrors: number
}

interface EscalationsProps {
  data: EscalationData
}

const escalationItems = [
  {
    key: 'pendingReviews' as const,
    label: 'Pending Reviews',
    icon: AlertTriangle,
    href: '/admin/commerce/reviews',
    status: 'pending' as const,
  },
  {
    key: 'failedPayouts' as const,
    label: 'Failed Payouts',
    icon: CreditCard,
    href: '/admin/finance/payouts',
    status: 'failed' as const,
  },
  {
    key: 'unresolvedErrors' as const,
    label: 'Unresolved Errors',
    icon: AlertCircle,
    href: '/admin/operations/errors',
    status: 'error' as const,
  },
]

export function Escalations({ data }: EscalationsProps) {
  const hasEscalations = Object.values(data).some((v) => v > 0)

  return (
    <Card className="animate-fade-up" style={{ animationDelay: '150ms' }}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Requires Attention</h3>
          {!hasEscalations && (
            <span className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              All clear
            </span>
          )}
        </div>

        {!hasEscalations ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">
              No items requiring attention
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {escalationItems.map((item, index) => {
              const count = data[item.key]
              if (count === 0) return null
              const Icon = item.icon
              const isError = item.status === 'failed' || item.status === 'error'

              return (
                <li
                  key={item.key}
                  className="animate-fade-up"
                  style={{ animationDelay: `${200 + index * 50}ms` }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg p-3',
                      'transition-all duration-fast',
                      'hover:bg-muted',
                      isError && 'bg-destructive/5 hover:bg-destructive/10'
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-lg p-2',
                        isError
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-warning/10 text-warning'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    <StatusBadge status={item.status} label={String(count)} size="sm" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function EscalationsSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-muted" />
        <SkeletonList items={3} showAvatar={false} />
      </CardContent>
    </Card>
  )
}
