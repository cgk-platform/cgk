/**
 * Activity Feed
 *
 * Recent activity timeline with staggered entrance animations.
 */

import { Card, CardContent, cn } from '@cgk-platform/ui'
import {
  ShoppingCart,
  UserPlus,
  CreditCard,
  Star,
  Package,
  Clock,
} from 'lucide-react'

export interface ActivityItem {
  id: string
  type: string
  description: string
  timestamp: string
}

interface ActivityFeedProps {
  items: ActivityItem[]
}

type IconType = typeof ShoppingCart

const typeIcons: Record<string, IconType> = {
  order: ShoppingCart,
  customer: UserPlus,
  payment: CreditCard,
  review: Star,
  shipment: Package,
}

const typeColors: Record<string, string> = {
  order: 'bg-gold/10 text-gold',
  customer: 'bg-info/10 text-info',
  payment: 'bg-success/10 text-success',
  review: 'bg-warning/10 text-warning',
  shipment: 'bg-primary/10 text-primary',
  default: 'bg-muted text-muted-foreground',
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card className="animate-fade-up" style={{ animationDelay: '200ms' }}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent Activity</h3>
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Last {items.length} events
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No recent activity</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Activity will appear here as events occur
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

            <ul className="space-y-3">
              {items.map((item, index) => {
                const Icon = typeIcons[item.type] ?? Clock
                const colorClass = typeColors[item.type] ?? typeColors.default

                return (
                  <li
                    key={item.id}
                    className="relative flex items-start gap-3 animate-fade-up"
                    style={{ animationDelay: `${250 + index * 50}ms` }}
                  >
                    {/* Icon with background */}
                    <div
                      className={cn(
                        'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ring-background',
                        colorClass
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm leading-tight">{item.description}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.timestamp}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ActivityFeedSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 h-5 w-28 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full animate-pulse bg-muted" />
              <div className="flex-1 space-y-1.5 pt-0.5">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
