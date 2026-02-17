/**
 * Internal Domain Lookup API
 *
 * POST /api/internal/domain-lookup
 *
 * Looks up which tenant owns a custom domain.
 * Called by middleware to resolve custom domains to tenant slugs.
 *
 * This endpoint is internal and should be protected by x-internal-key header
 * in production environments.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Validate internal API key if configured
 */
function validateInternalKey(request: NextRequest): boolean {
  const expectedKey = process.env.INTERNAL_API_KEY

  // If no key is configured, allow all requests (development mode)
  if (!expectedKey) {
    return true
  }

  const providedKey = request.headers.get('x-internal-key')
  return providedKey === expectedKey
}

/**
 * POST /api/internal/domain-lookup
 *
 * Request body: { domain: string }
 * Response: { tenantSlug: string | null }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Validate internal API key
  if (!validateInternalKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as { domain?: string }
    const { domain } = body

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid domain parameter' },
        { status: 400 }
      )
    }

    // Normalize domain (lowercase, trim)
    const normalizedDomain = domain.toLowerCase().trim()

    // Look up tenant by custom domain
    // Check both custom_domain column (added in migration 013)
    // and settings->>'customDomain' JSONB field for backwards compatibility
    const result = await sql<{
      slug: string
    }>`
      SELECT slug
      FROM public.organizations
      WHERE (
        custom_domain = ${normalizedDomain}
        OR settings->>'customDomain' = ${normalizedDomain}
      )
      AND status = 'active'
      LIMIT 1
    `

    const row = result.rows[0]

    if (!row) {
      // No tenant found for this domain
      return NextResponse.json({ tenantSlug: null })
    }

    return NextResponse.json({ tenantSlug: row.slug })
  } catch (error) {
    console.error('[domain-lookup] Error looking up domain:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/internal/domain-lookup
 *
 * Health check endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'domain-lookup',
    timestamp: new Date().toISOString(),
  })
}
