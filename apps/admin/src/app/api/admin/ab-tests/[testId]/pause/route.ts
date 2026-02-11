export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getABTest, updateABTest } from '@/lib/ab-tests/db'

interface RouteContext {
  params: Promise<{ testId: string }>
}

/**
 * POST /api/admin/ab-tests/[testId]/pause
 * Pause a running A/B test
 */
export async function POST(request: Request, context: RouteContext) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { testId } = await context.params

  try {
    const test = await getABTest(tenantSlug, testId)
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    if (test.status !== 'running') {
      return NextResponse.json(
        { error: 'Test can only be paused when running' },
        { status: 400 }
      )
    }

    const updatedTest = await updateABTest(tenantSlug, testId, {
      status: 'paused',
    })

    return NextResponse.json({ test: updatedTest })
  } catch (error) {
    console.error('Error pausing A/B test:', error)
    return NextResponse.json(
      { error: 'Failed to pause A/B test' },
      { status: 500 }
    )
  }
}
