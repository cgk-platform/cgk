'use client'

import { cn } from '@cgk-platform/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const integrationsTabs = [
  { label: 'Overview', href: '/admin/integrations' },
  { label: 'Shopify', href: '/admin/integrations/shopify-app' },
  { label: 'Meta Ads', href: '/admin/integrations/meta-ads' },
  { label: 'Google Ads', href: '/admin/integrations/google-ads' },
  { label: 'TikTok Ads', href: '/admin/integrations/tiktok-ads' },
  { label: 'SMS & Voice', href: '/admin/integrations/sms' },
  { label: 'Slack', href: '/admin/integrations/slack' },
  { label: 'Klaviyo', href: '/admin/integrations/klaviyo' },
  { label: 'Yotpo', href: '/admin/integrations/yotpo' },
  { label: 'MCP', href: '/admin/integrations/mcp' },
]

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect and manage third-party services
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b">
        {integrationsTabs.map((tab) => {
          const isActive = tab.href === '/admin/integrations'
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + '/')

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-2 text-sm transition-colors',
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
