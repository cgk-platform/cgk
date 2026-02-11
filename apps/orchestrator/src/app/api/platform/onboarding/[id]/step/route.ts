/**
 * Onboarding Step API - Update Step Progress
 *
 * POST /api/platform/onboarding/[id]/step - Update step data
 */

import { requireAuth } from '@cgk/auth'
import { createLogger } from '@cgk/logging'
import {
  completeStep,
  getSession,
  skipStep,
  updateSession,
  updateStepProgress,
  type StepNumber,
} from '@cgk/onboarding'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const logger = createLogger({
  meta: { service: 'orchestrator', component: 'onboarding-step-api' },
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/platform/onboarding/[id]/step
 *
 * Update a step's data and optionally mark it complete or skipped
 */
export async function POST(req: Request, context: RouteParams) {
  try {
    const auth = await requireAuth(req)
    const { id: sessionId } = await context.params

    const session = await getSession(sessionId)
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    // Only allow access to own sessions or super admins
    if (session.createdBy !== auth.userId && auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check session is still active
    if (session.status !== 'in_progress') {
      return Response.json(
        { error: 'Session is no longer active' },
        { status: 400 }
      )
    }

    const body = await req.json() as {
      stepNumber: StepNumber
      data: Record<string, unknown>
      action?: 'save' | 'complete' | 'skip' | 'next' | 'back'
    }

    const { stepNumber, data, action = 'save' } = body

    if (!stepNumber || stepNumber < 1 || stepNumber > 9) {
      return Response.json(
        { error: 'Invalid step number' },
        { status: 400 }
      )
    }

    let step

    switch (action) {
      case 'skip':
        step = await skipStep(sessionId, stepNumber)
        // Move to next step
        if (stepNumber < 9) {
          await updateSession(sessionId, { currentStep: (stepNumber + 1) as StepNumber })
        }
        break

      case 'complete':
      case 'next':
        step = await completeStep(sessionId, stepNumber, data)
        // Move to next step
        if (stepNumber < 9) {
          await updateSession(sessionId, { currentStep: (stepNumber + 1) as StepNumber })
        }
        break

      case 'back':
        step = await updateStepProgress({
          sessionId,
          stepNumber,
          data,
        })
        // Move to previous step
        if (stepNumber > 1) {
          await updateSession(sessionId, { currentStep: (stepNumber - 1) as StepNumber })
        }
        break

      case 'save':
      default:
        step = await updateStepProgress({
          sessionId,
          stepNumber,
          data,
          status: 'in_progress',
        })
        break
    }

    // Also update session's step_data for persistence
    const stepKey = getStepKey(stepNumber)
    const updatedStepData = {
      ...session.stepData,
      [stepKey]: data,
    }
    await updateSession(sessionId, { stepData: updatedStepData })

    logger.info('Step updated', {
      sessionId,
      stepNumber,
      action,
      userId: auth.userId,
    })

    return Response.json({ step })
  } catch (error) {
    logger.error('Failed to update step', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Map step number to step data key
 */
function getStepKey(stepNumber: StepNumber): string {
  const keys: Record<StepNumber, string> = {
    1: 'basicInfo',
    2: 'shopify',
    3: 'domains',
    4: 'payments',
    5: 'integrations',
    6: 'features',
    7: 'products',
    8: 'users',
    9: 'launch',
  }
  return keys[stepNumber]
}
