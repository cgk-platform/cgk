export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getABTest, updateABTest } from '@/lib/ab-tests/db'

interface RouteContext {
  params: Promise<{ testId: string }>
}

/**
 * POST /api/admin/ab-tests/[testId]/start
 * Start or resume an A/B test
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

    if (test.status !== 'draft' && test.status !== 'paused') {
      return NextResponse.json(
        { error: 'Test can only be started from draft or paused status' },
        { status: 400 }
      )
    }

    const updatedTest = await updateABTest(tenantSlug, testId, {
      status: 'running',
      startedAt: test.startedAt || new Date(),
    })

    return NextResponse.json({ test: updatedTest })
  } catch (error) {
    console.error('Error starting A/B test:', error)
    return NextResponse.json(
      { error: 'Failed to start A/B test' },
      { status: 500 }
    )
  }
}
