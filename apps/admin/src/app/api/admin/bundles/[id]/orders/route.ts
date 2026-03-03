export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { NextResponse } from 'next/server'

import { authenticateBundleRequest } from '@/lib/bundles/api-auth'
import { logger } from '@cgk-platform/logging'

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
 * Record a bundle order (called by Shopify webhook handler or admin UI)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateBundleRequest(request, 'products.sync')
  if (!auth.ok) return auth.response

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

  if (body.items_count !== undefined && (typeof body.items_count !== 'number' || !Number.isFinite(body.items_count))) {
    return NextResponse.json({ error: 'items_count must be a number' }, { status: 422 })
  }
  if (body.subtotal_cents !== undefined && (typeof body.subtotal_cents !== 'number' || !Number.isFinite(body.subtotal_cents))) {
    return NextResponse.json({ error: 'subtotal_cents must be a number' }, { status: 422 })
  }
  if (body.discount_cents !== undefined && (typeof body.discount_cents !== 'number' || !Number.isFinite(body.discount_cents))) {
    return NextResponse.json({ error: 'discount_cents must be a number' }, { status: 422 })
  }
  if (body.total_cents !== undefined && (typeof body.total_cents !== 'number' || !Number.isFinite(body.total_cents))) {
    return NextResponse.json({ error: 'total_cents must be a number' }, { status: 422 })
  }

  try {
    const result = await withTenant(auth.tenantSlug, async () => {
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
    logger.error('Error recording bundle order:', error instanceof Error ? error : new Error(String(error)))
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
  const auth = await authenticateBundleRequest(request, 'products.view')
  if (!auth.ok) return auth.response

  const { id: bundleId } = await params
  const { searchParams } = new URL(request.url)
  const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 500))
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)

  try {
    const [result, countResult] = await withTenant(auth.tenantSlug, async () => {
      const rows = await sql`
        SELECT * FROM bundle_orders
        WHERE bundle_id = ${bundleId}
        ORDER BY created_at DESC
        OFFSET ${offset} LIMIT ${limit}
      `
      const count = await sql`
        SELECT COUNT(*)::int AS total FROM bundle_orders
        WHERE bundle_id = ${bundleId}
      `
      return [rows, count] as const
    })

    const totalCount = (countResult.rows[0] as Record<string, unknown> | undefined)?.total ?? 0
    return NextResponse.json({ orders: result.rows, totalCount, limit, offset })
  } catch (error) {
    logger.error('Error fetching bundle orders:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to fetch bundle orders' }, { status: 500 })
  }
}
