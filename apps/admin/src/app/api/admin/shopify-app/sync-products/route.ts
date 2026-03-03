export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@cgk-platform/logging'

/**
 * POST /api/admin/shopify-app/sync-products
 *
 * Triggers initial product sync from Shopify to local database.
 * This should happen automatically after OAuth, but can be manually triggered.
 */
export async function POST() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    // Import Trigger.dev task API
    const { tasks } = await import('@trigger.dev/sdk/v3')

    // Get tenant ID
    const { sql } = await import('@cgk-platform/db')
    const tenantResult = await sql`
      SELECT id FROM public.organizations WHERE slug = ${tenantSlug}
    `

    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const tenantId = (tenantResult.rows[0] as { id: string }).id

    // Trigger batch product sync (syncs ALL products from Shopify)
    await tasks.trigger('commerce-product-batch-sync', {
      tenantId,
    })

    // Also sync collections
    await tasks.trigger('commerce-collection-sync', {
      tenantId,
    })

    return NextResponse.json({
      success: true,
      message: 'Product sync triggered. This may take a few minutes.',
    })
  } catch (error) {
    logger.error('[shopify-sync] Error:', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger product sync',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
