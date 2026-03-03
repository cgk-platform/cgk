/**
 * Contractor Balance API
 *
 * GET /api/contractor/payments/balance - Get contractor balance
 */

import { getPayeeBalance } from '@cgk-platform/payments'

import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'
import { logger } from '@cgk-platform/logging'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  try {
    const balance = await getPayeeBalance(auth.contractorId, auth.tenantSlug)

    return Response.json({
      balance: {
        pendingCents: balance.pendingCents,
        availableCents: balance.availableCents,
        paidCents: balance.paidCents,
        lastUpdatedAt: balance.lastUpdatedAt.toISOString(),
      },
    })
  } catch (error) {
    logger.error('Error fetching balance:', error instanceof Error ? error : new Error(String(error)))
    return Response.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    )
  }
}
