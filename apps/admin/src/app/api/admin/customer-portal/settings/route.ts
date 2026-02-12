import { headers } from 'next/headers'

import {
  getPortalSettings,
  updatePortalFeatures,
  updatePortalBranding,
  updatePortalMessaging,
  setPortalEnabled,
} from '@/lib/customer-portal/db'
import type { PortalFeatures, PortalBranding, PortalMessaging } from '@/lib/customer-portal/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/customer-portal/settings
 * Get current portal settings for the tenant
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const settings = await getPortalSettings(tenantSlug)
  return Response.json({ settings })
}

/**
 * PUT /api/admin/customer-portal/settings
 * Update portal settings (features, branding, messaging, enabled)
 */
export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = await request.json()
  const { features, branding, messaging, enabled } = body as {
    features?: Partial<PortalFeatures>
    branding?: Partial<PortalBranding>
    messaging?: Partial<PortalMessaging>
    enabled?: boolean
  }

  // Validate branding colors if provided
  if (branding) {
    const colorFields = [
      'primaryColor',
      'secondaryColor',
      'accentColor',
      'backgroundColor',
      'cardBackgroundColor',
      'borderColor',
    ] as const

    for (const field of colorFields) {
      const value = branding[field]
      if (value !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(value)) {
        return Response.json(
          { error: `Invalid color format for ${field}. Expected hex format like #RRGGBB.` },
          { status: 400 }
        )
      }
    }
  }

  // Apply updates
  if (features && Object.keys(features).length > 0) {
    await updatePortalFeatures(tenantSlug, features)
  }

  if (branding && Object.keys(branding).length > 0) {
    await updatePortalBranding(tenantSlug, branding)
  }

  if (messaging && Object.keys(messaging).length > 0) {
    await updatePortalMessaging(tenantSlug, messaging)
  }

  if (enabled !== undefined) {
    await setPortalEnabled(tenantSlug, enabled)
  }

  // Return updated settings
  const settings = await getPortalSettings(tenantSlug)
  return Response.json({ settings })
}
