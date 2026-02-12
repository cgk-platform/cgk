export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import type { SlackChannel } from '@/lib/creators/lifecycle-types'

/**
 * GET /api/admin/creators/slack-notifications/channels
 * Returns available Slack channels for the tenant's connected workspace
 *
 * In a full implementation, this would:
 * 1. Get the tenant's Slack workspace connection from tenant_slack_workspaces
 * 2. Call Slack API conversations.list to get available channels
 * 3. Return filtered list of channels the bot can post to
 *
 * For now, we return a placeholder response since Slack integration
 * was implemented in PHASE-2CM-SLACK-INTEGRATION
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    // Placeholder channels - in production, this would fetch from Slack API
    // using the tenant's connected workspace credentials
    const channels: SlackChannel[] = [
      { id: 'C00000001', name: 'general', isPrivate: false },
      { id: 'C00000002', name: 'creator-applications', isPrivate: false },
      { id: 'C00000003', name: 'creator-updates', isPrivate: false },
      { id: 'C00000004', name: 'escalations', isPrivate: false },
      { id: 'C00000005', name: 'ugc-content', isPrivate: false },
    ]

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('[slack-notifications/channels] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
  }
}
