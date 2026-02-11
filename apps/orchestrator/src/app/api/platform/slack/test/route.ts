export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import {
  testPlatformConnection,
  sendInfoAlert,
} from '@cgk/slack'

/**
 * POST /api/platform/slack/test
 * Tests platform Slack connection and optionally sends test alert
 */
export async function POST(request: Request) {
  let body: {
    sendTestAlert?: boolean
  } = {}

  try {
    body = await request.json()
  } catch {
    // No body provided
  }

  try {
    const result = await testPlatformConnection()

    if (body.sendTestAlert && result.success) {
      // Send a test alert
      await sendInfoAlert(
        'platform',
        'Connection Test Successful',
        'This is a test alert from CGK Platform.',
      )
    }

    return NextResponse.json({
      success: result.success,
      workspaceName: result.workspaceName,
      botValid: result.botValid,
      error: result.error,
    })
  } catch (error) {
    console.error('Failed to test platform Slack connection:', error)
    return NextResponse.json(
      {
        success: false,
        botValid: false,
        error: 'Connection test failed',
      },
      { status: 500 },
    )
  }
}
