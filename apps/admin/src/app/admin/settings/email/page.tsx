'use client'

import { cn } from '@cgk-platform/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { DomainList } from './components/domain-list'
import { RoutingList } from './components/routing-list'

const emailTabs = [
  { label: 'Domains', href: '/admin/settings/email/domains' },
  { label: 'Sender Addresses', href: '/admin/settings/email/senders' },
  { label: 'Templates', href: '/admin/settings/email/templates' },
]

export default function EmailSettingsPage() {
  const pathname = usePathname()

  // If we're at the root email settings page, show the combined view
  const isRootPage = pathname === '/admin/settings/email'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Email Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage email domains, sender addresses, templates, and notification routing
        </p>
      </div>

      <nav className="flex gap-1 border-b">
        {emailTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-2 text-sm transition-colors',
              pathname === tab.href
                ? 'border-primary font-medium text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {isRootPage ? (
        <div className="space-y-8">
          {/* Domain and Sender Address Management */}
          <section>
            <DomainList />
          </section>

          {/* Notification Routing */}
          <section className="border-t pt-8">
            <RoutingList />
          </section>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground">
            Select a category above to manage your email settings.
          </p>
        </div>
      )}
    </div>
  )
}
