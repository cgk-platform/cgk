export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getShopifyConnection,
  isShopifyConnected,
} from '@cgk-platform/shopify'

/**
 * GET /api/admin/shopify-app/status
 *
 * Returns Shopify connection status for the current tenant.
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    // Check if connected
    const connected = await isShopifyConnected(tenantSlug)

    if (!connected) {
      return NextResponse.json({
        connected: false,
        scopes: [],
        pixelEnabled: false,
        storefrontConfigured: false,
      })
    }

    // Get full connection details
    const connection = await getShopifyConnection(tenantSlug)

    if (!connection) {
      return NextResponse.json({
        connected: false,
        scopes: [],
        pixelEnabled: false,
        storefrontConfigured: false,
      })
    }

    return NextResponse.json({
      connected: connection.status === 'active',
      shopDomain: connection.shop,
      scopes: connection.scopes,
      apiVersion: connection.apiVersion,
      pixelEnabled: connection.pixelActive,
      pixelId: connection.pixelId,
      storefrontConfigured: !!connection.siteUrl,
      siteUrl: connection.siteUrl,
      defaultCountry: connection.defaultCountry,
      defaultLanguage: connection.defaultLanguage,
      status: connection.status,
      lastWebhookAt: connection.lastWebhookAt?.toISOString(),
      lastSyncedAt: connection.lastSyncAt?.toISOString(),
      installedAt: connection.installedAt.toISOString(),
    })
  } catch (error) {
    console.error('[shopify-status] Error fetching status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    )
  }
}
