/**
 * CSAT Survey Detail API
 *
 * GET /api/admin/support/csat/[surveyId] - Get survey details
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import { getSurvey } from '@cgk/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const { surveyId } = await params

    const survey = await getSurvey(tenantId, surveyId)

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ survey })
  } catch (error) {
    console.error('[csat/survey] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch survey' },
      { status: 500 }
    )
  }
}
