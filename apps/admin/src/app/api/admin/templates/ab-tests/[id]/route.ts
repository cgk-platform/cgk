export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/templates/ab-tests/[id]
 * Get a single template A/B test
 */
export async function GET(request: Request, context: RouteContext) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await context.params

  // In a real implementation, fetch from database
  return NextResponse.json({
    test: {
      id,
      tenantId: tenantSlug,
      name: 'Email Subject Line Test',
      description: 'Testing urgency vs. value-focused subject lines',
      status: 'running',
      templateAId: 'template-a-123',
      templateAName: 'Urgency Focus',
      templateBId: 'template-b-456',
      templateBName: 'Value Focus',
      trafficAllocation: { a: 50, b: 50 },
      metrics: {
        opens: { a: 1245, b: 1489 },
        clicks: { a: 312, b: 398 },
        conversions: { a: 45, b: 62 },
      },
      isSignificant: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  })
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

    // In a real implementation, update in database
    return NextResponse.json({
      test: {
        id,
        ...data,
        updatedAt: new Date(),
      },
    })
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
export async function DELETE(request: Request, context: RouteContext) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await context.params

  // In a real implementation, delete from database
  return NextResponse.json({ success: true })
}
