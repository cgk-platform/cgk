/**
 * SSO Token Verification API
 *
 * Validates SSO token and creates authenticated session
 */

import {
  createSession,
  getUserById,
  setAuthCookie,
  signJWT,
  validateSSOToken,
  type User,
} from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'
import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const redirectTo = searchParams.get('redirect') || '/'

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Validate SSO token
    const validation = await validateSSOToken(token, 'admin')

    if (!validation.valid) {
      // Redirect to login with error
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', validation.error || 'Invalid SSO token')
      return NextResponse.redirect(loginUrl)
    }

    const { userId, tenantId } = validation

    if (!userId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 400 })
    }

    // Get user details
    const user = await getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's organizations
    const orgsResult = await sql`
      SELECT uo.role, o.id, o.slug
      FROM public.user_organizations uo
      JOIN public.organizations o ON o.id = uo.organization_id
      WHERE uo.user_id = ${userId}
        AND o.status = 'active'
    `

    const orgs = orgsResult.rows.map((row) => ({
      id: (row as Record<string, unknown>).id as string,
      slug: (row as Record<string, unknown>).slug as string,
      role: (row as Record<string, unknown>).role as User['role'],
    }))

    // Determine tenant context
    let orgSlug: string | undefined
    let orgId: string | undefined
    let role = user.role

    if (tenantId) {
      // Use specified tenant
      const org = orgs.find((o) => o.id === tenantId)
      if (org) {
        orgSlug = org.slug
        orgId = org.id
        role = org.role
      }
    } else if (orgs.length > 0) {
      // Use first available org
      orgSlug = orgs[0].slug
      orgId = orgs[0].id
      role = orgs[0].role
    }

    // Create session
    const { session } = await createSession(userId, orgId || null, request)

    // Generate JWT
    const jwt = await signJWT({
      userId,
      sessionId: session.id,
      email: user.email,
      orgSlug: orgSlug || '',
      orgId: orgId || '',
      role,
      orgs,
    })

    // Create response with redirect
    const redirectUrl = new URL(redirectTo, request.url)
    const response = NextResponse.redirect(redirectUrl)

    // Set auth cookie
    setAuthCookie(response, jwt)

    return response
  } catch (error) {
    console.error('SSO verification failed:', error)

    // Redirect to login with error
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'SSO verification failed')
    return NextResponse.redirect(loginUrl)
  }
}
