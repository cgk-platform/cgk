import { sql } from '@cgk-platform/db'
import {
  saveTenantApiCredential,
  deleteTenantApiCredential,
  verifyTenantServiceCredentials,
  getAllTenantApiCredentials,
  type TenantApiService,
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

// Video-related services that are supported by TenantApiService type
const VIDEO_SERVICES: TenantApiService[] = ['mux', 'assemblyai']

/**
 * GET /api/platform/brands/[brandId]/integrations/video
 *
 * Get video service configurations (Mux, AssemblyAI, etc.)
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

    // Get all video-related credentials
    const allCredentials = await getAllTenantApiCredentials(tenantSlug)
    const videoCredentials = allCredentials.filter((c) =>
      VIDEO_SERVICES.includes(c.serviceName)
    )

    const services: Record<string, {
      configured: boolean
      isActive: boolean
      lastVerifiedAt: string | null
      lastError: string | null
      accountId?: string | null
    }> = {}

    for (const service of VIDEO_SERVICES) {
      const credential = videoCredentials.find((c) => c.serviceName === service)
      services[service] = {
        configured: !!credential,
        isActive: credential?.isActive ?? false,
        lastVerifiedAt: credential?.lastVerifiedAt?.toISOString() ?? null,
        lastError: credential?.lastError ?? null,
        accountId: credential?.accountId ?? null,
      }
    }

    return NextResponse.json({ services })
  } catch (error) {
    console.error('Get video config error:', error)
    return NextResponse.json({ error: 'Failed to get video configuration' }, { status: 500 })
  }
}

/**
 * POST /api/platform/brands/[brandId]/integrations/video
 *
 * Save video service configuration
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

    const { service, apiKey, apiSecret, metadata } = body

    if (!service) {
      return NextResponse.json({ error: 'Service name is required' }, { status: 400 })
    }

    if (!VIDEO_SERVICES.includes(service as TenantApiService)) {
      return NextResponse.json(
        { error: `Invalid service. Must be one of: ${VIDEO_SERVICES.join(', ')}` },
        { status: 400 }
      )
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    // Mux requires both key and secret
    if (service === 'mux' && !apiSecret) {
      return NextResponse.json({ error: 'API secret is required for Mux' }, { status: 400 })
    }

    // Get tenant slug
    const orgResult = await sql`
      SELECT slug FROM public.organizations WHERE id = ${brandId}
    `
    const tenantSlug = (orgResult.rows[0] as Record<string, unknown> | undefined)?.slug as string | undefined
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Save the credential
    const credential = await saveTenantApiCredential(tenantSlug, {
      serviceName: service as TenantApiService,
      apiKey,
      apiSecret,
      metadata,
    })

    // Verify the credentials
    const verification = await verifyTenantServiceCredentials(tenantSlug, service as TenantApiService)

    return NextResponse.json({
      success: true,
      config: {
        id: credential.id,
        serviceName: credential.serviceName,
        isActive: credential.isActive,
        lastVerifiedAt: credential.lastVerifiedAt,
        accountId: credential.accountId,
      },
      verification,
    })
  } catch (error) {
    console.error('Save video config error:', error)
    return NextResponse.json({ error: 'Failed to save video configuration' }, { status: 500 })
  }
}

/**
 * DELETE /api/platform/brands/[brandId]/integrations/video
 *
 * Remove video service configuration
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

    if (!VIDEO_SERVICES.includes(service as TenantApiService)) {
      return NextResponse.json(
        { error: `Invalid service. Must be one of: ${VIDEO_SERVICES.join(', ')}` },
        { status: 400 }
      )
    }

    // Get tenant slug
    const orgResult = await sql`
      SELECT slug FROM public.organizations WHERE id = ${brandId}
    `
    const tenantSlug = (orgResult.rows[0] as Record<string, unknown> | undefined)?.slug as string | undefined
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    await deleteTenantApiCredential(tenantSlug, service as TenantApiService)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete video config error:', error)
    return NextResponse.json({ error: 'Failed to delete video configuration' }, { status: 500 })
  }
}
