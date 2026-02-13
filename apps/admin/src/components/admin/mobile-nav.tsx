'use client'

import { cn } from '@cgk-platform/ui'
import { X, ChevronDown, Settings, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { navigation, type NavSection } from '@/lib/navigation'
import type { TenantConfig } from '@/lib/tenant'

interface MobileNavProps {
  open: boolean
  onClose: () => void
  tenant: TenantConfig
  user?: { id: string; name: string | null; email: string; role: string }
}

export function MobileNav({ open, onClose, tenant, user }: MobileNavProps) {
  const pathname = usePathname()

  // Close on route change
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const filteredNav = navigation.filter((section) => {
    if (!section.featureFlag) return true
    return tenant.features[section.featureFlag as keyof typeof tenant.features]
  })

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-normal lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-card shadow-2xl transition-transform duration-slow ease-smooth-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-5">
          <div className="flex items-center gap-3">
            {tenant.logo ? (
              <img
                src={tenant.logo}
                alt={tenant.name}
                className="h-9 w-9 rounded-lg object-cover ring-1 ring-border/50"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                {tenant.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <span className="block truncate text-sm font-semibold tracking-tight">
                {tenant.name}
              </span>
              <span className="text-xs text-muted-foreground">Admin Portal</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {filteredNav.map((section) => (
              <MobileNavItem key={section.href} section={section} pathname={pathname} />
            ))}
          </ul>

          {/* Settings */}
          <div className="mt-4 border-t border-border/50 pt-4">
            <Link
              href="/admin/settings"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-fast',
                pathname.startsWith('/admin/settings')
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </nav>

        {/* User section */}
        {user && (
          <div className="border-t border-border/50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-semibold text-primary ring-1 ring-primary/20">
                {(user.name || user.email).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{user.name || user.email}</p>
                <p className="truncate text-xs capitalize text-muted-foreground">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="rounded-lg p-2 text-muted-foreground transition-colors duration-fast hover:bg-destructive/10 hover:text-destructive"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function MobileNavItem({ section, pathname }: { section: NavSection; pathname: string }) {
  const isActive = pathname === section.href || pathname.startsWith(section.href + '/')
  const hasChildren = section.children && section.children.length > 0
  const [expanded, setExpanded] = useState(isActive && hasChildren)

  const Icon = section.icon

  if (!hasChildren) {
    return (
      <li>
        <Link
          href={section.href}
          className={cn(
            'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-fast',
            isActive
              ? 'bg-primary font-medium text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4 transition-colors',
              isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
            )}
          />
          {section.label}
          {isActive && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />
          )}
        </Link>
      </li>
    )
  }

  return (
    <li>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-fast',
          isActive
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4 transition-colors',
            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
          )}
        />
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-normal',
            expanded && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-normal',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <ul className="overflow-hidden">
          <div className="ml-4 mt-1 space-y-0.5 border-l border-border/50 pl-4">
            {section.children!.map((child) => {
              const isChildActive = pathname === child.href
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    className={cn(
                      'block rounded-md px-3 py-2 text-sm transition-all duration-fast',
                      isChildActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {child.label}
                  </Link>
                </li>
              )
            })}
          </div>
        </ul>
      </div>
    </li>
  )
}
