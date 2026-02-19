export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createSession,
  getActiveSessionForUser,
  getSessionWithProgress,
  updateSession,
} from '@cgk-platform/onboarding'

/**
 * GET /api/platform/onboarding
 * Get the current user's active onboarding session, or null if none exists
 */
export async function GET() {
  const headerList = await headers()
  const userId = headerList.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find active session for user
    const session = await getActiveSessionForUser(userId)

    if (!session) {
      return NextResponse.json({ session: null })
    }

    // Get full session with step progress
    const sessionWithProgress = await getSessionWithProgress(session.id)

    return NextResponse.json({ session: sessionWithProgress })
  } catch (error) {
    console.error('Error fetching onboarding session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch onboarding session' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/platform/onboarding
 * Create a new onboarding session or resume existing one
 *
 * Body: { resumeSessionId?: string }
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const userId = headerList.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let body: { resumeSessionId?: string } = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is fine — creates new session
    }

    // Check for existing active session
    const existing = await getActiveSessionForUser(userId)

    if (existing) {
      // If user already has an active session, return it
      const sessionWithProgress = await getSessionWithProgress(existing.id)
      return NextResponse.json({ session: sessionWithProgress, resumed: true })
    }

    if (body.resumeSessionId) {
      // Resume a specific session
      const session = await getSessionWithProgress(body.resumeSessionId)
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      // Reactivate if needed
      if (session.status !== 'in_progress') {
        await updateSession(session.id, { status: 'in_progress' })
      }

      return NextResponse.json({ session, resumed: true })
    }

    // Create new session
    const session = await createSession({ createdBy: userId })
    const sessionWithProgress = await getSessionWithProgress(session.id)

    return NextResponse.json(
      { session: sessionWithProgress, resumed: false },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating onboarding session:', error)
    return NextResponse.json(
      { error: 'Failed to create onboarding session' },
      { status: 500 }
    )
  }
}
