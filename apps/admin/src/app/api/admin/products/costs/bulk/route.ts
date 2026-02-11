export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  bulkUpsertProductCOGS,
  logPLConfigChange,
  type ProductCOGSBulkUpdate,
} from '@/lib/finance'

/**
 * PUT /api/admin/products/costs/bulk
 * Bulk update product COGS entries
 */
export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ProductCOGSBulkUpdate

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validation
  if (!body.products || !Array.isArray(body.products)) {
    return NextResponse.json({ error: 'Products array is required' }, { status: 400 })
  }

  if (body.products.length === 0) {
    return NextResponse.json({ error: 'Products array cannot be empty' }, { status: 400 })
  }

  if (body.products.length > 1000) {
    return NextResponse.json(
      { error: 'Maximum 1000 products per bulk update' },
      { status: 400 },
    )
  }

  // Validate each product entry
  for (let i = 0; i < body.products.length; i++) {
    const p = body.products[i]
    if (!p) {
      return NextResponse.json(
        { error: `Product at index ${i} is undefined` },
        { status: 400 },
      )
    }
    if (!p.productId) {
      return NextResponse.json(
        { error: `Product at index ${i} is missing productId` },
        { status: 400 },
      )
    }
    if (typeof p.cogsCents !== 'number' || p.cogsCents < 0) {
      return NextResponse.json(
        { error: `Product at index ${i} has invalid cogsCents` },
        { status: 400 },
      )
    }
  }

  const affectedCount = await bulkUpsertProductCOGS(tenantSlug, tenantId, body, userId)

  // Log the bulk update
  await logPLConfigChange(tenantSlug, tenantId, 'product_cogs', 'bulk_update', userId, {
    newValue: {
      count: affectedCount,
      source: body.source ?? 'manual',
    },
    ipAddress: headerList.get('x-forwarded-for') ?? undefined,
    userAgent: headerList.get('user-agent') ?? undefined,
  })

  return NextResponse.json({
    success: true,
    affectedCount,
    message: `Updated ${affectedCount} product COGS entries`,
  })
}
