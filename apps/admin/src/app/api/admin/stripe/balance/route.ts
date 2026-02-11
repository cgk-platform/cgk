/**
 * Stripe Balance API Routes
 * GET: Fetch current balance
 * POST: Create a top-up
 */

import { getTenantContext, requireAuth } from '@cgk/auth'
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
    // In production, this would call the Stripe API
    // For now, return mock data
    const balance: StripeBalance = {
      available: {
        usd: 2500000, // $25,000.00
        usdFormatted: formatCents(2500000),
      },
      pending: {
        usd: 150000, // $1,500.00
        usdFormatted: formatCents(150000),
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

    // In production, this would create a Stripe top-up via the API
    // For now, create a record with a mock Stripe ID
    const mockStripeTopupId = `tu_mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    const topup = await createStripeTopup(tenantId, {
      stripeTopupId: mockStripeTopupId,
      stripeSourceId: sourceId,
      amountCents,
      status: 'pending',
      description,
      createdBy: email || userId,
      linkedWithdrawalIds,
      expectedAvailableAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
    })

    // Log the action
    await logChange(tenantId, {
      source: 'admin',
      action: 'create',
      entityType: 'stripe_topup',
      entityId: topup.id,
      summary: `Created top-up for ${formatCents(amountCents)}`,
      details: { amountCents, stripeTopupId: mockStripeTopupId, description },
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
