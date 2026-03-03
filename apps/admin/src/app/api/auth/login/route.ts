export const dynamic = 'force-dynamic'

import {
  createSession,
  getUserByEmail,
  getUserOrganizations,
  setAuthCookie,
  signJWT,
  updateUserLastLogin,
} from '@cgk-platform/auth'
import type { UserRole } from '@cgk-platform/auth'
import { verifyPassword } from '@cgk-platform/auth/node'
import { logger } from '@cgk-platform/logging'

// IP-based rate limiting
const IP_RATE_LIMIT_MAX = 5
const IP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const IP_RATE_LIMIT_MAP_CAP = 10_000
const ipRateLimiter = new Map<string, { attempts: number; resetAt: number }>()

function checkIpRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  // Lazy cleanup
  for (const [key, entry] of ipRateLimiter.entries()) {
    if (now > entry.resetAt) ipRateLimiter.delete(key)
  }

  // Cap map size to prevent unbounded memory growth
  if (ipRateLimiter.size >= IP_RATE_LIMIT_MAP_CAP) {
    // Evict oldest entries (first entries in Map insertion order)
    const toEvict = ipRateLimiter.size - IP_RATE_LIMIT_MAP_CAP + 1
    let evicted = 0
    for (const key of ipRateLimiter.keys()) {
      if (evicted >= toEvict) break
      ipRateLimiter.delete(key)
      evicted++
    }
  }

  const entry = ipRateLimiter.get(ip)
  if (!entry || now > entry.resetAt) {
    ipRateLimiter.set(ip, { attempts: 1, resetAt: now + IP_RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (entry.attempts >= IP_RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.attempts++
  return { allowed: true }
}

/**
 * POST /api/auth/login
 * Email/password login for tenant admins
 */
export async function POST(request: Request) {
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { email, password } = body as { email?: string; password?: string }
    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Rate limiting
    const rateCheck = checkIpRateLimit(clientIp)
    if (!rateCheck.allowed) {
      return Response.json(
        { error: 'Too many login attempts. Please try again later.', retryAfter: rateCheck.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    // Get user
    const user = await getUserByEmail(email.toLowerCase().trim())
    if (!user) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Verify password
    if (!user.passwordHash) {
      return Response.json(
        { error: 'Password login not enabled. Use magic link instead.' },
        { status: 401 }
      )
    }

    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Get user organizations
    const orgs = await getUserOrganizations(user.id)
    if (orgs.length === 0) {
      return Response.json(
        { error: 'No organizations found for this account' },
        { status: 403 }
      )
    }

    const targetOrg = orgs[0]!

    // Verify user has admin-level role for this org
    const adminRoles = ['admin', 'owner', 'super_admin']
    if (!adminRoles.includes(targetOrg.role)) {
      return Response.json(
        { error: 'Insufficient permissions for admin access' },
        { status: 403 }
      )
    }

    // Create session
    const { session } = await createSession(user.id, targetOrg.id, request)

    // Sign JWT
    const jwt = await signJWT({
      userId: user.id,
      sessionId: session.id,
      email: user.email,
      orgSlug: targetOrg.slug,
      orgId: targetOrg.id,
      role: targetOrg.role as UserRole,
      orgs,
    })

    // Update last login
    await updateUserLastLogin(user.id).catch(() => {})

    const response = Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      redirectTo: '/',
    })

    return setAuthCookie(response, jwt)
  } catch (error) {
    logger.error('Login error:', error instanceof Error ? error : new Error(String(error)))
    return Response.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
