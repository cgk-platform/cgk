/**
 * Onboarding Sessions API - Create and List
 *
 * POST /api/platform/onboarding - Create new onboarding session
 * GET /api/platform/onboarding - Get active session or list sessions (admin)
 */

import { requireAuth } from '@cgk/auth'
import { createLogger } from '@cgk/logging'
import {
  createSession,
  getActiveSessionForUser,
  getInProgressSessions,
} from '@cgk/onboarding'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const logger = createLogger({
  meta: { service: 'orchestrator', component: 'onboarding-api' },
})

/**
 * GET /api/platform/onboarding
 *
 * For regular users: Get their active onboarding session
 * For super admins with ?admin=true: List all in-progress sessions
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    const url = new URL(req.url)
    const isAdminView = url.searchParams.get('admin') === 'true'

    // Admin view - list all in-progress sessions
    if (isAdminView && auth.role === 'super_admin') {
      const page = parseInt(url.searchParams.get('page') || '1', 10)
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)
      const offset = (page - 1) * limit

      const result = await getInProgressSessions({ limit, offset })

      return Response.json({
        sessions: result.sessions,
        total: result.total,
        page,
        limit,
      })
    }

    // Regular view - get user's active session
    const session = await getActiveSessionForUser(auth.userId)

    if (!session) {
      return Response.json({ session: null })
    }

    return Response.json({ session })
  } catch (error) {
    logger.error('Failed to get onboarding sessions', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/platform/onboarding
 *
 * Create a new onboarding session
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)

    // Only super admins can create new brands
    if (auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check for existing active session
    const existingSession = await getActiveSessionForUser(auth.userId)
    if (existingSession) {
      logger.info('Returning existing session', {
        sessionId: existingSession.id,
        userId: auth.userId,
      })
      return Response.json({ session: existingSession })
    }

    // Create new session
    const session = await createSession({ createdBy: auth.userId })

    logger.info('Created onboarding session', {
      sessionId: session.id,
      userId: auth.userId,
    })

    return Response.json({ session }, { status: 201 })
  } catch (error) {
    logger.error('Failed to create onboarding session', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
