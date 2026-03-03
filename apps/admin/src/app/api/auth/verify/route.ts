export const dynamic = 'force-dynamic'

import {
  createSession,
  getUserByEmail,
  getUserOrganizations,
  setAuthCookie,
  signJWT,
  updateUserLastLogin,
  verifyMagicLink,
} from '@cgk-platform/auth'
import type { UserRole } from '@cgk-platform/auth'

/**
 * POST /api/auth/verify
 * Verify magic link token and create session
 */
export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { email, token } = body as { email?: string; token?: string }
    if (!email || !token) {
      return Response.json({ error: 'Email and token are required' }, { status: 400 })
    }

    // Verify the magic link
    const result = await verifyMagicLink(email, token)
    if (!result.userId) {
      return Response.json({ error: 'No account found for this email' }, { status: 404 })
    }

    // Get user details
    const user = await getUserByEmail(email.toLowerCase().trim())
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user organizations (handle super admins specially)
    let orgs
    if (user.role === 'super_admin') {
      // Super admins get ALL organizations
      const { sql } = await import('@cgk-platform/db')
      const orgsResult = await sql`
        SELECT id, slug
        FROM public.organizations
        WHERE status IN ('active', 'onboarding', 'suspended')
        ORDER BY name ASC
      `
      orgs = orgsResult.rows.map((row) => {
        const r = row as { id: string; slug: string }
        return {
          id: r.id,
          slug: r.slug,
          role: 'super_admin' as const,
        }
      })
    } else {
      // Regular users get their memberships
      orgs = await getUserOrganizations(user.id)
    }

    if (orgs.length === 0) {
      return Response.json({ error: 'No organizations found for this account' }, { status: 403 })
    }

    // Use the first org (or the one from magic link if specified)
    const targetOrg = result.orgId ? orgs.find((o) => o.id === result.orgId) || orgs[0]! : orgs[0]!

    // Create session
    const { session } = await createSession(user.id, targetOrg.id, request)

    // Sign JWT
    const jwt = await signJWT({
      userId: user.id,
      sessionId: session.id,
      email: user.email,
      orgSlug: targetOrg.slug,
      orgId: targetOrg.id,
      role: targetOrg.role as UserRole,
      orgs,
    })

    // Update last login
    await updateUserLastLogin(user.id).catch(() => {})

    // Set cookie and return
    const response = Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      redirectTo: '/',
    })

    return setAuthCookie(response, jwt)
  } catch (error) {
    console.error('Verify error:', error)
    const message = error instanceof Error ? error.message : 'Verification failed'
    return Response.json({ error: message }, { status: 401 })
  }
}
