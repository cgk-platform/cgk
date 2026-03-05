/**
 * Stripe Connect Available Countries API
 *
 * GET /api/contractor/payments/connect/countries - Get available countries
 */

import { logger } from '@cgk-platform/logging'
import { getAvailableCountries } from '@cgk-platform/payments'

import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    // Verify auth but don't need the result
    await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  try {
    const countries = getAvailableCountries()

    return Response.json({
      countries,
    })
  } catch (error) {
    logger.error('Error fetching countries:', error instanceof Error ? error : new Error(String(error)))
    return Response.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    )
  }
}
