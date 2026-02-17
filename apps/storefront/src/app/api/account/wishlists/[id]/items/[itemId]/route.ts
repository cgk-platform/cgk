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
 * DELETE /api/account/wishlists/[id]/items/[itemId]
 * Removes an item from a wishlist
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
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

    // Delete the item
    const deleteResult = await withTenant(tenantSlug, async () => {
      return sql`
        DELETE FROM wishlist_items
        WHERE id = ${itemId}
          AND wishlist_id = ${wishlistId}
        RETURNING id
      `
    })

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Update wishlist timestamp
    await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE wishlists
        SET updated_at = NOW()
        WHERE id = ${wishlistId}
      `
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Failed to remove item from wishlist:', error)
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 })
  }
}
