export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getProductCOGS,
  upsertProductCOGS,
  logPLConfigChange,
  type ProductCOGSUpdate,
} from '@/lib/finance'

/**
 * GET /api/admin/products/costs
 * List product COGS entries with pagination and filtering
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)
  const search = url.searchParams.get('search') || undefined
  const productId = url.searchParams.get('productId') || undefined

  const { rows, totalCount } = await getProductCOGS(tenantSlug, tenantId, {
    page,
    limit,
    search,
    productId,
  })

  return NextResponse.json({
    products: rows,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  })
}

/**
 * POST /api/admin/products/costs
 * Create or update a product COGS entry
 */
export async function POST(request: Request) {
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

  let body: {
    productId: string
    variantId?: string
    sku?: string
    cogsCents: number
    source?: 'manual' | 'csv_import' | 'erp_sync'
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validation
  if (!body.productId) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
  }

  if (typeof body.cogsCents !== 'number' || body.cogsCents < 0) {
    return NextResponse.json({ error: 'COGS must be a non-negative number' }, { status: 400 })
  }

  const data: ProductCOGSUpdate = {
    cogsCents: Math.round(body.cogsCents),
    source: body.source,
  }

  const productCogs = await upsertProductCOGS(
    tenantSlug,
    tenantId,
    body.productId,
    body.variantId ?? null,
    body.sku ?? null,
    data,
    userId,
  )

  // Log the change
  await logPLConfigChange(tenantSlug, tenantId, 'product_cogs', 'update', userId, {
    fieldChanged: `${body.productId}${body.variantId ? `:${body.variantId}` : ''}`,
    newValue: { cogsCents: body.cogsCents },
    ipAddress: headerList.get('x-forwarded-for') ?? undefined,
    userAgent: headerList.get('user-agent') ?? undefined,
  })

  return NextResponse.json({ success: true, productCogs })
}
