import { headers } from 'next/headers'
import { Suspense } from 'react'

import { getCommunicationSettings, getNotificationSettings } from '@/lib/creator-communications/db'

import { NotificationSettingsForm } from './notification-settings-form'
import { GlobalSettingsForm } from './global-settings-form'

export default async function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Communication Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure notification preferences and global settings
        </p>
      </div>

      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsLoader />
      </Suspense>
    </div>
  )
}

async function SettingsLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const [notifications, globalSettings] = await Promise.all([
    getNotificationSettings(tenantSlug),
    getCommunicationSettings(tenantSlug),
  ])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
      <NotificationSettingsForm notifications={notifications} />
      <GlobalSettingsForm settings={globalSettings} />
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  )
}
