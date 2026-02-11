import { Card, CardContent, cn } from '@cgk/ui'
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
  },
  {
    key: 'orders' as const,
    label: 'Orders Today',
    icon: ShoppingCart,
    href: '/admin/commerce/orders',
    format: (v: number) => v.toLocaleString(),
    valueKey: 'ordersToday' as const,
    changeKey: 'ordersChange' as const,
  },
  {
    key: 'customers' as const,
    label: 'New Customers',
    icon: Users,
    href: '/admin/commerce/customers',
    format: (v: number) => v.toLocaleString(),
    valueKey: 'newCustomers' as const,
    changeKey: 'customersChange' as const,
  },
  {
    key: 'subscriptions' as const,
    label: 'Active Subscriptions',
    icon: RefreshCw,
    href: '/admin/commerce/subscriptions',
    format: (v: number) => v.toLocaleString(),
    valueKey: 'activeSubscriptions' as const,
    changeKey: 'subscriptionsChange' as const,
  },
]

export function KpiCards({ data }: KpiCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const value = data[card.valueKey]
        const change = data[card.changeKey]
        const Icon = card.icon
        const isPositive = change >= 0

        return (
          <Link key={card.key} href={card.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{card.label}</span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold">{card.format(value)}</div>
                <div className="mt-1 flex items-center gap-1 text-xs">
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={cn(isPositive ? 'text-emerald-500' : 'text-red-500')}>
                    {isPositive ? '+' : ''}{change}%
                  </span>
                  <span className="text-muted-foreground">vs last period</span>
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
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-3 w-32 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
