export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/mcp/keys
 *
 * Creates a new MCP API key for the current tenant.
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { name: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }

  const result = await withTenant(tenantSlug, async () => {
    // Ensure mcp_api_keys table exists
    await sql`
      CREATE TABLE IF NOT EXISTS mcp_api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        key_hash VARCHAR(64) NOT NULL,
        key_prefix VARCHAR(12) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ
      )
    `

    // Generate a secure API key
    const keyBytes = crypto.getRandomValues(new Uint8Array(32))
    const key = `cgk_${Buffer.from(keyBytes).toString('base64url')}`
    const keyPrefix = key.slice(0, 12)

    // Hash the key for storage
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(key))
    const keyHash = Buffer.from(hashBuffer).toString('hex')

    // Insert the key
    const insertResult = await sql`
      INSERT INTO mcp_api_keys (name, key_hash, key_prefix)
      VALUES (${body.name}, ${keyHash}, ${keyPrefix})
      RETURNING id, name, key_prefix as prefix, created_at as "createdAt"
    `

    const row = insertResult.rows[0]
    if (!row) {
      throw new Error('Failed to insert API key')
    }

    return {
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      createdAt: row.createdAt,
      key, // Return the full key only on creation
    }
  })

  return NextResponse.json(result)
}
