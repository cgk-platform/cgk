/**
 * Creator Portal middleware
 *
 * Protects all (portal) routes by verifying the creator JWT session cookie.
 * Public routes (auth, apply, onboarding, public profiles, API) are excluded.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as jose from 'jose'

const CREATOR_AUTH_COOKIE_NAME = 'creator-auth-token'

/**
 * Paths that do NOT require authentication.
 * Everything else (portal pages) requires a valid creator JWT.
 */
const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/apply',
  '/onboarding',
  '/creator',
  '/sign',
  '/api',
]

const STATIC_PATHS = [
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]

function getCreatorJWTSecret(): Uint8Array | null {
  const secret = process.env.CREATOR_JWT_SECRET || process.env.JWT_SECRET
  if (!secret) {
    return null
  }
  return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // Skip static assets
  if (STATIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Skip public paths
  if (
    pathname === '/' ||
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))
  ) {
    return NextResponse.next()
  }

  // All remaining paths are protected (portal) routes — require auth
  const secret = getCreatorJWTSecret()
  if (!secret) {
    console.error('[creator-portal] CREATOR_JWT_SECRET is not set — cannot verify sessions')
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'server_config')
    return NextResponse.redirect(loginUrl)
  }

  const token = request.cookies.get(CREATOR_AUTH_COOKIE_NAME)?.value
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: 'cgk-creator-portal',
    })

    // Set creator context headers for downstream use
    const requestHeaders = new Headers(request.headers)
    if (payload.sub) {
      requestHeaders.set('x-creator-id', payload.sub)
    }
    if (payload.sid) {
      requestHeaders.set('x-session-id', payload.sid as string)
    }
    if (payload.email) {
      requestHeaders.set('x-creator-email', payload.email as string)
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch {
    // Token invalid or expired — redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    loginUrl.searchParams.set('reason', 'session_expired')
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
