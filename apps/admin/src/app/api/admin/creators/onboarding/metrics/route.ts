export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getOnboardingMetrics,
  getStepCompletionMetrics,
  parseOnboardingPeriod,
} from '@/lib/creators-admin-ops'
import { logger } from '@cgk-platform/logging'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const period = parseOnboardingPeriod(url.searchParams.get('period') || undefined)
  const includeSteps = url.searchParams.get('steps') === 'true'

  try {
    const metrics = await getOnboardingMetrics(tenantSlug, period)

    const response: {
      metrics: typeof metrics
      period: number
      stepMetrics?: Awaited<ReturnType<typeof getStepCompletionMetrics>>
    } = {
      metrics,
      period,
    }

    if (includeSteps) {
      response.stepMetrics = await getStepCompletionMetrics(tenantSlug)
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching onboarding metrics:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to fetch onboarding metrics' },
      { status: 500 }
    )
  }
}
