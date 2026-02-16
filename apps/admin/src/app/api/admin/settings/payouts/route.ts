export const dynamic = 'force-dynamic'
export const revalidate = 0

import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { createTenantCache, withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getPayoutSettings,
  logSettingsChange,
  upsertPayoutSettings,
  type PayoutSettingsUpdate,
} from '@/lib/settings'

const PAYOUT_SETTINGS_CACHE_KEY = 'payout-settings'
const CACHE_TTL = 300 // 5 minutes

export async function GET(request: Request) {
  // Require authentication
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and above can view payout settings
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
  const cached = await cache.get(PAYOUT_SETTINGS_CACHE_KEY)
  if (cached) {
    return NextResponse.json({ settings: cached })
  }

  const settings = await withTenant(tenantSlug, () => getPayoutSettings(tenantId))

  if (!settings) {
    const defaults = await withTenant(tenantSlug, () =>
      upsertPayoutSettings(tenantId, {}, null)
    )
    await cache.set(PAYOUT_SETTINGS_CACHE_KEY, defaults, { ttl: CACHE_TTL })
    return NextResponse.json({ settings: defaults })
  }

  await cache.set(PAYOUT_SETTINGS_CACHE_KEY, settings, { ttl: CACHE_TTL })
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

  // Only admins and above can update payout settings
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

  let body: PayoutSettingsUpdate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowedFields: (keyof PayoutSettingsUpdate)[] = [
    'defaultPaymentMethod',
    'stripeConnectEnabled',
    'paypalEnabled',
    'wiseEnabled',
    'checkEnabled',
    'venmoEnabled',
    'payoutSchedule',
    'payoutDay',
    'minPayoutThresholdUsd',
    'maxPendingWithdrawals',
    'holdPeriodDays',
    'autoPayoutEnabled',
    'payoutFeeType',
    'payoutFeeAmount',
    'requireTaxInfo',
  ]

  const filteredUpdates: PayoutSettingsUpdate = {}
  for (const key of allowedFields) {
    if (key in body) {
      (filteredUpdates as Record<string, unknown>)[key] = body[key]
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  if (filteredUpdates.payoutDay !== undefined) {
    const day = filteredUpdates.payoutDay
    const schedule = filteredUpdates.payoutSchedule
    const isMonthlySchedule = schedule === 'monthly'

    if (isMonthlySchedule) {
      if (day < 1 || day > 28) {
        return NextResponse.json(
          { error: 'For monthly schedule, payout day must be between 1 and 28' },
          { status: 400 }
        )
      }
    } else {
      if (day < 1 || day > 7) {
        return NextResponse.json(
          { error: 'For weekly schedules, payout day must be between 1 (Monday) and 7 (Sunday)' },
          { status: 400 }
        )
      }
    }
  }

  if (
    filteredUpdates.minPayoutThresholdUsd !== undefined &&
    filteredUpdates.minPayoutThresholdUsd < 1
  ) {
    return NextResponse.json(
      { error: 'Minimum payout threshold must be at least $1.00' },
      { status: 400 }
    )
  }

  const currentSettings = await withTenant(tenantSlug, () => getPayoutSettings(tenantId))
  const previousValues = currentSettings
    ? Object.fromEntries(
        Object.keys(filteredUpdates).map((key) => [
          key,
          (currentSettings as unknown as Record<string, unknown>)[key],
        ])
      )
    : null

  const updatedSettings = await withTenant(tenantSlug, () =>
    upsertPayoutSettings(tenantId, filteredUpdates, userId)
  )

  await withTenant(tenantSlug, () =>
    logSettingsChange(
      tenantId,
      userId,
      'payout',
      filteredUpdates as unknown as Record<string, unknown>,
      previousValues
    )
  )

  const cache = createTenantCache(tenantSlug)
  await cache.delete(PAYOUT_SETTINGS_CACHE_KEY)

  return NextResponse.json({ settings: updatedSettings })
}
