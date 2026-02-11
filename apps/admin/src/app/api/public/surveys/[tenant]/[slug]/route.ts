export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

import { getSurveyBySlug, getQuestions } from '@/lib/surveys'

interface RouteParams {
  params: Promise<{ tenant: string; slug: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const { tenant: tenantSlug, slug } = await params

  // Add CORS headers for Shopify extension
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Session-Token, X-Shop-Domain',
    'Cache-Control': 'public, max-age=300, s-maxage=300',
  })

  const survey = await getSurveyBySlug(tenantSlug, slug)

  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404, headers })
  }

  // Only return active surveys for public API
  if (survey.status !== 'active') {
    return NextResponse.json({ error: 'Survey not available' }, { status: 404, headers })
  }

  // Check expiration
  if (survey.expires_at && new Date(survey.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Survey has expired' }, { status: 410, headers })
  }

  // Check response limit
  if (survey.response_limit && survey.response_count && survey.response_count >= survey.response_limit) {
    return NextResponse.json({ error: 'Survey response limit reached' }, { status: 410, headers })
  }

  // Load questions
  const questions = await getQuestions(tenantSlug, survey.id)

  return NextResponse.json(
    {
      survey: {
        id: survey.id,
        title: survey.title,
        subtitle: survey.subtitle,
        thank_you_message: survey.thank_you_message,
        redirect_url: survey.redirect_url,
        branding_config: survey.branding_config,
        questions: questions.map(q => ({
          id: q.id,
          question_text: q.question_text,
          help_text: q.help_text,
          question_type: q.question_type,
          options: q.options,
          required: q.required,
          validation_config: q.validation_config,
          show_when: q.show_when,
          is_attribution_question: q.is_attribution_question,
          display_order: q.display_order,
        })),
      },
    },
    { headers },
  )
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Session-Token, X-Shop-Domain',
    },
  })
}
