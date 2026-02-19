/**
 * Stripe Connect OAuth Callback API
 *
 * GET /api/contractor/payments/connect/oauth/callback - Handle OAuth callback
 */

import {
  handleStripeOAuthCallback,
  StripeConnectError,
  validateStripeOAuthState,
} from '@cgk-platform/payments'

import { getContractorAuthContext } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    const redirectUrl = new URL('/settings/payout-methods', url.origin)
    redirectUrl.searchParams.set('error', errorDescription || error)
    return Response.redirect(redirectUrl.toString())
  }

  if (!code || !state) {
    const redirectUrl = new URL('/settings/payout-methods', url.origin)
    redirectUrl.searchParams.set('error', 'Missing authorization code')
    return Response.redirect(redirectUrl.toString())
  }

  // Verify contractor is authenticated — reject if session is invalid
  const authContext = await getContractorAuthContext(req)
  if (!authContext) {
    const redirectUrl = new URL('/login', url.origin)
    redirectUrl.searchParams.set('error', 'Session expired. Please log in and try again.')
    return Response.redirect(redirectUrl.toString())
  }

  // Validate HMAC-signed state (verifies signature + expiry)
  let stateData: { payeeId: string; tenantSlug: string; timestamp: number }
  try {
    stateData = await validateStripeOAuthState<{ payeeId: string; tenantSlug: string }>(state)
  } catch {
    const redirectUrl = new URL('/settings/payout-methods', url.origin)
    redirectUrl.searchParams.set('error', 'Invalid or expired state parameter')
    return Response.redirect(redirectUrl.toString())
  }

  // Verify the payeeId from state matches the authenticated contractor
  if (stateData.payeeId !== authContext.contractorId) {
    const redirectUrl = new URL('/settings/payout-methods', url.origin)
    redirectUrl.searchParams.set('error', 'Session mismatch — OAuth was initiated by a different user')
    return Response.redirect(redirectUrl.toString())
  }

  const tenantSlug = stateData.tenantSlug

  try {
    await handleStripeOAuthCallback(code, state, tenantSlug)

    // Redirect to payout methods page with success message
    const redirectUrl = new URL('/settings/payout-methods', url.origin)
    redirectUrl.searchParams.set('success', 'Stripe account connected')
    return Response.redirect(redirectUrl.toString())
  } catch (err) {
    console.error('Stripe OAuth callback error:', err)

    const redirectUrl = new URL('/settings/payout-methods', url.origin)
    if (err instanceof StripeConnectError) {
      redirectUrl.searchParams.set('error', err.message)
    } else {
      redirectUrl.searchParams.set('error', 'Failed to connect Stripe account')
    }
    return Response.redirect(redirectUrl.toString())
  }
}
