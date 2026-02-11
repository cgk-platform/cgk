export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getTreasurySettings,
  updateTreasurySettings,
  getTopupSettings,
  updateTopupSettings,
} from '@/lib/treasury/db/settings'
import type {
  UpdateTreasurySettingsInput,
  UpdateTopupSettingsInput,
} from '@/lib/treasury/types'

/**
 * GET /api/admin/treasury/settings
 * Get treasury and topup settings
 */
export async function GET(_request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const [treasurySettings, topupSettings] = await Promise.all([
    getTreasurySettings(tenantSlug),
    getTopupSettings(tenantSlug),
  ])

  return NextResponse.json({
    treasury: treasurySettings,
    topup: topupSettings,
  })
}

/**
 * PATCH /api/admin/treasury/settings
 * Update treasury and/or topup settings
 */
export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: {
    treasury?: UpdateTreasurySettingsInput
    topup?: UpdateTopupSettingsInput
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const results: {
    treasury?: Awaited<ReturnType<typeof getTreasurySettings>>
    topup?: Awaited<ReturnType<typeof getTopupSettings>>
  } = {}

  if (body.treasury) {
    // Validate treasury settings
    if (body.treasury.auto_send_delay_hours !== undefined) {
      if (body.treasury.auto_send_delay_hours < 0 || body.treasury.auto_send_delay_hours > 168) {
        return NextResponse.json(
          { error: 'Auto-send delay must be between 0 and 168 hours' },
          { status: 400 }
        )
      }
    }

    if (body.treasury.low_balance_alert_threshold_cents !== undefined) {
      if (body.treasury.low_balance_alert_threshold_cents < 0) {
        return NextResponse.json(
          { error: 'Low balance threshold must be non-negative' },
          { status: 400 }
        )
      }
    }

    if (body.treasury.slack_webhook_url !== undefined && body.treasury.slack_webhook_url) {
      // Basic URL validation
      try {
        new URL(body.treasury.slack_webhook_url)
      } catch {
        return NextResponse.json(
          { error: 'Invalid Slack webhook URL' },
          { status: 400 }
        )
      }
    }

    results.treasury = await updateTreasurySettings(tenantSlug, body.treasury)
  }

  if (body.topup) {
    // Validate topup settings
    if (body.topup.auto_topup_threshold_cents !== undefined) {
      if (body.topup.auto_topup_threshold_cents < 0) {
        return NextResponse.json(
          { error: 'Auto top-up threshold must be non-negative' },
          { status: 400 }
        )
      }
    }

    if (body.topup.auto_topup_amount_cents !== undefined) {
      if (body.topup.auto_topup_amount_cents < 0) {
        return NextResponse.json(
          { error: 'Auto top-up amount must be non-negative' },
          { status: 400 }
        )
      }
    }

    results.topup = await updateTopupSettings(tenantSlug, body.topup)
  }

  // If neither was updated, return current settings
  if (!results.treasury && !results.topup) {
    const [treasurySettings, topupSettings] = await Promise.all([
      getTreasurySettings(tenantSlug),
      getTopupSettings(tenantSlug),
    ])
    return NextResponse.json({
      treasury: treasurySettings,
      topup: topupSettings,
    })
  }

  // Fill in missing results
  if (!results.treasury) {
    results.treasury = await getTreasurySettings(tenantSlug)
  }
  if (!results.topup) {
    results.topup = await getTopupSettings(tenantSlug)
  }

  return NextResponse.json(results)
}
