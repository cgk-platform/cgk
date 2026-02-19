export const dynamic = 'force-dynamic'
export const revalidate = 0

import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/products/costs
 * List products with their COGS cost overrides
 */
export async function GET(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  void auth

  try {
    const products = await withTenant(tenantId, async () => {
      const result = await sql`
        SELECT
          p.id,
          p.title,
          p.vendor,
          p.product_type,
          COALESCE(p.cost_per_item, 0) AS cost_per_item,
          p.price
        FROM products p
        ORDER BY p.title ASC
        LIMIT 200
      `
      return result.rows
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching product costs:', error)
    return NextResponse.json({ error: 'Failed to fetch product costs' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/products/costs
 * Update cost_per_item for a product
 */
export async function PATCH(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  void auth

  let body: { productId: string; costPerItem: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.productId || typeof body.costPerItem !== 'number') {
    return NextResponse.json(
      { error: 'productId and costPerItem are required' },
      { status: 400 }
    )
  }

  try {
    await withTenant(tenantId, async () => {
      await sql`
        UPDATE products
        SET cost_per_item = ${body.costPerItem}, updated_at = NOW()
        WHERE id = ${body.productId}
      `
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating product cost:', error)
    return NextResponse.json({ error: 'Failed to update product cost' }, { status: 500 })
  }
}
