export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  deleteSellingPlan,
  getSellingPlanWithAssignments,
  updateSellingPlan,
} from '@/lib/selling-plans/db'
import type { UpdateSellingPlanInput } from '@/lib/selling-plans/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/selling-plans/[id]
 * Get single selling plan with assignments
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const sellingPlan = await getSellingPlanWithAssignments(tenantSlug, id)

    if (!sellingPlan) {
      return NextResponse.json({ error: 'Selling plan not found' }, { status: 404 })
    }

    return NextResponse.json({ sellingPlan })
  } catch (error) {
    console.error('Error fetching selling plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch selling plan' },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/admin/selling-plans/[id]
 * Update selling plan
 */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: UpdateSellingPlanInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const sellingPlan = await updateSellingPlan(tenantSlug, id, body)

    if (!sellingPlan) {
      return NextResponse.json({ error: 'Selling plan not found' }, { status: 404 })
    }

    return NextResponse.json({ sellingPlan })
  } catch (error) {
    console.error('Error updating selling plan:', error)
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'A selling plan with this name already exists' },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to update selling plan' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/admin/selling-plans/[id]
 * Delete selling plan
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const deleted = await deleteSellingPlan(tenantSlug, id)

    if (!deleted) {
      return NextResponse.json({ error: 'Selling plan not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting selling plan:', error)
    return NextResponse.json(
      { error: 'Failed to delete selling plan' },
      { status: 500 },
    )
  }
}
