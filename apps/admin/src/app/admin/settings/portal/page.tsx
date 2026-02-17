import { headers } from 'next/headers'
import { Suspense } from 'react'
import Link from 'next/link'

import { Card, CardContent, Button } from '@cgk-platform/ui'
import { ArrowRight } from 'lucide-react'

import { getPortalSettings } from '@/lib/customer-portal/db'

import { PortalSettingsClient } from './portal-settings-client'

export default function PortalSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Customer Portal</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your customer-facing account portal settings
          </p>
        </div>
        <Link href="/admin/customer-portal">
          <Button variant="outline" className="gap-2">
            Full Portal Management
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <Suspense fallback={<PortalSettingsSkeleton />}>
        <PortalSettingsLoader />
      </Suspense>
    </div>
  )
}

async function PortalSettingsLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No tenant configured.</p>
        </CardContent>
      </Card>
    )
  }

  const settings = await getPortalSettings(tenantSlug)

  return <PortalSettingsClient initialSettings={settings} />
}

function PortalSettingsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Status card skeleton */}
      <div className="h-20 animate-pulse rounded-lg border bg-muted/50" />

      {/* Tabs skeleton */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-md bg-muted-foreground/10" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted/50" />
        ))}
      </div>
    </div>
  )
}
