export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  checkConnectionHealth,
  getShopifyCredentials,
  ShopifyError,
} from '@cgk-platform/shopify'

/**
 * POST /api/admin/shopify-app/test
 *
 * Tests the Shopify connection by making a simple API call.
 */
export async function POST() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    // Check connection health
    const health = await checkConnectionHealth(tenantSlug)

    if (!health.isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Not connected to Shopify',
      })
    }

    if (!health.tokenValid) {
      return NextResponse.json({
        success: false,
        error: 'Access token is invalid or expired. Please reconnect.',
      })
    }

    // Get credentials to fetch shop name
    const credentials = await getShopifyCredentials(tenantSlug)

    // Make a shop query to get the shop name
    const response = await fetch(
      `https://${credentials.shop}/admin/api/${credentials.apiVersion}/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': credentials.accessToken,
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `API call failed: ${response.status}`,
      })
    }

    const data = await response.json() as { shop?: { name: string } }

    return NextResponse.json({
      success: true,
      shopName: data.shop?.name || health.shop,
      shop: health.shop,
      tokenValid: health.tokenValid,
      scopesValid: health.scopesValid,
      missingScopes: health.missingSCopes,
      lastWebhookAt: health.lastWebhookAt?.toISOString(),
      lastSyncAt: health.lastSyncAt?.toISOString(),
    })
  } catch (error) {
    console.error('[shopify-test] Error:', error)

    if (error instanceof ShopifyError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to test connection',
    })
  }
}
