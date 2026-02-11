/**
 * Onboarding Session API - Get Session Details
 *
 * GET /api/platform/onboarding/[id] - Get session with progress
 */

import { requireAuth } from '@cgk/auth'
import { createLogger } from '@cgk/logging'
import { getSessionWithProgress } from '@cgk/onboarding'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const logger = createLogger({
  meta: { service: 'orchestrator', component: 'onboarding-session-api' },
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/platform/onboarding/[id]
 *
 * Get session with all step progress
 */
export async function GET(req: Request, context: RouteParams) {
  try {
    const auth = await requireAuth(req)
    const { id: sessionId } = await context.params

    const session = await getSessionWithProgress(sessionId)

    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    // Only allow access to own sessions or super admins
    if (session.createdBy !== auth.userId && auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    return Response.json({ session })
  } catch (error) {
    logger.error('Failed to get session', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
