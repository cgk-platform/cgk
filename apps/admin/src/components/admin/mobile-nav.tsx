'use client'

import { cn } from '@cgk/ui'
import { X, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { navigation, type NavSection } from '@/lib/navigation'
import type { TenantConfig } from '@/lib/tenant'

interface MobileNavProps {
  open: boolean
  onClose: () => void
  tenant: TenantConfig
}

export function MobileNav({ open, onClose, tenant }: MobileNavProps) {
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
          'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-card shadow-xl transition-transform duration-200 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-4">
          <div className="flex items-center gap-3">
            {tenant.logo ? (
              <img src={tenant.logo} alt={tenant.name} className="h-8 w-8 rounded" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
                {tenant.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold">{tenant.name}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="overflow-y-auto px-3 py-4" style={{ maxHeight: 'calc(100vh - 65px)' }}>
          <ul className="space-y-1">
            {filteredNav.map((section) => (
              <MobileNavItem key={section.href} section={section} pathname={pathname} />
            ))}
          </ul>
        </nav>
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
