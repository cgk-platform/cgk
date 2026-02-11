export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createTenantCache, withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getSiteConfig,
  logSettingsChange,
  upsertSiteConfig,
  type PricingConfig,
} from '@/lib/settings'

const PRICING_CONFIG_CACHE_KEY = 'pricing-config'
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
  const cached = await cache.get<PricingConfig>(PRICING_CONFIG_CACHE_KEY)
  if (cached) {
    return NextResponse.json({ pricing: cached })
  }

  const config = await withTenant(tenantSlug, () => getSiteConfig(tenantId))
  const pricing = config?.pricingConfig || {}

  await cache.set(PRICING_CONFIG_CACHE_KEY, pricing, { ttl: CACHE_TTL })
  return NextResponse.json({ pricing })
}

export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: PricingConfig
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const currentConfig = await withTenant(tenantSlug, () => getSiteConfig(tenantId))
  const previousPricing = currentConfig?.pricingConfig || {}

  const updatedConfig = await withTenant(tenantSlug, () =>
    upsertSiteConfig(tenantId, { pricingConfig: body }, userId)
  )

  await withTenant(tenantSlug, () =>
    logSettingsChange(
      tenantId,
      userId,
      'site_config',
      { pricingConfig: body },
      { pricingConfig: previousPricing }
    )
  )

  const cache = createTenantCache(tenantSlug)
  await cache.delete(PRICING_CONFIG_CACHE_KEY)
  await cache.delete(SITE_CONFIG_CACHE_KEY)

  return NextResponse.json({ pricing: updatedConfig.pricingConfig })
}
