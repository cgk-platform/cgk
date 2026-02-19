export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'

import {
  authenticateContractor,
  getTenantBySlug,
} from '@/lib/auth/authenticate'
import { getSetCookieHeader } from '@/lib/auth/cookies'
import { signContractorJWT } from '@/lib/auth/jwt'
import { checkRateLimit, recordRateLimitAttempt, getClientIP } from '@/lib/auth/rate-limit'
import { createContractorSession } from '@/lib/auth/session'

/**
 * POST /api/auth/signin
 * Contractor email/password login
 *
 * Tenant is resolved from:
 * 1. Request body `tenantSlug` field
 * 2. `x-tenant-slug` header (set by reverse proxy or middleware)
 * 3. `TENANT_SLUG` environment variable (single-tenant deployment)
 */
export async function POST(req: Request): Promise<Response> {
  let body: { email?: string; password?: string; tenantSlug?: string }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, password } = body
  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 })
  }

  // Resolve tenant slug
  const headerList = await headers()
  const tenantSlug =
    body.tenantSlug ||
    headerList.get('x-tenant-slug') ||
    process.env.TENANT_SLUG

  if (!tenantSlug) {
    return Response.json(
      { error: 'Tenant context is required. Provide tenantSlug in the request body.' },
      { status: 400 }
    )
  }

  // Rate limiting
  const clientIP = getClientIP(req)
  const rateLimitKey = `${clientIP}:${email.toLowerCase()}`
  const rateCheck = checkRateLimit(rateLimitKey, 'signin')
  if (rateCheck.isLimited) {
    return Response.json(
      { error: 'Too many sign-in attempts. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    // Validate tenant exists
    const tenant = await getTenantBySlug(tenantSlug)
    if (!tenant) {
      return Response.json({ error: 'Organization not found' }, { status: 400 })
    }

    // Authenticate contractor
    const contractor = await authenticateContractor(email, password, tenantSlug)

    // Create session
    const { session } = await createContractorSession(
      contractor.id,
      tenant.id,
      tenantSlug,
      req
    )

    // Sign JWT
    const jwt = await signContractorJWT({
      contractorId: contractor.id,
      sessionId: session.id,
      email: contractor.email,
      name: contractor.name,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    })

    // Set auth cookie
    const setCookieHeader = getSetCookieHeader(jwt)

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
          'Set-Cookie': setCookieHeader,
        },
      }
    )
  } catch (error) {
    recordRateLimitAttempt(rateLimitKey, 'signin')
    const message = error instanceof Error ? error.message : 'Authentication failed'
    return Response.json({ error: message }, { status: 401 })
  }
}
