export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import {
  generateOAuthState,
  serializeOAuthState,
  buildAuthorizationUrl,
} from '@cgk/slack'

const OAUTH_STATE_TTL = 600 // 10 minutes

/**
 * POST /api/platform/slack/connect
 * Initiates Slack OAuth flow for platform ops workspace
 */
export async function POST(request: Request) {
  // Note: In production, verify super admin auth here
  const userId = 'super-admin' // Would come from auth context

  try {
    // Generate OAuth state
    const state = generateOAuthState('platform', userId)
    const serializedState = serializeOAuthState(state)

    // Store state in Redis (would use global cache for platform)
    // In production: await globalCache.set(`slack:oauth:platform:${state.nonce}`, state)

    // Build authorization URL
    const authUrl = buildAuthorizationUrl(serializedState)

    return NextResponse.json({
      authUrl,
      state: serializedState,
    })
  } catch (error) {
    console.error('Failed to initiate platform Slack OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Slack connection' },
      { status: 500 },
    )
  }
}
