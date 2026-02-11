export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getSmsSettings,
  hasValidTwilioConfig,
  sendTestSms,
  updateSmsHealthStatus,
  verifyTwilioCredentials,
} from '@cgk/communications'

/**
 * POST /api/admin/sms/setup/verify
 * Verify Twilio configuration
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const settings = await getSmsSettings(tenantSlug)

  if (!hasValidTwilioConfig(settings)) {
    return NextResponse.json(
      { error: 'Twilio credentials not configured' },
      { status: 400 }
    )
  }

  // Verify credentials with Twilio
  const verificationResult = await verifyTwilioCredentials(
    settings.twilioAccountSid!,
    settings.twilioAuthToken!,
    settings.twilioPhoneNumber!
  )

  if (!verificationResult.success) {
    await updateSmsHealthStatus(tenantSlug, 'failed')
    return NextResponse.json(
      {
        success: false,
        error: verificationResult.error || 'Verification failed',
      },
      { status: 400 }
    )
  }

  // Optionally send a test SMS if recipient provided
  const body = await request.json().catch(() => ({}))
  const { testRecipient } = body

  if (testRecipient) {
    const testResult = await sendTestSms(tenantSlug, testRecipient)

    if (!testResult.success) {
      await updateSmsHealthStatus(tenantSlug, 'degraded')
      return NextResponse.json({
        success: true,
        verified: true,
        testSent: false,
        testError: testResult.error,
        message: 'Credentials verified but test SMS failed',
      })
    }

    await updateSmsHealthStatus(tenantSlug, 'healthy')
    return NextResponse.json({
      success: true,
      verified: true,
      testSent: true,
      messageSid: testResult.messageSid,
      message: 'Verification successful. Test SMS sent.',
    })
  }

  await updateSmsHealthStatus(tenantSlug, 'healthy')
  return NextResponse.json({
    success: true,
    verified: true,
    accountSid: verificationResult.accountSid,
    phoneNumber: verificationResult.phoneNumber,
    message: 'Twilio credentials verified successfully',
  })
}
