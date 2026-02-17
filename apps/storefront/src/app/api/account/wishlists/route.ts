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
  wishlist_id: string
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

function mapRowToWishlist(row: WishlistRow, items: WishlistItem[]): Wishlist {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
    isPublic: row.is_public,
    shareUrl: row.share_token ? `${baseUrl}/wishlist/shared/${row.share_token}` : null,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
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
 * GET /api/account/wishlists
 * Returns all wishlists for the customer
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
    // Get all wishlists
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
        WHERE customer_id = ${session.customerId}
        ORDER BY is_default DESC, created_at DESC
      `
    })

    if (wishlistResult.rows.length === 0) {
      // Create a default wishlist if none exists
      const defaultWishlistId = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      await withTenant(tenantSlug, async () => {
        return sql`
          INSERT INTO wishlists (id, customer_id, name, is_default, is_public, created_at, updated_at)
          VALUES (${defaultWishlistId}, ${session.customerId}, 'My Wishlist', true, false, NOW(), NOW())
        `
      })

      return NextResponse.json([{
        id: defaultWishlistId,
        name: 'My Wishlist',
        isDefault: true,
        isPublic: false,
        shareUrl: null,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }])
    }

    // Get items for all wishlists
    const wishlistIds = wishlistResult.rows.map(w => w.id)
    const itemsResult = await withTenant(tenantSlug, async () => {
      return sql<WishlistItemRow>`
        SELECT
          id,
          wishlist_id,
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
        WHERE wishlist_id = ANY(${`{${wishlistIds.join(',')}}`}::text[])
        ORDER BY created_at DESC
      `
    })

    // Group items by wishlist
    const itemsByWishlist = new Map<string, WishlistItem[]>()
    for (const row of itemsResult.rows) {
      const items = itemsByWishlist.get(row.wishlist_id) ?? []
      items.push(mapRowToItem(row))
      itemsByWishlist.set(row.wishlist_id, items)
    }

    const wishlists = wishlistResult.rows.map(row =>
      mapRowToWishlist(row, itemsByWishlist.get(row.id) ?? [])
    )

    return NextResponse.json(wishlists)
  } catch (error) {
    console.error('Failed to get wishlists:', error)
    // Return empty array if tables don't exist
    return NextResponse.json([])
  }
}

/**
 * POST /api/account/wishlists
 * Creates a new wishlist
 */
export async function POST(request: Request) {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'Wishlist name is required' }, { status: 400 })
  }

  const wishlistId = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  try {
    const result = await withTenant(tenantSlug, async () => {
      return sql<WishlistRow>`
        INSERT INTO wishlists (id, customer_id, name, is_default, is_public, created_at, updated_at)
        VALUES (${wishlistId}, ${session.customerId}, ${body.name.trim()}, false, false, NOW(), NOW())
        RETURNING id, name, is_default, is_public, share_token, created_at, updated_at
      `
    })

    const wishlist = result.rows[0]
    if (!wishlist) {
      return NextResponse.json({ error: 'Failed to create wishlist' }, { status: 500 })
    }

    return NextResponse.json(mapRowToWishlist(wishlist, []))
  } catch (error) {
    console.error('Failed to create wishlist:', error)
    return NextResponse.json({ error: 'Failed to create wishlist' }, { status: 500 })
  }
}
