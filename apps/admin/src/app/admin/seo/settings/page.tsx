import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import { SEONav } from '@/components/admin/seo/SEONav'
import { GlobalSEOSettings } from '@/components/content/global-seo-settings'
import { getSEOSettings } from '@/lib/landing-pages/db'

export default async function SEOSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SEO Settings</h1>
        <p className="text-muted-foreground">
          Configure default SEO settings for your store
        </p>
      </div>

      <SEONav />

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

  const settings = await withTenant(tenantSlug, () => getSEOSettings())

  return (
    <GlobalSEOSettings
      settings={settings || {
        default_title_template: '%s | Brand',
        default_description: '',
        site_name: 'Brand',
        og_default_image: null,
        twitter_handle: null,
        google_site_verification: null,
        bing_site_verification: null,
        robots_txt: 'User-agent: *\nAllow: /',
        sitemap_enabled: true,
      }}
    />
  )
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  )
}
