import {
  checkRateLimit,
  createSuperAdminSession,
  getSuperAdminUser,
  getUserByEmail,
  isSuperAdmin,
  logAuditAction,
  setAuthCookie,
  signJWT,
  verifyPassword,
} from '@cgk/auth'

export const dynamic = 'force-dynamic'

interface LoginRequestBody {
  email: string
  password: string
}

/**
 * POST /api/platform/auth/login
 *
 * Super admin login with password authentication.
 * Requires the user to be registered in super_admin_users table.
 *
 * Flow:
 * 1. Validate credentials
 * 2. Verify user is a super admin
 * 3. Create super admin session (single session per user)
 * 4. Check if MFA is required
 * 5. Return JWT token with session info
 */
export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    const body = (await request.json()) as LoginRequestBody

    // Validate required fields
    if (!body.email || !body.password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const email = body.email.toLowerCase().trim()

    // Rate limit login attempts by IP (5 attempts per minute)
    const withinRateLimit = await checkRateLimit(
      `login:${clientIp}`,
      'login',
      5,
      60
    )

    if (!withinRateLimit) {
      return Response.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: 60,
        },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        }
      )
    }

    // Get user by email
    const user = await getUserByEmail(email)
    if (!user) {
      // Log failed attempt (user not found)
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    if (!user.passwordHash) {
      return Response.json(
        { error: 'Password authentication not enabled for this account' },
        { status: 401 }
      )
    }

    const passwordValid = await verifyPassword(body.password, user.passwordHash)
    if (!passwordValid) {
      // Log failed attempt
      await logAuditAction({
        userId: user.id,
        action: 'login',
        resourceType: 'session',
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || null,
        metadata: { success: false, reason: 'invalid_password' },
      }).catch(() => {
        // Ignore logging errors
      })

      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user is a super admin
    const superAdminStatus = await isSuperAdmin(user.id)
    if (!superAdminStatus) {
      // Log failed attempt (not super admin)
      await logAuditAction({
        userId: user.id,
        action: 'login',
        resourceType: 'session',
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || null,
        metadata: { success: false, reason: 'not_super_admin' },
      }).catch(() => {
        // Ignore logging errors
      })

      return Response.json(
        { error: 'Access denied. This portal is for super administrators only.' },
        { status: 403 }
      )
    }

    // Get super admin details
    const superAdmin = await getSuperAdminUser(user.id)
    if (!superAdmin) {
      return Response.json(
        { error: 'Super admin record not found' },
        { status: 500 }
      )
    }

    // Create super admin session (automatically revokes existing sessions)
    const { session } = await createSuperAdminSession(user.id, request)

    // Create JWT
    const jwt = await signJWT({
      userId: user.id,
      sessionId: session.id,
      email: user.email,
      orgSlug: '',
      orgId: '',
      role: 'super_admin',
      orgs: [],
    })

    // Log successful login
    await logAuditAction({
      userId: user.id,
      action: 'login',
      resourceType: 'session',
      resourceId: session.id,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      metadata: {
        success: true,
        mfaRequired: superAdmin.mfaEnabled,
        sessionExpiresAt: session.expiresAt.toISOString(),
      },
    })

    // Prepare response
    const responseData = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'super_admin' as const,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        mfaVerified: session.mfaVerified,
      },
      mfaRequired: superAdmin.mfaEnabled && !session.mfaVerified,
      redirectTo: superAdmin.mfaEnabled && !session.mfaVerified ? '/mfa-challenge' : '/',
    }

    // Set auth cookie and return response
    const response = Response.json(responseData)
    return setAuthCookie(response, jwt)
  } catch (error) {
    console.error('Login error:', error)
    return Response.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
