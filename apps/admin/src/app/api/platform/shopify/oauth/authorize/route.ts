export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  initiateOAuth,
  normalizeShopDomain,
  ShopifyError,
} from '@cgk-platform/shopify'

/**
 * GET /api/platform/shopify/oauth/authorize?shop=example.myshopify.com
 * Initiates Shopify OAuth flow for the onboarding wizard.
 * Delegates to the existing Shopify OAuth infrastructure.
 *
 * Query params:
 *   shop - Shopify store domain (e.g., example.myshopify.com)
 *   returnUrl - URL to redirect to after OAuth (optional)
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (!appUrl) {
    return NextResponse.json({ error: 'APP_URL not configured' }, { status: 500 })
  }

  const url = new URL(request.url)
  const shopDomain = url.searchParams.get('shop')

  if (!shopDomain) {
    return NextResponse.json(
      { error: 'Shop domain is required. Add ?shop=your-store.myshopify.com' },
      { status: 400 }
    )
  }

  try {
    const normalizedShop = normalizeShopDomain(shopDomain)
    const redirectUri = `${appUrl}/api/admin/shopify-app/callback`

    const authUrl = await initiateOAuth({
      tenantId: tenantSlug,
      shop: normalizedShop,
      redirectUri,
    })

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('[shopify-oauth] Platform OAuth error:', error)

    if (error instanceof ShopifyError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to initiate Shopify OAuth' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/platform/shopify/oauth/authorize
 * Alternative POST endpoint for initiating OAuth from the onboarding wizard.
 *
 * Body: { shop: string }
 * Returns: { authUrl: string }
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (!appUrl) {
    return NextResponse.json({ error: 'APP_URL not configured' }, { status: 500 })
  }

  let body: { shop?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.shop) {
    return NextResponse.json({ error: 'Shop domain is required' }, { status: 400 })
  }

  try {
    const normalizedShop = normalizeShopDomain(body.shop)
    const redirectUri = `${appUrl}/api/admin/shopify-app/callback`

    const authUrl = await initiateOAuth({
      tenantId: tenantSlug,
      shop: normalizedShop,
      redirectUri,
    })

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('[shopify-oauth] Platform OAuth error:', error)

    if (error instanceof ShopifyError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to initiate Shopify OAuth' },
      { status: 500 }
    )
  }
}
