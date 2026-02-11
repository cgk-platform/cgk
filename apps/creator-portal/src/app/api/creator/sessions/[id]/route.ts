/**
 * Creator Session Revoke API Route
 *
 * DELETE /api/creator/sessions/[id] - Revoke a specific session
 */

import {
  requireCreatorAuth,
  revokeCreatorSession,
  type CreatorAuthContext,
} from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * Revoke a specific session
 */
export async function DELETE(
  req: Request,
  { params }: RouteParams
): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  const { id: sessionId } = await params

  // Prevent revoking current session
  if (sessionId === context.sessionId) {
    return Response.json(
      { error: 'Cannot revoke current session. Use logout instead.' },
      { status: 400 }
    )
  }

  try {
    await revokeCreatorSession(sessionId)

    return Response.json({
      success: true,
      message: 'Session revoked successfully',
    })
  } catch (error) {
    console.error('Error revoking session:', error)
    return Response.json({ error: 'Failed to revoke session' }, { status: 500 })
  }
}
