import {
  getAuthCookie,
  isImpersonationToken,
  updateMembershipActivity,
  validateImpersonationSession,
  validateSessionById,
  verifyImpersonationJWT,
  verifyJWT,
} from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/join',
  '/auth/verify',
  '/api/auth',
]

const STATIC_PATHS = [
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  if (STATIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next()
  }

  // Resolve tenant from Host header
  const host = request.headers.get('host') || ''
  const requestHeaders = new Headers(request.headers)

  // Try domain-to-tenant resolution from Host header
  const tenantFromDomain = await resolveTenantFromHost(host)
  if (tenantFromDomain) {
    requestHeaders.set('x-tenant-id', tenantFromDomain.id)
    requestHeaders.set('x-tenant-slug', tenantFromDomain.slug)
  }

  const token = getAuthCookie(request)

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // First, try to decode as a regular JWT to check the type
    const payload = await verifyJWT(token)

    // Check if this is an impersonation token
    if (isImpersonationToken(payload)) {
      // Verify as impersonation JWT
      const impersonationPayload = await verifyImpersonationJWT(token)

      // Validate the impersonation session is still active
      const impersonationSession = await validateImpersonationSession(impersonationPayload.sid)
      if (!impersonationSession) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        loginUrl.searchParams.set('reason', 'impersonation_expired')
        return NextResponse.redirect(loginUrl)
      }

      // Set user info from impersonated user
      requestHeaders.set('x-user-id', impersonationPayload.sub)
      requestHeaders.set('x-session-id', impersonationPayload.sid)
      requestHeaders.set('x-user-role', impersonationPayload.role)

      // Set impersonation info headers
      requestHeaders.set('x-impersonator-id', impersonationPayload.impersonator.userId)
      requestHeaders.set('x-impersonator-email', impersonationPayload.impersonator.email)
      requestHeaders.set('x-impersonator-session-id', impersonationPayload.impersonator.sessionId)
      requestHeaders.set('x-impersonation-expires-at', impersonationSession.expiresAt.toISOString())
      requestHeaders.set('x-is-impersonation', 'true')

      // Set tenant from impersonation payload
      requestHeaders.set('x-tenant-id', impersonationPayload.orgId)
      requestHeaders.set('x-tenant-slug', impersonationPayload.org)

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }

    // Regular session validation
    const session = await validateSessionById(payload.sid)
    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    requestHeaders.set('x-user-id', payload.sub)
    requestHeaders.set('x-session-id', payload.sid)
    requestHeaders.set('x-user-role', payload.role)

    // Use tenant from JWT if not already resolved from domain
    let tenantId = tenantFromDomain?.id || null
    if (!tenantFromDomain) {
      let orgSlug = payload.org
      if (payload.orgId && !orgSlug) {
        const orgResult = await sql`
          SELECT slug FROM organizations WHERE id = ${payload.orgId}
        `
        const orgRow = orgResult.rows[0]
        if (orgRow) {
          orgSlug = orgRow.slug as string
        }
      }
      if (payload.orgId) {
        requestHeaders.set('x-tenant-id', payload.orgId)
        tenantId = payload.orgId
      }
      if (orgSlug) {
        requestHeaders.set('x-tenant-slug', orgSlug)
      }
    }

    // Update membership activity (fire and forget)
    if (tenantId) {
      updateMembershipActivity(payload.sub, tenantId).catch(() => {
        // Ignore errors - this is non-critical
      })
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

async function resolveTenantFromHost(
  host: string
): Promise<{ id: string; slug: string } | null> {
  const hostname = host.split(':')[0] ?? ''

  // Check for custom domain match
  const domainResult = await sql`
    SELECT id, slug FROM organizations
    WHERE settings->>'customDomain' = ${hostname}
    AND status = 'active'
    LIMIT 1
  `
  if (domainResult.rows[0]) {
    return {
      id: domainResult.rows[0].id as string,
      slug: domainResult.rows[0].slug as string,
    }
  }

  // Check for subdomain match (e.g., rawdog.admin.example.com)
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    const subdomain = parts[0]!
    const subResult = await sql`
      SELECT id, slug FROM organizations
      WHERE slug = ${subdomain}
      AND status = 'active'
      LIMIT 1
    `
    if (subResult.rows[0]) {
      return {
        id: subResult.rows[0].id as string,
        slug: subResult.rows[0].slug as string,
      }
    }
  }

  return null
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
