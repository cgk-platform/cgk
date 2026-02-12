/**
 * Account Layout
 *
 * Layout for the customer portal / account section.
 * Provides sidebar navigation and consistent styling.
 */

import type { ReactNode } from 'react'

interface AccountLayoutProps {
  children: ReactNode
}

/**
 * Navigation items for the account portal
 */
const NAV_ITEMS = [
  { href: '/account', label: 'Dashboard', icon: 'dashboard' },
  { href: '/account/orders', label: 'Orders', icon: 'orders' },
  { href: '/account/subscriptions', label: 'Subscriptions', icon: 'subscriptions' },
  { href: '/account/wishlist', label: 'Wishlist', icon: 'wishlist' },
  { href: '/account/addresses', label: 'Addresses', icon: 'addresses' },
  { href: '/account/profile', label: 'Profile', icon: 'profile' },
  { href: '/account/store-credit', label: 'Store Credit', icon: 'store_credit' },
] as const

/**
 * Icon component for navigation items
 */
function NavIcon({ name, className = '' }: { name: string; className?: string }): React.ReactElement {
  const iconClass = `h-5 w-5 ${className}`

  switch (name) {
    case 'dashboard':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    case 'orders':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    case 'subscriptions':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    case 'addresses':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    case 'profile':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    case 'store_credit':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    case 'wishlist':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      )
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
  }
}

export default function AccountLayout({ children }: AccountLayoutProps): React.ReactElement {
  return (
    <div className="container mx-auto px-4 py-8" style={{ maxWidth: 'var(--portal-max-width)' }}>
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        {/* Sidebar Navigation */}
        <aside className="lg:w-64 lg:shrink-0">
          <nav className="flex flex-row gap-2 overflow-x-auto pb-4 lg:flex-col lg:gap-1 lg:overflow-x-visible lg:pb-0">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="
                  flex items-center gap-3
                  whitespace-nowrap
                  rounded-lg
                  px-4 py-3
                  text-sm font-medium
                  transition-colors
                  hover:bg-[hsl(var(--portal-muted))]
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))]
                  [&.active]:bg-[hsl(var(--portal-primary))] [&.active]:text-[hsl(var(--portal-primary-foreground))]
                "
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          {/* Sign Out Link */}
          <div className="mt-4 border-t border-[hsl(var(--portal-border))] pt-4 lg:mt-8 lg:pt-8">
            <a
              href="/account/logout"
              className="
                flex items-center gap-3
                rounded-lg
                px-4 py-3
                text-sm font-medium
                text-[hsl(var(--portal-muted-foreground))]
                transition-colors
                hover:bg-[hsl(var(--portal-muted))]
                hover:text-[hsl(var(--portal-foreground))]
              "
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
