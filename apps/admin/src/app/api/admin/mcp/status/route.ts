export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/mcp/status
 *
 * Returns MCP server status for the current tenant.
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

  const result = await withTenant(tenantSlug, async () => {
    // Check if mcp_api_keys table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'mcp_api_keys'
      ) as exists
    `

    if (!tableCheck.rows[0]?.exists) {
      return {
        connected: false,
        apiKeys: [],
        serverUrl: `${appUrl}/api/mcp`,
      }
    }

    // Fetch API keys
    const keysResult = await sql`
      SELECT
        id,
        name,
        key_prefix as prefix,
        created_at as "createdAt",
        last_used_at as "lastUsedAt",
        expires_at as "expiresAt"
      FROM mcp_api_keys
      WHERE revoked_at IS NULL
      ORDER BY created_at DESC
    `

    return {
      connected: keysResult.rows.length > 0,
      apiKeys: keysResult.rows,
      serverUrl: `${appUrl}/api/mcp`,
    }
  })

  return NextResponse.json(result)
}
