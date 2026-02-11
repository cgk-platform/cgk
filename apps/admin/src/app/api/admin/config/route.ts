export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createTenantCache, withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getSiteConfig,
  logSettingsChange,
  upsertSiteConfig,
  type SiteConfigUpdate,
} from '@/lib/settings'

const SITE_CONFIG_CACHE_KEY = 'site-config'
const CACHE_TTL = 300 // 5 minutes

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const cache = createTenantCache(tenantSlug)
  const cached = await cache.get(SITE_CONFIG_CACHE_KEY)
  if (cached) {
    return NextResponse.json({ config: cached })
  }

  const config = await withTenant(tenantSlug, () => getSiteConfig(tenantId))

  if (!config) {
    const defaults = await withTenant(tenantSlug, () =>
      upsertSiteConfig(tenantId, {}, null)
    )
    await cache.set(SITE_CONFIG_CACHE_KEY, defaults, { ttl: CACHE_TTL })
    return NextResponse.json({ config: defaults })
  }

  await cache.set(SITE_CONFIG_CACHE_KEY, config, { ttl: CACHE_TTL })
  return NextResponse.json({ config })
}

export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: SiteConfigUpdate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowedFields: (keyof SiteConfigUpdate)[] = [
    'pricingConfig',
    'saleActive',
    'saleName',
    'saleStartDate',
    'saleEndDate',
    'saleConfig',
    'announcementBarEnabled',
    'announcementBarText',
    'announcementBarLink',
    'announcementBarBgColor',
    'announcementBarTextColor',
    'promoBanners',
    'logoUrl',
    'logoDarkUrl',
    'faviconUrl',
    'brandColors',
    'brandFonts',
    'headerNav',
    'footerNav',
    'socialLinks',
    'defaultMetaTitle',
    'defaultMetaDescription',
    'ga4MeasurementId',
    'fbPixelId',
    'tiktokPixelId',
  ]

  const filteredUpdates: SiteConfigUpdate = {}
  for (const key of allowedFields) {
    if (key in body) {
      (filteredUpdates as Record<string, unknown>)[key] = body[key]
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const currentConfig = await withTenant(tenantSlug, () => getSiteConfig(tenantId))
  const previousValues = currentConfig
    ? Object.fromEntries(
        Object.keys(filteredUpdates).map((key) => [
          key,
          (currentConfig as unknown as Record<string, unknown>)[key],
        ])
      )
    : null

  const updatedConfig = await withTenant(tenantSlug, () =>
    upsertSiteConfig(tenantId, filteredUpdates, userId)
  )

  await withTenant(tenantSlug, () =>
    logSettingsChange(
      tenantId,
      userId,
      'site_config',
      filteredUpdates as unknown as Record<string, unknown>,
      previousValues
    )
  )

  const cache = createTenantCache(tenantSlug)
  await cache.delete(SITE_CONFIG_CACHE_KEY)
  await cache.delete('pricing-config')

  return NextResponse.json({ config: updatedConfig })
}
