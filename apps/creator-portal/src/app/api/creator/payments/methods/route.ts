/**
 * Creator Payment Methods API Route
 *
 * GET /api/creator/payments/methods - List payment methods
 * PATCH /api/creator/payments/methods - Set default method
 * DELETE /api/creator/payments/methods - Remove a method
 */

import { sql } from '@cgk/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Payment method type enum
 */
type PaymentMethodType = 'stripe_connect' | 'wise' | 'paypal' | 'venmo' | 'check'
type PaymentMethodStatus = 'pending' | 'active' | 'setup_required' | 'failed' | 'removed'

interface PaymentMethodRow {
  id: string
  creator_id: string
  type: PaymentMethodType
  status: PaymentMethodStatus
  is_default: boolean
  stripe_account_id: string | null
  stripe_account_type: string | null
  stripe_onboarding_complete: boolean | null
  stripe_charges_enabled: boolean | null
  stripe_payouts_enabled: boolean | null
  stripe_country: string | null
  wise_recipient_id: string | null
  wise_account_holder_name: string | null
  wise_currency: string | null
  wise_country: string | null
  legacy_identifier: string | null
  legacy_verified: boolean | null
  legacy_details: Record<string, unknown> | null
  display_name: string | null
  verified_at: Date | null
  created_at: Date
  updated_at: Date
}

/**
 * List payment methods for the creator
 */
export async function GET(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const result = await sql<PaymentMethodRow>`
      SELECT * FROM creator_payment_methods
      WHERE creator_id = ${context.creatorId}
      AND status != 'removed'
      ORDER BY is_default DESC, created_at DESC
    `

    const methods = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      isDefault: row.is_default,
      displayName: row.display_name,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
      // Type-specific details
      stripe: row.type === 'stripe_connect' ? {
        accountId: row.stripe_account_id,
        accountType: row.stripe_account_type,
        onboardingComplete: row.stripe_onboarding_complete,
        chargesEnabled: row.stripe_charges_enabled,
        payoutsEnabled: row.stripe_payouts_enabled,
        country: row.stripe_country,
      } : undefined,
      wise: row.type === 'wise' ? {
        recipientId: row.wise_recipient_id,
        accountHolderName: row.wise_account_holder_name,
        currency: row.wise_currency,
        country: row.wise_country,
      } : undefined,
      legacy: ['paypal', 'venmo', 'check'].includes(row.type) ? {
        identifier: row.legacy_identifier,
        verified: row.legacy_verified,
        details: row.legacy_details,
      } : undefined,
    }))

    // Check if any active Stripe Connect method exists
    const hasStripeConnect = methods.some(
      (m) => m.type === 'stripe_connect' && m.status === 'active'
    )

    // Check if Stripe setup is incomplete
    const incompleteStripe = methods.find(
      (m) => m.type === 'stripe_connect' && m.status === 'setup_required'
    )

    return Response.json({
      methods,
      hasActiveMethod: methods.some((m) => m.status === 'active'),
      hasStripeConnect,
      incompleteStripeSetup: !!incompleteStripe,
      defaultMethodId: methods.find((m) => m.isDefault)?.id,
    })
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return Response.json({ error: 'Failed to fetch payment methods' }, { status: 500 })
  }
}

/**
 * Set a payment method as default
 */
export async function PATCH(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const body = await req.json() as { methodId: string }
    const { methodId } = body

    if (!methodId) {
      return Response.json({ error: 'Method ID is required' }, { status: 400 })
    }

    // Verify the method belongs to this creator and is active
    const methodResult = await sql<{ id: string; status: PaymentMethodStatus }>`
      SELECT id, status FROM creator_payment_methods
      WHERE id = ${methodId}
      AND creator_id = ${context.creatorId}
    `

    if (methodResult.rows.length === 0) {
      return Response.json({ error: 'Payment method not found' }, { status: 404 })
    }

    const methodRow = methodResult.rows[0]
    if (!methodRow || methodRow.status !== 'active') {
      return Response.json(
        { error: 'Cannot set an inactive payment method as default' },
        { status: 400 }
      )
    }

    // Unset all other defaults
    await sql`
      UPDATE creator_payment_methods
      SET is_default = false
      WHERE creator_id = ${context.creatorId}
    `

    // Set the new default
    await sql`
      UPDATE creator_payment_methods
      SET is_default = true, updated_at = NOW()
      WHERE id = ${methodId}
    `

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error setting default payment method:', error)
    return Response.json({ error: 'Failed to update payment method' }, { status: 500 })
  }
}

/**
 * Remove a payment method (soft delete)
 */
export async function DELETE(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const methodId = searchParams.get('id')

    if (!methodId) {
      return Response.json({ error: 'Method ID is required' }, { status: 400 })
    }

    // Verify the method belongs to this creator
    const methodResult = await sql<{ id: string; is_default: boolean }>`
      SELECT id, is_default FROM creator_payment_methods
      WHERE id = ${methodId}
      AND creator_id = ${context.creatorId}
      AND status != 'removed'
    `

    if (methodResult.rows.length === 0) {
      return Response.json({ error: 'Payment method not found' }, { status: 404 })
    }

    // Soft delete the method
    await sql`
      UPDATE creator_payment_methods
      SET status = 'removed', is_default = false, updated_at = NOW()
      WHERE id = ${methodId}
    `

    // If this was the default, set another active method as default
    const deletedMethod = methodResult.rows[0]
    if (deletedMethod && deletedMethod.is_default) {
      await sql`
        UPDATE creator_payment_methods
        SET is_default = true
        WHERE creator_id = ${context.creatorId}
        AND status = 'active'
        AND id != ${methodId}
        ORDER BY created_at DESC
        LIMIT 1
      `
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error removing payment method:', error)
    return Response.json({ error: 'Failed to remove payment method' }, { status: 500 })
  }
}
