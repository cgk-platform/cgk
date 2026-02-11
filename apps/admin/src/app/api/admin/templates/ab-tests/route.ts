export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getTemplateABTests } from '@/lib/ab-tests/db'

/**
 * GET /api/admin/templates/ab-tests
 * List template A/B tests
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const tests = await getTemplateABTests(tenantSlug)

  return NextResponse.json({ tests })
}

/**
 * POST /api/admin/templates/ab-tests
 * Create a new template A/B test
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const data = await request.json()

    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: 'Test name is required' }, { status: 400 })
    }
    if (!data.templateAId || !data.templateBId) {
      return NextResponse.json(
        { error: 'Two template IDs are required' },
        { status: 400 }
      )
    }

    // In a real implementation, create the test
    return NextResponse.json({
      test: {
        id: `template-test-${Date.now()}`,
        tenantId: tenantSlug,
        name: data.name,
        description: data.description,
        status: 'draft',
        templateAId: data.templateAId,
        templateAName: data.templateAName || 'Template A',
        templateBId: data.templateBId,
        templateBName: data.templateBName || 'Template B',
        trafficAllocation: data.trafficAllocation || { a: 50, b: 50 },
        metrics: { opens: { a: 0, b: 0 }, clicks: { a: 0, b: 0 }, conversions: { a: 0, b: 0 } },
        isSignificant: false,
        createdAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Error creating template A/B test:', error)
    return NextResponse.json(
      { error: 'Failed to create template A/B test' },
      { status: 500 }
    )
  }
}
