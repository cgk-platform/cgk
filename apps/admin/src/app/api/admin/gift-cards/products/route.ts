export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getGiftCardProducts,
  upsertGiftCardProduct,
  updateGiftCardProduct,
  archiveGiftCardProduct,
  activateGiftCardProduct,
  type GiftCardProductStatus,
} from '@/lib/gift-card'

/**
 * GET /api/admin/gift-cards/products
 * Get all gift card products
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as GiftCardProductStatus | null

  const products = await withTenant(tenantSlug, async () => {
    return getGiftCardProducts(status || undefined)
  })

  return NextResponse.json({ products })
}

/**
 * POST /api/admin/gift-cards/products
 * Create or update a gift card product
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    id: string
    variant_id: string
    variant_id_numeric: string
    title: string
    sku?: string
    amount_cents: number
    min_order_subtotal_cents?: number
    status?: GiftCardProductStatus
    shopify_status?: string
    image_url?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id || !body.variant_id || !body.variant_id_numeric || !body.title || !body.amount_cents) {
    return NextResponse.json(
      { error: 'Missing required fields: id, variant_id, variant_id_numeric, title, amount_cents' },
      { status: 400 }
    )
  }

  const product = await withTenant(tenantSlug, async () => {
    return upsertGiftCardProduct(body)
  })

  return NextResponse.json({ product })
}

/**
 * PUT /api/admin/gift-cards/products
 * Update a gift card product
 */
export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    id: string
    title?: string
    sku?: string
    amount_cents?: number
    min_order_subtotal_cents?: number
    status?: GiftCardProductStatus
    shopify_status?: string
    image_url?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
  }

  const product = await withTenant(tenantSlug, async () => {
    return updateGiftCardProduct(body)
  })

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json({ product })
}

/**
 * PATCH /api/admin/gift-cards/products
 * Archive or activate a gift card product
 */
export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    id: string
    action: 'archive' | 'activate'
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id || !body.action) {
    return NextResponse.json({ error: 'Product ID and action are required' }, { status: 400 })
  }

  if (body.action !== 'archive' && body.action !== 'activate') {
    return NextResponse.json({ error: 'Action must be "archive" or "activate"' }, { status: 400 })
  }

  const success = await withTenant(tenantSlug, async () => {
    if (body.action === 'archive') {
      return archiveGiftCardProduct(body.id)
    } else {
      return activateGiftCardProduct(body.id)
    }
  })

  if (!success) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
