export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withTenant, sql, createTenantCache } from '@cgk/db'
import {
  deserializeOAuthState,
  validateOAuthState,
  exchangeCodeForTokens,
  processOAuthResponse,
} from '@cgk/slack'

/**
 * GET /api/slack/oauth/callback
 * Handles Slack OAuth callback
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  // Handle user denial or errors
  if (error) {
    const redirectUrl = new URL('/admin/settings/integrations', url.origin)
    redirectUrl.searchParams.set('slack_error', error)
    return NextResponse.redirect(redirectUrl)
  }

  if (!code || !state) {
    const redirectUrl = new URL('/admin/settings/integrations', url.origin)
    redirectUrl.searchParams.set('slack_error', 'missing_params')
    return NextResponse.redirect(redirectUrl)
  }

  // Deserialize and validate state
  const oauthState = deserializeOAuthState(state)
  if (!validateOAuthState(oauthState)) {
    const redirectUrl = new URL('/admin/settings/integrations', url.origin)
    redirectUrl.searchParams.set('slack_error', 'invalid_state')
    return NextResponse.redirect(redirectUrl)
  }

  const { tenantId, userId, nonce } = oauthState

  // Verify state exists in cache (CSRF protection)
  const cache = createTenantCache(tenantId)
  const storedState = await cache.get(`slack:oauth:${nonce}`)
  if (!storedState) {
    const redirectUrl = new URL('/admin/settings/integrations', url.origin)
    redirectUrl.searchParams.set('slack_error', 'expired_state')
    return NextResponse.redirect(redirectUrl)
  }

  // Clear the state from cache
  await cache.delete(`slack:oauth:${nonce}`)

  try {
    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForTokens(code)

    if (!tokenResponse.ok) {
      const redirectUrl = new URL('/admin/settings/integrations', url.origin)
      redirectUrl.searchParams.set('slack_error', tokenResponse.error ?? 'token_exchange_failed')
      return NextResponse.redirect(redirectUrl)
    }

    // Process and encrypt tokens
    const processed = processOAuthResponse(tokenResponse)
    if (!processed) {
      const redirectUrl = new URL('/admin/settings/integrations', url.origin)
      redirectUrl.searchParams.set('slack_error', 'token_processing_failed')
      return NextResponse.redirect(redirectUrl)
    }

    // Save to database
    await withTenant(tenantId, async () => {
      await sql`
        INSERT INTO tenant_slack_workspaces (
          tenant_id,
          workspace_id,
          workspace_name,
          bot_token_encrypted,
          user_token_encrypted,
          connected_by_user_id,
          connected_by_slack_user_id,
          bot_scopes,
          user_scopes,
          is_active,
          last_verified_at
        ) VALUES (
          ${tenantId},
          ${processed.workspaceId},
          ${processed.workspaceName},
          ${processed.botTokenEncrypted},
          ${processed.userTokenEncrypted},
          ${userId},
          ${processed.connectedBySlackUserId},
          ${processed.botScopes},
          ${processed.userScopes},
          true,
          NOW()
        )
        ON CONFLICT (tenant_id) DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          workspace_name = EXCLUDED.workspace_name,
          bot_token_encrypted = EXCLUDED.bot_token_encrypted,
          user_token_encrypted = EXCLUDED.user_token_encrypted,
          connected_by_user_id = EXCLUDED.connected_by_user_id,
          connected_by_slack_user_id = EXCLUDED.connected_by_slack_user_id,
          bot_scopes = EXCLUDED.bot_scopes,
          user_scopes = EXCLUDED.user_scopes,
          is_active = true,
          last_verified_at = NOW(),
          updated_at = NOW()
      `
    })

    // Invalidate cache
    await cache.delete('slack:workspace')

    // Redirect back to integrations page with success
    const redirectUrl = new URL('/admin/settings/integrations', url.origin)
    redirectUrl.searchParams.set('slack_connected', 'true')
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Slack OAuth callback error:', error)
    const redirectUrl = new URL('/admin/settings/integrations', url.origin)
    redirectUrl.searchParams.set('slack_error', 'connection_failed')
    return NextResponse.redirect(redirectUrl)
  }
}
