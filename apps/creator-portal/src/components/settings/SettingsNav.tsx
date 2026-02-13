/**
 * Settings Navigation
 *
 * Sidebar navigation for settings pages using lucide-react icons.
 */

'use client'

import { cn } from '@cgk-platform/ui'
import {
  User,
  Star,
  Lock,
  Bell,
  CreditCard,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { href: '/settings/profile', label: 'Profile', icon: User },
  { href: '/settings/brand-preferences', label: 'Brand Preferences', icon: Star },
  { href: '/settings/security', label: 'Security', icon: Lock },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings/payout-methods', label: 'Payout Methods', icon: CreditCard },
  { href: '/settings/tax', label: 'Tax Information', icon: FileText },
]

export function SettingsNav(): React.JSX.Element {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-fast',
              isActive
                ? 'bg-primary font-medium text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
            {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />}
          </Link>
        )
      })}
    </nav>
  )
}
