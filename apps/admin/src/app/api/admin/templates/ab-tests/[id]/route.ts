export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getTemplateABTest,
  updateTemplateABTest,
  deleteTemplateABTest,
} from '@/lib/ab-tests/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/templates/ab-tests/[id]
 * Get a single template A/B test
 */
export async function GET(_request: Request, context: RouteContext) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await context.params

  try {
    const test = await getTemplateABTest(tenantSlug, id)

    if (!test) {
      return NextResponse.json({ error: 'A/B test not found' }, { status: 404 })
    }

    return NextResponse.json({ test })
  } catch (error) {
    console.error('Error fetching template A/B test:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template A/B test' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/templates/ab-tests/[id]
 * Update a template A/B test
 */
export async function PATCH(request: Request, context: RouteContext) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await context.params

  try {
    const data = await request.json()

    const test = await updateTemplateABTest(tenantSlug, id, data)

    if (!test) {
      return NextResponse.json({ error: 'A/B test not found' }, { status: 404 })
    }

    return NextResponse.json({ test })
  } catch (error) {
    console.error('Error updating template A/B test:', error)
    return NextResponse.json(
      { error: 'Failed to update template A/B test' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/templates/ab-tests/[id]
 * Delete a template A/B test
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await context.params

  try {
    const deleted = await deleteTemplateABTest(tenantSlug, id)

    if (!deleted) {
      return NextResponse.json({ error: 'A/B test not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template A/B test:', error)
    return NextResponse.json(
      { error: 'Failed to delete template A/B test' },
      { status: 500 }
    )
  }
}
