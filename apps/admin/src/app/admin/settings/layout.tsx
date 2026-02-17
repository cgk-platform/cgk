'use client'

import { cn } from '@cgk-platform/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const settingsTabs = [
  { label: 'General', href: '/admin/settings/general' },
  { label: 'AI', href: '/admin/settings/ai' },
  { label: 'Email', href: '/admin/settings/email' },
  { label: 'Payouts', href: '/admin/settings/payouts' },
  { label: 'Costs', href: '/admin/settings/costs' },
  { label: 'Domains', href: '/admin/settings/domains' },
  { label: 'Shopify', href: '/admin/settings/shopify' },
  { label: 'Payments', href: '/admin/settings/payments' },
  { label: 'Portal', href: '/admin/settings/portal' },
  { label: 'Team', href: '/admin/settings/team' },
  { label: 'Integrations', href: '/admin/settings/integrations' },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your store configuration
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b">
        {settingsTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-2 text-sm transition-colors',
              pathname === tab.href || pathname.startsWith(tab.href + '/')
                ? 'border-primary font-medium text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div>{children}</div>
    </div>
  )
}
