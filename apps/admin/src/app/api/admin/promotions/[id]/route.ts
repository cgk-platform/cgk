export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  checkPromotionOverlaps,
  deletePromotion,
  getPromotionById,
  updatePromotion,
} from '@/lib/promotions/db'
import type { UpdatePromotionInput } from '@/lib/promotions/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/promotions/[id]
 * Get single promotion
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const promotion = await getPromotionById(tenantSlug, id)

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    return NextResponse.json({ promotion })
  } catch (error) {
    console.error('Error fetching promotion:', error)
    return NextResponse.json(
      { error: 'Failed to fetch promotion' },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/admin/promotions/[id]
 * Update promotion
 */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: UpdatePromotionInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate dates if provided
  if (body.starts_at && body.ends_at) {
    const startsAt = new Date(body.starts_at)
    const endsAt = new Date(body.ends_at)

    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    if (endsAt <= startsAt) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 },
      )
    }
  }

  try {
    // Get current promotion to check dates for overlap
    const current = await getPromotionById(tenantSlug, id)
    if (!current) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    const startsAt = body.starts_at || current.starts_at
    const endsAt = body.ends_at || current.ends_at

    // Check for overlaps (warn but don't prevent)
    const overlaps = await checkPromotionOverlaps(tenantSlug, startsAt, endsAt, id)

    const promotion = await updatePromotion(tenantSlug, id, body)

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    return NextResponse.json({
      promotion,
      warnings: overlaps.length > 0
        ? [`This promotion overlaps with ${overlaps.length} other promotion(s): ${overlaps.map(p => p.name).join(', ')}`]
        : [],
    })
  } catch (error) {
    console.error('Error updating promotion:', error)
    return NextResponse.json(
      { error: 'Failed to update promotion' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/admin/promotions/[id]
 * Delete promotion
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const deleted = await deletePromotion(tenantSlug, id)

    if (!deleted) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting promotion:', error)
    return NextResponse.json(
      { error: 'Failed to delete promotion' },
      { status: 500 },
    )
  }
}
