export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  markWithdrawalProcessing,
  processWithdrawal,
  failWithdrawal,
} from '@/lib/payouts/db'

type Action = 'approve' | 'reject' | 'execute'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { action?: Action; reason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validActions: Action[] = ['approve', 'reject', 'execute']
  if (!body.action || !validActions.includes(body.action)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
      { status: 400 },
    )
  }

  const withdrawal = await getWithdrawal(tenantSlug, id)
  if (!withdrawal) {
    return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
  }

  switch (body.action) {
    case 'approve': {
      if (withdrawal.status !== 'pending') {
        return NextResponse.json(
          { error: 'Can only approve pending withdrawals' },
          { status: 400 },
        )
      }
      const success = await approveWithdrawal(tenantSlug, id, userId)
      if (!success) {
        return NextResponse.json({ error: 'Failed to approve withdrawal' }, { status: 500 })
      }
      return NextResponse.json({ success: true, status: 'approved' })
    }

    case 'reject': {
      if (withdrawal.status !== 'pending') {
        return NextResponse.json(
          { error: 'Can only reject pending withdrawals' },
          { status: 400 },
        )
      }
      const reason = body.reason || 'Rejected by admin'
      const success = await rejectWithdrawal(tenantSlug, id, reason)
      if (!success) {
        return NextResponse.json({ error: 'Failed to reject withdrawal' }, { status: 500 })
      }
      return NextResponse.json({ success: true, status: 'rejected' })
    }

    case 'execute': {
      if (withdrawal.status !== 'approved') {
        return NextResponse.json(
          { error: 'Can only execute approved withdrawals' },
          { status: 400 },
        )
      }

      await markWithdrawalProcessing(tenantSlug, id)

      try {
        const transferId = await executePayoutTransfer(withdrawal)
        await processWithdrawal(tenantSlug, id, transferId)
        return NextResponse.json({ success: true, status: 'completed', transferId })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await failWithdrawal(tenantSlug, id, errorMessage)
        return NextResponse.json(
          { error: `Payout failed: ${errorMessage}`, status: 'failed' },
          { status: 500 },
        )
      }
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}

async function executePayoutTransfer(withdrawal: {
  id: string
  amount_cents: number
  currency: string
  method: string
  creator_email: string
}): Promise<string> {
  if (withdrawal.method === 'stripe') {
    return executeStripeTransfer(withdrawal)
  } else if (withdrawal.method === 'wise') {
    return executeWiseTransfer(withdrawal)
  } else {
    return `manual_${withdrawal.id}_${Date.now()}`
  }
}

async function executeStripeTransfer(withdrawal: {
  id: string
  amount_cents: number
  currency: string
  creator_email: string
}): Promise<string> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    throw new Error('Stripe is not configured')
  }

  const response = await fetch('https://api.stripe.com/v1/transfers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: String(withdrawal.amount_cents),
      currency: withdrawal.currency.toLowerCase(),
      destination: 'CONNECTED_ACCOUNT_ID',
      transfer_group: `withdrawal_${withdrawal.id}`,
      metadata: JSON.stringify({
        withdrawal_id: withdrawal.id,
        creator_email: withdrawal.creator_email,
      }),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Stripe transfer failed')
  }

  const transfer = await response.json()
  return transfer.id
}

async function executeWiseTransfer(withdrawal: {
  id: string
  amount_cents: number
  currency: string
  creator_email: string
}): Promise<string> {
  const wiseApiToken = process.env.WISE_API_TOKEN
  if (!wiseApiToken) {
    throw new Error('Wise is not configured')
  }

  return `wise_${withdrawal.id}_${Date.now()}`
}
