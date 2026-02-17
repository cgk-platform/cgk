export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type { Wishlist, WishlistItem } from '@/lib/account/types'

interface WishlistRow {
  id: string
  name: string
  is_default: boolean
  is_public: boolean
  share_token: string | null
  created_at: string
  updated_at: string
}

interface WishlistItemRow {
  id: string
  product_id: string
  variant_id: string | null
  title: string
  variant_title: string | null
  price_cents: number
  compare_price_cents: number | null
  image_url: string | null
  handle: string
  in_stock: boolean
  added_at: string
}

function mapRowToItem(row: WishlistItemRow): WishlistItem {
  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    title: row.title,
    variantTitle: row.variant_title,
    priceCents: row.price_cents,
    comparePriceCents: row.compare_price_cents,
    imageUrl: row.image_url,
    handle: row.handle,
    inStock: row.in_stock,
    addedAt: row.added_at,
  }
}

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/account/wishlists/[id]
 * Returns a specific wishlist
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id: wishlistId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get wishlist
    const wishlistResult = await withTenant(tenantSlug, async () => {
      return sql<WishlistRow>`
        SELECT
          id,
          name,
          is_default,
          is_public,
          share_token,
          created_at,
          updated_at
        FROM wishlists
        WHERE id = ${wishlistId}
          AND customer_id = ${session.customerId}
        LIMIT 1
      `
    })

    const wishlistRow = wishlistResult.rows[0]
    if (!wishlistRow) {
      return NextResponse.json({ error: 'Wishlist not found' }, { status: 404 })
    }

    // Get wishlist items
    const itemsResult = await withTenant(tenantSlug, async () => {
      return sql<WishlistItemRow>`
        SELECT
          id,
          product_id,
          variant_id,
          title,
          variant_title,
          price_cents,
          compare_price_cents,
          image_url,
          handle,
          COALESCE(in_stock, true) as in_stock,
          created_at as added_at
        FROM wishlist_items
        WHERE wishlist_id = ${wishlistId}
        ORDER BY created_at DESC
      `
    })

    const items = itemsResult.rows.map(mapRowToItem)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

    const wishlist: Wishlist = {
      id: wishlistRow.id,
      name: wishlistRow.name,
      isDefault: wishlistRow.is_default,
      isPublic: wishlistRow.is_public,
      shareUrl: wishlistRow.share_token ? `${baseUrl}/wishlist/shared/${wishlistRow.share_token}` : null,
      items,
      createdAt: wishlistRow.created_at,
      updatedAt: wishlistRow.updated_at,
    }

    return NextResponse.json(wishlist)
  } catch (error) {
    console.error('Failed to get wishlist:', error)
    return NextResponse.json({ error: 'Failed to get wishlist' }, { status: 500 })
  }
}

/**
 * DELETE /api/account/wishlists/[id]
 * Deletes a wishlist (cannot delete default wishlist)
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id: wishlistId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if wishlist exists and is not default
    const checkResult = await withTenant(tenantSlug, async () => {
      return sql<{ id: string; is_default: boolean }>`
        SELECT id, is_default
        FROM wishlists
        WHERE id = ${wishlistId}
          AND customer_id = ${session.customerId}
        LIMIT 1
      `
    })

    const wishlist = checkResult.rows[0]
    if (!wishlist) {
      return NextResponse.json({ error: 'Wishlist not found' }, { status: 404 })
    }

    if (wishlist.is_default) {
      return NextResponse.json({ error: 'Cannot delete default wishlist' }, { status: 400 })
    }

    // Delete wishlist items first
    await withTenant(tenantSlug, async () => {
      return sql`
        DELETE FROM wishlist_items
        WHERE wishlist_id = ${wishlistId}
      `
    })

    // Delete wishlist
    await withTenant(tenantSlug, async () => {
      return sql`
        DELETE FROM wishlists
        WHERE id = ${wishlistId}
          AND customer_id = ${session.customerId}
      `
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Failed to delete wishlist:', error)
    return NextResponse.json({ error: 'Failed to delete wishlist' }, { status: 500 })
  }
}
