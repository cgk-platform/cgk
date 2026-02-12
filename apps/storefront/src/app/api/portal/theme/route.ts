/**
 * Portal Theme API Route
 *
 * GET: Retrieve portal theme for a tenant
 * PUT: Update portal theme for a tenant
 * DELETE: Reset portal theme to defaults
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { headers } from 'next/headers'

import { getTenantConfig } from '@/lib/tenant'
import {
  loadPortalTheme,
  savePortalTheme,
  resetPortalTheme,
  type CustomerPortalThemeConfig,
} from '@/lib/portal-theme'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Get user ID from session header (set by auth middleware)
 */
async function getUserId(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-user-id')
}

/**
 * GET /api/portal/theme
 *
 * Retrieve the portal theme configuration for the current tenant.
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const tenantConfig = await getTenantConfig()

    if (!tenantConfig) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const theme = await loadPortalTheme(tenantConfig.id)

    return NextResponse.json({
      theme,
      _meta: {
        tenantId: tenantConfig.id,
        loadedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to load portal theme:', error)
    return NextResponse.json(
      { error: 'Failed to load theme configuration' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/portal/theme
 *
 * Update the portal theme configuration for the current tenant.
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const tenantConfig = await getTenantConfig()
    const userId = await getUserId()

    if (!tenantConfig) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const themeUpdates = body.theme as Partial<CustomerPortalThemeConfig>

    if (!themeUpdates || typeof themeUpdates !== 'object') {
      return NextResponse.json(
        { error: 'Invalid theme configuration' },
        { status: 400 }
      )
    }

    // Remove tenantId from updates (should not be changed via API)
    const updates = { ...themeUpdates }
    if ('tenantId' in updates) {
      delete (updates as Record<string, unknown>).tenantId
    }

    const result = await savePortalTheme(tenantConfig.id, updates)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to save theme' },
        { status: 500 }
      )
    }

    // Load the updated theme
    const updatedTheme = await loadPortalTheme(tenantConfig.id)

    return NextResponse.json({
      theme: updatedTheme,
      _meta: {
        tenantId: tenantConfig.id,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      },
    })
  } catch (error) {
    console.error('Failed to update portal theme:', error)
    return NextResponse.json(
      { error: 'Failed to update theme configuration' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/portal/theme
 *
 * Reset the portal theme to defaults for the current tenant.
 */
export async function DELETE(_request: NextRequest): Promise<NextResponse> {
  try {
    const tenantConfig = await getTenantConfig()
    const userId = await getUserId()

    if (!tenantConfig) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const result = await resetPortalTheme(tenantConfig.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to reset theme' },
        { status: 500 }
      )
    }

    // Load the default theme
    const defaultTheme = await loadPortalTheme(tenantConfig.id)

    return NextResponse.json({
      theme: defaultTheme,
      _meta: {
        tenantId: tenantConfig.id,
        resetAt: new Date().toISOString(),
        resetBy: userId,
      },
    })
  } catch (error) {
    console.error('Failed to reset portal theme:', error)
    return NextResponse.json(
      { error: 'Failed to reset theme configuration' },
      { status: 500 }
    )
  }
}
