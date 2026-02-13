/**
 * Stripe Connect Account Sync API
 *
 * POST /api/contractor/payments/connect/sync - Sync account status from Stripe
 */

import { StripeConnectError, syncStripeAccountStatus } from '@cgk-platform/payments'

import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  try {
    const status = await syncStripeAccountStatus(
      auth.contractorId,
      auth.tenantSlug
    )

    return Response.json({
      success: true,
      status: status.status,
      payoutsEnabled: status.payoutsEnabled,
      requirementsDue: status.requirementsDue,
    })
  } catch (error) {
    if (error instanceof StripeConnectError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }
    console.error('Error syncing Stripe account:', error)
    return Response.json(
      { error: 'Failed to sync Stripe account' },
      { status: 500 }
    )
  }
}
