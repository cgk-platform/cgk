'use client'

/**
 * Theme Preview Component
 *
 * Live preview of portal theme settings for admin customization.
 * Shows a miniature portal interface with all theme changes applied.
 */

import { cn } from '@cgk-platform/ui'
import { usePortalTheme } from './PortalThemeProvider'
import { PortalIcon } from './PortalIcon'

interface ThemePreviewProps {
  className?: string
  scale?: number
}

/**
 * Theme Preview Component
 *
 * Renders a scaled-down preview of the portal with live theme updates.
 */
export function ThemePreview({
  className,
  scale = 0.6,
}: ThemePreviewProps): React.ReactElement {
  // Theme values are applied via CSS variables
  usePortalTheme()

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border shadow-lg',
        'border-[hsl(var(--portal-border))]',
        'bg-[hsl(var(--portal-card))]',
        className
      )}
    >
      {/* Preview header */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--portal-border))] px-4 py-2">
        <span className="text-sm font-medium text-[hsl(var(--portal-foreground))]">
          Live Preview
        </span>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="h-2 w-2 rounded-full bg-yellow-400" />
          <span className="h-2 w-2 rounded-full bg-green-400" />
        </div>
      </div>

      {/* Preview content - scaled portal mockup */}
      <div
        className="relative origin-top-left"
        style={{
          transform: `scale(${scale})`,
          width: `${100 / scale}%`,
          height: `${600 / scale}px`,
        }}
      >
        <div className="portal-shell" style={{ minHeight: '100%' }}>
          {/* Sidebar */}
          <PreviewSidebar />

          {/* Main content */}
          <div className="flex flex-1 flex-col">
            {/* Header */}
            <PreviewHeader />

            {/* Content area */}
            <div className="portal-content p-6">
              <PreviewDashboard />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Preview sidebar component
 */
function PreviewSidebar(): React.ReactElement {
  const { theme } = usePortalTheme()
  const { sidebar } = theme

  const navItems = [
    { icon: 'dashboard', label: 'Dashboard', active: true },
    { icon: 'orders', label: 'Orders', active: false },
    { icon: 'subscriptions', label: 'Subscriptions', active: false },
    { icon: 'addresses', label: 'Addresses', active: false },
    { icon: 'profile', label: 'Profile', active: false },
  ]

  return (
    <aside
      className={cn(
        'portal-sidebar w-64',
        sidebar.style === 'floating' && 'portal-sidebar--floating',
        sidebar.style === 'attached' && 'portal-sidebar--attached'
      )}
    >
      {/* Logo placeholder */}
      <div className="mb-6 px-4">
        <div className="h-8 w-24 rounded bg-[hsl(var(--portal-muted))]" />
      </div>

      {/* Nav items */}
      <nav className="space-y-1">
        {navItems.map((item) => (
          <div
            key={item.icon}
            className={cn(
              'portal-nav-item',
              item.active && 'portal-nav-item--active'
            )}
          >
            {sidebar.showIcons && (
              <PortalIcon
                iconKey={item.icon}
                size={18}
                className={cn(
                  item.active
                    ? 'text-[hsl(var(--portal-sidebar-active-fg))]'
                    : 'text-[hsl(var(--portal-muted-foreground))]'
                )}
              />
            )}
            <span className="text-sm">{item.label}</span>
            {sidebar.activeIndicator === 'dot' && item.active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--portal-sidebar-active-bg))]" />
            )}
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className="mt-auto border-t border-[hsl(var(--portal-border))] pt-4">
        <div className="portal-nav-item opacity-60">
          <PortalIcon iconKey="signout" size={18} />
          <span className="text-sm">Sign Out</span>
        </div>
      </div>
    </aside>
  )
}

/**
 * Preview header component
 */
function PreviewHeader(): React.ReactElement {
  const { theme, isDarkMode } = usePortalTheme()
  const { header } = theme

  return (
    <header
      className={cn(
        'portal-header',
        header.showBorder && 'portal-header--bordered'
      )}
    >
      <div className="flex w-full items-center justify-between">
        {/* Left side - breadcrumb placeholder */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 rounded bg-[hsl(var(--portal-muted))]" />
          <span className="text-[hsl(var(--portal-muted-foreground))]">/</span>
          <div className="h-4 w-16 rounded bg-[hsl(var(--portal-muted))]" />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {header.showWelcome && (
            <span className="text-sm text-[hsl(var(--portal-muted-foreground))]">
              Welcome back, Alex
            </span>
          )}

          {theme.darkModeEnabled && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--portal-muted))]">
              <PortalIcon
                iconKey={isDarkMode ? 'sun' : 'moon'}
                size={16}
                className="text-[hsl(var(--portal-muted-foreground))]"
              />
            </div>
          )}

          {header.showAvatar && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--portal-primary))] text-xs font-medium text-[hsl(var(--portal-primary-foreground))]">
              AS
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

