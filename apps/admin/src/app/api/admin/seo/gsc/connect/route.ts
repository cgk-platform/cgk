export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getOAuthAuthorizationUrl,
  getGSCConnection,
  disconnectGSC,
} from '@/lib/seo/google-search-console'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Get current connection status
  const connection = await withTenant(tenantSlug, () => getGSCConnection())

  return NextResponse.json({ connection })
}

export async function POST() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Check if GSC client credentials are configured
  if (!process.env.GSC_CLIENT_ID || !process.env.GSC_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Google Search Console is not configured. Contact your administrator.' },
      { status: 500 }
    )
  }

  // Generate state token for OAuth flow (includes tenant for verification)
  const state = Buffer.from(
    JSON.stringify({
      tenantSlug,
      timestamp: Date.now(),
    })
  ).toString('base64')

  // Generate authorization URL
  const authUrl = getOAuthAuthorizationUrl(state)

  return NextResponse.json({ authUrl })
}

export async function DELETE() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  await withTenant(tenantSlug, () => disconnectGSC())

  return NextResponse.json({ success: true })
}
