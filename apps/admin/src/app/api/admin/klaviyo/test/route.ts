export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/klaviyo/test
 *
 * Tests Klaviyo API key connection.
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { privateKey: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.privateKey) {
    return NextResponse.json({ error: 'Private key required' }, { status: 400 })
  }

  try {
    // Test the API key by fetching account info
    const response = await fetch('https://a.klaviyo.com/api/accounts/', {
      headers: {
        Authorization: `Klaviyo-API-Key ${body.privateKey}`,
        revision: '2024-02-15',
      },
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key or insufficient permissions',
      })
    }

    const data = await response.json()
    const companyName = data.data?.[0]?.attributes?.contact_information?.organization_name || 'Unknown'

    return NextResponse.json({
      success: true,
      companyName,
    })
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Klaviyo',
    })
  }
}
