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

/**
 * GET /api/account/wishlists/default
 * Returns the customer's default wishlist
 */
export async function GET() {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get or create default wishlist
    let wishlistResult = await withTenant(tenantSlug, async () => {
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
        WHERE customer_id = ${session.customerId}
          AND is_default = true
        LIMIT 1
      `
    })

    let wishlistRow = wishlistResult.rows[0]

    // If no default wishlist exists, create one
    if (!wishlistRow) {
      const defaultWishlistId = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      wishlistResult = await withTenant(tenantSlug, async () => {
        return sql<WishlistRow>`
          INSERT INTO wishlists (id, customer_id, name, is_default, is_public, created_at, updated_at)
          VALUES (${defaultWishlistId}, ${session.customerId}, 'My Wishlist', true, false, NOW(), NOW())
          RETURNING id, name, is_default, is_public, share_token, created_at, updated_at
        `
      })
      wishlistRow = wishlistResult.rows[0]
    }

    if (!wishlistRow) {
      return NextResponse.json({ error: 'Failed to get wishlist' }, { status: 500 })
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
        WHERE wishlist_id = ${wishlistRow.id}
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
    console.error('Failed to get default wishlist:', error)
    // Return empty wishlist if tables don't exist
    return NextResponse.json({
      id: 'default',
      name: 'My Wishlist',
      isDefault: true,
      isPublic: false,
      shareUrl: null,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
}
