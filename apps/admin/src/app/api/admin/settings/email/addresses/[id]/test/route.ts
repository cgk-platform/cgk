export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  formatSenderAddress,
  getSenderAddressById,
  getResendConfig,
  type SendTestEmailResult,
} from '@cgk/communications'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/settings/email/addresses/[id]/test
 * Send a test email from this sender address
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { recipientEmail: string; subject?: string; body?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
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
      { error: 'Invalid recipient email address' },
      { status: 400 }
    )
  }

  // Get sender address
  const address = await withTenant(tenantSlug, () => getSenderAddressById(id))

  if (!address) {
    return NextResponse.json({ error: 'Sender address not found' }, { status: 404 })
  }

  // Check if domain is verified
  if (address.verificationStatus !== 'verified') {
    return NextResponse.json(
      { error: 'Domain is not verified. Please complete DNS verification first.' },
      { status: 400 }
    )
  }

  // Check Resend config
  const resendConfig = getResendConfig()
  if (!resendConfig) {
    return NextResponse.json(
      { error: 'Resend API key not configured' },
      { status: 500 }
    )
  }

  // Send test email via Resend
  const from = formatSenderAddress(address)
  const subject = body.subject ?? `Test Email from ${address.displayName}`
  const emailBody = body.body ?? `
    <html>
      <body style="font-family: system-ui, sans-serif; padding: 20px;">
        <h1>Test Email</h1>
        <p>This is a test email sent from your CGK email configuration.</p>
        <p><strong>From:</strong> ${from}</p>
        <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 14px;">
          If you received this email, your sender address is configured correctly!
        </p>
      </body>
    </html>
  `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: body.recipientEmail,
        subject,
        html: emailBody,
        reply_to: address.replyToAddress ?? undefined,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      const result: SendTestEmailResult = {
        success: false,
        error: `Failed to send test email: ${response.status} - ${errorBody}`,
      }
      return NextResponse.json(result, { status: 400 })
    }

    const data = await response.json()
    const result: SendTestEmailResult = {
      success: true,
      messageId: data.id,
    }

    return NextResponse.json(result)
  } catch (error) {
    const result: SendTestEmailResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test email',
    }
    return NextResponse.json(result, { status: 500 })
  }
}
