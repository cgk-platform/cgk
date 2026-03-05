export const dynamic = 'force-dynamic'

import { logger } from '@cgk-platform/logging'
import { headers } from 'next/headers'

import { getTenantBySlug } from '@/lib/auth/authenticate'
import {
  createPasswordResetToken,
  sendPasswordResetEmail,
} from '@/lib/auth/password-reset'
import {
  checkPasswordResetRateLimit,
  getClientIP,
  recordPasswordResetAttempt,
} from '@/lib/auth/rate-limit'

/**
 * POST /api/auth/forgot-password
 * Send a password reset email to a contractor
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
    return Response.json({ error: 'Tenant context is required' }, { status: 400 })
  }

  // Rate limit by email
  const normalizedEmail = email.toLowerCase().trim()
  const rateCheck = checkPasswordResetRateLimit(normalizedEmail)
  if (rateCheck.isLimited) {
    // Anti-enumeration: still return success
    return Response.json({ success: true })
  }
  recordPasswordResetAttempt(normalizedEmail)

  try {
    const tenant = await getTenantBySlug(tenantSlug)
    if (!tenant) {
      return Response.json({ success: true })
    }

    const clientIP = getClientIP(req)
    const token = await createPasswordResetToken(normalizedEmail, tenantSlug, clientIP)

    if (token) {
      await sendPasswordResetEmail(normalizedEmail, token, tenantSlug)
    }

    // Always return success for anti-enumeration
    return Response.json({ success: true })
  } catch (error) {
    logger.error('Forgot password error:', error instanceof Error ? error : new Error(String(error)))
    // Still return success for anti-enumeration
    return Response.json({ success: true })
  }
}
