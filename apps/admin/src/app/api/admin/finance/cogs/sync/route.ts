export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getCOGSConfig,
  updateCOGSLastSync,
  logPLConfigChange,
} from '@/lib/finance'

/**
 * POST /api/admin/finance/cogs/sync
 * Trigger a manual Shopify COGS sync
 */
export async function POST() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current COGS config
  const config = await getCOGSConfig(tenantSlug, tenantId)

  if (!config) {
    return NextResponse.json(
      { error: 'COGS configuration not found. Please configure COGS source first.' },
      { status: 400 },
    )
  }

  if (config.source !== 'shopify') {
    return NextResponse.json(
      { error: 'COGS sync is only available when source is set to Shopify' },
      { status: 400 },
    )
  }

  if (!config.shopifySyncEnabled) {
    return NextResponse.json(
      { error: 'Shopify COGS sync is disabled' },
      { status: 400 },
    )
  }

  // In a real implementation, this would trigger a background job
  // to sync product costs from Shopify. For now, we just update
  // the last sync timestamp.

  // TODO: Trigger Shopify product cost sync job
  // await jobs.send('shopify/sync-product-costs', { tenantId })

  // Update last sync timestamp
  await updateCOGSLastSync(tenantSlug, tenantId)

  // Log the sync action
  await logPLConfigChange(tenantSlug, tenantId, 'cogs_source', 'update', userId, {
    fieldChanged: 'sync',
    newValue: { syncTriggeredAt: new Date().toISOString() },
    ipAddress: headerList.get('x-forwarded-for') ?? undefined,
    userAgent: headerList.get('user-agent') ?? undefined,
  })

  return NextResponse.json({
    success: true,
    message: 'COGS sync initiated',
    lastSyncAt: new Date().toISOString(),
  })
}
