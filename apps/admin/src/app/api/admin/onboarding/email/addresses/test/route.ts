export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getSenderAddressById,
  getResendConfig,
  sendTestEmail,
} from '@cgk-platform/communications'

/**
 * POST /api/admin/onboarding/email/addresses/test
 * Send a test email from a sender address
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    senderAddressId: string
    recipientEmail: string
    brandName?: string
    resendApiKey?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.senderAddressId) {
    return NextResponse.json(
      { error: 'Missing required field: senderAddressId' },
      { status: 400 }
    )
  }

  if (!body.recipientEmail) {
    return NextResponse.json(
      { error: 'Missing required field: recipientEmail' },
      { status: 400 }
    )
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.recipientEmail)) {
    return NextResponse.json(
      { error: 'Invalid email format' },
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

  // Get the sender address
  const senderAddress = await getSenderAddressById(tenantSlug, body.senderAddressId)

  if (!senderAddress) {
    return NextResponse.json(
      { error: 'Sender address not found' },
      { status: 404 }
    )
  }

  if (senderAddress.verificationStatus !== 'verified') {
    return NextResponse.json(
      { error: 'Cannot send from unverified domain. Please verify the domain first.' },
      { status: 400 }
    )
  }

  const result = await sendTestEmail(
    senderAddress,
    body.recipientEmail,
    body.brandName ?? 'Your Brand',
    resendConfig
  )

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
  })
}
