'use client'

/**
 * Portal Sidebar Component
 *
 * Responsive sidebar navigation for the customer portal.
 * Supports multiple styles: floating, attached, minimal.
 */

import { cn } from '@cgk/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useCallback, useEffect, type ReactNode } from 'react'

import { usePortalTheme } from './PortalThemeProvider'
import { PortalIcon } from './PortalIcon'
import type { PortalNavItem } from '../types'

interface PortalSidebarProps {
  /** Additional CSS classes */
  className?: string
  /** Feature flags for conditional nav items */
  featureFlags?: Record<string, boolean>
  /** Custom navigation items (overrides theme config) */
  navItems?: PortalNavItem[]
  /** Footer content (e.g., sign out link) */
  footer?: ReactNode
  /** Logo element */
  logo?: ReactNode
  /** Controlled open state for mobile */
  isOpen?: boolean
  /** Callback when open state changes */
  onOpenChange?: (isOpen: boolean) => void
}

/**
 * Portal Sidebar Component
 *
 * Renders navigation sidebar with theme-aware styling.
 * Automatically handles mobile responsive behavior.
 */
export function PortalSidebar({
  className,
  featureFlags = {},
  navItems: customNavItems,
  footer,
  logo,
  isOpen: controlledOpen,
  onOpenChange,
}: PortalSidebarProps): React.ReactElement {
  const pathname = usePathname()
  const { theme } = usePortalTheme()
  const { sidebar, nav } = theme

  // Internal open state for mobile
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen ?? internalOpen
  const setIsOpen = onOpenChange ?? setInternalOpen

  // Use custom nav items or theme config
  const navItems = customNavItems || nav.items

  // Filter visible items based on feature flags
  const visibleItems = navItems.filter((item) => {
    if (!item.visible) return false
    if (item.featureFlag && !featureFlags[item.featureFlag]) return false
    return true
  })

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsOpen(false)
  }, [pathname, setIsOpen])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, setIsOpen])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleBackdropClick = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const sidebarClasses = cn(
    'portal-sidebar',
    sidebar.style === 'floating' && 'portal-sidebar--floating',
    sidebar.style === 'attached' && 'portal-sidebar--attached',
    sidebar.style === 'minimal' && 'portal-sidebar--minimal',
    isOpen && 'portal-sidebar--open',
    className
  )

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={sidebarClasses}>
        {/* Logo Area */}
        {logo && (
          <div className="mb-6 px-2">
            {logo}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {nav.groupBySection && nav.sections ? (
            // Grouped navigation
            nav.sections.map((section) => {
              const sectionItems = visibleItems.filter((item) =>
                section.items.includes(item.key)
              )

              if (sectionItems.length === 0) return null

              return (
                <div key={section.key} className="mb-4">
                  <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
                    {section.label}
                  </h3>
                  <div className="space-y-1">
                    {sectionItems.map((item) => (
                      <NavItem
                        key={item.key}
                        item={item}
                        isActive={isItemActive(item.href, pathname)}
                        showIcon={sidebar.showIcons}
                        activeIndicator={sidebar.activeIndicator}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            // Flat navigation
            visibleItems.map((item, index) => (
              <div key={item.key}>
                {nav.showDividers && index > 0 && (
                  <div className="my-2 border-t border-[hsl(var(--portal-border))]" />
                )}
                <NavItem
                  item={item}
                  isActive={isItemActive(item.href, pathname)}
                  showIcon={sidebar.showIcons}
                  activeIndicator={sidebar.activeIndicator}
                />
              </div>
            ))
          )}
        </nav>

        {/* Footer */}
        {footer && (
          <div className="mt-auto border-t border-[hsl(var(--portal-border))] pt-4">
            {footer}
          </div>
        )}
      </aside>
    </>
  )
}

/**
 * Check if a nav item is active based on current path
 */
function isItemActive(href: string, pathname: string): boolean {
  if (href === '/account') {
    return pathname === '/account'
  }
  return pathname.startsWith(href)
}

/**
 * Individual navigation item component
 */
interface NavItemProps {
  item: PortalNavItem
  isActive: boolean
  showIcon: boolean
  activeIndicator: 'bar' | 'dot' | 'fill' | 'none'
}

function NavItem({ item, isActive, showIcon, activeIndicator }: NavItemProps): React.ReactElement {
  return (
    <Link
      href={item.href}
      className={cn(
        'portal-nav-item group',
        isActive && 'portal-nav-item--active'
      )}
    >
      {/* Left bar indicator */}
      {activeIndicator === 'bar' && isActive && (
        <span
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[hsl(var(--portal-sidebar-active-bg))]"
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      {showIcon && (
        <span
          className={cn(
            'shrink-0 transition-colors',
            isActive
              ? 'text-[hsl(var(--portal-sidebar-active-fg))]'
              : 'text-[hsl(var(--portal-muted-foreground))] group-hover:text-[hsl(var(--portal-sidebar-fg))]'
          )}
        >
          <PortalIcon
            iconKey={item.iconKey}
            size={20}
            className="transition-transform group-hover:scale-105"
          />
        </span>
      )}

      {/* Label */}
      <span className="flex-1 truncate">{item.label}</span>

      {/* Dot indicator */}
      {activeIndicator === 'dot' && isActive && (
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--portal-sidebar-active-bg))]"
          aria-hidden="true"
        />
      )}

      {/* Badge */}
      {item.badge && (
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
            item.badgeVariant === 'error' && 'bg-[hsl(var(--portal-destructive))] text-[hsl(var(--portal-destructive-foreground))]',
            item.badgeVariant === 'success' && 'bg-[hsl(var(--portal-success))] text-[hsl(var(--portal-success-foreground))]',
            item.badgeVariant === 'warning' && 'bg-[hsl(var(--portal-warning))] text-[hsl(var(--portal-warning-foreground))]',
            (!item.badgeVariant || item.badgeVariant === 'default') && 'bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))]'
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  )
}

/**
 * Mobile menu trigger button
 */
interface PortalSidebarTriggerProps {
  className?: string
  onClick: () => void
  isOpen: boolean
}

export function PortalSidebarTrigger({
  className,
  onClick,
  isOpen,
}: PortalSidebarTriggerProps): React.ReactElement {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-lg',
        'text-[hsl(var(--portal-foreground))]',
        'hover:bg-[hsl(var(--portal-muted))]',
        'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))]',
        'lg:hidden',
        className
      )}
      onClick={onClick}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )}
    </button>
  )
}
