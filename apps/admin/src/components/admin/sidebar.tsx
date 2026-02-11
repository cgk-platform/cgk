'use client'

import { cn } from '@cgk/ui'
import { ChevronDown, LogOut } from 'lucide-react'
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
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      {/* Tenant branding */}
      <div className="flex items-center gap-3 border-b px-4 py-4">
        {tenant.logo ? (
          <img src={tenant.logo} alt={tenant.name} className="h-8 w-8 rounded" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
            {tenant.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="text-sm font-semibold">{tenant.name}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {filteredNav.map((section) => (
            <NavItem key={section.href} section={section} pathname={pathname} />
          ))}
        </ul>
      </nav>

      {/* User menu */}
      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {(user.name || user.email).slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user.name || user.email}</p>
            <p className="truncate text-xs text-muted-foreground">{user.role}</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
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
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
            isActive
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
          {section.label}
        </Link>
      </li>
    )
  }

  return (
    <li>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
        />
      </button>
      {expanded && (
        <ul className="ml-7 mt-1 space-y-1 border-l pl-3">
          {section.children!.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                className={cn(
                  'block rounded-md px-3 py-1.5 text-sm transition-colors',
                  pathname === child.href
                    ? 'font-medium text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
