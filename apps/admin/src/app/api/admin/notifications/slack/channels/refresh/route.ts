export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createTenantCache } from '@cgk-platform/db'
import { getTenantWorkspace, SlackClient } from '@cgk-platform/slack'

const CHANNEL_CACHE_TTL = 300 // 5 minutes

/**
 * POST /api/admin/notifications/slack/channels/refresh
 * Refreshes the Slack channel list (bypasses cache)
 */
export async function POST() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const workspace = await getTenantWorkspace(tenantSlug)

    if (!workspace) {
      return NextResponse.json({ error: 'Slack not connected' }, { status: 400 })
    }

    const client = SlackClient.fromEncryptedTokens(
      workspace.botTokenEncrypted,
      workspace.userTokenEncrypted,
    )

    const channels = await client.getAllChannels()

    // Update cache
    const cache = createTenantCache(tenantSlug)
    await cache.set('slack:channels', channels, { ttl: CHANNEL_CACHE_TTL })

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('Failed to refresh Slack channels:', error)
    return NextResponse.json(
      { error: 'Failed to refresh channels' },
      { status: 500 },
    )
  }
}
