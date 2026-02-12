/**
 * Stripe Connect Available Countries API
 *
 * GET /api/contractor/payments/connect/countries - Get available countries
 */

import { getAvailableCountries } from '@cgk/payments'

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
    console.error('Error fetching countries:', error)
    return Response.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    )
  }
}
