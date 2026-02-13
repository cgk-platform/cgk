export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getSmsSettings, updateSmsSettings } from '@cgk-platform/communications'

/**
 * GET /api/admin/sms/settings
 * Get SMS settings for the tenant
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const settings = await getSmsSettings(tenantSlug)

  // Mask sensitive credentials
  const maskedSettings = {
    ...settings,
    twilioAuthToken: settings.twilioAuthToken ? '********' : null,
    twilioAccountSid: settings.twilioAccountSid
      ? `${settings.twilioAccountSid.slice(0, 8)}...${settings.twilioAccountSid.slice(-4)}`
      : null,
  }

  return NextResponse.json({ settings: maskedSettings })
}

/**
 * PATCH /api/admin/sms/settings
 * Update SMS settings
 */
export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()

  // Validate input
  const allowedFields = [
    'smsEnabled',
    'provider',
    'twilioAccountSid',
    'twilioAuthToken',
    'twilioPhoneNumber',
    'twilioMessagingServiceSid',
    'a2p10dlcRegistered',
    'tollFreeVerified',
    'quietHoursEnabled',
    'quietHoursStart',
    'quietHoursEnd',
    'quietHoursTimezone',
    'messagesPerSecond',
    'dailyLimit',
  ]

  const input: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      input[field] = body[field]
    }
  }

  if (Object.keys(input).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const settings = await updateSmsSettings(tenantSlug, input)

  // Mask sensitive credentials in response
  const maskedSettings = {
    ...settings,
    twilioAuthToken: settings.twilioAuthToken ? '********' : null,
    twilioAccountSid: settings.twilioAccountSid
      ? `${settings.twilioAccountSid.slice(0, 8)}...${settings.twilioAccountSid.slice(-4)}`
      : null,
  }

  return NextResponse.json({ settings: maskedSettings })
}
