/**
 * Survey Submission API for Shopify Post-Purchase Extension
 *
 * Receives survey responses from the checkout extension and stores them
 * using the platform's survey response system.
 *
 * For full survey response management, see /api/public/surveys/[tenant]/responses
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Submission payload from Shopify extension
 */
interface ExtensionSubmission {
  orderId: string
  orderNumber?: string
  shop: string
  answers: Record<string, string | string[]>
  submittedAt: string
  email?: string
  surveyId?: string
}

/**
 * POST /api/surveys/submit
 *
 * Stores survey responses from the Shopify checkout extension.
 * Forwards to the platform's survey response system.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Add CORS headers
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Shop-Domain',
  })

  try {
    const submission: ExtensionSubmission = await request.json()

    // Validate required fields
    if (!submission.orderId || !submission.shop || !submission.answers) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, shop, answers' },
        { status: 400, headers }
      )
    }

    // Extract tenant from shop domain
    // Format: tenant-slug.myshopify.com or tenant-slug
    const shopDomain = submission.shop.replace('.myshopify.com', '')
    const tenant = shopDomain.split('.')[0] // Handle subdomains

    // Transform answers to platform format
    const platformAnswers = Object.entries(submission.answers).map(
      ([questionId, answer]) => ({
        question_id: questionId,
        answer_value: Array.isArray(answer) ? answer : [answer],
      })
    )

    // Forward to platform survey response API
    const url = new URL(request.url)
    const responseUrl = `${url.origin}/api/public/surveys/${tenant}/responses`

    const platformResponse = await fetch(responseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shop-Domain': submission.shop,
      },
      body: JSON.stringify({
        survey_id: submission.surveyId || 'post-purchase',
        respondent_id: submission.orderId,
        respondent_email: submission.email,
        source: 'shopify_checkout',
        metadata: {
          order_id: submission.orderId,
          order_number: submission.orderNumber,
          shop_domain: submission.shop,
          submitted_at: submission.submittedAt,
        },
        answers: platformAnswers,
      }),
    })

    if (platformResponse.ok) {
      return NextResponse.json({ success: true }, { headers })
    }

    // Log error but return success to not break checkout
    const errorData = await platformResponse.text()
    console.error('[Survey Submit] Platform API error:', errorData)

    // Still return success to not disrupt checkout experience
    return NextResponse.json({ success: true, warning: 'Response may not have been saved' }, { headers })
  } catch (error) {
    console.error('[Survey Submit] Error:', error)

    // Return success anyway to not break checkout
    return NextResponse.json(
      { success: true, warning: 'Response processing failed' },
      { headers }
    )
  }
}

/**
 * OPTIONS /api/surveys/submit (CORS preflight)
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Shop-Domain',
    },
  })
}
