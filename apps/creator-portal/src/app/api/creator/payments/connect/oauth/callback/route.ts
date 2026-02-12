/**
 * Stripe Connect OAuth Callback API Route
 *
 * GET /api/creator/payments/connect/oauth/callback - Handle OAuth callback
 */

import { sql } from '@cgk/db'
import { completeStripeOAuth, createStripeConnectProvider } from '@cgk/payments'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

/**
 * Handle Stripe OAuth callback
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('Stripe OAuth error:', error, errorDescription)
    return redirect('/creator/settings/payout-methods?error=oauth_failed')
  }

  if (!code || !state) {
    return redirect('/creator/settings/payout-methods?error=invalid_callback')
  }

  if (!STRIPE_SECRET_KEY) {
    return redirect('/creator/settings/payout-methods?error=stripe_not_configured')
  }

  try {
    // Decode state
    const stateData = JSON.parse(
      Buffer.from(state, 'base64url').toString('utf-8')
    ) as {
      creatorId: string
      methodId: string
      country: string
    }

    // Exchange code for account ID
    const oauthResult = await completeStripeOAuth(STRIPE_SECRET_KEY, code)

    // Get account status
    const provider = createStripeConnectProvider({ secretKey: STRIPE_SECRET_KEY })
    const accountStatus = await provider.getAccountStatus(oauthResult.accountId)

    // Update payment method record
    await sql`
      UPDATE creator_payment_methods
      SET
        stripe_account_id = ${oauthResult.accountId},
        stripe_onboarding_complete = ${accountStatus.onboardingComplete},
        stripe_charges_enabled = ${accountStatus.chargesEnabled},
        stripe_payouts_enabled = ${accountStatus.payoutsEnabled},
        status = ${accountStatus.payoutsEnabled ? 'active' : 'setup_required'},
        updated_at = NOW()
      WHERE id = ${stateData.methodId}
      AND creator_id = ${stateData.creatorId}
    `

    // Set as default if this is the first active method
    const activeCount = await sql<{ count: string }>`
      SELECT COUNT(*) as count FROM creator_payment_methods
      WHERE creator_id = ${stateData.creatorId}
      AND status = 'active'
      AND id != ${stateData.methodId}
    `

    if (parseInt(activeCount.rows[0]?.count || '0', 10) === 0 && accountStatus.payoutsEnabled) {
      await sql`
        UPDATE creator_payment_methods
        SET is_default = true
        WHERE id = ${stateData.methodId}
      `
    }

    // Redirect to success page
    return redirect('/creator/settings/payout-methods?setup=complete')
  } catch (err) {
    console.error('Error handling OAuth callback:', err)
    return redirect('/creator/settings/payout-methods?error=oauth_failed')
  }
}
