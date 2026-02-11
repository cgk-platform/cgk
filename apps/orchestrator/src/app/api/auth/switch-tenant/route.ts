import {
  getAuthCookie,
  getUserById,
  getUserOrganizations,
  setAuthCookie,
  signJWT,
  updateSessionOrganization,
  validateSessionById,
  verifyJWT,
} from '@cgk/auth'
import { sql } from '@cgk/db'

export const dynamic = 'force-dynamic'

interface SwitchTenantBody {
  organizationId: string
}

/**
 * POST /api/auth/switch-tenant
 *
 * Switch the active tenant/organization context.
 * Updates the session and returns a new JWT with the new org context.
 */
export async function POST(request: Request) {
  try {
    const token = getAuthCookie(request)

    if (!token) {
      return Response.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify JWT
    let payload
    try {
      payload = await verifyJWT(token)
    } catch {
      return Response.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Validate session
    const session = await validateSessionById(payload.sid)
    if (!session) {
      return Response.json(
        { error: 'Session expired or revoked' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = (await request.json()) as SwitchTenantBody
    const { organizationId } = body

    if (!organizationId) {
      return Response.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Get user
    const user = await getUserById(payload.sub)
    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    // Get user's organizations
    const orgs = await getUserOrganizations(user.id)

    // Check if user has access to this organization
    const targetOrg = orgs.find((o) => o.id === organizationId)
    if (!targetOrg) {
      return Response.json(
        { error: 'Organization not found or access denied' },
        { status: 403 }
      )
    }

    // Get organization slug
    const orgResult = await sql`
      SELECT slug FROM organizations WHERE id = ${organizationId}
    `
    const orgRow = orgResult.rows[0]
    if (!orgRow) {
      return Response.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }
    const orgSlug = orgRow.slug as string

    // Update session organization
    await updateSessionOrganization(session.id, organizationId)

    // Create new JWT with updated org context
    const jwt = await signJWT({
      userId: user.id,
      sessionId: session.id,
      email: user.email,
      orgSlug,
      orgId: organizationId,
      role: targetOrg.role,
      orgs,
    })

    // Create response with new cookie
    const response = Response.json({
      success: true,
      organization: {
        id: organizationId,
        slug: orgSlug,
        role: targetOrg.role,
      },
    })

    return setAuthCookie(response, jwt)
  } catch (error) {
    console.error('Switch tenant error:', error)
    return Response.json(
      { error: 'Failed to switch tenant' },
      { status: 500 }
    )
  }
}
