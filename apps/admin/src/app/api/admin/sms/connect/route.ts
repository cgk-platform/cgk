export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import {
  getSmsSettings,
  updateSmsSettings,
  updateSmsHealthStatus,
} from '@cgk-platform/communications'
import { verifyTwilioCredentials } from '@cgk-platform/communications'

/**
 * POST /api/admin/sms/connect
 * Connect SMS provider (Twilio) - saves and verifies credentials
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    accountSid?: string
    authToken?: string
    phoneNumber?: string
    messagingServiceSid?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { accountSid, authToken, phoneNumber, messagingServiceSid } = body

  if (!accountSid || !authToken || !phoneNumber) {
    return NextResponse.json(
      { error: 'Account SID, Auth Token, and Phone Number are required' },
      { status: 400 }
    )
  }

  // Verify credentials with Twilio
  const verification = await verifyTwilioCredentials(accountSid, authToken, phoneNumber)

  if (!verification.success) {
    return NextResponse.json(
      { error: verification.error || 'Failed to verify Twilio credentials' },
      { status: 400 }
    )
  }

  // Save credentials to tenant config
  await updateSmsSettings(tenantSlug, {
    smsEnabled: true,
    provider: 'twilio',
    twilioAccountSid: accountSid,
    twilioAuthToken: authToken,
    twilioPhoneNumber: phoneNumber,
    twilioMessagingServiceSid: messagingServiceSid || undefined,
  })

  // Update health status to healthy since we verified
  await updateSmsHealthStatus(tenantSlug, 'healthy')

  // Get updated settings
  const settings = await getSmsSettings(tenantSlug)

  return NextResponse.json({
    success: true,
    message: 'Twilio connected successfully',
    settings: {
      smsEnabled: settings.smsEnabled,
      provider: settings.provider,
      phoneNumber: settings.twilioPhoneNumber,
      healthStatus: settings.healthStatus,
    },
  })
}
