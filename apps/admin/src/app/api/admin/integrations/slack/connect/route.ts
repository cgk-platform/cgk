export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  generateOAuthState,
  serializeOAuthState,
  buildAuthorizationUrl,
} from '@cgk/slack'
import { createTenantCache } from '@cgk/db'

const OAUTH_STATE_TTL = 600 // 10 minutes

/**
 * POST /api/admin/integrations/slack/connect
 * Initiates Slack OAuth flow
 */
export async function POST(_request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
  }

  try {
    // Generate OAuth state with CSRF protection
    const state = generateOAuthState(tenantSlug, userId)
    const serializedState = serializeOAuthState(state)

    // Store state in Redis for validation during callback
    const cache = createTenantCache(tenantSlug)
    await cache.set(`slack:oauth:${state.nonce}`, state, { ttl: OAUTH_STATE_TTL })

    // Build authorization URL
    const authUrl = buildAuthorizationUrl(serializedState)

    return NextResponse.json({
      authUrl,
      state: serializedState,
    })
  } catch (error) {
    console.error('Failed to initiate Slack OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Slack connection' },
      { status: 500 },
    )
  }
}
