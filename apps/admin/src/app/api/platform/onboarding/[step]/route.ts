export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  completeStep,
  getActiveSessionForUser,
  getSessionWithProgress,
  skipStep,
  updateSession,
  type StepNumber,
} from '@cgk-platform/onboarding'

/**
 * PATCH /api/platform/onboarding/[step]
 * Update a specific onboarding step
 *
 * Path params: step (1-9)
 * Body: { data: Record<string, unknown>, action: 'save' | 'complete' | 'skip' }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ step: string }> }
) {
  const headerList = await headers()
  const userId = headerList.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { step: stepStr } = await params
  const stepNumber = parseInt(stepStr, 10) as StepNumber

  if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 9) {
    return NextResponse.json(
      { error: 'Step must be between 1 and 9' },
      { status: 400 }
    )
  }

  let body: {
    data?: Record<string, unknown>
    action?: 'save' | 'complete' | 'skip'
    sessionId?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const action = body.action || 'save'

  try {
    // Get the active session
    let session
    if (body.sessionId) {
      session = await getSessionWithProgress(body.sessionId)
    } else {
      const activeSession = await getActiveSessionForUser(userId)
      if (activeSession) {
        session = await getSessionWithProgress(activeSession.id)
      }
    }

    if (!session) {
      return NextResponse.json(
        { error: 'No active onboarding session found. Start a new session first.' },
        { status: 404 }
      )
    }

    let stepProgress

    switch (action) {
      case 'complete':
        stepProgress = await completeStep(session.id, stepNumber, body.data || {})
        // Advance current step if completing current step
        if (stepNumber === session.currentStep && stepNumber < 9) {
          await updateSession(session.id, {
            currentStep: (stepNumber + 1) as StepNumber,
          })
        }
        break

      case 'skip':
        stepProgress = await skipStep(session.id, stepNumber)
        // Advance current step if skipping current step
        if (stepNumber === session.currentStep && stepNumber < 9) {
          await updateSession(session.id, {
            currentStep: (stepNumber + 1) as StepNumber,
          })
        }
        break

      case 'save':
      default:
        // Save step data without changing status
        await updateSession(session.id, {
          stepData: {
            ...session.stepData,
            [stepNumber]: body.data || {},
          },
        })
        stepProgress = { stepNumber, data: body.data, status: 'in_progress' }
        break
    }

    // Return updated session
    const updatedSession = await getSessionWithProgress(session.id)

    return NextResponse.json({
      session: updatedSession,
      step: stepProgress,
    })
  } catch (error) {
    console.error('Error updating onboarding step:', error)
    return NextResponse.json(
      { error: 'Failed to update onboarding step' },
      { status: 500 }
    )
  }
}
