import {
  createSuperAdminSession,
  getSuperAdminUser,
  getUserByEmail,
  isSuperAdmin,
  logAuditAction,
  setAuthCookie,
  signJWT,
} from '@cgk-platform/auth'
import { verifyPassword } from '@cgk-platform/auth/node'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') || 'unknown'

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (
      typeof body !== 'object' || body === null ||
      typeof (body as Record<string, unknown>).email !== 'string' ||
      typeof (body as Record<string, unknown>).password !== 'string'
    ) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const { email: rawEmail, password } = body as { email: string; password: string }
    const email = rawEmail.toLowerCase().trim()

    const user = await getUserByEmail(email)
    if (!user || !user.passwordHash) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      await logAuditAction({
        userId: user.id,
        action: 'login',
        resourceType: 'session',
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || null,
        metadata: { success: false, reason: 'invalid_password', app: 'command-center' },
      }).catch(() => {})
      return Response.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const superAdminStatus = await isSuperAdmin(user.id)
    if (!superAdminStatus) {
      return Response.json(
        { error: 'Access denied. Super administrators only.' },
        { status: 403 }
      )
    }

    const superAdmin = await getSuperAdminUser(user.id)
    if (!superAdmin) {
      return Response.json({ error: 'Super admin record not found' }, { status: 500 })
    }

    const { session } = await createSuperAdminSession(user.id, request)

    const jwt = await signJWT({
      userId: user.id,
      sessionId: session.id,
      email: user.email,
      orgSlug: '',
      orgId: '',
      role: 'super_admin',
      orgs: [],
    })

    await logAuditAction({
      userId: user.id,
      action: 'login',
      resourceType: 'session',
      resourceId: session.id,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      metadata: { success: true, app: 'command-center' },
    })

    const response = Response.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    })
    return setAuthCookie(response, jwt)
  } catch (error) {
    console.error('Login error:', error)
    return Response.json({ error: 'Login failed' }, { status: 500 })
  }
}
