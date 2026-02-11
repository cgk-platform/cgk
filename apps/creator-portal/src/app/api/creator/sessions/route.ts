/**
 * Creator Sessions API Route
 *
 * GET /api/creator/sessions - List active sessions
 * DELETE /api/creator/sessions - Revoke all other sessions
 */

import {
  getCreatorSessions,
  requireCreatorAuth,
  revokeOtherCreatorSessions,
  type CreatorAuthContext,
} from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Get all active sessions for the current creator
 */
export async function GET(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const sessions = await getCreatorSessions(context.creatorId, context.sessionId)

    return Response.json({
      sessions: sessions.map((session) => ({
        id: session.id,
        deviceInfo: session.deviceInfo || 'Unknown Device',
        deviceType: session.deviceType || 'unknown',
        ipAddress: maskIPAddress(session.ipAddress),
        lastActiveAt: session.lastActiveAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        isCurrent: session.isCurrent || false,
      })),
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return Response.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

/**
 * Revoke all other sessions (keep current session active)
 */
export async function DELETE(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const revokedCount = await revokeOtherCreatorSessions(
      context.creatorId,
      context.sessionId
    )

    return Response.json({
      success: true,
      message: `Signed out of ${revokedCount} other device${revokedCount === 1 ? '' : 's'}`,
      revokedCount,
    })
  } catch (error) {
    console.error('Error revoking sessions:', error)
    return Response.json({ error: 'Failed to revoke sessions' }, { status: 500 })
  }
}

/**
 * Mask IP address for privacy (show only first two octets)
 */
function maskIPAddress(ip: string | null): string {
  if (!ip) return 'Unknown'

  // Handle IPv4
  const ipv4Parts = ip.split('.')
  if (ipv4Parts.length === 4) {
    return `${ipv4Parts[0]}.${ipv4Parts[1]}.*.*`
  }

  // Handle IPv6 (simplified masking)
  if (ip.includes(':')) {
    const parts = ip.split(':')
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:****`
    }
  }

  return 'Unknown'
}
