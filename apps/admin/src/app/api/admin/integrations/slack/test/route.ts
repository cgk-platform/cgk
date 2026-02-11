export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getTenantWorkspace, SlackClient } from '@cgk/slack'

/**
 * POST /api/admin/integrations/slack/test
 * Tests Slack connection
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const workspace = await getTenantWorkspace(tenantSlug)

    if (!workspace) {
      return NextResponse.json({
        success: false,
        botValid: false,
        userValid: false,
        canPostToChannel: false,
        canListChannels: false,
        error: 'Slack not connected',
      })
    }

    const client = SlackClient.fromEncryptedTokens(
      workspace.botTokenEncrypted,
      workspace.userTokenEncrypted,
    )

    // Get optional test channel from request body
    let testChannelId: string | undefined
    try {
      const body = await request.json()
      testChannelId = body.channelId
    } catch {
      // No body provided
    }

    const testResult = await client.testConnection(testChannelId)
    const teamInfo = await client.getTeamInfo()

    return NextResponse.json({
      success: testResult.botValid,
      workspaceName: teamInfo?.name ?? workspace.workspaceName,
      botValid: testResult.botValid,
      userValid: testResult.userValid,
      canPostToChannel: testResult.canPost,
      canListChannels: testResult.canListChannels,
    })
  } catch (error) {
    console.error('Failed to test Slack connection:', error)
    return NextResponse.json(
      {
        success: false,
        botValid: false,
        userValid: false,
        canPostToChannel: false,
        canListChannels: false,
        error: 'Connection test failed',
      },
      { status: 500 },
    )
  }
}
