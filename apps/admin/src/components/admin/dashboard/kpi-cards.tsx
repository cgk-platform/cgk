/**
 * KPI Cards
 *
 * Dashboard metrics cards with trend indicators and entrance animations.
 */

import { Card, CardContent, SkeletonStats, cn } from '@cgk-platform/ui'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export interface KpiData {
  revenueMtd: number
  revenueChange: number
  ordersToday: number
  ordersChange: number
  newCustomers: number
  customersChange: number
  activeSubscriptions: number
  subscriptionsChange: number
}

interface KpiCardsProps {
  data: KpiData
}

const cards = [
  {
    key: 'revenue' as const,
    label: 'Revenue MTD',
    icon: DollarSign,
    href: '/admin/commerce/orders',
    format: (v: number) => `$${v.toLocaleString()}`,
    valueKey: 'revenueMtd' as const,
    changeKey: 'revenueChange' as const,
    accent: 'gold' as const,
  },
  {
    key: 'orders' as const,
    label: 'Orders Today',
    icon: ShoppingCart,
    href: '/admin/commerce/orders',
    format: (v: number) => v.toLocaleString(),
    valueKey: 'ordersToday' as const,
    changeKey: 'ordersChange' as const,
    accent: 'navy' as const,
  },
  {
    key: 'customers' as const,
    label: 'New Customers',
    icon: Users,
    href: '/admin/commerce/customers',
    format: (v: number) => v.toLocaleString(),
    valueKey: 'newCustomers' as const,
    changeKey: 'customersChange' as const,
    accent: 'navy' as const,
  },
  {
    key: 'subscriptions' as const,
    label: 'Active Subscriptions',
    icon: RefreshCw,
    href: '/admin/commerce/subscriptions',
    format: (v: number) => v.toLocaleString(),
    valueKey: 'activeSubscriptions' as const,
    changeKey: 'subscriptionsChange' as const,
    accent: 'navy' as const,
  },
]

export function KpiCards({ data }: KpiCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const value = data[card.valueKey]
        const change = data[card.changeKey]
        const Icon = card.icon
        const isPositive = change >= 0
        const isGold = card.accent === 'gold'

        return (
          <Link
            key={card.key}
            href={card.href}
            className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
            style={{ animationDelay: `${index * 75}ms` }}
          >
            <Card
              className={cn(
                'relative overflow-hidden transition-all duration-normal',
                'hover:shadow-lg hover:-translate-y-0.5',
                'animate-fade-up',
                isGold && 'ring-1 ring-gold/20 bg-gradient-to-br from-gold/5 to-transparent'
              )}
              style={{ animationDelay: `${index * 75}ms` }}
            >
              {/* Accent border top */}
              <div
                className={cn(
                  'absolute inset-x-0 top-0 h-0.5',
                  isGold ? 'bg-gold' : 'bg-primary'
                )}
              />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </span>
                  <div
                    className={cn(
                      'rounded-lg p-2 transition-colors duration-fast',
                      isGold
                        ? 'bg-gold/10 text-gold group-hover:bg-gold/20'
                        : 'bg-primary/10 text-primary group-hover:bg-primary/20'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-bold tracking-tight">
                    {card.format(value)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <div
                    className={cn(
                      'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
                      isPositive
                        ? 'bg-success/10 text-success'
                        : 'bg-destructive/10 text-destructive'
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>
                      {isPositive ? '+' : ''}
                      {change}%
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">vs last period</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

export function KpiCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonStats key={i} />
      ))}
    </div>
  )
}
