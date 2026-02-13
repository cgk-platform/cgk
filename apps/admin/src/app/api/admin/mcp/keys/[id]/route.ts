export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * DELETE /api/admin/mcp/keys/:id
 *
 * Revokes an MCP API key.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE mcp_api_keys
      SET revoked_at = NOW()
      WHERE id = ${id}
    `
  })

  return NextResponse.json({ success: true })
}
