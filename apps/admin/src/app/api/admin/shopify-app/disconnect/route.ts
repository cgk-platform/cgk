export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  disconnectStore,
  clearCredentialsCache,
  unregisterWebhooks,
  isShopifyConnected,
  ShopifyError,
} from '@cgk/shopify'

/**
 * DELETE /api/admin/shopify-app/disconnect
 *
 * Disconnects the Shopify store for the current tenant.
 * Clears stored credentials and unregisters webhooks.
 */
export async function DELETE() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    // Check if connected
    const connected = await isShopifyConnected(tenantSlug)

    if (!connected) {
      return NextResponse.json({ error: 'Not connected' }, { status: 400 })
    }

    // Try to unregister webhooks first (may fail if token already invalid)
    try {
      await unregisterWebhooks(tenantSlug)
    } catch (error) {
      console.warn('[shopify-disconnect] Failed to unregister webhooks:', error)
    }

    // Disconnect the store
    await disconnectStore(tenantSlug)

    // Clear cached credentials
    await clearCredentialsCache(tenantSlug)

    console.log(`[shopify-disconnect] Disconnected tenant ${tenantSlug}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[shopify-disconnect] Error:', error)

    if (error instanceof ShopifyError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
