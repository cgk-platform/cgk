'use client'

import { cn } from '@cgk-platform/ui'
import {
  LayoutDashboard,
  FolderOpen,
  CreditCard,
  BarChart3,
  MessageSquare,
  MonitorPlay,
  Settings,
  HelpCircle,
  User,
  Menu,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useCallback, useEffect } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/teleprompter', label: 'Teleprompter', icon: MonitorPlay },
]

const bottomNavItems = [
  { href: '/settings/profile', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help & FAQ', icon: HelpCircle },
]

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  // Close on route change
  useEffect(() => {
    closeMobileMenu()
  }, [pathname, closeMobileMenu])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border/50 bg-card lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b border-border/50 p-4">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <User className="h-4.5 w-4.5" />
              </div>
              <span className="text-lg font-bold tracking-tight">Creator Portal</span>
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

      {/* Mobile header */}
      <div className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="font-bold tracking-tight">
            Creator Portal
          </Link>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-normal lg:hidden',
          mobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* Mobile menu drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 bg-card shadow-2xl transition-transform duration-slow ease-smooth-out lg:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 p-4">
            <Link href="/dashboard" className="flex items-center gap-2.5" onClick={closeMobileMenu}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <User className="h-4.5 w-4.5" />
              </div>
              <span className="text-lg font-bold tracking-tight">Creator Portal</span>
            </Link>
            <button
              onClick={closeMobileMenu}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href} pathname={pathname} onClick={closeMobileMenu}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-border/50 p-4">
            <nav className="space-y-1">
              {bottomNavItems.map((item) => (
                <NavLink key={item.href} href={item.href} pathname={pathname} onClick={closeMobileMenu}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 pt-14 lg:pt-0">
        <div className="mx-auto max-w-6xl p-6 lg:p-8 animate-fade-up">{children}</div>
      </main>
    </div>
  )
}

function NavLink({
  href,
  pathname,
  children,
  onClick,
}: {
  href: string
  pathname: string
  children: React.ReactNode
  onClick?: () => void
}): React.JSX.Element {
  const isActive = pathname === href || pathname.startsWith(href + '/')

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
