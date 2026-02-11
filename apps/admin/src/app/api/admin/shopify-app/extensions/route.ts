/**
 * Shopify Extensions Status API
 *
 * Returns the status of all Shopify extensions for the current tenant.
 * Used by the admin UI to display extension deployment and configuration status.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Extension status structure
 */
interface ExtensionStatus {
  handle: string
  name: string
  type: 'function' | 'web_pixel_extension' | 'checkout_ui_extension'
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
 * GET /api/admin/shopify-app/extensions
 *
 * Returns the status of all Shopify extensions.
 * In production, this would query Shopify's API and the platform database.
 */
export async function GET(): Promise<NextResponse<ExtensionsResponse>> {
  try {
    // TODO: Get tenant context from auth
    // const { tenantId } = await getTenantContext(request)

    // TODO: Check if Shopify is connected for this tenant
    // const shopifyConnection = await withTenant(tenantId, () =>
    //   sql`SELECT * FROM shopify_connections WHERE tenant_id = ${tenantId}`
    // )

    // For now, return mock data showing extension structure
    // In production, this would:
    // 1. Query Shopify Admin API for deployed extensions
    // 2. Query platform database for configuration status
    // 3. Return combined status

    const mockConnected = true
    const mockShopDomain = 'demo-store.myshopify.com'

    // Mock extension statuses - in production these come from Shopify API
    const extensions: ExtensionStatus[] = [
      {
        handle: 'delivery-customization',
        name: 'Platform Delivery Customization',
        type: 'function',
        status: 'active',
        lastDeployed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        version: '1.0.0',
        configured: true, // Functions don't need additional config
      },
      {
        handle: 'session-stitching-pixel',
        name: 'Session Stitching Pixel',
        type: 'web_pixel_extension',
        status: 'active',
        lastDeployed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        version: '1.0.0',
        configured: true, // Depends on if GA4/Meta settings are configured
      },
      {
        handle: 'post-purchase-survey',
        name: 'Post-Purchase Survey',
        type: 'checkout_ui_extension',
        status: 'active',
        lastDeployed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        version: '1.0.0',
        configured: false, // Requires survey config URL
      },
    ]

    return NextResponse.json({
      connected: mockConnected,
      shopDomain: mockShopDomain,
      extensions,
    })
  } catch (error) {
    console.error('Failed to fetch extension status:', error)
    return NextResponse.json(
      {
        connected: false,
        extensions: [],
      },
      { status: 500 }
    )
  }
}
