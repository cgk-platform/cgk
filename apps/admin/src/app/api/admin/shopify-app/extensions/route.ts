/**
 * Shopify Extensions Status API
 *
 * Returns the status of all Shopify extensions for the current tenant.
 * Used by the admin UI to display extension deployment and configuration status.
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { requireAuth } from '@cgk-platform/auth'
import type { AuthContext } from '@cgk-platform/auth'
import { withTenant, sql } from '@cgk-platform/db'
import { logger } from '@cgk-platform/logging'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Extension status structure
 */
interface ExtensionStatus {
  handle: string
  name: string
  type: 'function' | 'web_pixel_extension' | 'checkout_ui_extension' | 'theme'
  status: 'active' | 'inactive' | 'error' | 'pending'
  lastDeployed?: string
  version?: string
  errorMessage?: string
  configured: boolean
}

/**
 * API response structure
 */
interface ExtensionsResponse {
  connected: boolean
  shopDomain?: string
  extensions: ExtensionStatus[]
}

/**
 * Platform extensions that are part of the CGK Shopify app.
 * These are deployed as part of the app and their availability
 * depends on the Shopify connection status.
 */
const PLATFORM_EXTENSIONS: Omit<ExtensionStatus, 'status' | 'configured'>[] = [
  {
    handle: 'delivery-customization',
    name: 'Platform Delivery Customization',
    type: 'function',
    version: '1.0.0',
  },
  {
    handle: 'session-stitching-pixel',
    name: 'Session Stitching Pixel',
    type: 'web_pixel_extension',
    version: '1.0.0',
  },
  {
    handle: 'post-purchase-survey',
    name: 'Post-Purchase Survey',
    type: 'checkout_ui_extension',
    version: '1.0.0',
  },
  {
    handle: 'bundle-builder',
    name: 'Bundle Builder',
    type: 'theme',
    version: '1.0.0',
  },
]

/**
 * GET /api/admin/shopify-app/extensions
 *
 * Returns the status of all Shopify extensions.
 * Queries the shopify_connections table for connection status
 * and returns extension availability based on that.
 */
export async function GET(request: Request): Promise<NextResponse<ExtensionsResponse>> {
  try {
    // Authenticate the user
    let auth: AuthContext
    try {
      auth = await requireAuth(request)
    } catch {
      return NextResponse.json(
        { connected: false, extensions: [] },
        { status: 401 }
      )
    }

    const headerList = await headers()
    const tenantSlug = headerList.get('x-tenant-slug')

    if (!tenantSlug) {
      return NextResponse.json({
        connected: false,
        extensions: [],
      })
    }

    // Verify the authenticated user belongs to the requested tenant
    const userHasAccess = auth.orgs.some((org) => org.slug === tenantSlug)
    if (!userHasAccess) {
      return NextResponse.json(
        { connected: false, extensions: [] },
        { status: 403 }
      )
    }

    // Query the Shopify connection for this tenant
    const connectionResult = await withTenant(tenantSlug, async () => {
      return sql`
        SELECT
          shop,
          status,
          pixel_id,
          pixel_active,
          last_sync_at,
          installed_at
        FROM shopify_connections
        WHERE status = 'active'
        LIMIT 1
      `
    })

    const connection = connectionResult.rows[0] as {
      shop: string
      status: string
      pixel_id: string | null
      pixel_active: boolean
      last_sync_at: string | null
      installed_at: string
    } | undefined

    if (!connection) {
      // No active Shopify connection
      return NextResponse.json({
        connected: false,
        extensions: PLATFORM_EXTENSIONS.map((ext) => ({
          ...ext,
          status: 'inactive' as const,
          configured: false,
        })),
      })
    }

    // Check extension configuration status
    // For now, we determine configuration based on known criteria:
    // - Delivery customization: Always configured (function-based)
    // - Session stitching pixel: Configured if pixel is active
    // - Post-purchase survey: Would need survey config (check analytics config)

    const analyticsConfigResult = await withTenant(tenantSlug, async () => {
      return sql`
        SELECT value FROM tenant_config
        WHERE key = 'analytics'
        LIMIT 1
      `
    })

    const analyticsConfig = analyticsConfigResult.rows[0]?.value as {
      ga4MeasurementId?: string
      metaPixelId?: string
      postPurchaseSurveyEnabled?: boolean
    } | undefined

    const extensions: ExtensionStatus[] = PLATFORM_EXTENSIONS.map((ext) => {
      let configured = false
      let status: ExtensionStatus['status'] = 'active'

      switch (ext.handle) {
        case 'delivery-customization':
          // Functions are always configured once deployed
          configured = true
          break
        case 'session-stitching-pixel':
          // Pixel configured if GA4 or Meta pixel is set up
          configured = !!(
            connection.pixel_active ||
            analyticsConfig?.ga4MeasurementId ||
            analyticsConfig?.metaPixelId
          )
          if (!configured) status = 'pending'
          break
        case 'post-purchase-survey':
          // Survey needs explicit configuration
          configured = !!analyticsConfig?.postPurchaseSurveyEnabled
          if (!configured) status = 'pending'
          break
        case 'bundle-builder':
          // Theme extension — configured once deployed, settings managed in Shopify theme editor
          configured = true
          break
      }

      return {
        ...ext,
        status,
        configured,
        lastDeployed: connection.installed_at,
      }
    })

    return NextResponse.json({
      connected: true,
      shopDomain: connection.shop,
      extensions,
    })
  } catch (error) {
    logger.error('Failed to fetch extension status:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        connected: false,
        extensions: [],
      },
      { status: 500 }
    )
  }
}
