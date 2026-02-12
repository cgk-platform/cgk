export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getSlackNotificationConfig,
  saveSlackNotificationConfig,
} from '@/lib/creators/lifecycle-db'
import type { CreatorSlackNotificationConfig } from '@/lib/creators/lifecycle-types'

/**
 * GET /api/admin/creators/slack-notifications
 * Returns the Slack notification configuration for all creator events
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const config = await getSlackNotificationConfig(tenantSlug)
    return NextResponse.json({ config })
  } catch (error) {
    console.error('[slack-notifications] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/creators/slack-notifications
 * Updates the Slack notification configuration
 */
export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { config?: CreatorSlackNotificationConfig[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.config || !Array.isArray(body.config)) {
    return NextResponse.json({ error: 'config array is required' }, { status: 400 })
  }

  try {
    await saveSlackNotificationConfig(tenantSlug, body.config)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[slack-notifications] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
  }
}
