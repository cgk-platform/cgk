/**
 * Recovery Settings API Route
 * GET: Get tenant recovery settings
 * PUT: Update tenant recovery settings
 */

export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getRecoverySettings,
  updateRecoverySettings,
} from '@/lib/abandoned-checkouts/db'
import type { UpdateRecoverySettingsRequest } from '@/lib/abandoned-checkouts/types'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const settings = await withTenant(tenantSlug, async () => {
      return getRecoverySettings()
    })

    if (!settings) {
      return NextResponse.json(
        { error: 'Recovery settings not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Failed to fetch recovery settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recovery settings' },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: UpdateRecoverySettingsRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate inputs
  if (body.abandonmentTimeoutHours !== undefined && body.abandonmentTimeoutHours < 1) {
    return NextResponse.json(
      { error: 'Abandonment timeout must be at least 1 hour' },
      { status: 400 },
    )
  }

  if (body.maxRecoveryEmails !== undefined && (body.maxRecoveryEmails < 1 || body.maxRecoveryEmails > 3)) {
    return NextResponse.json(
      { error: 'Maximum recovery emails must be between 1 and 3' },
      { status: 400 },
    )
  }

  if (body.checkoutExpiryDays !== undefined && body.checkoutExpiryDays < 1) {
    return NextResponse.json(
      { error: 'Checkout expiry must be at least 1 day' },
      { status: 400 },
    )
  }

  try {
    const settings = await withTenant(tenantSlug, async () => {
      return updateRecoverySettings({
        enabled: body.enabled,
        abandonmentTimeoutHours: body.abandonmentTimeoutHours,
        maxRecoveryEmails: body.maxRecoveryEmails,
        sequence1DelayHours: body.sequence1DelayHours,
        sequence2DelayHours: body.sequence2DelayHours,
        sequence3DelayHours: body.sequence3DelayHours,
        sequence1IncentiveCode: body.sequence1IncentiveCode,
        sequence2IncentiveCode: body.sequence2IncentiveCode,
        sequence3IncentiveCode: body.sequence3IncentiveCode,
        sequence1Enabled: body.sequence1Enabled,
        sequence2Enabled: body.sequence2Enabled,
        sequence3Enabled: body.sequence3Enabled,
        checkoutExpiryDays: body.checkoutExpiryDays,
        highValueThresholdCents: body.highValueThresholdCents,
      })
    })

    if (!settings) {
      return NextResponse.json(
        { error: 'Failed to update recovery settings' },
        { status: 500 },
      )
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Failed to update recovery settings:', error)
    return NextResponse.json(
      { error: 'Failed to update recovery settings' },
      { status: 500 },
    )
  }
}
