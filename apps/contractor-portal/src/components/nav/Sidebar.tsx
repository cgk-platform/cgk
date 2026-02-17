'use client'

import { cn } from '@cgk-platform/ui'
import {
  LayoutDashboard,
  FolderKanban,
  CreditCard,
  FileText,
  Settings,
  HelpCircle,
  Briefcase,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Navigation items for main content area
 */
const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/request-payment', label: 'Request Payment', icon: FileText },
]

/**
 * Navigation items for bottom section
 */
const bottomNavItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help & FAQ', icon: HelpCircle },
]

interface SidebarProps {
  className?: string
}

/**
 * Desktop sidebar navigation for contractor portal
 */
export function Sidebar({ className }: SidebarProps): React.JSX.Element {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'hidden w-64 shrink-0 border-r border-border/50 bg-card lg:block',
        className
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="border-b border-border/50 p-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Briefcase className="h-4.5 w-4.5" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Contractor Portal
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} pathname={pathname}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border/50 p-4">
          <nav className="space-y-1">
            {bottomNavItems.map((item) => (
              <NavLink key={item.href} href={item.href} pathname={pathname}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  )
}

interface NavLinkProps {
  href: string
  pathname: string
  children: React.ReactNode
  onClick?: () => void
}

/**
 * Navigation link with active state styling
 */
export function NavLink({
  href,
  pathname,
  children,
  onClick,
}: NavLinkProps): React.JSX.Element {
  // Handle root path specially
  const isActive =
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-fast',
        isActive
          ? 'bg-primary font-medium text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
      {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />}
    </Link>
  )
}

export { navItems, bottomNavItems }
