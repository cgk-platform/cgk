import { getTenantContext } from '@cgk/auth'
import { getTikTokConnection } from '@cgk/integrations'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/integrations/tiktok/advertisers
 * List available TikTok advertiser accounts
 */
export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const connection = await getTikTokConnection(tenantId)

    if (!connection) {
      return Response.json({ error: 'No TikTok connection found' }, { status: 404 })
    }

    return Response.json({
      advertiserIds: connection.advertiserIds,
      selectedId: connection.selectedAdvertiserId,
      selectedName: connection.selectedAdvertiserName,
    })
  } catch (error) {
    console.error('Failed to get TikTok advertisers:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to get advertisers' },
      { status: 500 }
    )
  }
}
