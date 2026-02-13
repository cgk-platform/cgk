'use client'

import { cn } from '@cgk-platform/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Search,
  ArrowRightLeft,
  FileCode,
  BarChart3,
  FileWarning,
} from 'lucide-react'

const navItems = [
  { href: '/admin/seo', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/seo/keywords', label: 'Keywords', icon: Search },
  { href: '/admin/seo/content-gap', label: 'Content Gap', icon: FileWarning },
  { href: '/admin/seo/redirects', label: 'Redirects', icon: ArrowRightLeft },
  { href: '/admin/seo/schema', label: 'Schema Validation', icon: FileCode },
  { href: '/admin/seo/analysis', label: 'Site Audit', icon: BarChart3 },
]

export function SEONav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
