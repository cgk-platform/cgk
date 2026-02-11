'use client'

import { Button, cn } from '@cgk/ui'
import {
  Activity,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

import type { NavItem } from '../../types/platform'

interface SidebarProps {
  /** Whether MFA is verified for current session */
  mfaVerified?: boolean
  /** User name for display */
  userName?: string
  /** User email for display */
  userEmail?: string
}

/**
 * Navigation items for the sidebar
 */
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    href: '/',
    icon: 'LayoutDashboard',
  },
  {
    label: 'Brands',
    href: '/brands',
    icon: 'Building2',
    children: [
      { label: 'All Brands', href: '/brands', icon: 'Building2' },
      { label: 'Brand Health', href: '/brands/health', icon: 'Activity' },
    ],
  },
  {
    label: 'Operations',
    href: '/ops',
    icon: 'Activity',
    children: [
      { label: 'Errors', href: '/ops/errors', icon: 'Activity' },
      { label: 'Logs', href: '/ops/logs', icon: 'Activity' },
      { label: 'Health', href: '/ops/health', icon: 'Activity' },
      { label: 'Jobs', href: '/ops/jobs', icon: 'Activity' },
    ],
  },
  {
    label: 'Flags',
    href: '/flags',
    icon: 'Flag',
  },
  {
    label: 'Users',
    href: '/users',
    icon: 'Users',
    requiresMfa: true,
    children: [
      { label: 'All Users', href: '/users', icon: 'Users' },
      { label: 'Super Admins', href: '/users/super-admins', icon: 'ShieldCheck' },
    ],
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: 'BarChart3',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: 'Settings',
    requiresMfa: true,
  },
]

/**
 * Icon component map
 */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Building2,
  Activity,
  Flag,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
}

/**
 * Orchestrator navigation sidebar
 */
export function Sidebar({ mfaVerified = false, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Toggle expanded state for items with children
  const toggleExpanded = useCallback((href: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(href)) {
        next.delete(href)
      } else {
        next.add(href)
      }
      return next
    })
  }, [])

  // Check if a path is active
  const isActive = useCallback(
    (href: string) => {
      if (href === '/') {
        return pathname === '/'
      }
      return pathname.startsWith(href)
    },
    [pathname]
  )

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/platform/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      console.error('Logout failed')
    }
  }, [router])

  // Auto-expand active parent items
  const activeParent = NAV_ITEMS.find(
    (item) => item.children?.some((child) => isActive(child.href))
  )
  if (activeParent && !expandedItems.has(activeParent.href)) {
    setExpandedItems((prev) => new Set([...prev, activeParent.href]))
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-md bg-card p-2 shadow-md lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-bold">Orchestrator</span>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="rounded-md p-1 hover:bg-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* MFA indicator */}
        {mfaVerified && (
          <div className="mx-3 mt-3 flex items-center gap-1.5 rounded-md bg-green-500/10 px-2 py-1 text-xs text-green-500">
            <ShieldCheck className="h-3 w-3" />
            MFA Verified
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavItemComponent
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                isExpanded={expandedItems.has(item.href)}
                onToggleExpand={() => toggleExpanded(item.href)}
                mfaVerified={mfaVerified}
                pathname={pathname}
              />
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium">{userName || 'Super Admin'}</p>
            <p className="truncate text-xs text-muted-foreground">
              {userEmail || 'admin@platform.com'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
    </>
  )
}

/**
 * Individual navigation item
 */
function NavItemComponent({
  item,
  isActive,
  isExpanded,
  onToggleExpand,
  mfaVerified,
  pathname,
}: {
  item: NavItem
  isActive: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  mfaVerified: boolean
  pathname: string
}) {
  const Icon = ICONS[item.icon]
  const hasChildren = item.children && item.children.length > 0
  const requiresMfaAndNotVerified = item.requiresMfa && !mfaVerified

  // If item requires MFA and not verified, show lock
  if (requiresMfaAndNotVerified) {
    return (
      <li>
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground/50"
          title="MFA verification required"
        >
          {Icon && <Icon className="h-4 w-4" />}
          <span>{item.label}</span>
          <ShieldCheck className="ml-auto h-3 w-3" />
        </div>
      </li>
    )
  }

  if (hasChildren) {
    return (
      <li>
        <button
          onClick={onToggleExpand}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            isActive
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          {Icon && <Icon className="h-4 w-4" />}
          <span>{item.label}</span>
          {isExpanded ? (
            <ChevronDown className="ml-auto h-4 w-4" />
          ) : (
            <ChevronRight className="ml-auto h-4 w-4" />
          )}
        </button>

        {isExpanded && (
          <ul className="ml-6 mt-1 space-y-1 border-l pl-2">
            {item.children?.map((child) => {
              const ChildIcon = ICONS[child.icon]
              const isChildActive = pathname === child.href
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                      isChildActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {ChildIcon && <ChildIcon className="h-3.5 w-3.5" />}
                    <span>{child.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </li>
    )
  }

  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        <span>{item.label}</span>
        {item.badge && (
          <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
            {item.badge}
          </span>
        )}
      </Link>
    </li>
  )
}
