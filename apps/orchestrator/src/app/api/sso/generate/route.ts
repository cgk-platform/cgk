/**
 * Generate SSO Token API
 *
 * Creates a one-time token for cross-app authentication
 */

import { generateSSOToken, requireAuth, type TargetApp } from '@cgk-platform/auth'
import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireAuth(request)

    // Parse request body
    const body = (await request.json()) as {
      targetApp: TargetApp
      tenantSlug?: string
    }

    const { targetApp, tenantSlug } = body

    if (!targetApp) {
      return NextResponse.json({ error: 'targetApp is required' }, { status: 400 })
    }

    // Validate target app
    const validApps: TargetApp[] = [
      'admin',
      'storefront',
      'creator-portal',
      'contractor-portal',
      'orchestrator',
    ]
    if (!validApps.includes(targetApp)) {
      return NextResponse.json({ error: 'Invalid target app' }, { status: 400 })
    }

    // Determine tenant ID from slug
    let tenantId: string | null = null
    if (tenantSlug) {
      // Find tenant by slug
      const tenant = auth.orgs.find((org) => org.slug === tenantSlug)
      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found or access denied' },
          { status: 403 }
        )
      }
      tenantId = tenant.id
    }

    // Generate SSO token (5 minute expiry)
    const token = await generateSSOToken({
      userId: auth.userId,
      tenantId,
      targetApp,
      expiryMinutes: 5,
    })

    return NextResponse.json({
      token,
      expiresIn: 300, // 5 minutes in seconds
    })
  } catch (error) {
    console.error('Failed to generate SSO token:', error)
    return NextResponse.json(
      { error: 'Failed to generate SSO token' },
      { status: 500 }
    )
  }
}
