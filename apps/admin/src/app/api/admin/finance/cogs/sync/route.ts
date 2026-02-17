export const dynamic = 'force-dynamic'

import { sendJob } from '@cgk-platform/jobs'
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
 *
 * Uses the product batch sync task to sync product data including costs.
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

  try {
    // Trigger product batch sync which includes cost data
    // The product sync task fetches product data from Shopify including cost_per_item
    const handle = await sendJob('product.sync', {
      tenantId,
      fullSync: true, // Full sync to ensure all product costs are updated
    })

    // Update last sync timestamp
    await updateCOGSLastSync(tenantSlug, tenantId)

    // Log the sync action
    await logPLConfigChange(tenantSlug, tenantId, 'cogs_source', 'update', userId, {
      fieldChanged: 'sync',
      newValue: {
        syncTriggeredAt: new Date().toISOString(),
        jobId: handle.id,
      },
      ipAddress: headerList.get('x-forwarded-for') ?? undefined,
      userAgent: headerList.get('user-agent') ?? undefined,
    })

    return NextResponse.json({
      success: true,
      message: 'COGS sync initiated',
      jobId: handle.id,
      status: 'queued',
      lastSyncAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[finance/cogs/sync] Error triggering sync:', error)

    // Still update timestamp and log even if job trigger fails
    // This handles cases where Trigger.dev is not configured
    await updateCOGSLastSync(tenantSlug, tenantId)

    await logPLConfigChange(tenantSlug, tenantId, 'cogs_source', 'update', userId, {
      fieldChanged: 'sync',
      newValue: {
        syncTriggeredAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: headerList.get('x-forwarded-for') ?? undefined,
      userAgent: headerList.get('user-agent') ?? undefined,
    })

    // Return success with warning if Trigger.dev is not configured
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('TRIGGER') || errorMessage.includes('not configured')) {
      return NextResponse.json({
        success: true,
        message: 'COGS sync timestamp updated. Background job could not be triggered - check Trigger.dev configuration.',
        lastSyncAt: new Date().toISOString(),
        warning: 'Background job system not configured',
      })
    }

    return NextResponse.json(
      { error: 'Failed to trigger COGS sync' },
      { status: 500 }
    )
  }
}
