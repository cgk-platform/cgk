export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

import { requireAuth, checkPermissionOrRespond } from '@cgk-platform/auth'
import { sql, withTenant } from '@cgk-platform/db'
import {
  getTenantStripeClient,
  getTenantWiseClient,
} from '@cgk-platform/integrations'

import {
  getWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  markWithdrawalProcessing,
  processWithdrawal,
  failWithdrawal,
} from '@/lib/payouts/db'

type Action = 'approve' | 'reject' | 'execute'

interface PayoutMethod {
  stripe_account_id: string | null
  wise_recipient_id: string | null
}

/**
 * Get creator's payout method info (Stripe account ID or Wise recipient ID)
 */
async function getCreatorPayoutMethod(
  tenantSlug: string,
  creatorId: string,
  method: 'stripe' | 'wise'
): Promise<PayoutMethod | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        stripe_account_id,
        wise_recipient_id
      FROM payout_methods
      WHERE payee_id = ${creatorId}
        AND type = ${method === 'stripe' ? 'stripe_connect' : 'wise'}
        AND status = 'active'
      LIMIT 1
    `
    const row = result.rows[0]
    if (!row) return null
    return {
      stripe_account_id: row.stripe_account_id as string | null,
      wise_recipient_id: row.wise_recipient_id as string | null,
    }
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Authenticate and get tenant context
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Check permission
  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId,
    'payouts.process'
  )
  if (permissionDenied) return permissionDenied

  // Get tenant slug for database operations
  const orgResult = await sql`
    SELECT slug FROM public.organizations
    WHERE id = ${auth.tenantId}
    LIMIT 1
  `
  const tenantSlug = orgResult.rows[0]?.slug as string
  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
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
      { status: 400 }
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
          { status: 400 }
        )
      }
      const success = await approveWithdrawal(tenantSlug, id, auth.userId)
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to approve withdrawal' },
          { status: 500 }
        )
      }
      return NextResponse.json({ success: true, status: 'approved' })
    }

    case 'reject': {
      if (withdrawal.status !== 'pending') {
        return NextResponse.json(
          { error: 'Can only reject pending withdrawals' },
          { status: 400 }
        )
      }
      const reason = body.reason || 'Rejected by admin'
      const success = await rejectWithdrawal(tenantSlug, id, reason)
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to reject withdrawal' },
          { status: 500 }
        )
      }
      return NextResponse.json({ success: true, status: 'rejected' })
    }

    case 'execute': {
      if (withdrawal.status !== 'approved') {
        return NextResponse.json(
          { error: 'Can only execute approved withdrawals' },
          { status: 400 }
        )
      }

      await markWithdrawalProcessing(tenantSlug, id)

      try {
        const transferId = await executePayoutTransfer(
          auth.tenantId,
          tenantSlug,
          withdrawal
        )
        await processWithdrawal(tenantSlug, id, transferId)
        return NextResponse.json({
          success: true,
          status: 'completed',
          transferId,
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        await failWithdrawal(tenantSlug, id, errorMessage)
        return NextResponse.json(
          { error: `Payout failed: ${errorMessage}`, status: 'failed' },
          { status: 500 }
        )
      }
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}

async function executePayoutTransfer(
  tenantId: string,
  tenantSlug: string,
  withdrawal: {
    id: string
    creator_id: string
    amount_cents: number
    currency: string
    method: string
    creator_email: string
  }
): Promise<string> {
  if (withdrawal.method === 'stripe') {
    return executeStripeTransfer(tenantId, tenantSlug, withdrawal)
  } else if (withdrawal.method === 'wise') {
    return executeWiseTransfer(tenantId, tenantSlug, withdrawal)
  } else {
    // Manual payout - just generate a reference ID
    return `manual_${withdrawal.id}_${Date.now()}`
  }
}

async function executeStripeTransfer(
  tenantId: string,
  tenantSlug: string,
  withdrawal: {
    id: string
    creator_id: string
    amount_cents: number
    currency: string
    creator_email: string
  }
): Promise<string> {
  // Get tenant's Stripe client
  const stripe = await getTenantStripeClient(tenantId)
  if (!stripe) {
    throw new Error('Stripe is not configured for this tenant')
  }

  // Get creator's Stripe Connect account ID
  const payoutMethod = await getCreatorPayoutMethod(
    tenantSlug,
    withdrawal.creator_id,
    'stripe'
  )
  if (!payoutMethod?.stripe_account_id) {
    throw new Error(
      'Creator does not have a connected Stripe account for payouts'
    )
  }

  // Create the transfer using tenant's Stripe account
  const transfer = await stripe.transfers.create({
    amount: withdrawal.amount_cents,
    currency: withdrawal.currency.toLowerCase(),
    destination: payoutMethod.stripe_account_id,
    transfer_group: `withdrawal_${withdrawal.id}`,
    metadata: {
      withdrawal_id: withdrawal.id,
      creator_email: withdrawal.creator_email,
    },
  })

  return transfer.id
}

async function executeWiseTransfer(
  tenantId: string,
  tenantSlug: string,
  withdrawal: {
    id: string
    creator_id: string
    amount_cents: number
    currency: string
    creator_email: string
  }
): Promise<string> {
  // Get tenant's Wise client
  const wise = await getTenantWiseClient(tenantId)
  if (!wise) {
    throw new Error('Wise is not configured for this tenant')
  }

  // Get creator's Wise recipient ID
  const payoutMethod = await getCreatorPayoutMethod(
    tenantSlug,
    withdrawal.creator_id,
    'wise'
  )
  if (!payoutMethod?.wise_recipient_id) {
    throw new Error('Creator does not have a Wise recipient configured')
  }

  const wiseRecipientId = parseInt(payoutMethod.wise_recipient_id, 10)
  if (isNaN(wiseRecipientId)) {
    throw new Error('Invalid Wise recipient ID')
  }

  // Create a quote for the transfer
  const quote = await wise.createQuote({
    sourceCurrency: withdrawal.currency.toUpperCase(),
    targetCurrency: withdrawal.currency.toUpperCase(),
    sourceAmount: withdrawal.amount_cents / 100,
  })

  // Create the transfer
  const transfer = await wise.createTransfer({
    targetAccount: wiseRecipientId,
    quoteUuid: quote.id,
    customerTransactionId: `withdrawal_${withdrawal.id}`,
    details: {
      reference: `Payout ${withdrawal.id}`,
    },
  })

  // Fund the transfer from Wise balance
  await wise.fundTransfer(String(transfer.id))

  return String(transfer.id)
}
