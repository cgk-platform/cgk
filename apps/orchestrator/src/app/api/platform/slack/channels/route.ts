export const dynamic = 'force-dynamic'

import {
  getPlatformWorkspace,
  updatePlatformChannels,
} from '@cgk-platform/slack'
import { NextResponse } from 'next/server'

/**
 * GET /api/platform/slack/channels
 * Gets configured channels for platform alerts
 */
export async function GET() {
  try {
    const workspace = await getPlatformWorkspace()

    if (!workspace) {
      return NextResponse.json({ error: 'Slack not connected' }, { status: 400 })
    }

    return NextResponse.json({
      channelCritical: workspace.channelCritical,
      channelErrors: workspace.channelErrors,
      channelWarnings: workspace.channelWarnings,
      channelInfo: workspace.channelInfo,
      channelDeployments: workspace.channelDeployments,
      mentionCritical: workspace.mentionCritical,
      mentionErrors: workspace.mentionErrors,
    })
  } catch (error) {
    console.error('Failed to get platform Slack channels:', error)
    return NextResponse.json(
      { error: 'Failed to get channels' },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/platform/slack/channels
 * Updates channel configuration for platform alerts
 */
export async function PUT(request: Request) {
  let body: {
    channelCritical?: string
    channelErrors?: string
    channelWarnings?: string
    channelInfo?: string
    channelDeployments?: string
    mentionCritical?: string
    mentionErrors?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const workspace = await updatePlatformChannels(body)

    if (!workspace) {
      return NextResponse.json({ error: 'Slack not connected' }, { status: 400 })
    }

    return NextResponse.json({
      channelCritical: workspace.channelCritical,
      channelErrors: workspace.channelErrors,
      channelWarnings: workspace.channelWarnings,
      channelInfo: workspace.channelInfo,
      channelDeployments: workspace.channelDeployments,
      mentionCritical: workspace.mentionCritical,
      mentionErrors: workspace.mentionErrors,
    })
  } catch (error) {
    console.error('Failed to update platform Slack channels:', error)
    return NextResponse.json(
      { error: 'Failed to update channels' },
      { status: 500 },
    )
  }
}
