'use client'

import { cn } from '@cgk/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { AttributionProvider } from '@/components/attribution'

const attributionTabs = [
  { label: 'Overview', href: '/admin/attribution' },
  { label: 'Channels', href: '/admin/attribution/channels' },
  { label: 'Products', href: '/admin/attribution/products' },
  { label: 'Creatives', href: '/admin/attribution/creatives' },
  { label: 'Cohorts', href: '/admin/attribution/cohorts' },
  { label: 'ROAS Index', href: '/admin/attribution/roas-index' },
  { label: 'Model Comparison', href: '/admin/attribution/model-comparison' },
  { label: 'Journeys', href: '/admin/attribution/journeys' },
  { label: 'MMM', href: '/admin/attribution/mmm' },
  { label: 'Incrementality', href: '/admin/attribution/incrementality' },
  { label: 'AI Insights', href: '/admin/attribution/ai-insights' },
  { label: 'Settings', href: '/admin/attribution/settings' },
  { label: 'Data Quality', href: '/admin/attribution/data-quality' },
  { label: 'Setup', href: '/admin/attribution/setup' },
]

export default function AttributionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin/attribution') {
      return pathname === '/admin/attribution'
    }
    return pathname.startsWith(href)
  }

  return (
    <AttributionProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Attribution</h1>
          <p className="text-sm text-muted-foreground">
            Track and analyze marketing channel performance
          </p>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-b">
          {attributionTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-2 text-sm transition-colors',
                isActive(tab.href)
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
    </AttributionProvider>
  )
}
