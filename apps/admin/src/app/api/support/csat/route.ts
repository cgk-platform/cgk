/**
 * Public CSAT Survey API
 *
 * GET /api/support/csat - Get survey by ID (via query param)
 * POST /api/support/csat - Submit survey response
 *
 * @ai-pattern api-route
 * @ai-note Public endpoint for customer survey submission
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import {
  getSurvey,
  submitSurveyResponse,
  type CSATRating,
} from '@cgk/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const surveyId = req.nextUrl.searchParams.get('id')
    if (!surveyId) {
      return NextResponse.json(
        { error: 'Survey ID is required' },
        { status: 400 }
      )
    }

    const survey = await getSurvey(tenantId, surveyId)

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date() > survey.expiresAt) {
      return NextResponse.json(
        { error: 'Survey has expired', expired: true },
        { status: 410 }
      )
    }

    // Check if already responded
    if (survey.respondedAt) {
      return NextResponse.json(
        { error: 'Survey has already been submitted', alreadySubmitted: true },
        { status: 400 }
      )
    }

    // Get config for survey display
    const { getCSATConfig } = await import('@cgk/support')
    const config = await getCSATConfig(tenantId)

    return NextResponse.json({
      surveyId: survey.id,
      customerEmail: survey.customerEmail,
      ratingQuestion: config.ratingQuestion,
      feedbackPrompt: config.feedbackPrompt,
      expiresAt: survey.expiresAt,
    })
  } catch (error) {
    console.error('[support/csat] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch survey' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const body = await req.json() as {
      surveyId: string
      rating: number
      feedback?: string
    }

    if (!body.surveyId) {
      return NextResponse.json(
        { error: 'Survey ID is required' },
        { status: 400 }
      )
    }

    if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const survey = await submitSurveyResponse(tenantId, body.surveyId, {
      rating: body.rating as CSATRating,
      feedback: body.feedback,
    })

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
    })
  } catch (error) {
    console.error('[support/csat] POST error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Failed to submit response'

    // Handle specific errors
    if (errorMessage.includes('already been submitted')) {
      return NextResponse.json(
        { error: 'Survey has already been submitted' },
        { status: 400 }
      )
    }

    if (errorMessage.includes('expired')) {
      return NextResponse.json(
        { error: 'Survey has expired' },
        { status: 410 }
      )
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
