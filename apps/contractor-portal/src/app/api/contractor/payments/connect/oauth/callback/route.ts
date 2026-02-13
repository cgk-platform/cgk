/**
 * Stripe Connect OAuth Callback API
 *
 * GET /api/contractor/payments/connect/oauth/callback - Handle OAuth callback
 */

import { handleStripeOAuthCallback, StripeConnectError } from '@cgk-platform/payments'

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

  // Get auth context - may not be available if session expired (not used but available for future logging)
  await getContractorAuthContext(req)

  // Decode state to get tenant slug
  let stateData: { payeeId: string; tenantSlug: string }
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString())
  } catch {
    const redirectUrl = new URL('/settings/payout-methods', url.origin)
    redirectUrl.searchParams.set('error', 'Invalid state parameter')
    return Response.redirect(redirectUrl.toString())
  }

  // Use tenant from state since session might be different
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
