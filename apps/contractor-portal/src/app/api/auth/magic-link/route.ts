export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'

import { getTenantBySlug } from '@/lib/auth/authenticate'
import {
  createContractorMagicLink,
  sendContractorMagicLinkEmail,
} from '@/lib/auth/magic-link'
import { checkRateLimit, recordRateLimitAttempt, getClientIP } from '@/lib/auth/rate-limit'

/**
 * POST /api/auth/magic-link
 * Send a magic link email to a contractor
 */
export async function POST(req: Request): Promise<Response> {
  let body: { email?: string; tenantSlug?: string }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email } = body
  if (!email || typeof email !== 'string') {
    return Response.json({ error: 'Email is required' }, { status: 400 })
  }

  // Resolve tenant
  const headerList = await headers()
  const tenantSlug =
    body.tenantSlug ||
    headerList.get('x-tenant-slug') ||
    process.env.TENANT_SLUG

  if (!tenantSlug) {
    return Response.json(
      { error: 'Tenant context is required' },
      { status: 400 }
    )
  }

  // Rate limiting
  const clientIP = getClientIP(req)
  const rateCheck = checkRateLimit(clientIP, 'magic-link')
  if (rateCheck.isLimited) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }
  recordRateLimitAttempt(clientIP, 'magic-link')

  try {
    const tenant = await getTenantBySlug(tenantSlug)
    if (!tenant) {
      // Anti-enumeration: always return success
      return Response.json({ success: true })
    }

    // Create and send magic link (anti-enumeration: don't reveal if contractor exists)
    try {
      const token = await createContractorMagicLink(
        email.toLowerCase().trim(),
        'login',
        tenantSlug
      )
      await sendContractorMagicLinkEmail(email, token, 'login', tenantSlug)
    } catch {
      // Contractor may not exist - still return success for anti-enumeration
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Magic link error:', error)
    return Response.json({ error: 'Failed to send magic link' }, { status: 500 })
  }
}
