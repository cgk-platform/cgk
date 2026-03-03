/**
 * DEBUG ENDPOINT - Remove after fixing
 * Tests what token is actually being fetched from database
 */

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tenantId = '5cb87b13-3b13-4400-9542-53c8b8d12cb8' // meliusly
    const tenantSlug = 'meliusly'

    const result = await withTenant(
      tenantSlug,
      () => sql`
      SELECT
        shop,
        LENGTH(storefront_api_token_encrypted) as token_length,
        SUBSTRING(storefront_api_token_encrypted, 1, 70) as token_preview,
        updated_at
      FROM shopify_connections
      WHERE tenant_id = ${tenantId}
      AND status = 'active'
      LIMIT 1
    `
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No connection found' }, { status: 404 })
    }

    const row = result.rows[0]
    const parts = row.token_preview.split(':').length

    return NextResponse.json({
      shop: row.shop,
      tokenLength: row.token_length,
      tokenParts: parts,
      tokenPreview: row.token_preview,
      updatedAt: row.updated_at,
      encryptionKeySet: !!process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY,
      encryptionKeyLength: process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY?.length || 0,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
