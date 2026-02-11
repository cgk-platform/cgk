/**
 * Brand Launch API
 *
 * POST /api/platform/brands/launch - Launch a brand (complete onboarding)
 */

import { requireAuth } from '@cgk/auth'
import { createLogger } from '@cgk/logging'
import {
  completeSession,
  getSession,
  getSessionWithProgress,
  launchOrganization,
  updateOrganization,
  verifyLaunchReadiness,
} from '@cgk/onboarding'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const logger = createLogger({
  meta: { service: 'orchestrator', component: 'brand-launch-api' },
})

/**
 * POST /api/platform/brands/launch
 *
 * Verify launch checklist and activate the brand
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)

    if (auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as {
      sessionId: string
      force?: boolean
    }

    const { sessionId, force = false } = body

    // Get session with progress
    const session = await getSessionWithProgress(sessionId)
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    if (!session.organizationId) {
      return Response.json(
        { error: 'Organization not yet created' },
        { status: 400 }
      )
    }

    // Verify launch readiness
    const verification = verifyLaunchReadiness(session.stepData)

    if (!verification.canLaunch && !force) {
      return Response.json(
        {
          error: 'Launch blocked by unmet requirements',
          checklist: verification.checklist,
          blockers: verification.blockers,
        },
        { status: 400 }
      )
    }

    logger.info('Launching brand', {
      sessionId,
      organizationId: session.organizationId,
      forced: force && !verification.canLaunch,
    })

    // Update organization with final settings
    await updateOrganization(session.organizationId, {
      enabledFeatures: session.stepData.features?.enabledFeatures || [],
      setupChecklist: Object.fromEntries(
        verification.checklist.map((item) => [item.key, item.status])
      ),
    })

    // Launch organization (set status to active)
    await launchOrganization(session.organizationId)

    // Complete the onboarding session
    await completeSession(sessionId)

    logger.info('Brand launched successfully', {
      sessionId,
      organizationId: session.organizationId,
    })

    return Response.json({
      success: true,
      organizationId: session.organizationId,
      checklist: verification.checklist,
    })
  } catch (error) {
    logger.error('Failed to launch brand', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/platform/brands/launch?sessionId=xxx
 *
 * Preview launch status without actually launching
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)

    if (auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const sessionId = url.searchParams.get('sessionId')

    if (!sessionId) {
      return Response.json(
        { error: 'sessionId required' },
        { status: 400 }
      )
    }

    const session = await getSession(sessionId)
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    const verification = verifyLaunchReadiness(session.stepData)

    return Response.json({
      canLaunch: verification.canLaunch,
      checklist: verification.checklist,
      blockers: verification.blockers,
    })
  } catch (error) {
    logger.error('Failed to check launch status', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
