/**
 * Stripe Connect OAuth Initiation API
 *
 * POST /api/contractor/payments/connect/oauth - Get OAuth URL
 */

import { getStripeOAuthUrl } from '@cgk-platform/payments'

import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'
import { logger } from '@cgk-platform/logging'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  try {
    // Construct callback URL
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const redirectUrl = `${origin}/api/contractor/payments/connect/oauth/callback`

    const oauthUrl = await getStripeOAuthUrl(
      auth.contractorId,
      auth.tenantSlug,
      redirectUrl
    )

    return Response.json({
      success: true,
      url: oauthUrl,
    })
  } catch (error) {
    logger.error('Error generating OAuth URL:', error instanceof Error ? error : new Error(String(error)))
    return Response.json(
      { error: 'Failed to generate OAuth URL' },
      { status: 500 }
    )
  }
}
