import { headers } from 'next/headers'
import { Suspense } from 'react'

import { getPortalSettings, getPortalAnalytics } from '@/lib/customer-portal/db'

import { CustomerPortalPageClient } from './customer-portal-page-client'

export default async function CustomerPortalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customer Portal</h1>
        <p className="text-sm text-muted-foreground">
          Configure and manage your customer-facing account portal
        </p>
      </div>

      <Suspense fallback={<CustomerPortalSkeleton />}>
        <CustomerPortalLoader />
      </Suspense>
    </div>
  )
}

async function CustomerPortalLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">No tenant configured.</p>
      </div>
    )
  }

  const settings = await getPortalSettings(tenantSlug)

  // Get analytics for last 30 days
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  const analytics = await getPortalAnalytics(tenantSlug, start, end)

  return (
    <CustomerPortalPageClient
      initialSettings={settings}
      initialAnalytics={analytics}
      initialDateRange={{ start, end }}
    />
  )
}

function CustomerPortalSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs skeleton */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-md bg-muted-foreground/10" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border bg-muted/50" />
          ))}
        </div>
      </div>
    </div>
  )
}
