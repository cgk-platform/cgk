export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

import {
  handleOAuthCallback,
  registerWebhooks,
  ShopifyError,
} from '@cgk-platform/shopify'

/**
 * GET /api/admin/shopify-app/callback
 *
 * Handles Shopify OAuth callback.
 * Exchanges authorization code for access token,
 * encrypts and stores credentials, and registers webhooks.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

  // Extract OAuth parameters
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const shop = url.searchParams.get('shop')
  const hmac = url.searchParams.get('hmac')
  const timestamp = url.searchParams.get('timestamp')
  const host = url.searchParams.get('host')

  // Validate required parameters
  if (!code || !state || !shop || !hmac || !timestamp) {
    console.error('[shopify-oauth] Missing callback parameters')
    return NextResponse.redirect(
      new URL('/admin/integrations/shopify-app?error=missing_params', appUrl)
    )
  }

  try {
    // Handle OAuth callback - verifies HMAC, exchanges code, stores encrypted token
    const { tenantId, shop: connectedShop } = await handleOAuthCallback({
      shop,
      code,
      state,
      hmac,
      timestamp,
      host: host || undefined,
    })

    console.log(`[shopify-oauth] Successfully connected shop ${connectedShop} for tenant ${tenantId}`)

    // Register webhooks for the connected shop
    const webhookBaseUrl = process.env.SHOPIFY_WEBHOOK_BASE_URL || appUrl

    try {
      const { registered, errors } = await registerWebhooks(
        tenantId,
        connectedShop,
        webhookBaseUrl
      )

      console.log(`[shopify-oauth] Registered ${registered.length} webhooks`)
      if (errors.length > 0) {
        console.warn('[shopify-oauth] Webhook registration errors:', errors)
      }
    } catch (webhookError) {
      // Log but don't fail the OAuth flow
      console.error('[shopify-oauth] Webhook registration failed:', webhookError)
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/admin/integrations/shopify-app?success=connected', appUrl)
    )
  } catch (error) {
    console.error('[shopify-oauth] Callback error:', error)

    if (error instanceof ShopifyError) {
      return NextResponse.redirect(
        new URL(`/admin/integrations/shopify-app?error=${error.code.toLowerCase()}`, appUrl)
      )
    }

    return NextResponse.redirect(
      new URL('/admin/integrations/shopify-app?error=oauth_failed', appUrl)
    )
  }
}
