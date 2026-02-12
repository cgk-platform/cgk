'use client'

/**
 * Portal Shell Component
 *
 * Main layout shell for the customer portal.
 * Combines sidebar, header, and content area with responsive behavior.
 */

import { cn } from '@cgk/ui'
import { useState, useCallback, type ReactNode } from 'react'

import { PortalSidebar } from './PortalSidebar'
import { PortalHeader } from './PortalHeader'
import type { PortalNavItem } from '../types'

interface PortalShellProps {
  /** Main content */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
  /** Customer information for header */
  customer?: {
    firstName: string
    lastName?: string
    email: string
    avatarUrl?: string
  }
  /** Feature flags for navigation */
  featureFlags?: Record<string, boolean>
  /** Custom navigation items */
  navItems?: PortalNavItem[]
  /** Logo element */
  logo?: ReactNode
  /** Header actions */
  headerActions?: ReactNode
  /** Sidebar footer content */
  sidebarFooter?: ReactNode
  /** Breadcrumb elements */
  breadcrumbs?: ReactNode
  /** Whether to show the sign out link in sidebar */
  showSignOut?: boolean
}

/**
 * Portal Shell Component
 *
 * Provides the complete layout structure for portal pages.
 * Handles responsive behavior and theme-aware styling.
 */
export function PortalShell({
  children,
  className,
  customer,
  featureFlags = {},
  navItems,
  logo,
  headerActions,
  sidebarFooter,
  breadcrumbs,
  showSignOut = true,
}: PortalShellProps): React.ReactElement {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleMenuToggle = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev)
  }, [])

  const handleMenuClose = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  // Build sidebar footer with sign out
  const sidebarFooterContent = showSignOut ? (
    <div className="space-y-2">
      {sidebarFooter}
      <SignOutLink />
    </div>
  ) : (
    sidebarFooter
  )

  return (
    <div className={cn('portal-shell', className)}>
      {/* Sidebar */}
      <PortalSidebar
        featureFlags={featureFlags}
        navItems={navItems}
        logo={logo}
        footer={sidebarFooterContent}
        isOpen={isMobileMenuOpen}
        onOpenChange={handleMenuClose}
      />

      {/* Main area */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header */}
        <PortalHeader
          customerFirstName={customer?.firstName}
          customerName={
            customer
              ? [customer.firstName, customer.lastName].filter(Boolean).join(' ')
              : undefined
          }
          avatarUrl={customer?.avatarUrl}
          logo={logo}
          breadcrumbs={breadcrumbs}
          actions={headerActions}
          onMenuToggle={handleMenuToggle}
          isMenuOpen={isMobileMenuOpen}
        />

        {/* Content */}
        <main className="portal-content flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

/**
 * Sign out link component
 */
function SignOutLink(): React.ReactElement {
  return (
    <a
      href="/account/logout"
      className={cn(
        'flex items-center gap-3 rounded-lg px-4 py-3',
        'text-sm font-medium',
        'text-[hsl(var(--portal-muted-foreground))]',
        'transition-colors',
        'hover:bg-[hsl(var(--portal-muted))]',
        'hover:text-[hsl(var(--portal-foreground))]'
      )}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      <span>Sign Out</span>
    </a>
  )
}

/**
 * Portal Section component for organizing content
 */
interface PortalSectionProps {
  children: ReactNode
  className?: string
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Actions for the section header */
  actions?: ReactNode
}

export function PortalSection({
  children,
  className,
  title,
  description,
  actions,
}: PortalSectionProps): React.ReactElement {
  return (
    <section className={cn('portal-section', className)}>
      {(title || description || actions) && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-[hsl(var(--portal-foreground))]">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

/**
 * Portal Card component with theme-aware styling
 */
interface PortalCardProps {
  children: ReactNode
  className?: string
  /** Card variant */
  variant?: 'elevated' | 'outlined' | 'flat'
  /** Whether card is clickable */
  clickable?: boolean
  /** Click handler */
  onClick?: () => void
  /** Card padding */
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

export function PortalCard({
  children,
  className,
  variant = 'elevated',
  clickable = false,
  onClick,
  padding = 'md',
}: PortalCardProps): React.ReactElement {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-7',
  }

  const Component = clickable ? 'button' : 'div'

  return (
    <Component
      className={cn(
        'portal-card',
        variant === 'outlined' && 'portal-card--outlined',
        variant === 'flat' && 'portal-card--flat',
        clickable && 'cursor-pointer text-left w-full',
        paddingClasses[padding],
        className
      )}
      onClick={clickable ? onClick : undefined}
      type={clickable ? 'button' : undefined}
    >
      {children}
    </Component>
  )
}

/**
 * Portal Grid component for card layouts
 */
interface PortalGridProps {
  children: ReactNode
  className?: string
  /** Number of columns on different breakpoints */
  columns?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
}

export function PortalGrid({
  children,
  className,
  columns = { default: 1, md: 2, lg: 3 },
}: PortalGridProps): React.ReactElement {
  const columnClasses = [
    columns.default && `grid-cols-${columns.default}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cn(
        'grid gap-[var(--portal-card-gap)]',
        columnClasses,
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Portal Empty State component
 */
interface PortalEmptyStateProps {
  /** Icon key from portal icon set */
  iconKey?: string
  /** Title text */
  title: string
  /** Description text */
  description?: string
  /** Action button */
  action?: ReactNode
  /** Additional CSS classes */
  className?: string
}

export function PortalEmptyState({
  iconKey: _iconKey = 'empty_box',
  title,
  description,
  action,
  className,
}: PortalEmptyStateProps): React.ReactElement {
  return (
    <div className={cn('portal-empty-state', className)}>
      <div className="portal-empty-state-icon">
        <svg
          className="h-12 w-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-[hsl(var(--portal-foreground))]">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[hsl(var(--portal-muted-foreground))]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/**
 * Portal Loading component
 */
interface PortalLoadingProps {
  /** Loading text */
  text?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

export function PortalLoading({
  text = 'Loading...',
  size = 'md',
  className,
}: PortalLoadingProps): React.ReactElement {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <div className={cn('portal-loading', className)}>
      <svg
        className={cn('animate-spin', sizeClasses[size])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text && <span className="text-sm">{text}</span>}
    </div>
  )
}
