export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getSmsSettings,
  hasValidTwilioConfig,
  normalizeToE164,
  sendTestSms,
} from '@cgk-platform/communications'

/**
 * POST /api/admin/sms/test
 * Send a test SMS
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()
  const { phoneNumber } = body

  if (!phoneNumber) {
    return NextResponse.json(
      { error: 'Phone number is required' },
      { status: 400 }
    )
  }

  // Normalize phone number
  const normalized = normalizeToE164(phoneNumber)

  if (!normalized) {
    return NextResponse.json(
      { error: 'Invalid phone number format. Must be E.164 format (e.g., +15551234567)' },
      { status: 400 }
    )
  }

  // Check SMS is configured
  const settings = await getSmsSettings(tenantSlug)

  if (!settings.smsEnabled) {
    return NextResponse.json(
      { error: 'SMS is not enabled for this tenant' },
      { status: 400 }
    )
  }

  if (!hasValidTwilioConfig(settings)) {
    return NextResponse.json(
      { error: 'Twilio credentials not configured' },
      { status: 400 }
    )
  }

  // Send test SMS
  const result = await sendTestSms(tenantSlug, normalized)

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || 'Failed to send test SMS',
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    messageSid: result.messageSid,
    message: 'Test SMS sent successfully',
  })
}
