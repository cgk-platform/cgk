/**
 * Creator Transactions API Route
 *
 * GET /api/creator/payments/transactions - List balance transactions
 */

import { listBalanceTransactions, type BalanceTransactionType } from '@cgk-platform/payments'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * List balance transactions with filtering and pagination
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

    // Parse filters
    const type = searchParams.get('type') as BalanceTransactionType | null
    const brandId = searchParams.get('brandId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await listBalanceTransactions(context.creatorId, {
      type: type || undefined,
      brandId: brandId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: Math.min(limit, 100), // Cap at 100
      offset,
    })

    return Response.json({
      transactions: result.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amountCents,
        currency: t.currency,
        balanceAfter: t.balanceAfterCents,
        description: t.description,
        brandId: t.brandId,
        orderId: t.orderId,
        projectId: t.projectId,
        withdrawalId: t.withdrawalId,
        availableAt: t.availableAt?.toISOString(),
        createdAt: t.createdAt.toISOString(),
      })),
      pagination: {
        total: result.total,
        offset: result.offset,
        limit: result.limit,
        hasMore: result.hasMore,
      },
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return Response.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
