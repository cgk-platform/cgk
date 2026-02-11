export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

import { checkResponseExists } from '@/lib/surveys'

interface RouteParams {
  params: Promise<{ tenant: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const { tenant: tenantSlug } = await params

  // Add CORS headers for Shopify extension
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Session-Token, X-Shop-Domain',
  })

  let body: { surveyId: string; orderId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  if (!body.surveyId || !body.orderId) {
    return NextResponse.json(
      { error: 'Missing required fields: surveyId, orderId' },
      { status: 400, headers },
    )
  }

  const alreadyCompleted = await checkResponseExists(tenantSlug, body.surveyId, body.orderId)

  return NextResponse.json({ alreadyCompleted }, { headers })
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
