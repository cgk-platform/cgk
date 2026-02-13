export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  checkConnectionHealth,
  clearCredentialsCache,
  getShopifyConnection,
  updateLastSyncAt,
  ShopifyError,
} from '@cgk-platform/shopify'

/**
 * POST /api/admin/shopify-app/refresh
 *
 * Refreshes the connection health check and clears cache.
 */
export async function POST() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    // Clear cached credentials to force fresh fetch
    await clearCredentialsCache(tenantSlug)

    // Check connection health
    const health = await checkConnectionHealth(tenantSlug)

    if (!health.isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Not connected to Shopify',
        health,
      })
    }

    // Get full connection details
    const connection = await getShopifyConnection(tenantSlug)

    // Update last sync timestamp
    await updateLastSyncAt(tenantSlug)

    return NextResponse.json({
      success: true,
      connection: connection
        ? {
            shop: connection.shop,
            status: connection.status,
            scopes: connection.scopes,
            apiVersion: connection.apiVersion,
            pixelActive: connection.pixelActive,
            lastWebhookAt: connection.lastWebhookAt?.toISOString(),
            lastSyncAt: new Date().toISOString(),
          }
        : null,
      health: {
        tokenValid: health.tokenValid,
        scopesValid: health.scopesValid,
        missingScopes: health.missingSCopes,
      },
    })
  } catch (error) {
    console.error('[shopify-refresh] Error:', error)

    if (error instanceof ShopifyError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to refresh connection' },
      { status: 500 }
    )
  }
}
