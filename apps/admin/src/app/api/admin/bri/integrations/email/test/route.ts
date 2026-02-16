export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import {
  getTenantResendClient,
  getTenantResendSenderConfig,
} from '@cgk-platform/integrations'

/**
 * POST /api/admin/bri/integrations/email/test
 * Send test email through BRI integration
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    recipientEmail?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { recipientEmail } = body

  if (!recipientEmail) {
    return NextResponse.json(
      { error: 'Recipient email is required' },
      { status: 400 }
    )
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(recipientEmail)) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    )
  }

  // Get tenant's Resend client
  const resend = await getTenantResendClient(tenantSlug)
  if (!resend) {
    return NextResponse.json(
      { error: 'Email (Resend) is not configured. Please add your Resend API key first.' },
      { status: 400 }
    )
  }

  // Get sender config
  const senderConfig = await getTenantResendSenderConfig(tenantSlug)
  if (!senderConfig) {
    return NextResponse.json(
      { error: 'Email sender configuration is missing. Please configure a from email address.' },
      { status: 400 }
    )
  }

  try {
    // Send test email
    const result = await resend.emails.send({
      from: senderConfig.from,
      replyTo: senderConfig.replyTo,
      to: recipientEmail,
      subject: 'BRI Email Integration Test',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e293b; margin-bottom: 16px;">Email Integration Test</h2>
          <p style="color: #475569; line-height: 1.6;">
            This is a test email from your BRI (Business Resource Intelligence) integration.
          </p>
          <p style="color: #475569; line-height: 1.6;">
            If you received this email, your email integration is working correctly!
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 14px;">
            Sent from your CGK platform
          </p>
        </div>
      `,
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to send test email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${recipientEmail}`,
      messageId: result.data?.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to send test email: ${message}` },
      { status: 500 }
    )
  }
}
