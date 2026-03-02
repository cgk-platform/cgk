export const dynamic = 'force-dynamic'

import { sql, withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'

import { getTenantBySlug } from '@/lib/auth/authenticate'
import { getSetCookieHeader } from '@/lib/auth/cookies'
import { signContractorJWT } from '@/lib/auth/jwt'
import { verifyContractorMagicLink } from '@/lib/auth/magic-link'
import { createContractorSession } from '@/lib/auth/session'

/**
 * POST /api/auth/verify
 * Verify a magic link token and create session
 */
export async function POST(req: Request): Promise<Response> {
  let body: { email?: string; token?: string; tenantSlug?: string }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, token } = body
  if (!email || !token) {
    return Response.json({ error: 'Email and token are required' }, { status: 400 })
  }

  // Resolve tenant
  const headerList = await headers()
  const tenantSlug = body.tenantSlug || headerList.get('x-tenant-slug') || process.env.TENANT_SLUG

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context is required' }, { status: 400 })
  }

  try {
    const tenant = await getTenantBySlug(tenantSlug)
    if (!tenant) {
      return Response.json({ error: 'Organization not found' }, { status: 400 })
    }

    // Verify magic link
    const result = await verifyContractorMagicLink(email, token, tenantSlug)
    if (!result.contractorId) {
      return Response.json({ error: 'No contractor account found for this email' }, { status: 404 })
    }

    // Get contractor details
    const contractorResult = await withTenant(tenantSlug, async () => {
      return sql`
        SELECT id, email, name, status
        FROM contractors
        WHERE id = ${result.contractorId}
      `
    })

    const contractor = contractorResult.rows[0]
    if (!contractor) {
      return Response.json({ error: 'Contractor not found' }, { status: 404 })
    }

    // Create session
    const { session } = await createContractorSession(
      contractor.id as string,
      tenant.id,
      tenantSlug,
      req
    )

    // Sign JWT
    const jwt = await signContractorJWT({
      contractorId: contractor.id as string,
      sessionId: session.id,
      email: contractor.email as string,
      name: (contractor.name as string) || '',
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    })

    return Response.json(
      {
        success: true,
        contractor: {
          id: contractor.id,
          name: contractor.name,
          email: contractor.email,
          status: contractor.status,
        },
      },
      {
        headers: {
          'Set-Cookie': getSetCookieHeader(jwt),
        },
      }
    )
  } catch (error) {
    console.error('Verify error:', error)
    const message = error instanceof Error ? error.message : 'Verification failed'
    return Response.json({ error: message }, { status: 401 })
  }
}
