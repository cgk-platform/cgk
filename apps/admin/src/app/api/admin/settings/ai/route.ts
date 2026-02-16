export const dynamic = 'force-dynamic'
export const revalidate = 0

import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { createTenantCache, withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getAISettings,
  logSettingsChange,
  upsertAISettings,
  type AISettingsUpdate,
} from '@/lib/settings'

const AI_SETTINGS_CACHE_KEY = 'ai-settings'
const CACHE_TTL = 300 // 5 minutes

export async function GET(request: Request) {
  // Require authentication
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and above can view AI settings
  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const cache = createTenantCache(tenantSlug)
  const cached = await cache.get(AI_SETTINGS_CACHE_KEY)
  if (cached) {
    return NextResponse.json({ settings: cached })
  }

  const settings = await withTenant(tenantSlug, () => getAISettings(tenantId))

  if (!settings) {
    const defaults = await withTenant(tenantSlug, () =>
      upsertAISettings(tenantId, {}, null)
    )
    await cache.set(AI_SETTINGS_CACHE_KEY, defaults, { ttl: CACHE_TTL })
    return NextResponse.json({ settings: defaults })
  }

  await cache.set(AI_SETTINGS_CACHE_KEY, settings, { ttl: CACHE_TTL })
  return NextResponse.json({ settings })
}

export async function PATCH(request: Request) {
  // Require authentication
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and above can update AI settings
  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = auth.userId

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: AISettingsUpdate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowedFields: (keyof AISettingsUpdate)[] = [
    'aiEnabled',
    'briiEnabled',
    'aiContentEnabled',
    'aiInsightsEnabled',
    'aiModelPreference',
    'aiMonthlyBudgetUsd',
    'aiContentAutoApprove',
    'aiMemoryEnabled',
    'aiMemoryRetentionDays',
  ]

  const filteredUpdates: AISettingsUpdate = {}
  for (const key of allowedFields) {
    if (key in body) {
      (filteredUpdates as Record<string, unknown>)[key] = body[key]
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const currentSettings = await withTenant(tenantSlug, () => getAISettings(tenantId))
  const previousValues = currentSettings
    ? Object.fromEntries(
        Object.keys(filteredUpdates).map((key) => [
          key,
          (currentSettings as unknown as Record<string, unknown>)[key],
        ])
      )
    : null

  const updatedSettings = await withTenant(tenantSlug, () =>
    upsertAISettings(tenantId, filteredUpdates, userId)
  )

  await withTenant(tenantSlug, () =>
    logSettingsChange(
      tenantId,
      userId,
      'ai',
      filteredUpdates as unknown as Record<string, unknown>,
      previousValues
    )
  )

  const cache = createTenantCache(tenantSlug)
  await cache.delete(AI_SETTINGS_CACHE_KEY)

  return NextResponse.json({ settings: updatedSettings })
}
