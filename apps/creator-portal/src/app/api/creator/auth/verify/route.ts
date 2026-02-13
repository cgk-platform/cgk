/**
 * Creator Magic Link Verification API Route
 *
 * POST /api/creator/auth/verify
 * Verifies a magic link token and creates a session.
 */

import { sql } from '@cgk-platform/db'

import {
  createCreatorSession,
  getSetCookieHeader,
  loadBrandMemberships,
  signCreatorJWT,
  verifyCreatorMagicLink,
} from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface VerifyRequest {
  email: string
  token: string
}

export async function POST(req: Request): Promise<Response> {
  let body: VerifyRequest

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, token } = body

  if (!email || !token) {
    return Response.json(
      { error: 'Email and token are required' },
      { status: 400 }
    )
  }

  try {
    // Verify the magic link
    const { creatorId } = await verifyCreatorMagicLink(email, token)

    if (!creatorId) {
      return Response.json(
        { error: 'No account found for this email. Please contact support.' },
        { status: 404 }
      )
    }

    // Get creator data
    const creatorResult = await sql`
      SELECT id, email, name, status, onboarding_completed, guided_tour_completed
      FROM creators
      WHERE id = ${creatorId}
    `

    const creatorRow = creatorResult.rows[0]
    if (!creatorRow) {
      return Response.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    if (creatorRow.status === 'suspended') {
      return Response.json(
        { error: 'Your account has been suspended. Please contact support.' },
        { status: 403 }
      )
    }

    // Update last login
    await sql`
      UPDATE creators
      SET last_login_at = NOW(),
          first_login_at = COALESCE(first_login_at, NOW())
      WHERE id = ${creatorId}
    `

    // Create session
    const { session } = await createCreatorSession(creatorId, req)

    // Load brand memberships
    const memberships = await loadBrandMemberships(creatorId)

    // Sign JWT
    const jwt = await signCreatorJWT({
      creatorId,
      sessionId: session.id,
      email: creatorRow.email as string,
      name: creatorRow.name as string,
      memberships,
    })

    // Set auth cookie
    const setCookieHeader = getSetCookieHeader(jwt)

    return Response.json(
      {
        success: true,
        creator: {
          id: creatorId,
          email: creatorRow.email,
          name: creatorRow.name,
          status: creatorRow.status,
          onboardingCompleted: creatorRow.onboarding_completed,
          guidedTourCompleted: creatorRow.guided_tour_completed,
        },
      },
      {
        headers: {
          'Set-Cookie': setCookieHeader,
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed'
    return Response.json({ error: message }, { status: 400 })
  }
}
