export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { setProductExcluded } from '@/lib/google-feed/db'

/**
 * POST /api/admin/google-feed/products/[handle]/exclude
 *
 * Exclude a product from the Google Feed
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { reason?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const result = await withTenant(tenantSlug, async () => {
    // Get product to find shopify_product_id
    const productResult = await sql`
      SELECT shopify_product_id as "shopifyProductId", id, title
      FROM products
      WHERE handle = ${handle}
      LIMIT 1
    `

    if (productResult.rows.length === 0) {
      return { error: 'Product not found', status: 404 }
    }

    const { shopifyProductId, id, title } = productResult.rows[0] as {
      shopifyProductId: string
      id: string
      title: string
    }
    const productId = shopifyProductId || id

    await setProductExcluded(productId, null, true, body.reason || 'Manually excluded')

    return { success: true, productId, title, excluded: true }
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result)
}
