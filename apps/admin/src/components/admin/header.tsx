'use client'

import { SimpleBreadcrumbs, type BreadcrumbItemData } from '@cgk-platform/ui'
import { Menu, Search, Bell, Command } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { TenantSwitcher, useTenantOptional } from '@cgk-platform/ui'

interface HeaderProps {
  tenantName: string
  onMenuToggle: () => void
}

export function Header({ tenantName, onMenuToggle }: HeaderProps) {
  const tenantContext = useTenantOptional()
  const hasMultipleTenants = tenantContext?.hasMultipleTenants ?? false
  const pathname = usePathname()
  const breadcrumbItems = buildBreadcrumbItems(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/50 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:h-16 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs */}
      <div className="hidden md:block">
        <SimpleBreadcrumbs
          items={breadcrumbItems}
          homeHref="/admin"
          homeLabel="Dashboard"
          linkComponent={Link}
        />
      </div>

      {/* Mobile: Current page title */}
      <div className="flex-1 md:hidden">
        <h1 className="truncate text-sm font-medium">
          {breadcrumbItems[breadcrumbItems.length - 1]?.label || 'Dashboard'}
        </h1>
      </div>

      <div className="flex-1 hidden md:block" />

      {/* Tenant switcher or static tenant name */}
      {hasMultipleTenants ? (
        <TenantSwitcher variant="compact" />
      ) : (
        <span className="hidden text-sm text-muted-foreground lg:block">{tenantName}</span>
      )}

      {/* Search trigger */}
      <button
        className="group flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-all duration-fast hover:border-border hover:bg-muted hover:text-foreground"
        title="Search (Cmd+K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border/50 bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline-flex">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      {/* Notifications */}
      <button className="relative rounded-lg p-2 text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground">
        <Bell className="h-4 w-4" />
        {/* Notification dot - uncomment when notifications are implemented */}
        {/* <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold ring-2 ring-background" /> */}
      </button>
    </header>
  )
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
  commissions: 'Commissions',
  contractors: 'Contractors',
  esign: 'E-Sign',
  support: 'Support',
  tickets: 'Tickets',
  communications: 'Communications',
  credentials: 'Credentials',
}

function buildBreadcrumbItems(pathname: string): BreadcrumbItemData[] {
  const segments = pathname.split('/').filter(Boolean)
  const items: BreadcrumbItemData[] = []

  // Skip the first segment if it's 'admin' (it's the home)
  const startIndex = segments[0] === 'admin' ? 1 : 0

  for (let i = startIndex; i < segments.length; i++) {
    const segment = segments[i]!
    const href = '/' + segments.slice(0, i + 1).join('/')
    const label = LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    items.push({ label, href })
  }

  return items
}