/**
 * Preview dashboard content
 */
function PreviewDashboard(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-semibold text-[hsl(var(--portal-foreground))]">
          My Account
        </h1>
        <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
          Manage your orders and account settings
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <PreviewStatCard
          icon="orders"
          label="Total Orders"
          value="12"
        />
        <PreviewStatCard
          icon="subscriptions"
          label="Active Subscriptions"
          value="2"
        />
        <PreviewStatCard
          icon="store_credit"
          label="Store Credit"
          value="$45.00"
        />
      </div>

      {/* Recent orders */}
      <div className="portal-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium text-[hsl(var(--portal-foreground))]">
            Recent Orders
          </h2>
          <button
            type="button"
            className="portal-button bg-[hsl(var(--portal-primary))] px-3 py-1.5 text-xs text-[hsl(var(--portal-primary-foreground))]"
          >
            View All
          </button>
        </div>

        <div className="space-y-3">
          <PreviewOrderRow
            orderId="#12345"
            date="Feb 8, 2026"
            status="Delivered"
            statusColor="success"
          />
          <PreviewOrderRow
            orderId="#12344"
            date="Feb 1, 2026"
            status="In Transit"
            statusColor="warning"
          />
          <PreviewOrderRow
            orderId="#12343"
            date="Jan 25, 2026"
            status="Processing"
            statusColor="default"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Preview stat card
 */
interface PreviewStatCardProps {
  icon: string
  label: string
  value: string
}

function PreviewStatCard({ icon, label, value }: PreviewStatCardProps): React.ReactElement {
  return (
    <div className="portal-card">
      <div className="mb-2 text-[hsl(var(--portal-muted-foreground))]">
        <PortalIcon iconKey={icon} size={20} />
      </div>
      <div className="text-xl font-semibold text-[hsl(var(--portal-foreground))]">
        {value}
      </div>
      <div className="text-xs text-[hsl(var(--portal-muted-foreground))]">
        {label}
      </div>
    </div>
  )
}

/**
 * Preview order row
 */
interface PreviewOrderRowProps {
  orderId: string
  date: string
  status: string
  statusColor: 'success' | 'warning' | 'default'
}

function PreviewOrderRow({
  orderId,
  date,
  status,
  statusColor,
}: PreviewOrderRowProps): React.ReactElement {
  const statusClasses = {
    success: 'bg-[hsl(var(--portal-success))] text-[hsl(var(--portal-success-foreground))]',
    warning: 'bg-[hsl(var(--portal-warning))] text-[hsl(var(--portal-warning-foreground))]',
    default: 'bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))]',
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--portal-border))] px-3 py-2">
      <div>
        <div className="text-sm font-medium text-[hsl(var(--portal-foreground))]">
          {orderId}
        </div>
        <div className="text-xs text-[hsl(var(--portal-muted-foreground))]">
          {date}
        </div>
      </div>
      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusClasses[statusColor])}>
        {status}
      </span>
    </div>
  )
}

/**
 * Compact theme preview for smaller spaces
 */
export function ThemePreviewCompact({
  className,
}: {
  className?: string
}): React.ReactElement {
  const { theme } = usePortalTheme()

  return (
    <div
      className={cn(
        'grid grid-cols-5 gap-2 rounded-lg border p-3',
        'border-[hsl(var(--portal-border))]',
        className
      )}
    >
      {/* Color swatches */}
      <div
        className="h-10 rounded"
        style={{ backgroundColor: theme.primaryColor }}
        title="Primary"
      />
      <div
        className="h-10 rounded"
        style={{ backgroundColor: theme.secondaryColor }}
        title="Secondary"
      />
      <div
        className="h-10 rounded"
        style={{ backgroundColor: theme.accentColor }}
        title="Accent"
      />
      <div
        className="h-10 rounded border border-[hsl(var(--portal-border))]"
        style={{ backgroundColor: theme.backgroundColor }}
        title="Background"
      />
      <div
        className="h-10 rounded border border-[hsl(var(--portal-border))]"
        style={{ backgroundColor: theme.cardBackgroundColor }}
        title="Card"
      />
    </div>
  )
}
