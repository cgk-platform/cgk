import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { getAuthCookie, validateSessionById, verifyJWT } from '@cgk/auth'
import { sql } from '@cgk/db'

/**
 * Public paths that don't require authentication
 */
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/verify',
  '/login',
  '/auth/verify',
  '/',
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

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // Skip static assets
  if (STATIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next()
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

    // Validate session exists and is not revoked
    const session = await validateSessionById(payload.sid)
    if (!session) {
      // Session revoked or expired, redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
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

    // Clone the request and add auth headers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.sub)
    requestHeaders.set('x-session-id', payload.sid)
    requestHeaders.set('x-user-role', payload.role)

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
  } catch {
    // Invalid token, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
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
