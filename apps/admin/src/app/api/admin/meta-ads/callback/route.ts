export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/meta-ads/callback
 *
 * Handles Meta OAuth callback.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (!appUrl) {
    return NextResponse.redirect(new URL('/admin/integrations/meta-ads?error=config_missing', 'http://localhost:3001'))
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/admin/integrations/meta-ads?error=missing_params', appUrl)
    )
  }

  // Decode and validate state
  let stateData: { tenantSlug: string; nonce: string; timestamp: number }
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
  } catch {
    return NextResponse.redirect(
      new URL('/admin/integrations/meta-ads?error=invalid_state', appUrl)
    )
  }

  // Check state timestamp (5 minute expiry)
  if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
    return NextResponse.redirect(
      new URL('/admin/integrations/meta-ads?error=state_expired', appUrl)
    )
  }

  const { tenantSlug } = stateData
  const metaAppId = process.env.META_APP_ID
  const metaAppSecret = process.env.META_APP_SECRET

  if (!metaAppId || !metaAppSecret) {
    return NextResponse.redirect(
      new URL('/admin/integrations/meta-ads?error=config_error', appUrl)
    )
  }

  try {
    const redirectUri = `${appUrl}/api/admin/meta-ads/callback`

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', metaAppId)
    tokenUrl.searchParams.set('client_secret', metaAppSecret)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)

    const tokenResponse = await fetch(tokenUrl.toString())

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        new URL('/admin/integrations/meta-ads?error=token_exchange_failed', appUrl)
      )
    }

    const tokenData = await tokenResponse.json()
    const { access_token: accessToken, expires_in: expiresIn } = tokenData

    // Exchange for long-lived token
    const longLivedUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.set('client_id', metaAppId)
    longLivedUrl.searchParams.set('client_secret', metaAppSecret)
    longLivedUrl.searchParams.set('fb_exchange_token', accessToken)

    const longLivedResponse = await fetch(longLivedUrl.toString())
    const longLivedData = await longLivedResponse.json()

    const finalToken = longLivedData.access_token || accessToken
    const finalExpiresIn = longLivedData.expires_in || expiresIn

    // Fetch ad accounts
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency,account_status&access_token=${finalToken}`
    )
    const accountsData = await accountsResponse.json()

    const accounts = (accountsData.data || []).map((account: {
      id: string
      name: string
      currency: string
      account_status: number
    }) => ({
      id: account.id.replace('act_', ''),
      name: account.name,
      currency: account.currency,
      status: account.account_status === 1 ? 'active' : 'inactive',
    }))

    // Store credentials in tenant's schema
    await withTenant(tenantSlug, async () => {
      // Ensure integration_credentials table exists
      await sql`
        CREATE TABLE IF NOT EXISTS integration_credentials (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          integration_type VARCHAR(50) NOT NULL,
          credentials JSONB NOT NULL,
          status VARCHAR(20) DEFAULT 'active',
          connected_at TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ,
          last_synced_at TIMESTAMPTZ,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(integration_type)
        )
      `

      const expiresAt = finalExpiresIn
        ? new Date(Date.now() + finalExpiresIn * 1000).toISOString()
        : null

      // Upsert Meta Ads credentials
      await sql`
        INSERT INTO integration_credentials (
          integration_type,
          credentials,
          status,
          connected_at,
          expires_at,
          metadata
        ) VALUES (
          'meta-ads',
          ${JSON.stringify({
            accessToken: finalToken, // In production, encrypt this!
          })},
          'active',
          NOW(),
          ${expiresAt},
          ${JSON.stringify({
            accounts,
            syncStatus: 'idle',
          })}
        )
        ON CONFLICT (integration_type)
        DO UPDATE SET
          credentials = EXCLUDED.credentials,
          status = 'active',
          connected_at = NOW(),
          expires_at = EXCLUDED.expires_at,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `
    })

    return NextResponse.redirect(
      new URL('/admin/integrations/meta-ads?success=connected', appUrl)
    )
  } catch (error) {
    console.error('Meta OAuth error:', error)
    return NextResponse.redirect(
      new URL('/admin/integrations/meta-ads?error=oauth_failed', appUrl)
    )
  }
}
