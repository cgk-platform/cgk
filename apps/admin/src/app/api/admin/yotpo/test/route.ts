export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/yotpo/test
 *
 * Tests Yotpo API credentials.
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { appKey: string; apiSecret: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.appKey || !body.apiSecret) {
    return NextResponse.json({ error: 'App key and API secret required' }, { status: 400 })
  }

  try {
    // Get OAuth token
    const tokenResponse = await fetch('https://api.yotpo.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: body.appKey,
        client_secret: body.apiSecret,
        grant_type: 'client_credentials',
      }),
    })

    if (!tokenResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials',
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Yotpo',
    })
  }
}
