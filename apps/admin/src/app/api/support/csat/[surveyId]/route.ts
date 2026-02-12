/**
 * Public CSAT Survey Detail API
 *
 * GET /api/support/csat/[surveyId] - Get survey status
 *
 * @ai-pattern api-route
 * @ai-note Public endpoint for survey access
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import { getCSATConfig, getSurvey } from '@cgk/support'

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

    const isExpired = new Date() > survey.expiresAt
    const isCompleted = survey.respondedAt !== null

    // Get config for survey display
    const config = await getCSATConfig(tenantId)

    return NextResponse.json({
      surveyId: survey.id,
      customerEmail: survey.customerEmail,
      ratingQuestion: config.ratingQuestion,
      feedbackPrompt: config.feedbackPrompt,
      expiresAt: survey.expiresAt,
      isExpired,
      isCompleted,
      // Only include rating if already completed
      rating: isCompleted ? survey.rating : undefined,
    })
  } catch (error) {
    console.error('[support/csat/survey] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch survey' },
      { status: 500 }
    )
  }
}
