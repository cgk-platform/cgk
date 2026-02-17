export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>
}

/**
 * POST /api/account/wishlists/[id]/items/[itemId]/move-to-cart
 * Moves an item from wishlist to cart
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { id: wishlistId, itemId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify wishlist belongs to customer
    const checkResult = await withTenant(tenantSlug, async () => {
      return sql<{ id: string }>`
        SELECT id
        FROM wishlists
        WHERE id = ${wishlistId}
          AND customer_id = ${session.customerId}
        LIMIT 1
      `
    })

    if (!checkResult.rows[0]) {
      return NextResponse.json({ error: 'Wishlist not found' }, { status: 404 })
    }

    // Get item details
    const itemResult = await withTenant(tenantSlug, async () => {
      return sql<{
        id: string
        product_id: string
        variant_id: string | null
      }>`
        SELECT id, product_id, variant_id
        FROM wishlist_items
        WHERE id = ${itemId}
          AND wishlist_id = ${wishlistId}
        LIMIT 1
      `
    })

    const item = itemResult.rows[0]
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Note: Actual cart operations would be handled by the commerce provider
    // (Shopify cart API or custom cart). This endpoint just removes the item
    // from the wishlist and returns the product/variant IDs for the frontend
    // to add to cart.

    // Delete the item from wishlist
    await withTenant(tenantSlug, async () => {
      return sql`
        DELETE FROM wishlist_items
        WHERE id = ${itemId}
          AND wishlist_id = ${wishlistId}
      `
    })

    // Update wishlist timestamp
    await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE wishlists
        SET updated_at = NOW()
        WHERE id = ${wishlistId}
      `
    })

    // Return product info for frontend to add to cart
    return NextResponse.json({
      success: true,
      productId: item.product_id,
      variantId: item.variant_id,
    })
  } catch (error) {
    console.error('Failed to move item to cart:', error)
    return NextResponse.json({ error: 'Failed to move item' }, { status: 500 })
  }
}
