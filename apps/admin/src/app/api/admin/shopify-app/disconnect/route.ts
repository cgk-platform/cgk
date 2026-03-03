export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  disconnectStore,
  clearCredentialsCache,
  unregisterWebhooks,
  isShopifyConnected,
  ShopifyError,
} from '@cgk-platform/shopify'
import { logger } from '@cgk-platform/logging'

/**
 * DELETE /api/admin/shopify-app/disconnect
 *
 * Disconnects the Shopify store for the current tenant.
 * Clears stored credentials and unregisters webhooks.
 */
export async function DELETE() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
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
      await unregisterWebhooks(tenantId)
    } catch (error) {
      logger.warn('[shopify-disconnect] Failed to unregister webhooks:', error)
    }

    // Disconnect the store
    await disconnectStore(tenantSlug)

    // Clear cached credentials
    await clearCredentialsCache(tenantId)

    logger.info(`[shopify-disconnect] Disconnected tenant ${tenantSlug}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[shopify-disconnect] Error:', error instanceof Error ? error : new Error(String(error)))

    if (error instanceof ShopifyError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
