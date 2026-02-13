'use client'

import { cn } from '@cgk-platform/ui'
import { ChevronDown, LogOut, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { navigation, type NavSection } from '@/lib/navigation'
import type { TenantConfig } from '@/lib/tenant'

interface SidebarProps {
  tenant: TenantConfig
  user: { id: string; name: string | null; email: string; role: string }
}

export function Sidebar({ tenant, user }: SidebarProps) {
  const pathname = usePathname()

  const filteredNav = navigation.filter((section) => {
    if (!section.featureFlag) return true
    return tenant.features[section.featureFlag as keyof typeof tenant.features]
  })

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border/50 bg-card">
      {/* Tenant branding */}
      <div className="flex items-center gap-3 border-b border-border/50 px-5 py-5">
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {filteredNav.map((section) => (
            <NavItem key={section.href} section={section} pathname={pathname} />
          ))}
        </ul>
      </nav>

      {/* Footer actions */}
      <div className="border-t border-border/50 p-3">
        <Link
          href="/admin/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-fast',
            pathname.startsWith('/admin/settings')
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>

      {/* User menu */}
      <div className="border-t border-border/50 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-semibold text-primary ring-1 ring-primary/20">
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
    </aside>
  )
}

function NavItem({ section, pathname }: { section: NavSection; pathname: string }) {
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
