'use client'

import { cn } from '@cgk/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const shopifyTabs = [
  { label: 'Connection', href: '/admin/integrations/shopify-app' },
  { label: 'Extensions', href: '/admin/integrations/shopify-app/extensions' },
]

/**
 * Layout for the Shopify App integration section
 * Provides sub-navigation between Connection and Extensions pages
 */
export default function ShopifyAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 border-b">
        {shopifyTabs.map((tab) => {
          const isActive = tab.href === '/admin/integrations/shopify-app'
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + '/')

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'border-primary font-medium text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>

      <div>{children}</div>
    </div>
  )
}
