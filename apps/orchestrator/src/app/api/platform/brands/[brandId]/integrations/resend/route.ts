import { sql } from '@cgk-platform/db'
import {
  saveTenantResendConfig,
  getTenantResendConfig,
  deleteTenantResendConfig,
  verifyTenantResendCredentials,
} from '@cgk-platform/integrations'
import { NextResponse } from 'next/server'

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
 * GET /api/platform/brands/[brandId]/integrations/resend
 *
 * Get Resend configuration for a brand
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

    const config = await getTenantResendConfig(tenantSlug)

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
        resendTeamId: config.resendTeamId,
        accountName: config.accountName,
        defaultFromEmail: config.defaultFromEmail,
        defaultFromName: config.defaultFromName,
        defaultReplyTo: config.defaultReplyTo,
        verifiedDomains: config.verifiedDomains,
        isActive: config.isActive,
        lastVerifiedAt: config.lastVerifiedAt,
        lastError: config.lastError,
        updatedAt: config.updatedAt,
      },
    })
  } catch (error) {
    console.error('Get Resend config error:', error)
    return NextResponse.json({ error: 'Failed to get Resend configuration' }, { status: 500 })
  }
}

/**
 * POST /api/platform/brands/[brandId]/integrations/resend
 *
 * Save Resend configuration for a brand
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

    const { apiKey, defaultFromEmail, defaultFromName, defaultReplyTo } = body

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
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
    const config = await saveTenantResendConfig(tenantSlug, {
      apiKey,
      defaultFromEmail,
      defaultFromName,
      defaultReplyTo,
    })

    // Verify the credentials
    const verification = await verifyTenantResendCredentials(tenantSlug)

    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        resendTeamId: config.resendTeamId,
        accountName: config.accountName,
        defaultFromEmail: config.defaultFromEmail,
        defaultFromName: config.defaultFromName,
        verifiedDomains: config.verifiedDomains,
        isActive: config.isActive,
        lastVerifiedAt: config.lastVerifiedAt,
      },
      verification,
    })
  } catch (error) {
    console.error('Save Resend config error:', error)
    return NextResponse.json({ error: 'Failed to save Resend configuration' }, { status: 500 })
  }
}

/**
 * DELETE /api/platform/brands/[brandId]/integrations/resend
 *
 * Remove Resend configuration for a brand
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

    await deleteTenantResendConfig(tenantSlug)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete Resend config error:', error)
    return NextResponse.json({ error: 'Failed to delete Resend configuration' }, { status: 500 })
  }
}
