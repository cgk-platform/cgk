/**
 * Contractor Transactions API
 *
 * GET /api/contractor/payments/transactions - List balance transactions
 */

import { getBalanceTransactions, type ContractorTransactionType } from '@cgk-platform/payments'

import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const type = url.searchParams.get('type') as ContractorTransactionType | null

  try {
    const result = await getBalanceTransactions(
      auth.contractorId,
      auth.tenantSlug,
      {
        limit: Math.min(limit, 100),
        offset,
        type: type || undefined,
      }
    )

    return Response.json({
      transactions: result.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amountCents: t.amountCents,
        balanceAfterCents: t.balanceAfterCents,
        description: t.description,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        createdAt: t.createdAt.toISOString(),
      })),
      total: result.total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return Response.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
