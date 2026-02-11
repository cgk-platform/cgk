import { Card, CardContent, Badge } from '@cgk/ui'
import { AlertTriangle, CreditCard, AlertCircle } from 'lucide-react'
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
    variant: 'warning' as const,
  },
  {
    key: 'failedPayouts' as const,
    label: 'Failed Payouts',
    icon: CreditCard,
    href: '/admin/finance/payouts',
    variant: 'destructive' as const,
  },
  {
    key: 'unresolvedErrors' as const,
    label: 'Unresolved Errors',
    icon: AlertCircle,
    href: '/admin/operations/errors',
    variant: 'destructive' as const,
  },
]

export function Escalations({ data }: EscalationsProps) {
  const hasEscalations = Object.values(data).some((v) => v > 0)

  if (!hasEscalations) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium">Escalations</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No items requiring attention.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-sm font-medium">Requires Attention</h3>
        <ul className="space-y-3">
          {escalationItems.map((item) => {
            const count = data[item.key]
            if (count === 0) return null
            const Icon = item.icon
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{item.label}</span>
                  <Badge variant={item.variant}>{count}</Badge>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

export function EscalationsSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-5 w-8 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
