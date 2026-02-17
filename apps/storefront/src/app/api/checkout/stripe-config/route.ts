/**
 * Stripe Config API Route
 *
 * GET /api/checkout/stripe-config
 *
 * Returns the tenant's Stripe publishable key for client-side initialization.
 */

import { NextResponse } from 'next/server'
import { getTenantStripeConfig } from '@cgk-platform/integrations'

import { getTenantSlug } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const tenantSlug = await getTenantSlug()
    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const stripeConfig = await getTenantStripeConfig(tenantSlug)
    if (!stripeConfig?.publishableKey) {
      return NextResponse.json(
        { error: 'Stripe not configured for this store' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      publishableKey: stripeConfig.publishableKey,
    })
  } catch (error) {
    console.error('[stripe-config] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get Stripe configuration' },
      { status: 500 }
    )
  }
}
