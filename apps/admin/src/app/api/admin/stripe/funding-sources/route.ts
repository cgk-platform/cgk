/**
 * Stripe Funding Sources API Routes
 * GET: Fetch available funding sources
 * POST: Update default funding source settings
 */

import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import { getTenantStripeClient } from '@cgk-platform/integrations'
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
    // Get tenant's Stripe client
    const stripe = await getTenantStripeClient(tenantId)

    if (!stripe) {
      // Stripe not configured - return empty sources
      const settings = await getStripeTopupSettings(tenantId)
      return NextResponse.json({
        sources: [],
        settings,
        configuredInDashboard: false,
        error: 'Stripe is not configured for this tenant',
      })
    }

    // Fetch bank accounts from Stripe
    // Using payment methods API for US bank accounts
    const sources: StripeFundingSource[] = []

    try {
      // List US bank account payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        type: 'us_bank_account',
        limit: 10,
      })

      for (const pm of paymentMethods.data) {
        if (pm.us_bank_account) {
          sources.push({
            id: pm.id,
            last4: pm.us_bank_account.last4 ?? '****',
            bankName: pm.us_bank_account.bank_name ?? 'Bank Account',
            status: pm.us_bank_account.status_details?.blocked ? 'errored' : 'verified',
            type: 'bank_account',
          })
        }
      }
    } catch (error) {
      // Payment methods API may require customer context
      // Log and continue with empty sources
      console.warn('Failed to list payment methods:', error)
    }

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
