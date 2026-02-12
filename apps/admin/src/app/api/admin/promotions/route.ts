export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  checkPromotionOverlaps,
  createPromotion,
  getPromotionList,
  getPromotionsForCalendar,
} from '@/lib/promotions/db'
import type { CreatePromotionInput } from '@/lib/promotions/types'

/**
 * GET /api/admin/promotions
 * List scheduled promotions with optional filtering
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const status = searchParams.get('status') || undefined
  const includeEnded = searchParams.get('includeEnded') !== 'false'
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined
  const view = searchParams.get('view') // 'calendar' for calendar view

  try {
    // Calendar view returns events for a date range
    if (view === 'calendar' && startDate && endDate) {
      const events = await getPromotionsForCalendar(tenantSlug, startDate, endDate)
      return NextResponse.json({ events })
    }

    // List view
    const result = await getPromotionList(tenantSlug, {
      limit,
      offset,
      status,
      includeEnded,
      startDate,
      endDate,
    })

    return NextResponse.json({
      promotions: result.rows,
      totalCount: result.totalCount,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching promotions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch promotions' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/admin/promotions
 * Create a new scheduled promotion
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreatePromotionInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!body.starts_at) {
    return NextResponse.json({ error: 'Start date is required' }, { status: 400 })
  }
  if (!body.ends_at) {
    return NextResponse.json({ error: 'End date is required' }, { status: 400 })
  }

  // Validate dates
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

  try {
    // Check for overlaps (warn but don't prevent)
    const overlaps = await checkPromotionOverlaps(tenantSlug, body.starts_at, body.ends_at)

    const promotion = await createPromotion(tenantSlug, body)

    return NextResponse.json(
      {
        promotion,
        warnings: overlaps.length > 0
          ? [`This promotion overlaps with ${overlaps.length} other promotion(s): ${overlaps.map(p => p.name).join(', ')}`]
          : [],
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating promotion:', error)
    return NextResponse.json(
      { error: 'Failed to create promotion' },
      { status: 500 },
    )
  }
}
