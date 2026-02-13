import { enableUser, logAuditAction } from '@cgk-platform/auth'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Helper to get request context from headers (set by middleware)
 */
function getRequestContext(request: Request): {
  userId: string
  sessionId: string
  isSuperAdmin: boolean
  mfaVerified: boolean
} {
  return {
    userId: request.headers.get('x-user-id') || '',
    sessionId: request.headers.get('x-session-id') || '',
    isSuperAdmin: request.headers.get('x-is-super-admin') === 'true',
    mfaVerified: request.headers.get('x-mfa-verified') === 'true',
  }
}

/**
 * POST /api/platform/users/[id]/enable
 *
 * Re-enable a previously disabled user account.
 * Requires: Super admin access with MFA verification
 */
export async function POST(request: Request, { params }: RouteParams) {
  const resolvedParams = await params
  const targetUserId = resolvedParams.id

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    const { userId, isSuperAdmin, mfaVerified } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    if (!mfaVerified) {
      return Response.json(
        { error: 'MFA verification required for this action' },
        { status: 403 }
      )
    }

    if (!targetUserId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    await enableUser(targetUserId, userId)

    // Log to super admin audit
    await logAuditAction({
      userId,
      action: 'edit_user',
      resourceType: 'user',
      resourceId: targetUserId,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      metadata: {
        action: 'enable_user',
      },
    })

    return Response.json({
      success: true,
      message: 'User has been re-enabled',
    })
  } catch (error) {
    console.error('Enable user error:', error)
    return Response.json({ error: 'Failed to enable user' }, { status: 500 })
  }
}
