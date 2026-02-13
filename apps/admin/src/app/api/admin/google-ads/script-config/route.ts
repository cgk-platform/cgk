export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/google-ads/script-config
 *
 * Configures Google Ads in script mode.
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { customerId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.customerId) {
    return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
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

    // Upsert Google Ads credentials
    await sql`
      INSERT INTO integration_credentials (
        integration_type,
        credentials,
        status,
        connected_at,
        metadata
      ) VALUES (
        'google-ads',
        '{}'::jsonb,
        'active',
        NOW(),
        ${JSON.stringify({
          mode: 'script',
          customerId: body.customerId.replace(/-/g, ''),
        })}
      )
      ON CONFLICT (integration_type)
      DO UPDATE SET
        status = 'active',
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `
  })

  return NextResponse.json({ success: true })
}
