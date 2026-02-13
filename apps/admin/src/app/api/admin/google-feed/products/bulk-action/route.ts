export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import type { BulkActionRequest } from '@/lib/google-feed/types'

/**
 * POST /api/admin/google-feed/products/bulk-action
 *
 * Perform bulk actions on multiple products
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: BulkActionRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { action, productIds, categoryId } = body

  if (!action || !productIds || productIds.length === 0) {
    return NextResponse.json(
      { error: 'action and productIds are required' },
      { status: 400 }
    )
  }

  if (productIds.length > 100) {
    return NextResponse.json(
      { error: 'Maximum 100 products per bulk action' },
      { status: 400 }
    )
  }

  const result = await withTenant(tenantSlug, async () => {
    let affected = 0

    switch (action) {
      case 'include': {
        // Remove exclusion from products
        for (const productId of productIds) {
          await sql`
            INSERT INTO google_feed_products (shopify_product_id, is_excluded, exclude_reason)
            VALUES (${productId}, false, NULL)
            ON CONFLICT (shopify_product_id, shopify_variant_id)
            DO UPDATE SET is_excluded = false, exclude_reason = NULL, updated_at = NOW()
          `
          affected++
        }
        break
      }

      case 'exclude': {
        // Exclude products
        for (const productId of productIds) {
          await sql`
            INSERT INTO google_feed_products (shopify_product_id, is_excluded, exclude_reason)
            VALUES (${productId}, true, 'Bulk excluded')
            ON CONFLICT (shopify_product_id, shopify_variant_id)
            DO UPDATE SET is_excluded = true, exclude_reason = 'Bulk excluded', updated_at = NOW()
          `
          affected++
        }
        break
      }

      case 'set_category': {
        if (!categoryId) {
          return { error: 'categoryId required for set_category action', status: 400 }
        }
        // Set Google category for products
        for (const productId of productIds) {
          await sql`
            INSERT INTO google_feed_products (shopify_product_id, google_category_id)
            VALUES (${productId}, ${categoryId})
            ON CONFLICT (shopify_product_id, shopify_variant_id)
            DO UPDATE SET google_category_id = ${categoryId}, updated_at = NOW()
          `
          affected++
        }
        break
      }

      case 'refresh': {
        // Mark products for refresh (reset sync status)
        for (const productId of productIds) {
          await sql`
            UPDATE google_feed_products
            SET sync_status = 'pending', updated_at = NOW()
            WHERE shopify_product_id = ${productId}
          `
          affected++
        }
        break
      }

      default:
        return { error: `Unknown action: ${action}`, status: 400 }
    }

    return { success: true, action, affected }
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result)
}
