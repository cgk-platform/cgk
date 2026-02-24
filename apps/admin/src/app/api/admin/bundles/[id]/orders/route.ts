export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { withTenant, sql } from '@cgk-platform/db'

interface CreateBundleOrderInput {
  order_id: string
  customer_id: string | null
  items_count: number
  subtotal_cents: number
  discount_cents: number
  total_cents: number
  tier_label: string | null
}

/**
 * POST /api/admin/bundles/:id/orders
 * Record a bundle order (called by Shopify webhook handler)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id: bundleId } = await params

  let body: CreateBundleOrderInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
  }

  try {
    const result = await withTenant(tenantSlug, async () => {
      // Upsert: if this order_id + bundle_id combo exists, update it
      return sql`
        INSERT INTO bundle_orders (
          bundle_id, order_id, customer_id,
          items_count, subtotal_cents, discount_cents, total_cents, tier_label
        ) VALUES (
          ${bundleId},
          ${body.order_id},
          ${body.customer_id ?? null},
          ${body.items_count},
          ${body.subtotal_cents},
          ${body.discount_cents},
          ${body.total_cents},
          ${body.tier_label ?? null}
        )
        ON CONFLICT (order_id, bundle_id)
        DO UPDATE SET
          items_count = EXCLUDED.items_count,
          subtotal_cents = EXCLUDED.subtotal_cents,
          discount_cents = EXCLUDED.discount_cents,
          total_cents = EXCLUDED.total_cents,
          tier_label = EXCLUDED.tier_label
        RETURNING id
      `
    })

    const row = result.rows[0] as Record<string, unknown> | undefined
    return NextResponse.json({ success: true, id: row?.id ?? null }, { status: 201 })
  } catch (error) {
    console.error('Error recording bundle order:', error)
    return NextResponse.json({ error: 'Failed to record bundle order' }, { status: 500 })
  }
}

/**
 * GET /api/admin/bundles/:id/orders
 * List orders for a specific bundle
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id: bundleId } = await params
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  try {
    const result = await withTenant(tenantSlug, async () => {
      return sql`
        SELECT * FROM bundle_orders
        WHERE bundle_id = ${bundleId}
        ORDER BY created_at DESC
        OFFSET ${offset} LIMIT ${limit}
      `
    })

    return NextResponse.json({ orders: result.rows })
  } catch (error) {
    console.error('Error fetching bundle orders:', error)
    return NextResponse.json({ error: 'Failed to fetch bundle orders' }, { status: 500 })
  }
}
