/**
 * Stripe Connect OAuth API Route
 *
 * GET /api/creator/payments/connect/oauth - Generate OAuth URL for Standard accounts
 */

import { sql } from '@cgk-platform/db'
import { requiresStripeStandardAccount } from '@cgk-platform/payments'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID

/**
 * Generate Stripe OAuth URL for Standard accounts (Brazil, etc.)
 */
export async function GET(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  if (!STRIPE_CLIENT_ID) {
    return Response.json({ error: 'Stripe OAuth not configured' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const country = searchParams.get('country') || 'BR'

    // Verify this country requires Standard accounts
    if (!requiresStripeStandardAccount(country)) {
      return Response.json(
        { error: 'OAuth not required for this country. Use Express onboarding.' },
        { status: 400 }
      )
    }

    // Get or create payment method record
    let methodResult = await sql<{ id: string }>`
      SELECT id FROM creator_payment_methods
      WHERE creator_id = ${context.creatorId}
      AND type = 'stripe_connect'
      AND status != 'removed'
      ORDER BY created_at DESC
      LIMIT 1
    `

    let methodId: string

    if (methodResult.rows.length === 0) {
      const insertResult = await sql<{ id: string }>`
        INSERT INTO creator_payment_methods (
          creator_id,
          type,
          status,
          stripe_country,
          stripe_account_type,
          is_default
        ) VALUES (
          ${context.creatorId},
          'stripe_connect',
          'pending',
          ${country},
          'standard',
          false
        )
        RETURNING id
      `
      const insertedRow = insertResult.rows[0]
      if (!insertedRow) {
        return Response.json({ error: 'Failed to create payment method' }, { status: 500 })
      }
      methodId = insertedRow.id
    } else {
      const existingRow = methodResult.rows[0]
      if (!existingRow) {
        return Response.json({ error: 'Payment method not found' }, { status: 500 })
      }
      methodId = existingRow.id
    }

    // Create state for OAuth callback
    const state = Buffer.from(JSON.stringify({
      creatorId: context.creatorId,
      methodId,
      country,
    })).toString('base64url')

    // Build OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/creator/payments/connect/oauth/callback`
    const oauthUrl = new URL('https://connect.stripe.com/oauth/authorize')
    oauthUrl.searchParams.set('response_type', 'code')
    oauthUrl.searchParams.set('client_id', STRIPE_CLIENT_ID)
    oauthUrl.searchParams.set('scope', 'read_write')
    oauthUrl.searchParams.set('redirect_uri', redirectUri)
    oauthUrl.searchParams.set('state', state)
    oauthUrl.searchParams.set('stripe_user[country]', country)
    oauthUrl.searchParams.set('stripe_user[email]', context.email)

    return Response.json({
      oauthUrl: oauthUrl.toString(),
      methodId,
    })
  } catch (error) {
    console.error('Error generating OAuth URL:', error)
    return Response.json({ error: 'Failed to generate OAuth URL' }, { status: 500 })
  }
}
