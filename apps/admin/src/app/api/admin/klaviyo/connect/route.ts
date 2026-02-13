export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/klaviyo/connect
 *
 * Connects Klaviyo integration.
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    privateKey: string
    publicKey?: string
    smsListId?: string
    emailListId?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.privateKey) {
    return NextResponse.json({ error: 'Private key required' }, { status: 400 })
  }

  // Verify the API key first
  try {
    const response = await fetch('https://a.klaviyo.com/api/accounts/', {
      headers: {
        Authorization: `Klaviyo-API-Key ${body.privateKey}`,
        revision: '2024-02-15',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 400 })
    }

    const data = await response.json()
    const companyName = data.data?.[0]?.attributes?.contact_information?.organization_name || 'Unknown'

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

      // Upsert Klaviyo credentials
      await sql`
        INSERT INTO integration_credentials (
          integration_type,
          credentials,
          status,
          connected_at,
          metadata
        ) VALUES (
          'klaviyo',
          ${JSON.stringify({
            privateKey: body.privateKey, // In production, encrypt this!
            publicKey: body.publicKey,
          })},
          'active',
          NOW(),
          ${JSON.stringify({
            companyName,
            smsListId: body.smsListId,
            emailListId: body.emailListId,
          })}
        )
        ON CONFLICT (integration_type)
        DO UPDATE SET
          credentials = EXCLUDED.credentials,
          status = 'active',
          connected_at = NOW(),
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `
    })

    return NextResponse.json({ success: true, companyName })
  } catch {
    return NextResponse.json({ error: 'Failed to connect' }, { status: 500 })
  }
}
