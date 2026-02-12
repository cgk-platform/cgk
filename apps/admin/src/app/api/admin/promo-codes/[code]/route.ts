export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  deletePromoCodeMetadata,
  getPromoCodeByCode,
  getPromoCodeAnalytics,
  getPromoCodeUsage,
  updatePromoCodeMetadata,
} from '@/lib/promo-codes/db'
import type { UpdatePromoCodeInput } from '@/lib/promo-codes/types'

interface RouteContext {
  params: Promise<{ code: string }>
}

/**
 * GET /api/admin/promo-codes/[code]
 * Get single promo code metadata with analytics
 */
export async function GET(request: Request, context: RouteContext) {
  const { code } = await context.params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const includeAnalytics = searchParams.get('analytics') === 'true'
  const includeUsage = searchParams.get('usage') === 'true'

  try {
    const promoCode = await getPromoCodeByCode(tenantSlug, code)

    if (!promoCode) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 })
    }

    const response: Record<string, unknown> = { promoCode }

    if (includeAnalytics) {
      response.analytics = await getPromoCodeAnalytics(tenantSlug, promoCode.id)
    }

    if (includeUsage) {
      response.usage = await getPromoCodeUsage(tenantSlug, promoCode.id)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching promo code:', error)
    return NextResponse.json(
      { error: 'Failed to fetch promo code' },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/admin/promo-codes/[code]
 * Update promo code metadata
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { code } = await context.params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: UpdatePromoCodeInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const promoCode = await updatePromoCodeMetadata(tenantSlug, code, body)

    if (!promoCode) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 })
    }

    return NextResponse.json({ promoCode })
  } catch (error) {
    console.error('Error updating promo code:', error)
    return NextResponse.json(
      { error: 'Failed to update promo code' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/admin/promo-codes/[code]
 * Delete promo code metadata (does not affect Shopify discount)
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const { code } = await context.params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const deleted = await deletePromoCodeMetadata(tenantSlug, code)

    if (!deleted) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting promo code:', error)
    return NextResponse.json(
      { error: 'Failed to delete promo code' },
      { status: 500 },
    )
  }
}
