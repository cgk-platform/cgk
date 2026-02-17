import { NextResponse } from 'next/server'
import { sql } from '@cgk-platform/db'
import {
  saveTenantStripeConfig,
  getTenantStripeConfig,
  deleteTenantStripeConfig,
  verifyTenantStripeCredentials,
} from '@cgk-platform/integrations'

export const dynamic = 'force-dynamic'

/**
 * Helper to get request context from headers (set by middleware)
 */
function getRequestContext(request: Request): {
  userId: string
  sessionId: string
  isSuperAdmin: boolean
} {
  return {
    userId: request.headers.get('x-user-id') || '',
    sessionId: request.headers.get('x-session-id') || '',
    isSuperAdmin: request.headers.get('x-is-super-admin') === 'true',
  }
}

/**
 * GET /api/platform/brands/[brandId]/integrations/stripe
 *
 * Get Stripe configuration for a brand
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { isSuperAdmin } = getRequestContext(request)
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { brandId } = await params

    // Get tenant slug
    const orgResult = await sql`
      SELECT slug FROM public.organizations WHERE id = ${brandId}
    `
    const tenantSlug = (orgResult.rows[0] as Record<string, unknown> | undefined)?.slug as string | undefined
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const config = await getTenantStripeConfig(tenantSlug)

    if (!config) {
      return NextResponse.json({
        configured: false,
        config: null,
      })
    }

    // Return config without sensitive data
    return NextResponse.json({
      configured: true,
      config: {
        id: config.id,
        publishableKey: config.publishableKey,
        stripeAccountId: config.stripeAccountId,
        accountName: config.accountName,
        accountCountry: config.accountCountry,
        livemode: config.livemode,
        connectEnabled: config.connectEnabled,
        isActive: config.isActive,
        lastVerifiedAt: config.lastVerifiedAt,
        lastError: config.lastError,
        updatedAt: config.updatedAt,
      },
    })
  } catch (error) {
    console.error('Get Stripe config error:', error)
    return NextResponse.json({ error: 'Failed to get Stripe configuration' }, { status: 500 })
  }
}

/**
 * POST /api/platform/brands/[brandId]/integrations/stripe
 *
 * Save Stripe configuration for a brand
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { isSuperAdmin } = getRequestContext(request)
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { brandId } = await params
    const body = await request.json()

    const { secretKey, publishableKey, webhookSecret, livemode } = body

    if (!secretKey) {
      return NextResponse.json({ error: 'Secret key is required' }, { status: 400 })
    }

    // Get tenant slug
    const orgResult = await sql`
      SELECT slug FROM public.organizations WHERE id = ${brandId}
    `
    const tenantSlug = (orgResult.rows[0] as Record<string, unknown> | undefined)?.slug as string | undefined
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Save the configuration
    const config = await saveTenantStripeConfig(tenantSlug, {
      secretKey,
      publishableKey,
      webhookSecret,
      livemode: livemode ?? secretKey.startsWith('sk_live'),
    })

    // Verify the credentials
    const verification = await verifyTenantStripeCredentials(tenantSlug)

    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        publishableKey: config.publishableKey,
        stripeAccountId: config.stripeAccountId,
        accountName: config.accountName,
        accountCountry: config.accountCountry,
        livemode: config.livemode,
        isActive: config.isActive,
        lastVerifiedAt: config.lastVerifiedAt,
      },
      verification,
    })
  } catch (error) {
    console.error('Save Stripe config error:', error)
    return NextResponse.json({ error: 'Failed to save Stripe configuration' }, { status: 500 })
  }
}

/**
 * DELETE /api/platform/brands/[brandId]/integrations/stripe
 *
 * Remove Stripe configuration for a brand
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { isSuperAdmin } = getRequestContext(request)
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { brandId } = await params

    // Get tenant slug
    const orgResult = await sql`
      SELECT slug FROM public.organizations WHERE id = ${brandId}
    `
    const tenantSlug = (orgResult.rows[0] as Record<string, unknown> | undefined)?.slug as string | undefined
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    await deleteTenantStripeConfig(tenantSlug)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete Stripe config error:', error)
    return NextResponse.json({ error: 'Failed to delete Stripe configuration' }, { status: 500 })
  }
}
