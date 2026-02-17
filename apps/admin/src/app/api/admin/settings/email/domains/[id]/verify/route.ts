export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getDomainById,
  getResendConfig,
  verifyDomainWithResend,
} from '@cgk-platform/communications'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/settings/email/domains/[id]/verify
 * Trigger domain verification check
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Check domain exists
  const domain = await getDomainById(tenantSlug, id)

  if (!domain) {
    return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
  }

  // Already verified
  if (domain.verificationStatus === 'verified') {
    return NextResponse.json({
      success: true,
      status: 'verified',
      message: 'Domain is already verified',
    })
  }

  // Check Resend config
  const resendConfig = getResendConfig()
  if (!resendConfig) {
    return NextResponse.json(
      { error: 'Resend API key not configured' },
      { status: 500 }
    )
  }

  // Verify domain
  const result = await verifyDomainWithResend(tenantSlug, id, resendConfig)

  if (result.rateLimited) {
    return NextResponse.json(
      {
        error: 'Rate limited. Please wait before checking again.',
        nextCheckAllowedAt: result.nextCheckAllowedAt,
      },
      { status: 429 }
    )
  }

  if (!result.success && result.status !== 'pending') {
    return NextResponse.json(
      {
        success: false,
        status: result.status,
        error: result.error ?? 'Verification failed',
      },
      { status: 400 }
    )
  }

  // Get updated domain
  const updatedDomain = await getDomainById(tenantSlug, id)

  return NextResponse.json({
    success: result.status === 'verified',
    status: result.status,
    domain: updatedDomain,
    message:
      result.status === 'verified'
        ? 'Domain verified successfully!'
        : 'Verification pending. Please ensure DNS records are correctly configured.',
  })
}
