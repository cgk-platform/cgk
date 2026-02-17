export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type { WishlistItem } from '@/lib/account/types'

interface AddItemRequest {
  productId: string
  variantId?: string | null
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

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/account/wishlists/[id]/items
 * Adds an item to a wishlist
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id: wishlistId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: AddItemRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.productId) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
  }

  // Handle "default" wishlist ID
  let actualWishlistId = wishlistId
  if (wishlistId === 'default') {
    try {
      const defaultResult = await withTenant(tenantSlug, async () => {
        return sql<{ id: string }>`
          SELECT id
          FROM wishlists
          WHERE customer_id = ${session.customerId}
            AND is_default = true
          LIMIT 1
        `
      })

      if (defaultResult.rows[0]) {
        actualWishlistId = defaultResult.rows[0].id
      } else {
        // Create default wishlist
        actualWishlistId = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        await withTenant(tenantSlug, async () => {
          return sql`
            INSERT INTO wishlists (id, customer_id, name, is_default, is_public, created_at, updated_at)
            VALUES (${actualWishlistId}, ${session.customerId}, 'My Wishlist', true, false, NOW(), NOW())
          `
        })
      }
    } catch (error) {
      console.error('Failed to get/create default wishlist:', error)
      return NextResponse.json({ error: 'Failed to process wishlist' }, { status: 500 })
    }
  }

  try {
    // Verify wishlist belongs to customer
    const checkResult = await withTenant(tenantSlug, async () => {
      return sql<{ id: string }>`
        SELECT id
        FROM wishlists
        WHERE id = ${actualWishlistId}
          AND customer_id = ${session.customerId}
        LIMIT 1
      `
    })

    if (!checkResult.rows[0]) {
      return NextResponse.json({ error: 'Wishlist not found' }, { status: 404 })
    }

    // Check if item already exists
    const existingResult = await withTenant(tenantSlug, async () => {
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
        WHERE wishlist_id = ${actualWishlistId}
          AND product_id = ${body.productId}
          AND (variant_id = ${body.variantId ?? null} OR (variant_id IS NULL AND ${body.variantId ?? null} IS NULL))
        LIMIT 1
      `
    })

    if (existingResult.rows[0]) {
      // Item already exists, return it
      const row = existingResult.rows[0]
      const item: WishlistItem = {
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
      return NextResponse.json(item)
    }

    // Get product info from products table
    const productResult = await withTenant(tenantSlug, async () => {
      return sql<{
        id: string
        title: string
        handle: string
        price_cents: number
        compare_at_price_cents: number | null
        image_url: string | null
        in_stock: boolean
      }>`
        SELECT
          id,
          title,
          handle,
          COALESCE((price_range->>'minVariantPrice')::int, 0) as price_cents,
          (price_range->>'maxVariantPrice')::int as compare_at_price_cents,
          (images->0->>'url') as image_url,
          true as in_stock
        FROM products
        WHERE id = ${body.productId}
        LIMIT 1
      `
    })

    const product = productResult.rows[0]

    // Create wishlist item
    const itemId = `wi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const result = await withTenant(tenantSlug, async () => {
      return sql<WishlistItemRow>`
        INSERT INTO wishlist_items (
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
          in_stock,
          created_at
        ) VALUES (
          ${itemId},
          ${actualWishlistId},
          ${body.productId},
          ${body.variantId ?? null},
          ${product?.title ?? 'Product'},
          ${null},
          ${product?.price_cents ?? 0},
          ${product?.compare_at_price_cents ?? null},
          ${product?.image_url ?? null},
          ${product?.handle ?? body.productId},
          ${true},
          NOW()
        )
        RETURNING
          id,
          product_id,
          variant_id,
          title,
          variant_title,
          price_cents,
          compare_price_cents,
          image_url,
          handle,
          in_stock,
          created_at as added_at
      `
    })

    const row = result.rows[0]
    if (!row) {
      return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
    }

    // Update wishlist timestamp
    await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE wishlists
        SET updated_at = NOW()
        WHERE id = ${actualWishlistId}
      `
    })

    const item: WishlistItem = {
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

    return NextResponse.json(item)
  } catch (error) {
    console.error('Failed to add item to wishlist:', error)
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
  }
}
