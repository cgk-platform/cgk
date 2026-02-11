export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createTenantCache, withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getSiteConfig,
  logSettingsChange,
  upsertSiteConfig,
  type BrandColors,
  type BrandFonts,
} from '@/lib/settings'

const BRANDING_CACHE_KEY = 'branding-config'
const SITE_CONFIG_CACHE_KEY = 'site-config'
const CACHE_TTL = 300 // 5 minutes

interface BrandingConfig {
  logoUrl: string | null
  logoDarkUrl: string | null
  faviconUrl: string | null
  brandColors: BrandColors
  brandFonts: BrandFonts
}

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const cache = createTenantCache(tenantSlug)
  const cached = await cache.get<BrandingConfig>(BRANDING_CACHE_KEY)
  if (cached) {
    return NextResponse.json({ branding: cached })
  }

  const config = await withTenant(tenantSlug, () => getSiteConfig(tenantId))

  const branding: BrandingConfig = {
    logoUrl: config?.logoUrl || null,
    logoDarkUrl: config?.logoDarkUrl || null,
    faviconUrl: config?.faviconUrl || null,
    brandColors: config?.brandColors || { primary: '#000000', secondary: '#374d42' },
    brandFonts: config?.brandFonts || { heading: 'Inter', body: 'Inter' },
  }

  await cache.set(BRANDING_CACHE_KEY, branding, { ttl: CACHE_TTL })
  return NextResponse.json({ branding })
}

export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: Partial<BrandingConfig>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowedFields = ['logoUrl', 'logoDarkUrl', 'faviconUrl', 'brandColors', 'brandFonts']
  const filteredUpdates: Partial<BrandingConfig> = {}

  for (const key of allowedFields) {
    if (key in body) {
      (filteredUpdates as Record<string, unknown>)[key] =
        body[key as keyof BrandingConfig]
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const currentConfig = await withTenant(tenantSlug, () => getSiteConfig(tenantId))
  const previousValues = Object.fromEntries(
    Object.keys(filteredUpdates).map((key) => [
      key,
      currentConfig ? (currentConfig as unknown as Record<string, unknown>)[key] : null,
    ])
  )

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
  await cache.delete(BRANDING_CACHE_KEY)
  await cache.delete(SITE_CONFIG_CACHE_KEY)

  const branding: BrandingConfig = {
    logoUrl: updatedConfig.logoUrl,
    logoDarkUrl: updatedConfig.logoDarkUrl,
    faviconUrl: updatedConfig.faviconUrl,
    brandColors: updatedConfig.brandColors,
    brandFonts: updatedConfig.brandFonts,
  }

  return NextResponse.json({ branding })
}
