import {
  addUserToOrganization,
  createSession,
  createUser,
  getUserByEmail,
  getUserOrganizations,
  setAuthCookie,
  signJWT,
  updateUserLastLogin,
  verifyMagicLink,
} from '@cgk-platform/auth'

export const dynamic = 'force-dynamic'

interface VerifyRequestBody {
  email: string
  token: string
}

/**
 * POST /api/auth/verify
 *
 * Verify a magic link token and create a session.
 * Returns a JWT in an HTTP-only cookie.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyRequestBody

    if (!body.email || !body.token) {
      return Response.json(
        { error: 'Email and token are required' },
        { status: 400 }
      )
    }

    const email = body.email.toLowerCase().trim()

    // Verify the magic link
    const verification = await verifyMagicLink(email, body.token)

    let userId = verification.userId
    let user = userId ? await getUserByEmail(email) : null

    // Create user if this is a signup
    if (!userId || !user) {
      user = await createUser({
        email,
        role: verification.inviteRole || 'member',
      })
      userId = user.id
    }

    // Handle invite - add user to organization
    if (verification.purpose === 'invite' && verification.orgId) {
      await addUserToOrganization(
        userId,
        verification.orgId,
        verification.inviteRole || 'member'
      )
    }

    // Update last login
    await updateUserLastLogin(userId)

    // Get user's organizations
    const orgs = await getUserOrganizations(userId)

    // Determine current org context
    // Priority: invite org > first org > null (super admin)
    let currentOrgId: string | null = null
    let currentOrgSlug: string | null = null
    let currentRole = user.role

    if (verification.orgId) {
      currentOrgId = verification.orgId
      const org = orgs.find((o) => o.id === verification.orgId)
      currentOrgSlug = org?.slug || null
      currentRole = org?.role || user.role
    } else if (orgs.length > 0) {
      const firstOrg = orgs[0]
      if (firstOrg) {
        currentOrgId = firstOrg.id
        currentOrgSlug = firstOrg.slug
        currentRole = firstOrg.role
      }
    }

    // Create session
    const { session } = await createSession(userId, currentOrgId, request)

    // Create JWT
    const jwt = await signJWT({
      userId,
      sessionId: session.id,
      email: user.email,
      orgSlug: currentOrgSlug || '',
      orgId: currentOrgId || '',
      role: currentRole,
      orgs,
    })

    // Create response with cookie
    const response = Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: currentRole,
      },
      organization: currentOrgId
        ? { id: currentOrgId, slug: currentOrgSlug }
        : null,
    })

    return setAuthCookie(response, jwt)
  } catch (error) {
    console.error('Verify error:', error)

    if (error instanceof Error && error.message === 'Invalid or expired magic link') {
      return Response.json(
        { error: 'Invalid or expired magic link' },
        { status: 400 }
      )
    }

    return Response.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}
