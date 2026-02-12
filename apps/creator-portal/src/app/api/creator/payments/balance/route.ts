/**
 * Creator Balance API Route
 *
 * GET /api/creator/payments/balance - Get creator balance summary
 */

import {
  getCreatorBalance,
  getEarningsBreakdown,
  getUpcomingMaturations,
  getWithdrawalBlockingStatus,
  MINIMUM_WITHDRAWAL_CENTS,
} from '@cgk/payments'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Get creator balance summary with earnings breakdown
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
    // Get balance, earnings breakdown, and upcoming maturations in parallel
    const [balance, earnings, upcomingMaturations, blockingStatus] = await Promise.all([
      getCreatorBalance(context.creatorId),
      getEarningsBreakdown(context.creatorId),
      getUpcomingMaturations(context.creatorId, 30),
      getWithdrawalBlockingStatus(context.creatorId),
    ])

    return Response.json({
      balance: {
        available: balance.availableCents,
        pending: balance.pendingCents,
        withdrawn: balance.withdrawnCents,
        currency: balance.currency,
        byBrand: balance.byBrand?.map((b) => ({
          brandId: b.brandId,
          brandName: b.brandName,
          available: b.availableCents,
          pending: b.pendingCents,
        })),
      },
      earnings: {
        commissions: earnings.commissionsCents,
        projectPayments: earnings.projectPaymentsCents,
        bonuses: earnings.bonusesCents,
        adjustments: earnings.adjustmentsCents,
        total: earnings.totalCents,
      },
      upcomingMaturations: upcomingMaturations.map((m) => ({
        date: m.date.toISOString(),
        amount: m.amountCents,
        count: m.count,
      })),
      withdrawal: {
        minimumCents: MINIMUM_WITHDRAWAL_CENTS,
        canWithdraw: blockingStatus.canWithdraw,
        blockers: blockingStatus.blockers,
      },
    })
  } catch (error) {
    console.error('Error fetching balance:', error)
    return Response.json({ error: 'Failed to fetch balance' }, { status: 500 })
  }
}
