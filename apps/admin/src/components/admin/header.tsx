'use client'

import { Menu, Search, Bell } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { TenantSwitcher, useHasMultipleTenants } from '@cgk/ui'

interface HeaderProps {
  tenantName: string
  onMenuToggle: () => void
}

export function Header({ tenantName, onMenuToggle }: HeaderProps) {
  const pathname = usePathname()
  const breadcrumbs = buildBreadcrumbs(pathname)

  // Check if user has multiple tenants (will be false if TenantProvider not present)
  let hasMultiple = false
  try {
    hasMultiple = useHasMultipleTenants()
  } catch {
    // TenantProvider not present, show static tenant name
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground">/</span>}
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Tenant switcher or static tenant name */}
      {hasMultiple ? (
        <TenantSwitcher variant="compact" />
      ) : (
        <span className="hidden text-sm text-muted-foreground lg:block">{tenantName}</span>
      )}

      {/* Search trigger */}
      <button
        className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Search (Cmd+K)"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Notifications */}
      <button className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
        <Bell className="h-4 w-4" />
      </button>
    </header>
  )
}

interface Breadcrumb {
  label: string
  href: string
}

const LABEL_MAP: Record<string, string> = {
  admin: 'Dashboard',
  content: 'Content',
  commerce: 'Commerce',
  attribution: 'Attribution',
  creators: 'Creators',
  finance: 'Finance',
  operations: 'Operations',
  settings: 'Settings',
  general: 'General',
  domains: 'Domains',
  shopify: 'Shopify',
  payments: 'Payments',
  team: 'Team',
  integrations: 'Integrations',
  blog: 'Blog',
  pages: 'Landing Pages',
  seo: 'SEO',
  brand: 'Brand Context',
  orders: 'Orders',
  customers: 'Customers',
  subscriptions: 'Subscriptions',
  reviews: 'Reviews',
  'ab-tests': 'A/B Tests',
  promotions: 'Promotions',
  channels: 'Channels',
  journeys: 'Journeys',
  insights: 'AI Insights',
  applications: 'Applications',
  pipeline: 'Pipeline',
  inbox: 'Inbox',
  payouts: 'Payouts',
  treasury: 'Treasury',
  expenses: 'Expenses',
  tax: 'Tax / 1099',
  errors: 'Errors',
  health: 'Health',
}

function buildBreadcrumbs(pathname: string): Breadcrumb[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Breadcrumb[] = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!
    const href = '/' + segments.slice(0, i + 1).join('/')
    const label = LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    crumbs.push({ label, href })
  }

  return crumbs
}
