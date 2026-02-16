export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import {
  getSmsSettings,
  hasValidTwilioConfig,
  sendTestSms,
} from '@cgk-platform/communications'

/**
 * POST /api/admin/bri/integrations/sms/test
 * Send test SMS through BRI integration
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    phoneNumber?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { phoneNumber } = body

  if (!phoneNumber) {
    return NextResponse.json(
      { error: 'Phone number is required' },
      { status: 400 }
    )
  }

  // Validate phone number format (basic E.164 validation)
  const phoneRegex = /^\+[1-9]\d{1,14}$/
  if (!phoneRegex.test(phoneNumber)) {
    return NextResponse.json(
      { error: 'Invalid phone number format. Please use E.164 format (e.g., +15551234567)' },
      { status: 400 }
    )
  }

  // Check if Twilio is configured
  const settings = await getSmsSettings(tenantSlug)
  if (!hasValidTwilioConfig(settings)) {
    return NextResponse.json(
      { error: 'SMS (Twilio) is not configured. Please add your Twilio credentials first.' },
      { status: 400 }
    )
  }

  // Check if SMS is enabled
  if (!settings.smsEnabled) {
    return NextResponse.json(
      { error: 'SMS is not enabled. Please enable SMS in your settings.' },
      { status: 400 }
    )
  }

  // Send test SMS
  const result = await sendTestSms(tenantSlug, phoneNumber)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Failed to send test SMS' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: `Test SMS sent to ${phoneNumber}`,
    messageSid: result.messageSid,
  })
}
