/**
 * Creator Login API Route
 *
 * POST /api/creator/auth/login
 * Authenticates a creator with email and password, returns JWT token.
 */

import {
  authenticateCreator,
  checkRateLimit,
  createCreatorSession,
  getClientIP,
  getClearCookieHeader,
  getRateLimitHeaders,
  getSetCookieHeader,
  loadBrandMemberships,
  recordRateLimitAttempt,
  signCreatorJWT,
} from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export async function POST(req: Request): Promise<Response> {
  const ip = getClientIP(req)

  // Check rate limit
  const { isLimited, remaining, resetAt } = checkRateLimit(ip, 'auth')
  if (isLimited) {
    return Response.json(
      { error: 'Too many login attempts. Please try again later.' },
      {
        status: 429,
        headers: getRateLimitHeaders(remaining, resetAt),
      }
    )
  }

  // Record the attempt
  recordRateLimitAttempt(ip, 'auth')

  let body: LoginRequest

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, password } = body

  if (!email || !password) {
    return Response.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  try {
    // Authenticate creator
    const creator = await authenticateCreator(email, password)

    // Create session
    const { session } = await createCreatorSession(creator.id, req)

    // Load brand memberships for JWT
    const memberships = await loadBrandMemberships(creator.id)

    // Sign JWT
    const jwt = await signCreatorJWT({
      creatorId: creator.id,
      sessionId: session.id,
      email: creator.email,
      name: creator.name,
      memberships,
    })

    // Set auth cookie
    const setCookieHeader = getSetCookieHeader(jwt)

    return Response.json(
      {
        success: true,
        creator: {
          id: creator.id,
          email: creator.email,
          name: creator.name,
          status: creator.status,
          onboardingCompleted: creator.onboardingCompleted,
          guidedTourCompleted: creator.guidedTourCompleted,
        },
      },
      {
        headers: {
          'Set-Cookie': setCookieHeader,
          ...getRateLimitHeaders(remaining - 1, resetAt),
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed'
    return Response.json(
      { error: message },
      {
        status: 401,
        headers: getRateLimitHeaders(remaining - 1, resetAt),
      }
    )
  }
}

export async function DELETE(): Promise<Response> {
  // Logout - clear the cookie
  return Response.json(
    { success: true, message: 'Logged out successfully' },
    {
      headers: {
        'Set-Cookie': getClearCookieHeader(),
      },
    }
  )
}
