/**
 * Survey Configuration API for Shopify Post-Purchase Extension
 *
 * Returns survey configuration in a format compatible with the checkout extension.
 * This is a lightweight endpoint that transforms the platform's survey format.
 *
 * For full survey management, see /api/public/surveys/[tenant]/[slug]
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Survey configuration for Shopify extension
 */
interface ExtensionSurveyConfig {
  questions: Array<{
    id: string
    question: string
    type: 'single_choice' | 'multi_choice' | 'text'
    options?: Array<{ value: string; label: string }>
    required: boolean
    placeholder?: string
  }>
  submitButtonText: string
  thankYouMessage: string
  title?: string
}

/**
 * Default attribution survey for new/unconfigured tenants
 */
const DEFAULT_SURVEY_CONFIG: ExtensionSurveyConfig = {
  title: 'Quick Question',
  submitButtonText: 'Submit',
  thankYouMessage: 'Thank you for your feedback!',
  questions: [
    {
      id: 'attribution',
      question: 'How did you first hear about us?',
      type: 'single_choice',
      required: true,
      options: [
        { value: 'google', label: 'Google Search' },
        { value: 'facebook', label: 'Facebook / Instagram' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'youtube', label: 'YouTube' },
        { value: 'influencer', label: 'Influencer / Creator' },
        { value: 'friend', label: 'Friend or Family' },
        { value: 'podcast', label: 'Podcast' },
        { value: 'email', label: 'Email' },
        { value: 'other', label: 'Other' },
      ],
    },
  ],
}

/**
 * GET /api/surveys
 *
 * Returns survey config for the Shopify checkout extension.
 * Fetches from the platform's survey system when tenant is identified.
 *
 * Query parameters:
 * - tenant: Tenant slug (required in production)
 * - slug: Survey slug (defaults to 'post-purchase')
 *
 * Headers:
 * - X-API-Key: API key for authentication
 * - X-Shop-Domain: Shopify shop domain (alternative to tenant param)
 */
export async function GET(request: Request): Promise<NextResponse<ExtensionSurveyConfig>> {
  // Add CORS headers for Shopify extension
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Shop-Domain',
    'Cache-Control': 'public, max-age=300',
  })

  try {
    const url = new URL(request.url)
    const tenant = url.searchParams.get('tenant')
    const slug = url.searchParams.get('slug') || 'post-purchase'

    // If tenant provided, fetch their survey config
    if (tenant) {
      // Proxy to the full survey API
      const surveyUrl = `${url.origin}/api/public/surveys/${tenant}/${slug}`
      const surveyResponse = await fetch(surveyUrl)

      if (surveyResponse.ok) {
        const data = await surveyResponse.json()
        const survey = data.survey

        // Transform to extension format
        const config: ExtensionSurveyConfig = {
          title: survey.title || 'Quick Question',
          submitButtonText: 'Submit',
          thankYouMessage: survey.thank_you_message || 'Thank you for your feedback!',
          questions: survey.questions.map((q: {
            id: string
            question_text: string
            question_type: string
            options?: Array<{ value: string; label: string }>
            required: boolean
          }) => ({
            id: q.id,
            question: q.question_text,
            type: mapQuestionType(q.question_type),
            options: q.options,
            required: q.required,
          })),
        }

        return NextResponse.json(config, { headers })
      }
    }

    // Return default config if no tenant or survey not found
    return NextResponse.json(DEFAULT_SURVEY_CONFIG, { headers })
  } catch (error) {
    console.error('[Survey API] Error:', error)
    return NextResponse.json(DEFAULT_SURVEY_CONFIG, { headers })
  }
}

/**
 * OPTIONS /api/surveys (CORS preflight)
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Shop-Domain',
    },
  })
}

/**
 * Maps platform question types to extension types
 */
function mapQuestionType(
  platformType: string
): 'single_choice' | 'multi_choice' | 'text' {
  switch (platformType) {
    case 'multiple_choice':
    case 'dropdown':
    case 'rating':
      return 'single_choice'
    case 'checkbox':
      return 'multi_choice'
    case 'text':
    case 'email':
    case 'phone':
    default:
      return 'text'
  }
}
