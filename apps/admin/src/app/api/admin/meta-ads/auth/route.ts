export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

const META_SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'pages_read_engagement',
].join(',')

/**
 * GET /api/admin/meta-ads/auth
 *
 * Initiates Meta OAuth flow.
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const metaAppId = process.env.META_APP_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (!appUrl) {
    return NextResponse.json({ error: 'APP_URL not configured' }, { status: 500 })
  }

  if (!metaAppId) {
    return NextResponse.json(
      { error: 'Meta app not configured' },
      { status: 500 }
    )
  }

  // Generate state for CSRF protection
  const state = Buffer.from(
    JSON.stringify({
      tenantSlug,
      nonce: crypto.randomUUID(),
      timestamp: Date.now(),
    })
  ).toString('base64url')

  // Build Meta OAuth URL
  const redirectUri = `${appUrl}/api/admin/meta-ads/callback`
  const metaAuthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  metaAuthUrl.searchParams.set('client_id', metaAppId)
  metaAuthUrl.searchParams.set('redirect_uri', redirectUri)
  metaAuthUrl.searchParams.set('state', state)
  metaAuthUrl.searchParams.set('scope', META_SCOPES)
  metaAuthUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(metaAuthUrl.toString())
}
