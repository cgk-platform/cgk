export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { sql, withTenant } from '@cgk-platform/db'
import {
  getSmsSettings,
  updateSmsSettings,
  hasValidTwilioConfig,
} from '@cgk-platform/communications'

interface BriSmsConfig {
  enabled: boolean
  provider: 'twilio' | 'none'
  phoneNumber: string | null
  messagingServiceSid: string | null
  healthStatus: string
  configuredAt: string | null
}

/**
 * GET /api/admin/bri/integrations/sms
 * Get SMS integration config for BRI
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Check BRI settings for SMS outreach flag
  const briSettingsResult = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT enable_sms_outreach as "enableSmsOutreach"
      FROM bri_settings
      LIMIT 1
    `
  })

  const briSettings = briSettingsResult.rows[0] as { enableSmsOutreach?: boolean } | undefined

  // Get SMS settings from communications package
  const smsSettings = await getSmsSettings(tenantSlug)
  const isConfigured = hasValidTwilioConfig(smsSettings)

  const config: BriSmsConfig = {
    enabled: briSettings?.enableSmsOutreach ?? false,
    provider: isConfigured ? 'twilio' : 'none',
    phoneNumber: smsSettings.twilioPhoneNumber,
    messagingServiceSid: smsSettings.twilioMessagingServiceSid,
    healthStatus: smsSettings.healthStatus,
    configuredAt: smsSettings.setupCompletedAt?.toISOString() ?? null,
  }

  return NextResponse.json({ config })
}

/**
 * POST /api/admin/bri/integrations/sms
 * Save SMS integration config for BRI
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    enabled?: boolean
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

  const { enabled, accountSid, authToken, phoneNumber, messagingServiceSid } = body

  // Update BRI settings to enable/disable SMS outreach
  if (typeof enabled === 'boolean') {
    await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE bri_settings
        SET enable_sms_outreach = ${enabled}, updated_at = NOW()
        WHERE id = (SELECT id FROM bri_settings LIMIT 1)
      `
    })
  }

  // If Twilio credentials provided, save them
  if (accountSid && authToken && phoneNumber) {
    await updateSmsSettings(tenantSlug, {
      smsEnabled: true,
      provider: 'twilio',
      twilioAccountSid: accountSid,
      twilioAuthToken: authToken,
      twilioPhoneNumber: phoneNumber,
      twilioMessagingServiceSid: messagingServiceSid || undefined,
    })
  }

  // Get updated settings
  const smsSettings = await getSmsSettings(tenantSlug)
  const isConfigured = hasValidTwilioConfig(smsSettings)

  const config: BriSmsConfig = {
    enabled: enabled ?? false,
    provider: isConfigured ? 'twilio' : 'none',
    phoneNumber: smsSettings.twilioPhoneNumber,
    messagingServiceSid: smsSettings.twilioMessagingServiceSid,
    healthStatus: smsSettings.healthStatus,
    configuredAt: smsSettings.setupCompletedAt?.toISOString() ?? null,
  }

  return NextResponse.json({
    success: true,
    message: 'SMS integration config saved',
    config,
  })
}
