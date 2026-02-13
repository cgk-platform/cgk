/**
 * Creator Withdrawal API Route
 *
 * GET /api/creator/payments/withdraw - List withdrawal requests
 * POST /api/creator/payments/withdraw - Create withdrawal request
 */

import {
  requestWithdrawal,
  listWithdrawalRequests,
  getActiveWithdrawal,
  type PayoutType,
  MINIMUM_WITHDRAWAL_CENTS,
  STORE_CREDIT_BONUS_PERCENT,
  calculateStoreCreditBonus,
} from '@cgk-platform/payments'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * List withdrawal requests
 */
export async function GET(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Get active withdrawal if any
    const activeWithdrawal = await getActiveWithdrawal(context.creatorId)

    // Get withdrawal history
    const { withdrawals, total } = await listWithdrawalRequests(context.creatorId, {
      limit: Math.min(limit, 100),
      offset,
    })

    return Response.json({
      activeWithdrawal: activeWithdrawal ? {
        id: activeWithdrawal.id,
        amount: activeWithdrawal.amountCents,
        currency: activeWithdrawal.currency,
        payoutType: activeWithdrawal.payoutType,
        storeCreditBonus: activeWithdrawal.storeCreditBonusCents,
        status: activeWithdrawal.status,
        provider: activeWithdrawal.provider,
        estimatedArrival: activeWithdrawal.estimatedArrival?.toISOString(),
        createdAt: activeWithdrawal.createdAt.toISOString(),
      } : null,
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amount: w.amountCents,
        currency: w.currency,
        payoutType: w.payoutType,
        storeCreditBonus: w.storeCreditBonusCents,
        status: w.status,
        provider: w.provider,
        completedAt: w.completedAt?.toISOString(),
        failureReason: w.failureReason,
        adminNote: w.adminNote,
        createdAt: w.createdAt.toISOString(),
      })),
      pagination: {
        total,
        offset,
        limit,
        hasMore: offset + withdrawals.length < total,
      },
    })
  } catch (error) {
    console.error('Error fetching withdrawals:', error)
    return Response.json({ error: 'Failed to fetch withdrawals' }, { status: 500 })
  }
}

/**
 * Create a withdrawal request
 */
export async function POST(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const body = await req.json() as {
      amountCents: number
      payoutType: PayoutType
      paymentMethodId?: string
      shopifyCustomerId?: string
    }

    const { amountCents, payoutType, paymentMethodId, shopifyCustomerId } = body

    // Validate amount
    if (!amountCents || amountCents < MINIMUM_WITHDRAWAL_CENTS) {
      return Response.json({
        error: `Minimum withdrawal amount is $${(MINIMUM_WITHDRAWAL_CENTS / 100).toFixed(2)}`,
      }, { status: 400 })
    }

    // Validate payout type
    if (!payoutType || !['cash', 'store_credit'].includes(payoutType)) {
      return Response.json({ error: 'Invalid payout type' }, { status: 400 })
    }

    // Require payment method for cash payouts
    if (payoutType === 'cash' && !paymentMethodId) {
      return Response.json({ error: 'Payment method required for cash withdrawals' }, { status: 400 })
    }

    // Create withdrawal request
    const result = await requestWithdrawal({
      creatorId: context.creatorId,
      amountCents,
      payoutType,
      paymentMethodId,
      shopifyCustomerId,
    })

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 })
    }

    const withdrawal = result.withdrawal!

    return Response.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amountCents,
        currency: withdrawal.currency,
        payoutType: withdrawal.payoutType,
        storeCreditBonus: withdrawal.storeCreditBonusCents,
        totalCredit: payoutType === 'store_credit'
          ? withdrawal.amountCents + (withdrawal.storeCreditBonusCents || 0)
          : undefined,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt.toISOString(),
      },
      message: payoutType === 'store_credit'
        ? `Store credit of $${((withdrawal.amountCents + (withdrawal.storeCreditBonusCents || 0)) / 100).toFixed(2)} (includes ${STORE_CREDIT_BONUS_PERCENT}% bonus) is being processed.`
        : `Withdrawal of $${(withdrawal.amountCents / 100).toFixed(2)} is being processed.`,
    })
  } catch (error) {
    console.error('Error creating withdrawal:', error)
    return Response.json({ error: 'Failed to create withdrawal' }, { status: 500 })
  }
}

/**
 * Preview store credit bonus
 */
export async function OPTIONS(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const amountCents = parseInt(searchParams.get('amount') || '0', 10)

  if (amountCents < MINIMUM_WITHDRAWAL_CENTS) {
    return Response.json({
      error: `Minimum amount is $${(MINIMUM_WITHDRAWAL_CENTS / 100).toFixed(2)}`,
    }, { status: 400 })
  }

  const bonus = calculateStoreCreditBonus(amountCents)

  return Response.json({
    baseAmount: amountCents,
    bonusAmount: bonus,
    bonusPercent: STORE_CREDIT_BONUS_PERCENT,
    totalCredit: amountCents + bonus,
  })
}
