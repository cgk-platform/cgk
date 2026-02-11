/**
 * Stripe Funding Sources API Routes
 * GET: Fetch available funding sources
 * POST: Update default funding source settings
 */

import { getTenantContext, requireAuth } from '@cgk/auth'
import { NextResponse } from 'next/server'

import {
  getStripeTopupSettings,
  logChange,
  upsertStripeTopupSettings,
} from '@/lib/admin-utilities/db'
import type { StripeFundingSource } from '@/lib/admin-utilities/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    // In production, this would fetch from Stripe API
    // For now, return mock data
    const sources: StripeFundingSource[] = [
      {
        id: 'ba_mock_1234567890',
        last4: '6789',
        bankName: 'Chase',
        status: 'verified',
        type: 'bank_account',
      },
      {
        id: 'ba_mock_0987654321',
        last4: '4321',
        bankName: 'Bank of America',
        status: 'verified',
        type: 'bank_account',
      },
    ]

    const settings = await getStripeTopupSettings(tenantId)

    return NextResponse.json({
      sources,
      settings,
      configuredInDashboard: sources.length > 0,
    })
  } catch (error) {
    console.error('Failed to fetch funding sources:', error)
    return NextResponse.json({ error: 'Failed to fetch funding sources' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { tenantId, userId, email } = await requireAuth(req)

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const {
      defaultSourceId,
      defaultSourceLast4,
      defaultSourceBankName,
      autoTopupEnabled,
      autoTopupThresholdCents,
      autoTopupAmountCents,
    } = body

    const settings = await upsertStripeTopupSettings(tenantId, {
      defaultSourceId,
      defaultSourceLast4,
      defaultSourceBankName,
      autoTopupEnabled,
      autoTopupThresholdCents,
      autoTopupAmountCents,
    })

    // Log the change
    await logChange(tenantId, {
      source: 'admin',
      action: 'update',
      entityType: 'stripe_topup_settings',
      entityId: settings.id,
      summary: 'Updated Stripe top-up settings',
      details: { autoTopupEnabled, defaultSourceId },
      userId,
      userEmail: email,
    })

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Failed to update funding source settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
