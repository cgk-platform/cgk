import { getTenantContext } from '@cgk-platform/auth'
import { disconnectTikTok } from '@cgk-platform/integrations'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/admin/integrations/tiktok/disconnect
 * Disconnect TikTok Ads
 */
export async function DELETE(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    await disconnectTikTok(tenantId)
    return Response.json({ success: true })
  } catch (error) {
    console.error('Failed to disconnect TikTok:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
