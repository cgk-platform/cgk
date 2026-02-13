export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createTenantCache, withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getAttributionSettings,
  upsertAttributionSettings,
  type AttributionSettingsUpdate,
} from '@/lib/attribution'

const CACHE_KEY = 'attribution-settings'
const CACHE_TTL = 300 // 5 minutes

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const cache = createTenantCache(tenantSlug)
  const cached = await cache.get(CACHE_KEY)
  if (cached) {
    return NextResponse.json({ settings: cached })
  }

  let settings = await withTenant(tenantSlug, () => getAttributionSettings(tenantId))

  if (!settings) {
    // Create default settings
    settings = await withTenant(tenantSlug, () =>
      upsertAttributionSettings(tenantId, {}, null)
    )
  }

  await cache.set(CACHE_KEY, settings, { ttl: CACHE_TTL })

  return NextResponse.json({ settings })
}

export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: AttributionSettingsUpdate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowedFields: (keyof AttributionSettingsUpdate)[] = [
    'enabled',
    'defaultModel',
    'defaultWindow',
    'attributionMode',
    'enabledModels',
    'enabledWindows',
    'timeDecayHalfLifeHours',
    'positionBasedWeights',
    'fairingBridgeEnabled',
    'fairingSyncInterval',
  ]

  const filteredUpdates: AttributionSettingsUpdate = {}
  for (const key of allowedFields) {
    if (key in body) {
      (filteredUpdates as Record<string, unknown>)[key] = body[key]
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const settings = await withTenant(tenantSlug, () =>
    upsertAttributionSettings(tenantId, filteredUpdates, userId)
  )

  const cache = createTenantCache(tenantSlug)
  await cache.delete(CACHE_KEY)

  return NextResponse.json({ settings })
}
