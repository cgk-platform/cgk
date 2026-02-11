export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getCommunicationSettings,
  getNotificationSettings,
  updateCommunicationSettings,
  updateNotificationSettings,
} from '@/lib/creator-communications/db'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const [notificationSettings, globalSettings] = await Promise.all([
    getNotificationSettings(tenantSlug),
    getCommunicationSettings(tenantSlug),
  ])

  return NextResponse.json({
    notifications: notificationSettings,
    global: globalSettings,
  })
}

export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()
  const { notifications, global } = body

  if (notifications && Array.isArray(notifications)) {
    await updateNotificationSettings(tenantSlug, notifications)
  }

  if (global) {
    await updateCommunicationSettings(tenantSlug, global)
  }

  const [notificationSettings, globalSettings] = await Promise.all([
    getNotificationSettings(tenantSlug),
    getCommunicationSettings(tenantSlug),
  ])

  return NextResponse.json({
    success: true,
    notifications: notificationSettings,
    global: globalSettings,
  })
}
