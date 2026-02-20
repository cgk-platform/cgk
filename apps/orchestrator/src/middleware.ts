import {
  checkIpAllowlist,
  checkRateLimit,
  getAuthCookie,
  isSuperAdmin,
  logAuditAction,
  validateSuperAdminSessionById,
  verifyJWT,
} from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Super Admin Middleware for Orchestrator
 *
 * This middleware enforces:
 * 1. Super admin authentication required for all protected routes
 * 2. MFA verification required for sensitive operations
 * 3. IP allowlist checking (if configured)
 * 4. Rate limiting (100 req/min, stricter for sensitive routes)
 * 5. Audit logging of all requests
 * 6. Session validation with 4-hour limit and inactivity timeout
 */

/**
 * Public paths that don't require authentication
 */
const PUBLIC_PATHS = [
  '/api/platform/auth/login',
  '/api/platform/auth/mfa',
  '/api/setup',
  '/login',
  '/mfa-challenge',
  '/unauthorized',
  '/setup',
]

/**
 * Static asset paths to skip middleware
 */
const STATIC_PATHS = [
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]

/**
 * Sensitive routes that require MFA re-verification
 */
const SENSITIVE_ROUTES = [
  '/brands/new',
  '/api/platform/brands',
  '/users/impersonate',
  '/api/platform/users/impersonate',
  '/users/super-admins',
  '/api/platform/users/super-admins',
  '/settings',
  '/api/platform/settings',
]

/**
 * Rate limiting configuration
 */
const RATE_LIMITS = {
  default: { limit: 100, windowSeconds: 60 },
  sensitive: { limit: 20, windowSeconds: 60 },
  login: { limit: 5, windowSeconds: 60 },
}

/**
 * Check if path matches any of the given patterns
 */
function matchesPath(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith('/')) {
      return pathname === pattern.slice(0, -1) || pathname.startsWith(pattern)
    }
    return pathname === pattern || pathname.startsWith(pattern + '/')
  })
}

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const requestId = generateRequestId()

  // Skip static assets
  if (STATIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Allow public paths
  if (matchesPath(pathname, PUBLIC_PATHS)) {
    return NextResponse.next()
  }

  // Get client IP for rate limiting and audit
  const clientIp = getClientIp(request)

  // Check IP allowlist (if configured)
  try {
    const ipAllowed = await checkIpAllowlist(clientIp)
    if (!ipAllowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Access denied: IP not allowed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch {
    // If IP check fails, continue (allowlist might not be configured)
  }

  // Get auth token from cookie
  const token = getAuthCookie(request)

  if (!token) {
    // No token, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Verify JWT signature and expiration
    const payload = await verifyJWT(token)

    // Verify user is a super admin
    const superAdminStatus = await isSuperAdmin(payload.sub)
    if (!superAdminStatus) {
      // User is not a super admin
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    // Validate super admin session (checks 4-hour limit and inactivity timeout)
    const session = await validateSuperAdminSessionById(payload.sid)
    if (!session) {
      // Session expired or revoked, redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      loginUrl.searchParams.set('reason', 'session_expired')
      return NextResponse.redirect(loginUrl)
    }

    // Check rate limiting
    const isSensitiveRoute = matchesPath(pathname, SENSITIVE_ROUTES)
    const rateLimitConfig = isSensitiveRoute ? RATE_LIMITS.sensitive : RATE_LIMITS.default
    const rateLimitBucket = isSensitiveRoute ? 'sensitive' : 'api'

    const withinRateLimit = await checkRateLimit(
      payload.sub,
      rateLimitBucket,
      rateLimitConfig.limit,
      rateLimitConfig.windowSeconds
    )

    if (!withinRateLimit) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitConfig.windowSeconds,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitConfig.windowSeconds.toString(),
          },
        }
      )
    }

    // Check MFA for sensitive routes
    if (isSensitiveRoute && !session.mfaVerified) {
      // MFA required but not verified for this session
      const mfaUrl = new URL('/mfa-challenge', request.url)
      mfaUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(mfaUrl)
    }

    // Get organization slug if we have an org ID
    let orgSlug = payload.org
    if (payload.orgId && !orgSlug) {
      const orgResult = await sql`
        SELECT slug FROM public.organizations WHERE id = ${payload.orgId}
      `
      const orgRow = orgResult.rows[0]
      if (orgRow) {
        orgSlug = orgRow.slug as string
      }
    }

    // Log request to audit log (async, don't await)
    logAuditAction({
      userId: payload.sub,
      action: 'api_request',
      resourceType: 'api',
      resourceId: null,
      tenantId: payload.orgId || null,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      requestId,
      metadata: {
        method: request.method,
        path: pathname,
        isSensitive: isSensitiveRoute,
      },
    }).catch((error) => {
      console.error('Failed to log audit action:', error)
    })

    // Clone the request and add auth headers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.sub)
    requestHeaders.set('x-session-id', payload.sid)
    requestHeaders.set('x-user-role', 'super_admin')
    requestHeaders.set('x-is-super-admin', 'true')
    requestHeaders.set('x-mfa-verified', session.mfaVerified ? 'true' : 'false')
    requestHeaders.set('x-request-id', requestId)

    if (payload.orgId) {
      requestHeaders.set('x-tenant-id', payload.orgId)
    }
    if (orgSlug) {
      requestHeaders.set('x-tenant-slug', orgSlug)
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (err: unknown) {
    console.error('Middleware error:', err)
    // Invalid token, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    loginUrl.searchParams.set('reason', 'invalid_token')
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
