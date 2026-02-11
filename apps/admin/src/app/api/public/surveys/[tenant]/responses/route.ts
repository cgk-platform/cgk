export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

import { submitResponse, checkResponseExists } from '@/lib/surveys'
import type { SubmitResponseInput } from '@/lib/surveys'

interface RouteParams {
  params: Promise<{ tenant: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const { tenant: tenantSlug } = await params

  // Add CORS headers for Shopify extension
  const responseHeaders = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Session-Token, X-Shop-Domain',
  })

  let body: SubmitResponseInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: responseHeaders })
  }

  if (!body.surveyId || !body.answers || body.answers.length === 0) {
    return NextResponse.json(
      { error: 'Missing required fields: surveyId, answers' },
      { status: 400, headers: responseHeaders },
    )
  }

  // Extract additional info from request
  const userAgent = request.headers.get('user-agent') || undefined
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || undefined

  try {
    const response = await submitResponse(tenantSlug, {
      ...body,
      userAgent,
      ipAddress,
    })

    return NextResponse.json({ response }, { status: 201, headers: responseHeaders })
  } catch (error) {
    // Handle duplicate response
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'Response already submitted for this order' },
        { status: 409, headers: responseHeaders },
      )
    }
    throw error
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Session-Token, X-Shop-Domain',
    },
  })
}
