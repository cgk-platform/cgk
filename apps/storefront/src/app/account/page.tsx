/**
 * Account Dashboard Page
 *
 * Main landing page for the customer portal.
 * Shows overview cards for orders, subscriptions, credit, etc.
 */

import type { Metadata } from 'next'

import { defaultContent, getContent } from '@/lib/account/content'

export const metadata: Metadata = {
  title: 'My Account',
  description: 'Manage your account, orders, and subscriptions',
}

export const dynamic = 'force-dynamic'

/**
 * Dashboard card data
 */
const DASHBOARD_CARDS = [
  {
    title: 'Orders',
    description: 'View order history and track shipments',
    href: '/account/orders',
    icon: 'orders',
    stat: null,
  },
  {
    title: 'Subscriptions',
    description: 'Manage your recurring orders',
    href: '/account/subscriptions',
    icon: 'subscriptions',
    stat: null,
  },
  {
    title: 'Wishlist',
    description: 'View your saved items',
    href: '/account/wishlist',
    icon: 'wishlist',
    stat: null,
  },
  {
    title: 'Addresses',
    description: 'Manage delivery addresses',
    href: '/account/addresses',
    icon: 'addresses',
    stat: null,
  },
  {
    title: 'Profile',
    description: 'Update your account information',
    href: '/account/profile',
    icon: 'profile',
    stat: null,
  },
  {
    title: 'Store Credit',
    description: 'View your store credit balance',
    href: '/account/store-credit',
    icon: 'store_credit',
    stat: null,
  },
] as const

/**
 * Icon component for dashboard cards
 */
function CardIcon({ name, className = '' }: { name: string; className?: string }): React.ReactElement {
  const iconClass = `h-10 w-10 ${className}`

  switch (name) {
    case 'orders':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    case 'subscriptions':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    case 'addresses':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    case 'profile':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    case 'store_credit':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    case 'wishlist':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      )
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
  }
}

export default function AccountDashboardPage(): React.ReactElement {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl" style={{ fontFamily: 'var(--portal-heading-font)' }}>
          {getContent(defaultContent, 'dashboard.title')}
        </h1>
        <p className="mt-2 text-[hsl(var(--portal-muted-foreground))]">
          {getContent(defaultContent, 'dashboard.welcome')}
        </p>
      </div>

      {/* Dashboard Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DASHBOARD_CARDS.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="
              group
              flex flex-col
              rounded-[var(--portal-card-radius)]
              border border-[hsl(var(--portal-border))]
              bg-[hsl(var(--portal-card))]
              p-[var(--portal-card-padding)]
              transition-all duration-200
              hover:border-[hsl(var(--portal-primary))]
              hover:shadow-md
              focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))]
            "
          >
            <div className="flex items-start justify-between">
              <div className="text-[hsl(var(--portal-primary))] opacity-80 transition-opacity group-hover:opacity-100">
                <CardIcon name={card.icon} />
              </div>
              {card.stat && (
                <span className="rounded-full bg-[hsl(var(--portal-primary))] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--portal-primary-foreground))]">
                  {card.stat}
                </span>
              )}
            </div>
            <h2 className="mt-4 text-lg font-semibold">{card.title}</h2>
            <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
              {card.description}
            </p>
            <div className="mt-4 flex items-center text-sm font-medium text-[hsl(var(--portal-primary))]">
              <span>View {card.title.toLowerCase()}</span>
              <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
        ))}
      </div>

      {/* Recent Orders Section */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--portal-heading-font)' }}>
            {getContent(defaultContent, 'dashboard.recent_orders')}
          </h2>
          <a
            href="/account/orders"
            className="text-sm font-medium text-[hsl(var(--portal-primary))] hover:underline"
          >
            {getContent(defaultContent, 'dashboard.view_all')}
          </a>
        </div>

        {/* Empty State */}
        <div className="mt-4 rounded-[var(--portal-card-radius)] border border-dashed border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]/30 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-[hsl(var(--portal-muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="mt-4 text-sm font-medium">No orders yet</h3>
          <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
            When you place an order, it will appear here.
          </p>
          <a
            href="/products"
            className="
              mt-4
              inline-flex items-center justify-center
              rounded-[var(--portal-button-radius)]
              bg-[hsl(var(--portal-primary))]
              px-4 py-2
              text-sm font-medium
              text-[hsl(var(--portal-primary-foreground))]
              transition-colors
              hover:bg-[hsl(var(--portal-primary))]/90
              focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))] focus:ring-offset-2
            "
          >
            Start Shopping
          </a>
        </div>
      </section>
    </div>
  )
}
