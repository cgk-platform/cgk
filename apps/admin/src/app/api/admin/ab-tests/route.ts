export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getABTests, getQuickStats, createABTest, createVariant } from '@/lib/ab-tests/db'
import type { ABTestFilters, WizardData } from '@/lib/ab-tests/types'

/**
 * GET /api/admin/ab-tests
 * List A/B tests with optional filters and stats
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)

  // Check if requesting stats
  if (url.searchParams.get('stats') === 'true') {
    const stats = await getQuickStats(tenantSlug)
    return NextResponse.json({ stats })
  }

  // Build filters from query params
  const pageParam = url.searchParams.get('page')
  const limitParam = url.searchParams.get('limit')
  const filters: ABTestFilters = {
    status: url.searchParams.get('status') as ABTestFilters['status'] ?? undefined,
    testType: url.searchParams.get('testType') as ABTestFilters['testType'] ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
    page: pageParam ? (parseInt(pageParam, 10) || 1) : 1,
    limit: limitParam ? (parseInt(limitParam, 10) || 20) : 20,
    sort: url.searchParams.get('sort') ?? undefined,
    dir: url.searchParams.get('dir') as 'asc' | 'desc' ?? undefined,
  }

  const { tests, total } = await getABTests(tenantSlug, filters)

  return NextResponse.json({
    tests,
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(total / (filters.limit || 20)),
  })
}

/**
 * POST /api/admin/ab-tests
 * Create a new A/B test from wizard data
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const data: WizardData = await request.json()

    // Validate required fields
    if (!data.step1?.name) {
      return NextResponse.json({ error: 'Test name is required' }, { status: 400 })
    }
    if (!data.step1?.baseUrl) {
      return NextResponse.json({ error: 'Base URL is required' }, { status: 400 })
    }
    if (!data.step2?.variants || data.step2.variants.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 variants are required' },
        { status: 400 }
      )
    }

    // Create the test
    const test = await createABTest(tenantSlug, {
      name: data.step1.name,
      description: data.step1.description,
      status: data.step4?.startOption === 'now' ? 'running' : 'draft',
      mode: data.step2.mode,
      testType: data.step1.testType,
      goalEvent: data.step1.goalEvent,
      optimizationMetric: data.step1.optimizationMetric,
      confidenceLevel: data.step1.confidenceLevel,
      baseUrl: data.step1.baseUrl,
      isSignificant: false,
      scheduleTimezone: data.step4?.timezone || 'America/New_York',
      autoStart: data.step4?.startOption === 'scheduled',
      autoEnd: data.step4?.endOption === 'auto_significance',
      scheduledStartAt: data.step4?.scheduledStartAt
        ? new Date(data.step4.scheduledStartAt)
        : undefined,
      scheduledEndAt: data.step4?.scheduledEndAt
        ? new Date(data.step4.scheduledEndAt)
        : undefined,
      startedAt: data.step4?.startOption === 'now' ? new Date() : undefined,
    })

    // Create variants
    for (const variant of data.step2.variants) {
      await createVariant(tenantSlug, {
        testId: test.id,
        name: variant.name,
        url: variant.url,
        urlType: variant.urlType || 'static',
        landingPageId: variant.landingPageId,
        trafficAllocation: variant.trafficAllocation,
        isControl: variant.isControl,
        preserveQueryParams: true,
        shippingSuffix: variant.shippingSuffix,
        shippingPriceCents: variant.shippingPriceCents,
      })
    }

    return NextResponse.json({ test })
  } catch (error) {
    console.error('Error creating A/B test:', error)
    return NextResponse.json(
      { error: 'Failed to create A/B test' },
      { status: 500 }
    )
  }
}
