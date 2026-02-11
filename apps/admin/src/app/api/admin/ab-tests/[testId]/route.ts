export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getABTest, getVariants, updateABTest, deleteABTest } from '@/lib/ab-tests/db'

interface RouteContext {
  params: Promise<{ testId: string }>
}

/**
 * GET /api/admin/ab-tests/[testId]
 * Get a single A/B test with variants
 */
export async function GET(_request: Request, context: RouteContext) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { testId } = await context.params

  const test = await getABTest(tenantSlug, testId)
  if (!test) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 })
  }

  const variants = await getVariants(tenantSlug, testId)

  return NextResponse.json({ test, variants })
}

/**
 * PATCH /api/admin/ab-tests/[testId]
 * Update an A/B test
 */
export async function PATCH(request: Request, context: RouteContext) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { testId } = await context.params

  try {
    const data = await request.json()
    const test = await updateABTest(tenantSlug, testId, data)

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    return NextResponse.json({ test })
  } catch (error) {
    console.error('Error updating A/B test:', error)
    return NextResponse.json(
      { error: 'Failed to update A/B test' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/ab-tests/[testId]
 * Delete an A/B test
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { testId } = await context.params

  try {
    const success = await deleteABTest(tenantSlug, testId)

    if (!success) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting A/B test:', error)
    return NextResponse.json(
      { error: 'Failed to delete A/B test' },
      { status: 500 }
    )
  }
}
