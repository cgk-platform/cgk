export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { withTenant, sql, createTenantCache } from '@cgk/db'
import {
  getTenantWorkspace,
  invalidateSlackCache,
  decryptToken,
  revokeToken,
} from '@cgk/slack'

/**
 * DELETE /api/admin/integrations/slack/disconnect
 * Disconnects Slack workspace from tenant
 */
export async function DELETE() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    // Get current workspace to revoke tokens
    const workspace = await getTenantWorkspace(tenantSlug)

    if (workspace) {
      // Attempt to revoke tokens (best effort)
      try {
        const botToken = decryptToken(workspace.botTokenEncrypted)
        await revokeToken(botToken)

        if (workspace.userTokenEncrypted) {
          const userToken = decryptToken(workspace.userTokenEncrypted)
          await revokeToken(userToken)
        }
      } catch {
        // Token revocation failure is not critical
      }
    }

    // Mark workspace as inactive (preserve data for audit)
    await withTenant(tenantSlug, async () => {
      await sql`
        UPDATE tenant_slack_workspaces
        SET is_active = false, updated_at = NOW()
        WHERE is_active = true
      `

      // Pause all scheduled reports (don't delete)
      await sql`
        UPDATE tenant_slack_reports
        SET is_enabled = false, updated_at = NOW()
        WHERE is_enabled = true
      `
    })

    // Invalidate cache
    await invalidateSlackCache(tenantSlug)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to disconnect Slack:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Slack' },
      { status: 500 },
    )
  }
}
