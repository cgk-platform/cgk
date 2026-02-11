export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getNotificationSettings, saveNotificationSettings, getIntegrationStatus } from '@/lib/bri/db'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const [settings, integrations] = await Promise.all([
    getNotificationSettings(tenantSlug),
    getIntegrationStatus(tenantSlug),
  ])

  return NextResponse.json({
    settings,
    channelStatus: {
      slack: integrations.slack.connected,
      sms: integrations.sms.configured,
      email: integrations.email.configured,
    },
  })
}

export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()

  await saveNotificationSettings(tenantSlug, body)

  return NextResponse.json({ success: true })
}
