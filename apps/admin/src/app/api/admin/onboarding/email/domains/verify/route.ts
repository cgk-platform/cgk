export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getResendConfig,
  verifyOnboardingDomain,
} from '@cgk-platform/communications'

/**
 * POST /api/admin/onboarding/email/domains/verify
 * Verify a domain's DNS records with Resend
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { domainId: string; resendApiKey?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.domainId) {
    return NextResponse.json(
      { error: 'Missing required field: domainId' },
      { status: 400 }
    )
  }

  // Get Resend config
  const resendConfig = body.resendApiKey
    ? { apiKey: body.resendApiKey }
    : getResendConfig()

  if (!resendConfig) {
    return NextResponse.json(
      { error: 'Resend API key not configured' },
      { status: 400 }
    )
  }

  const result = await verifyOnboardingDomain(tenantSlug, body.domainId, resendConfig)

  if (result.rateLimited) {
    return NextResponse.json(
      {
        success: false,
        rateLimited: true,
        nextCheckAt: result.nextCheckAt?.toISOString(),
        error: 'Please wait before checking again',
      },
      { status: 429 }
    )
  }

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    domain: result.domain,
  })
}
