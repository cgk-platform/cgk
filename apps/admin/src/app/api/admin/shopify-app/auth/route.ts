export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  initiateOAuth,
  normalizeShopDomain,
  ShopifyError,
} from '@cgk-platform/shopify'

/**
 * GET /api/admin/shopify-app/auth
 *
 * Initiates Shopify OAuth flow.
 * Redirects user to Shopify for authorization.
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

  // Get shop domain from query
  const url = new URL(request.url)
  const shopDomain = url.searchParams.get('shop')

  if (!shopDomain) {
    // Redirect to a page where user can enter shop domain
    return NextResponse.redirect(
      new URL('/admin/integrations/shopify-app?error=shop_required', appUrl)
    )
  }

  try {
    // Normalize the shop domain
    const normalizedShop = normalizeShopDomain(shopDomain)

    // Build the callback URL
    const redirectUri = `${appUrl}/api/admin/shopify-app/callback`

    // Initiate OAuth flow - stores state in database with encryption
    const authUrl = await initiateOAuth({
      tenantId: tenantSlug,
      shop: normalizedShop,
      redirectUri,
    })

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('[shopify-oauth] Auth initiation error:', error)

    if (error instanceof ShopifyError) {
      return NextResponse.redirect(
        new URL(`/admin/integrations/shopify-app?error=${error.code.toLowerCase()}`, appUrl)
      )
    }

    return NextResponse.redirect(
      new URL('/admin/integrations/shopify-app?error=auth_failed', appUrl)
    )
  }
}

/**
 * POST /api/admin/shopify-app/auth
 *
 * Alternative endpoint for initiating OAuth via POST.
 * Accepts JSON body with shop domain.
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const body = await request.json() as { shop?: string }
    const { shop: shopDomain } = body

    if (!shopDomain) {
      return NextResponse.json({ error: 'Shop domain required' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
    if (!appUrl) {
      return NextResponse.json({ error: 'APP_URL not configured' }, { status: 500 })
    }
    const normalizedShop = normalizeShopDomain(shopDomain)
    const redirectUri = `${appUrl}/api/admin/shopify-app/callback`

    const authUrl = await initiateOAuth({
      tenantId: tenantSlug,
      shop: normalizedShop,
      redirectUri,
    })

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('[shopify-oauth] Auth initiation error:', error)

    if (error instanceof ShopifyError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    )
  }
}
