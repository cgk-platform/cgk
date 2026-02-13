export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/yotpo/connect
 *
 * Connects Yotpo integration.
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

  // Verify credentials first
  try {
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
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 })
    }

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

      // Upsert Yotpo credentials
      await sql`
        INSERT INTO integration_credentials (
          integration_type,
          credentials,
          status,
          connected_at,
          metadata
        ) VALUES (
          'yotpo',
          ${JSON.stringify({
            appKey: body.appKey,
            apiSecret: body.apiSecret, // In production, encrypt this!
          })},
          'active',
          NOW(),
          '{}'::jsonb
        )
        ON CONFLICT (integration_type)
        DO UPDATE SET
          credentials = EXCLUDED.credentials,
          status = 'active',
          connected_at = NOW(),
          updated_at = NOW()
      `
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to connect' }, { status: 500 })
  }
}
