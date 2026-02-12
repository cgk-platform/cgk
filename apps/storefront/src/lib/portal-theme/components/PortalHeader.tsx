'use client'

/**
 * Portal Header Component
 *
 * Top navigation bar for the customer portal.
 * Supports multiple styles with theme-aware rendering.
 */

import { cn } from '@cgk/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { usePortalTheme } from './PortalThemeProvider'
import { PortalIcon } from './PortalIcon'
import { PortalSidebarTrigger } from './PortalSidebar'

interface PortalHeaderProps {
  /** Additional CSS classes */
  className?: string
  /** Customer's first name for welcome message */
  customerFirstName?: string
  /** Customer's full name */
  customerName?: string
  /** Customer's avatar URL */
  avatarUrl?: string
  /** Logo element to display */
  logo?: ReactNode
  /** Breadcrumb elements */
  breadcrumbs?: ReactNode
  /** Actions to display on the right */
  actions?: ReactNode
  /** Callback when mobile menu is toggled */
  onMenuToggle?: () => void
  /** Whether mobile menu is open */
  isMenuOpen?: boolean
}

/**
 * Portal Header Component
 *
 * Renders the top navigation bar with branding, user info, and actions.
 */
export function PortalHeader({
  className,
  customerFirstName,
  customerName,
  avatarUrl,
  logo,
  breadcrumbs,
  actions,
  onMenuToggle,
  isMenuOpen = false,
}: PortalHeaderProps): React.ReactElement {
  const { theme, isDarkMode, toggleDarkMode } = usePortalTheme()
  const { header } = theme

  const headerClasses = cn(
    'portal-header',
    header.sticky && 'portal-header--sticky',
    header.showBorder && 'portal-header--bordered',
    className
  )

  // Generate welcome message from template
  const welcomeMessage = header.showWelcome && customerFirstName
    ? header.welcomeTemplate.replace('{{firstName}}', customerFirstName)
    : null

  return (
    <header className={headerClasses}>
      <div className="flex w-full items-center justify-between gap-4">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Mobile menu trigger */}
          {onMenuToggle && (
            <PortalSidebarTrigger
              onClick={onMenuToggle}
              isOpen={isMenuOpen}
            />
          )}

          {/* Logo (mobile only in some layouts) */}
          {logo && (
            <div className="lg:hidden">
              {logo}
            </div>
          )}

          {/* Breadcrumbs */}
          {header.showBreadcrumbs && breadcrumbs && (
            <nav className="hidden md:block" aria-label="Breadcrumb">
              {breadcrumbs}
            </nav>
          )}
        </div>

        {/* Center/Title section */}
        {header.style === 'branded' && logo && (
          <div className="hidden lg:block">
            {logo}
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Welcome message (desktop) */}
          {welcomeMessage && header.style !== 'minimal' && (
            <span className="hidden text-sm text-[hsl(var(--portal-muted-foreground))] lg:block">
              {welcomeMessage}
            </span>
          )}

          {/* Custom actions */}
          {actions}

          {/* Dark mode toggle */}
          {theme.darkModeEnabled && (
            <button
              type="button"
              onClick={toggleDarkMode}
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-lg',
                'text-[hsl(var(--portal-muted-foreground))]',
                'hover:bg-[hsl(var(--portal-muted))] hover:text-[hsl(var(--portal-foreground))]',
                'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))]',
                'transition-colors'
              )}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
                <PortalIcon iconKey="sun" size={18} />
              ) : (
                <PortalIcon iconKey="moon" size={18} />
              )}
            </button>
          )}

          {/* User avatar/menu */}
          {header.showAvatar && (
            <UserAvatar
              name={customerName}
              avatarUrl={avatarUrl}
            />
          )}
        </div>
      </div>
    </header>
  )
}

/**
 * User avatar component
 */
interface UserAvatarProps {
  name?: string
  avatarUrl?: string
}

function UserAvatar({ name, avatarUrl }: UserAvatarProps): React.ReactElement {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'

  return (
    <Link
      href="/account/profile"
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full',
        'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
        'text-sm font-medium',
        'ring-2 ring-transparent hover:ring-[hsl(var(--portal-primary)/0.3)]',
        'transition-all',
        'overflow-hidden'
      )}
      aria-label="Profile settings"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name || 'User avatar'}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </Link>
  )
}

/**
 * Portal breadcrumb component
 */
interface PortalBreadcrumbsProps {
  items: Array<{
    label: string
    href?: string
  }>
  className?: string
}

export function PortalBreadcrumbs({
  items,
  className,
}: PortalBreadcrumbsProps): React.ReactElement {
  return (
    <ol
      className={cn(
        'flex items-center gap-2 text-sm',
        className
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <li key={item.label} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-[hsl(var(--portal-muted-foreground))] hover:text-[hsl(var(--portal-foreground))] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast
                    ? 'font-medium text-[hsl(var(--portal-foreground))]'
                    : 'text-[hsl(var(--portal-muted-foreground))]'
                )}
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <PortalIcon
                iconKey="chevron_right"
                size={14}
                className="text-[hsl(var(--portal-muted-foreground))]"
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Simple page title header
 */
interface PortalPageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PortalPageHeader({
  title,
  description,
  actions,
  className,
}: PortalPageHeaderProps): React.ReactElement {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>
        <h1 className="text-2xl font-semibold text-[hsl(var(--portal-foreground))]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  )
}
