export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getSmsSettings,
  hasValidTwilioConfig,
  markSmsSetupCompleted,
  updateSmsSettings,
} from '@cgk/communications'

/**
 * GET /api/admin/sms/setup
 * Get SMS setup status
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const settings = await getSmsSettings(tenantSlug)

  const setupStatus = {
    smsEnabled: settings.smsEnabled,
    credentialsConfigured: hasValidTwilioConfig(settings),
    credentialsVerified: settings.healthStatus === 'healthy',
    complianceAcknowledged: settings.setupCompletedAt !== null,
    setupCompleted: settings.setupCompletedAt !== null,
    steps: [
      {
        id: 'enable_sms',
        title: 'Enable SMS',
        description: 'Turn on SMS notifications for your store',
        completed: settings.smsEnabled,
      },
      {
        id: 'twilio_credentials',
        title: 'Twilio Configuration',
        description: 'Configure your Twilio account credentials',
        completed: hasValidTwilioConfig(settings),
      },
      {
        id: 'verify_twilio',
        title: 'Verify Configuration',
        description: 'Verify your Twilio setup works correctly',
        completed: settings.healthStatus === 'healthy',
      },
      {
        id: 'compliance_info',
        title: 'Compliance Information',
        description: 'Acknowledge TCPA compliance requirements',
        completed: settings.setupCompletedAt !== null,
      },
    ],
  }

  return NextResponse.json({ setupStatus })
}

/**
 * POST /api/admin/sms/setup
 * Configure SMS setup (Twilio credentials)
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()
  const { accountSid, authToken, phoneNumber, messagingServiceSid } = body

  if (!accountSid || !authToken || !phoneNumber) {
    return NextResponse.json(
      { error: 'Account SID, Auth Token, and Phone Number are required' },
      { status: 400 }
    )
  }

  // Update settings with credentials
  await updateSmsSettings(tenantSlug, {
    smsEnabled: true,
    provider: 'twilio',
    twilioAccountSid: accountSid,
    twilioAuthToken: authToken,
    twilioPhoneNumber: phoneNumber,
    twilioMessagingServiceSid: messagingServiceSid || null,
  })

  return NextResponse.json({
    success: true,
    message: 'Twilio credentials saved. Please verify the configuration.',
  })
}

/**
 * PUT /api/admin/sms/setup
 * Complete SMS setup
 */
export async function PUT() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const settings = await getSmsSettings(tenantSlug)

  // Check prerequisites
  if (!settings.smsEnabled) {
    return NextResponse.json({ error: 'SMS must be enabled first' }, { status: 400 })
  }

  if (!hasValidTwilioConfig(settings)) {
    return NextResponse.json(
      { error: 'Twilio credentials must be configured first' },
      { status: 400 }
    )
  }

  if (settings.healthStatus !== 'healthy') {
    return NextResponse.json(
      { error: 'Twilio configuration must be verified first' },
      { status: 400 }
    )
  }

  await markSmsSetupCompleted(tenantSlug)

  return NextResponse.json({
    success: true,
    message: 'SMS setup completed successfully',
  })
}
