export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getSRMAnalysis } from '@/lib/ab-tests/db'

interface RouteContext {
  params: Promise<{ testId: string }>
}

/**
 * GET /api/admin/ab-tests/[testId]/srm
 * Get SRM (Sample Ratio Mismatch) analysis for a test
 */
export async function GET(_request: Request, context: RouteContext) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { testId } = await context.params

  const analysis = await getSRMAnalysis(tenantSlug, testId)
  if (!analysis) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 })
  }

  return NextResponse.json(analysis)
}
