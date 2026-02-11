export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getSlackConfig } from '@/lib/surveys'

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { surveyId?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const config = await getSlackConfig(tenantSlug, body.surveyId)

  if (!config || !config.webhook_url) {
    return NextResponse.json({ error: 'Slack webhook not configured' }, { status: 400 })
  }

  try {
    const response = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Test notification from CGK Surveys',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: 'Test Survey Notification',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'This is a test notification to verify your Slack integration is working correctly.',
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Sent from *${tenantSlug}* at ${new Date().toISOString()}`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `Slack webhook failed: ${error}` },
        { status: 400 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to send test notification: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 },
    )
  }
}
