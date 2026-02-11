export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getABTest, getTestResults } from '@/lib/ab-tests/db'
import type { ABTest, TestResults } from '@/lib/ab-tests/types'

interface RouteContext {
  params: Promise<{ testId: string }>
}

/**
 * GET /api/admin/ab-tests/[testId]/export
 * Export test results as CSV or PDF
 */
export async function GET(request: Request, context: RouteContext) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { testId } = await context.params
  const url = new URL(request.url)
  const format = url.searchParams.get('format') || 'csv'

  const test = await getABTest(tenantSlug, testId)
  if (!test) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 })
  }

  const results = await getTestResults(tenantSlug, testId)
  if (!results) {
    return NextResponse.json({ error: 'No results available' }, { status: 404 })
  }

  if (format === 'csv') {
    const csv = generateCSV(test, results)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${test.name.replace(/[^a-z0-9]/gi, '_')}_results.csv"`,
      },
    })
  }

  // For PDF, return JSON that would be used by a PDF generator
  return NextResponse.json({
    test,
    results,
    generatedAt: new Date().toISOString(),
  })
}

function generateCSV(test: ABTest, results: TestResults): string {
  const rows: string[] = []

  // Header
  rows.push('A/B Test Results Export')
  rows.push(`Test Name,${test.name}`)
  rows.push(`Generated,${new Date().toISOString()}`)
  rows.push('')

  // Variant Results
  rows.push('Variant,Visitors,Conversions,Conversion Rate,Revenue,RPV,Improvement')

  for (const variant of results.variants) {
    rows.push([
      variant.variantName,
      variant.visitors,
      variant.conversions,
      `${(variant.conversionRate * 100).toFixed(2)}%`,
      `$${variant.revenue.toFixed(2)}`,
      `$${variant.revenuePerVisitor.toFixed(2)}`,
      variant.improvement !== undefined ? `${variant.improvement.toFixed(1)}%` : '-',
    ].join(','))
  }

  return rows.join('\n')
}
