import {
  checkRateLimit,
  getAuthCookie,
  isSuperAdmin,
  verifyJWT,
  validateSuperAdminSessionById,
} from '@cgk-platform/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/api/platform/auth/login',
  '/login',
  '/unauthorized',
]

const STATIC_PATHS = ['/_next', '/favicon.ico', '/robots.txt']

function matchesPath(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith('/')) {
      return pathname === pattern.slice(0, -1) || pathname.startsWith(pattern)
    }
    return pathname === pattern || pathname.startsWith(pattern + '/')
  })
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  if (STATIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  if (matchesPath(pathname, PUBLIC_PATHS)) {
    return NextResponse.next()
  }

  const token = getAuthCookie(request)

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const payload = await verifyJWT(token)

    const superAdminStatus = await isSuperAdmin(payload.sub)
    if (!superAdminStatus) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    const session = await validateSuperAdminSessionById(payload.sid)
    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      loginUrl.searchParams.set('reason', 'session_expired')
      return NextResponse.redirect(loginUrl)
    }

    const withinRateLimit = await checkRateLimit(payload.sub, 'api', 100, 60)
    if (!withinRateLimit) {
      return new NextResponse(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
      )
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.sub)
    requestHeaders.set('x-session-id', payload.sid)
    requestHeaders.set('x-user-role', 'super_admin')
    requestHeaders.set('x-is-super-admin', 'true')

    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  } catch {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    loginUrl.searchParams.set('reason', 'invalid_token')
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
