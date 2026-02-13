import { sql } from '@cgk-platform/db'

import { getAuthCookie } from './cookies'
import { verifyJWT } from './jwt'
import { validateSessionById } from './session'
import type { UserRole } from './types'

/**
 * Request with modified headers (Next.js NextRequest compatible interface)
 */
interface NextRequest extends Request {
  nextUrl: {
    pathname: string
    searchParams: URLSearchParams
  }
}

/**
 * Response with Next.js NextResponse compatible interface
 */
interface NextResponse extends Response {
  // Using intersection to add static methods
}

interface NextResponseStatic {
  next(init?: { headers?: Headers }): NextResponse
  redirect(url: URL | string, status?: number): NextResponse
}

/**
 * Auth middleware for Next.js
 *
 * Validates JWT and session, then injects context headers:
 * - x-tenant-id: Organization ID
 * - x-tenant-slug: Organization slug
 * - x-user-id: User ID
 * - x-user-role: User's role
 * - x-session-id: Session ID
 *
 * @param request - Next.js request object
 * @param NextResponse - Next.js NextResponse class
 * @returns Response to continue or redirect
 */
export async function authMiddleware(
  request: NextRequest,
  NextResponse: NextResponseStatic
): Promise<NextResponse | null> {
  const token = getAuthCookie(request)

  if (!token) {
    // No token, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Verify JWT signature and expiration
    const payload = await verifyJWT(token)

    // Validate session exists and is not revoked
    const session = await validateSessionById(payload.sid)
    if (!session) {
      // Session revoked or expired, redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Get organization slug if we have an org ID
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

    // Inject context headers
    const headers = new Headers(request.headers)
    headers.set('x-user-id', payload.sub)
    headers.set('x-session-id', payload.sid)
    headers.set('x-user-role', payload.role)

    if (payload.orgId) {
      headers.set('x-tenant-id', payload.orgId)
    }
    if (orgSlug) {
      headers.set('x-tenant-slug', orgSlug)
    }

    return NextResponse.next({ headers })
  } catch {
    // Invalid token, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    super_admin: 4,
    owner: 3,
    admin: 2,
    member: 1,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Create a role-checking middleware
 */
export function requireRole(requiredRole: UserRole) {
  return async function roleMiddleware(
    request: NextRequest,
    _NextResponse: NextResponseStatic
  ): Promise<NextResponse | null> {
    const userRole = request.headers.get('x-user-role') as UserRole

    if (!userRole || !hasRole(userRole, requiredRole)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ) as NextResponse
    }

    return null // Continue
  }
}

/**
 * Combine multiple middlewares
 */
export function composeMiddleware(
  ...middlewares: Array<
    (
      request: NextRequest,
      NextResponse: NextResponseStatic
    ) => Promise<NextResponse | null>
  >
) {
  return async function composedMiddleware(
    request: NextRequest,
    NextResponse: NextResponseStatic
  ): Promise<NextResponse | null> {
    for (const middleware of middlewares) {
      const result = await middleware(request, NextResponse)
      if (result) {
        return result
      }
    }
    return null
  }
}
