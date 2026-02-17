export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getTemplateABTests, createTemplateABTest } from '@/lib/ab-tests/db'

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

  try {
    const tests = await getTemplateABTests(tenantSlug)
    return NextResponse.json({ tests })
  } catch (error) {
    console.error('Error fetching template A/B tests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template A/B tests' },
      { status: 500 }
    )
  }
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
    if (!data.templateAName || !data.templateBName) {
      return NextResponse.json(
        { error: 'Template names are required' },
        { status: 400 }
      )
    }

    const test = await createTemplateABTest(tenantSlug, {
      name: data.name,
      description: data.description,
      templateAId: data.templateAId,
      templateAName: data.templateAName,
      templateBId: data.templateBId,
      templateBName: data.templateBName,
      trafficAllocation: data.trafficAllocation,
    })

    return NextResponse.json({ test })
  } catch (error) {
    console.error('Error creating template A/B test:', error)
    return NextResponse.json(
      { error: 'Failed to create template A/B test' },
      { status: 500 }
    )
  }
}
