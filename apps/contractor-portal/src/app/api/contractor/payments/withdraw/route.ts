/**
 * Withdrawal API
 *
 * GET  /api/contractor/payments/withdraw - List withdrawal history
 * POST /api/contractor/payments/withdraw - Request withdrawal
 */

import {
  createContractorWithdrawal,
  getContractorWithdrawals,
  getPayeeBalance,
  WithdrawalError,
  type ContractorWithdrawalStatus,
} from '@cgk-platform/payments'

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
  const status = url.searchParams.get('status') as ContractorWithdrawalStatus | null

  try {
    const result = await getContractorWithdrawals(
      auth.contractorId,
      auth.tenantSlug,
      {
        limit: Math.min(limit, 100),
        offset,
        status: status || undefined,
      }
    )

    return Response.json({
      withdrawals: result.withdrawals.map((w) => ({
        id: w.id,
        amountCents: w.amountCents,
        status: w.status,
        payoutMethodId: w.payoutMethodId,
        payoutMethod: w.payoutMethod
          ? {
              id: w.payoutMethod.id,
              type: w.payoutMethod.type,
              paypalEmail: w.payoutMethod.paypalEmail,
              venmoHandle: w.payoutMethod.venmoHandle,
              accountLastFour: w.payoutMethod.accountLastFour,
            }
          : null,
        processedAt: w.processedAt?.toISOString() || null,
        failureReason: w.failureReason,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })),
      total: result.total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching withdrawals:', error)
    return Response.json(
      { error: 'Failed to fetch withdrawals' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  let body: {
    amountCents?: number
    payoutMethodId: string
    withdrawAll?: boolean
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.payoutMethodId) {
    return Response.json({ error: 'Payout method ID is required' }, { status: 400 })
  }

  // Get amount - either specified or full balance
  let amountCents = body.amountCents

  if (!amountCents || body.withdrawAll) {
    const balance = await getPayeeBalance(auth.contractorId, auth.tenantSlug)
    amountCents = balance.availableCents
  }

  if (!amountCents || amountCents <= 0) {
    return Response.json({ error: 'No available balance to withdraw' }, { status: 400 })
  }

  try {
    const withdrawal = await createContractorWithdrawal(
      auth.contractorId,
      auth.tenantId,
      auth.tenantSlug,
      {
        amountCents,
        payoutMethodId: body.payoutMethodId,
      }
    )

    return Response.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amountCents: withdrawal.amountCents,
        status: withdrawal.status,
        payoutMethodId: withdrawal.payoutMethodId,
        createdAt: withdrawal.createdAt.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof WithdrawalError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }
    console.error('Error creating withdrawal:', error)
    return Response.json(
      { error: 'Failed to create withdrawal' },
      { status: 500 }
    )
  }
}
