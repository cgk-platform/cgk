import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import {
  saveTenantApiCredential,
  deleteTenantApiCredential,
  verifyTenantServiceCredentials,
  type TenantApiService,
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
 * GET /api/platform/brands/[brandId]/integrations/analytics
 *
 * Get analytics service configurations (GA4, Segment, etc.)
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

    // Get GA4 settings from tenant settings
    const ga4Settings = await withTenant(tenantSlug, async () => {
      const result = await sql`
        SELECT settings->'analytics' as analytics
        FROM tenant_settings
        LIMIT 1
      `
      return (result.rows[0] as Record<string, unknown> | undefined)?.analytics as Record<string, unknown> | null
    })

    return NextResponse.json({
      ga4: {
        configured: !!ga4Settings?.measurementId,
        measurementId: ga4Settings?.measurementId || null,
        streamId: ga4Settings?.streamId || null,
      },
    })
  } catch (error) {
    console.error('Get analytics config error:', error)
    return NextResponse.json({ error: 'Failed to get analytics configuration' }, { status: 500 })
  }
}

/**
 * POST /api/platform/brands/[brandId]/integrations/analytics
 *
 * Save analytics service configurations
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

    const { service, apiKey, measurementId, streamId, propertyId, metadata } = body

    if (!service) {
      return NextResponse.json({ error: 'Service name is required' }, { status: 400 })
    }

    // Get tenant slug
    const orgResult = await sql`
      SELECT slug FROM public.organizations WHERE id = ${brandId}
    `
    const tenantSlug = (orgResult.rows[0] as Record<string, unknown> | undefined)?.slug as string | undefined
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    if (service === 'ga4') {
      // GA4 configuration goes in tenant_settings
      await withTenant(tenantSlug, async () => {
        await sql`
          UPDATE tenant_settings
          SET settings = jsonb_set(
            COALESCE(settings, '{}'),
            '{analytics}',
            ${JSON.stringify({
              measurementId,
              streamId,
              propertyId,
            })}::jsonb
          ),
          updated_at = NOW()
        `
      })

      return NextResponse.json({
        success: true,
        config: {
          measurementId,
          streamId,
          propertyId,
        },
      })
    }

    // For other analytics services (Segment, Mixpanel, etc.), use generic credentials
    if (apiKey) {
      const credential = await saveTenantApiCredential(tenantSlug, {
        serviceName: service,
        apiKey,
        metadata: { ...metadata, measurementId, streamId, propertyId },
      })

      // Verify if possible
      const verification = await verifyTenantServiceCredentials(tenantSlug, service)

      return NextResponse.json({
        success: true,
        config: {
          id: credential.id,
          serviceName: credential.serviceName,
          isActive: credential.isActive,
          lastVerifiedAt: credential.lastVerifiedAt,
        },
        verification,
      })
    }

    return NextResponse.json({ error: 'API key required for this service' }, { status: 400 })
  } catch (error) {
    console.error('Save analytics config error:', error)
    return NextResponse.json({ error: 'Failed to save analytics configuration' }, { status: 500 })
  }
}

/**
 * DELETE /api/platform/brands/[brandId]/integrations/analytics
 *
 * Remove analytics service configuration
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
    const url = new URL(request.url)
    const service = url.searchParams.get('service')

    if (!service) {
      return NextResponse.json({ error: 'Service parameter required' }, { status: 400 })
    }

    // Get tenant slug
    const orgResult = await sql`
      SELECT slug FROM public.organizations WHERE id = ${brandId}
    `
    const tenantSlug = (orgResult.rows[0] as Record<string, unknown> | undefined)?.slug as string | undefined
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    if (service === 'ga4') {
      // Clear GA4 from tenant settings
      await withTenant(tenantSlug, async () => {
        await sql`
          UPDATE tenant_settings
          SET settings = settings - 'analytics',
              updated_at = NOW()
        `
      })
    } else {
      // Delete from generic credentials - only for supported service types
      const supportedServices: TenantApiService[] = ['mux', 'assemblyai', 'anthropic', 'openai', 'elevenlabs', 'cloudflare_r2', 'google_maps', 'twilio']
      if (supportedServices.includes(service as TenantApiService)) {
        await deleteTenantApiCredential(tenantSlug, service as TenantApiService)
      } else {
        return NextResponse.json({ error: `Unsupported analytics service: ${service}` }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete analytics config error:', error)
    return NextResponse.json({ error: 'Failed to delete analytics configuration' }, { status: 500 })
  }
}
