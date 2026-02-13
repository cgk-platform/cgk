export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createTenantCache } from '@cgk-platform/db'
import { getTenantWorkspace, SlackClient, type SlackChannel } from '@cgk-platform/slack'

const CHANNEL_CACHE_TTL = 300 // 5 minutes

/**
 * GET /api/admin/notifications/slack/channels
 * Lists all accessible Slack channels
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    // Check cache first
    const cache = createTenantCache(tenantSlug)
    const cached = await cache.get<SlackChannel[]>('slack:channels')
    if (cached) {
      return NextResponse.json({ channels: cached })
    }

    const workspace = await getTenantWorkspace(tenantSlug)

    if (!workspace) {
      return NextResponse.json({ error: 'Slack not connected' }, { status: 400 })
    }

    const client = SlackClient.fromEncryptedTokens(
      workspace.botTokenEncrypted,
      workspace.userTokenEncrypted,
    )

    const channels = await client.getAllChannels()

    // Cache the results
    await cache.set('slack:channels', channels, { ttl: CHANNEL_CACHE_TTL })

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('Failed to list Slack channels:', error)
    return NextResponse.json(
      { error: 'Failed to list channels' },
      { status: 500 },
    )
  }
}
