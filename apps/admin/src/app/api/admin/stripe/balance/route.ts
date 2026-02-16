/**
 * Stripe Balance API Routes
 * GET: Fetch current balance
 * POST: Create a top-up
 */

import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import { getTenantStripeClient } from '@cgk-platform/integrations'
import { NextResponse } from 'next/server'

import { createStripeTopup, logChange } from '@/lib/admin-utilities/db'
import type { CreateTopupRequest, StripeBalance } from '@/lib/admin-utilities/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Format cents to USD string
function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    // Get tenant's Stripe client
    const stripe = await getTenantStripeClient(tenantId)

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured for this tenant' },
        { status: 400 }
      )
    }

    // Fetch real balance from Stripe
    const stripeBalance = await stripe.balance.retrieve()

    // Extract USD amounts (or default to 0)
    const availableUsd = stripeBalance.available.find((b) => b.currency === 'usd')?.amount ?? 0
    const pendingUsd = stripeBalance.pending.find((b) => b.currency === 'usd')?.amount ?? 0

    const balance: StripeBalance = {
      available: {
        usd: availableUsd,
        usdFormatted: formatCents(availableUsd),
      },
      pending: {
        usd: pendingUsd,
        usdFormatted: formatCents(pendingUsd),
      },
    }

    return NextResponse.json(balance)
  } catch (error) {
    console.error('Failed to fetch Stripe balance:', error)
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { tenantId, userId, email } = await requireAuth(req)

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body: CreateTopupRequest = await req.json()
    const { amountCents, description, sourceId, linkedWithdrawalIds } = body

    if (!amountCents || amountCents <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be greater than 0' },
        { status: 400 }
      )
    }

    // Get tenant's Stripe client
    const stripe = await getTenantStripeClient(tenantId)

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured for this tenant' },
        { status: 400 }
      )
    }

    // Create real Stripe top-up
    const stripeTopup = await stripe.topups.create({
      amount: amountCents,
      currency: 'usd',
      description: description || 'Balance top-up',
      source: sourceId,
      metadata: {
        tenant_id: tenantId,
        created_by: email || userId,
      },
    })

    const topup = await createStripeTopup(tenantId, {
      stripeTopupId: stripeTopup.id,
      stripeSourceId: sourceId,
      amountCents,
      status: stripeTopup.status === 'succeeded' ? 'succeeded' : 'pending',
      description,
      createdBy: email || userId,
      linkedWithdrawalIds,
      expectedAvailableAt: stripeTopup.expected_availability_date
        ? new Date(stripeTopup.expected_availability_date * 1000).toISOString()
        : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    })

    // Log the action
    await logChange(tenantId, {
      source: 'admin',
      action: 'create',
      entityType: 'stripe_topup',
      entityId: topup.id,
      summary: `Created top-up for ${formatCents(amountCents)}`,
      details: { amountCents, stripeTopupId: stripeTopup.id, description },
      userId,
      userEmail: email,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: topup.id,
        stripeTopupId: topup.stripeTopupId,
        amountFormatted: formatCents(amountCents),
      },
    })
  } catch (error) {
    console.error('Failed to create top-up:', error)
    return NextResponse.json({ error: 'Failed to create top-up' }, { status: 500 })
  }
}
