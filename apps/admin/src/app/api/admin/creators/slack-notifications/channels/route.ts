export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getTenantWorkspace, SlackClient } from '@cgk-platform/slack'

import type { SlackChannel } from '@/lib/creators/lifecycle-types'

/**
 * GET /api/admin/creators/slack-notifications/channels
 * Returns available Slack channels for the tenant's connected workspace
 *
 * Fetches from Slack API using tenant's workspace credentials.
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    // Get tenant's Slack workspace configuration
    const workspace = await getTenantWorkspace(tenantId)

    if (!workspace) {
      return NextResponse.json({
        channels: [],
        error: 'Slack workspace not connected. Connect your Slack workspace in Settings > Integrations.',
      })
    }

    // Create Slack client from encrypted tokens
    const client = SlackClient.fromEncryptedTokens(
      workspace.botTokenEncrypted,
      workspace.userTokenEncrypted
    )

    // Fetch channels from Slack API
    const slackChannels = await client.listChannels()

    // Transform to expected format
    const channels: SlackChannel[] = slackChannels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      isPrivate: ch.isPrivate,
    }))

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('[slack-notifications/channels] GET error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Handle specific Slack errors
    if (errorMessage.includes('token_revoked') || errorMessage.includes('invalid_auth')) {
      return NextResponse.json({
        channels: [],
        error: 'Slack connection expired. Please reconnect your workspace in Settings > Integrations.',
      })
    }

    return NextResponse.json({
      channels: [],
      error: 'Failed to fetch channels from Slack',
    })
  }
}
