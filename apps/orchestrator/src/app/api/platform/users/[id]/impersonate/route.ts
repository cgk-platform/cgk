import {
  endImpersonation,
  getActiveImpersonationSessions,
  getSuperAdminUser,
  startImpersonation,
  ImpersonationError,
} from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'

interface ImpersonationNoticeParams {
  targetEmail: string
  targetName: string
  actorName: string
  tenantId: string
  reason: string
  startedAt: Date
  sessionId: string
}

/**
 * Send a security notice email to the user whose account is being accessed.
 * Uses the platform Resend API key (not a per-tenant credential).
 * Fire-and-forget — caller must .catch() any errors.
 */
async function sendImpersonationNotice(params: ImpersonationNoticeParams): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM || process.env.ALERT_EMAIL_FROM
  if (!resendApiKey || !emailFrom) {
    console.warn('[Impersonation] Email not configured (RESEND_API_KEY or EMAIL_FROM missing)')
    return
  }

  const { targetEmail, targetName, actorName, reason, startedAt, sessionId } = params
  const formattedDate = startedAt.toUTCString()

  const html = `
    <p>Hello ${targetName ?? 'there'},</p>
    <p>
      This is an automated security notice. A support agent accessed your account
      on the CGK platform.
    </p>
    <table cellpadding="8" style="border-collapse:collapse;font-family:monospace;font-size:13px">
      <tr><td><strong>Agent</strong></td><td>${actorName}</td></tr>
      <tr><td><strong>Reason</strong></td><td>${reason}</td></tr>
      <tr><td><strong>Time</strong></td><td>${formattedDate}</td></tr>
      <tr><td><strong>Session ID</strong></td><td>${sessionId}</td></tr>
    </table>
    <p>
      If you did not authorise this access or have concerns, please contact
      platform support immediately.
    </p>
    <p>— CGK Platform Security</p>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: emailFrom,
      to: targetEmail,
      subject: 'Security Notice: Your account was accessed by support',
      html,
    }),
  })

  if (!res.ok) {
    throw new Error(`Resend API error ${res.status}: ${await res.text()}`)
  }

  console.log(`[Impersonation] Security notice sent to ${targetEmail} (session ${sessionId})`)
}

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
} {
  return {
    userId: request.headers.get('x-user-id') || '',
    sessionId: request.headers.get('x-session-id') || '',
    isSuperAdmin: request.headers.get('x-is-super-admin') === 'true',
  }
}

/**
 * POST /api/platform/users/[id]/impersonate
 *
 * Start an impersonation session for the target user.
 * Requires: Super admin with impersonation privileges
 *
 * Body:
 * - tenantId: string - The tenant to access as the user
 * - reason: string - Mandatory reason for impersonation
 */
export async function POST(request: Request, { params }: RouteParams) {
  const resolvedParams = await params
  const targetUserId = resolvedParams.id

  try {
    const { userId, sessionId, isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    // Verify user has impersonation privileges
    const superAdmin = await getSuperAdminUser(userId)
    if (!superAdmin?.canImpersonate) {
      return Response.json(
        { error: 'You do not have impersonation privileges' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { tenantId, reason } = body

    if (!tenantId) {
      return Response.json({ error: 'tenantId is required' }, { status: 400 })
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return Response.json(
        { error: 'A reason is required for impersonation' },
        { status: 400 }
      )
    }

    // Start impersonation
    const result = await startImpersonation(
      userId,
      sessionId,
      targetUserId,
      tenantId,
      reason,
      request
    )

    // Send security notice to the impersonated account owner (fire-and-forget)
    sendImpersonationNotice({
      targetEmail: result.targetUser.email,
      targetName: result.targetUser.name ?? result.targetUser.email,
      actorName: `User ${userId}`,
      tenantId,
      reason,
      startedAt: new Date(),
      sessionId: result.session.id,
    }).catch((err) => console.error('[Impersonation] Security notice failed:', err))

    // Get tenant info for response
    const tenantResult = await sql`
      SELECT name, slug FROM public.organizations WHERE id = ${tenantId}
    `
    const tenant = tenantResult.rows[0] as Record<string, unknown> | undefined

    return Response.json({
      success: true,
      session: {
        id: result.session.id,
        expiresAt: result.session.expiresAt.toISOString(),
        targetUser: result.targetUser,
        tenant: tenant
          ? { id: tenantId, name: tenant.name, slug: tenant.slug }
          : null,
      },
      token: result.token,
    })
  } catch (error) {
    if (error instanceof ImpersonationError) {
      const statusCodes: Record<string, number> = {
        REASON_REQUIRED: 400,
        NOT_SUPER_ADMIN: 403,
        TARGET_NOT_FOUND: 404,
        CANNOT_IMPERSONATE_SUPER_ADMIN: 403,
        NO_TENANT_ACCESS: 400,
      }
      return Response.json(
        { error: error.message, code: error.code },
        { status: statusCodes[error.code] || 400 }
      )
    }

    console.error('Start impersonation error:', error)
    return Response.json(
      { error: 'Failed to start impersonation' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/platform/users/[id]/impersonate
 *
 * Get active impersonation sessions for the current super admin.
 * Requires: Super admin access
 */
export async function GET(request: Request, _params: RouteParams) {
  try {
    const { userId, isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const sessions = await getActiveImpersonationSessions(userId)

    // Enrich sessions with user and tenant info
    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        const userResult = await sql`
          SELECT id, email, name FROM public.users WHERE id = ${session.targetUserId}
        `
        const tenantResult = await sql`
          SELECT id, name, slug FROM public.organizations WHERE id = ${session.targetTenantId}
        `

        return {
          ...session,
          targetUser: userResult.rows[0] || null,
          tenant: tenantResult.rows[0] || null,
        }
      })
    )

    return Response.json({ sessions: enrichedSessions })
  } catch (error) {
    console.error('Get impersonation sessions error:', error)
    return Response.json(
      { error: 'Failed to get impersonation sessions' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/platform/users/[id]/impersonate
 *
 * End an impersonation session.
 * Requires: Super admin access
 *
 * Body:
 * - sessionId: string - The impersonation session to end
 */
export async function DELETE(request: Request, _params: RouteParams) {
  try {
    const { userId, isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return Response.json({ error: 'sessionId is required' }, { status: 400 })
    }

    await endImpersonation(sessionId, 'manual_end', userId)

    return Response.json({ success: true })
  } catch (error) {
    console.error('End impersonation error:', error)
    return Response.json(
      { error: 'Failed to end impersonation' },
      { status: 500 }
    )
  }
}
