export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createSellingPlan,
  getSellingPlanList,
} from '@/lib/selling-plans/db'
import type { CreateSellingPlanInput } from '@/lib/selling-plans/types'

/**
 * GET /api/admin/selling-plans
 * List selling plans
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
  const activeOnly = searchParams.get('activeOnly') === 'true'

  try {
    const result = await getSellingPlanList(tenantSlug, {
      limit,
      offset,
      activeOnly,
    })

    return NextResponse.json({
      sellingPlans: result.rows,
      totalCount: result.totalCount,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching selling plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch selling plans' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/admin/selling-plans
 * Create a new selling plan
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateSellingPlanInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!body.selector_title) {
    return NextResponse.json({ error: 'Selector title is required' }, { status: 400 })
  }
  if (!body.interval_unit) {
    return NextResponse.json({ error: 'Interval unit is required' }, { status: 400 })
  }
  if (!body.discount_type) {
    return NextResponse.json({ error: 'Discount type is required' }, { status: 400 })
  }
  if (body.discount_value === undefined) {
    return NextResponse.json({ error: 'Discount value is required' }, { status: 400 })
  }

  try {
    const sellingPlan = await createSellingPlan(tenantSlug, body)
    return NextResponse.json({ sellingPlan }, { status: 201 })
  } catch (error) {
    console.error('Error creating selling plan:', error)
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'A selling plan with this name already exists' },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to create selling plan' },
      { status: 500 },
    )
  }
}
