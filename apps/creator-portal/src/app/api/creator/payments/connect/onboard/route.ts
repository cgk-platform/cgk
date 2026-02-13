/**
 * Stripe Connect Onboarding API Route
 *
 * GET /api/creator/payments/connect/onboard - Get Stripe account status
 * POST /api/creator/payments/connect/onboard - Start Stripe onboarding
 */

import { sql } from '@cgk-platform/db'
import {
  createStripeConnectProvider,
  createStripeAccountLink,
  requiresStripeStandardAccount,
} from '@cgk-platform/payments'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

/**
 * Get Stripe Connect account status
 */
export async function GET(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  if (!STRIPE_SECRET_KEY) {
    return Response.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  try {
    // Get existing Stripe Connect method
    const methodResult = await sql<{
      id: string
      stripe_account_id: string | null
      stripe_account_type: string | null
      stripe_onboarding_complete: boolean | null
      stripe_charges_enabled: boolean | null
      stripe_payouts_enabled: boolean | null
      stripe_country: string | null
      status: string
    }>`
      SELECT * FROM creator_payment_methods
      WHERE creator_id = ${context.creatorId}
      AND type = 'stripe_connect'
      AND status != 'removed'
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (methodResult.rows.length === 0) {
      return Response.json({
        hasAccount: false,
        status: 'not_started',
      })
    }

    const method = methodResult.rows[0]
    if (!method) {
      return Response.json({
        hasAccount: false,
        status: 'not_started',
      })
    }

    if (!method.stripe_account_id) {
      return Response.json({
        hasAccount: false,
        status: 'not_started',
        methodId: method.id,
      })
    }

    // Get live status from Stripe
    const provider = createStripeConnectProvider({ secretKey: STRIPE_SECRET_KEY })
    const accountStatus = await provider.getAccountStatus(method.stripe_account_id)

    // Update our database with current status
    await sql`
      UPDATE creator_payment_methods
      SET
        stripe_onboarding_complete = ${accountStatus.onboardingComplete},
        stripe_charges_enabled = ${accountStatus.chargesEnabled},
        stripe_payouts_enabled = ${accountStatus.payoutsEnabled},
        status = ${accountStatus.payoutsEnabled ? 'active' : 'setup_required'},
        updated_at = NOW()
      WHERE id = ${method.id}
    `

    return Response.json({
      hasAccount: true,
      methodId: method.id,
      accountId: method.stripe_account_id,
      accountType: method.stripe_account_type,
      country: method.stripe_country || accountStatus.country,
      status: accountStatus.payoutsEnabled ? 'active' : 'setup_required',
      onboardingComplete: accountStatus.onboardingComplete,
      chargesEnabled: accountStatus.chargesEnabled,
      payoutsEnabled: accountStatus.payoutsEnabled,
      pendingRequirements: accountStatus.pendingRequirements,
    })
  } catch (error) {
    console.error('Error fetching Stripe account status:', error)
    return Response.json({ error: 'Failed to fetch account status' }, { status: 500 })
  }
}

/**
 * Start Stripe Connect onboarding
 */
export async function POST(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  if (!STRIPE_SECRET_KEY) {
    return Response.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  try {
    const body = await req.json() as { country?: string }
    const country = body.country || 'US'

    // Check for existing Stripe Connect method
    const existingResult = await sql<{
      id: string
      stripe_account_id: string | null
      status: string
    }>`
      SELECT * FROM creator_payment_methods
      WHERE creator_id = ${context.creatorId}
      AND type = 'stripe_connect'
      AND status != 'removed'
      ORDER BY created_at DESC
      LIMIT 1
    `

    let methodId: string
    let stripeAccountId: string | null = null

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0]
      if (!existing) {
        return Response.json({ error: 'Unexpected error' }, { status: 500 })
      }
      methodId = existing.id
      stripeAccountId = existing.stripe_account_id

      // If there's already an account but onboarding is incomplete, create a new link
      if (stripeAccountId && existing.status === 'setup_required') {
        const onboardingUrl = await createStripeAccountLink(
          STRIPE_SECRET_KEY,
          stripeAccountId,
          `${process.env.NEXT_PUBLIC_APP_URL}/creator/settings/payout-methods?setup=complete`,
          `${process.env.NEXT_PUBLIC_APP_URL}/creator/settings/payout-methods/stripe-setup?refresh=true`,
          'account_onboarding'
        )

        return Response.json({
          success: true,
          onboardingUrl,
          accountId: stripeAccountId,
          methodId,
        })
      }
    } else {
      // Create a new payment method record
      const insertResult = await sql<{ id: string }>`
        INSERT INTO creator_payment_methods (
          creator_id,
          type,
          status,
          stripe_country,
          is_default
        ) VALUES (
          ${context.creatorId},
          'stripe_connect',
          'pending',
          ${country},
          false
        )
        RETURNING id
      `
      const insertedRow = insertResult.rows[0]
      if (!insertedRow) {
        return Response.json({ error: 'Failed to create payment method' }, { status: 500 })
      }
      methodId = insertedRow.id
    }

    // Create Stripe account if not exists
    if (!stripeAccountId) {
      const provider = createStripeConnectProvider({ secretKey: STRIPE_SECRET_KEY })
      const accountType = requiresStripeStandardAccount(country) ? 'standard' : 'express'

      const result = await provider.createAccount({
        creatorId: context.creatorId,
        email: context.email,
        country,
        accountType,
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/creator/settings/payout-methods?setup=complete`,
        refreshUrl: `${process.env.NEXT_PUBLIC_APP_URL}/creator/settings/payout-methods/stripe-setup?refresh=true`,
      })

      if (!result.success || !result.accountId) {
        return Response.json(
          { error: result.error || 'Failed to create Stripe account' },
          { status: 500 }
        )
      }

      stripeAccountId = result.accountId

      // Update the payment method record
      await sql`
        UPDATE creator_payment_methods
        SET
          stripe_account_id = ${stripeAccountId},
          stripe_account_type = ${accountType},
          status = 'setup_required',
          updated_at = NOW()
        WHERE id = ${methodId}
      `

      return Response.json({
        success: true,
        onboardingUrl: result.onboardingUrl,
        accountId: stripeAccountId,
        accountType,
        methodId,
      })
    }

    return Response.json({
      success: true,
      accountId: stripeAccountId,
      methodId,
    })
  } catch (error) {
    console.error('Error starting Stripe onboarding:', error)
    return Response.json({ error: 'Failed to start onboarding' }, { status: 500 })
  }
}
