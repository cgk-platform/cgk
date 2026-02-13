import { disableUser, getSuperAdminUser, logAuditAction } from '@cgk-platform/auth'

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

interface DisableUserBody {
  reason: string
}

/**
 * POST /api/platform/users/[id]/disable
 *
 * Disable a user account.
 * Immediately invalidates all their sessions.
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

    // Cannot disable yourself
    if (targetUserId === userId) {
      return Response.json({ error: 'Cannot disable your own account' }, { status: 400 })
    }

    const body = (await request.json()) as DisableUserBody

    if (!body.reason || body.reason.trim().length === 0) {
      return Response.json({ error: 'Reason for disabling is required' }, { status: 400 })
    }

    if (body.reason.trim().length < 10) {
      return Response.json(
        { error: 'Reason must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Check if target is the last super admin
    const targetSuperAdmin = await getSuperAdminUser(targetUserId)
    if (targetSuperAdmin) {
      // Let disableUser handle the "last super admin" check
    }

    await disableUser(targetUserId, body.reason.trim(), userId)

    // Log to super admin audit (the function already logs, but we add request context)
    await logAuditAction({
      userId,
      action: 'edit_user',
      resourceType: 'user',
      resourceId: targetUserId,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      metadata: {
        action: 'disable_user',
        reason: body.reason.trim(),
      },
    })

    return Response.json({
      success: true,
      message: 'User has been disabled and all sessions have been revoked',
    })
  } catch (error) {
    console.error('Disable user error:', error)

    if (error instanceof Error) {
      if (error.message.includes('last super admin')) {
        return Response.json({ error: error.message }, { status: 400 })
      }
    }

    return Response.json({ error: 'Failed to disable user' }, { status: 500 })
  }
}
