import { getTenantContext } from '@cgk/auth'
import { getTikTokConnection, selectTikTokAdvertiser } from '@cgk/integrations'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/integrations/tiktok/advertisers/[id]
 * Select a TikTok advertiser account
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { id: advertiserId } = await params

  try {
    const connection = await getTikTokConnection(tenantId)

    if (!connection) {
      return Response.json({ error: 'No TikTok connection found' }, { status: 404 })
    }

    // Verify advertiser ID exists
    if (!connection.advertiserIds.includes(advertiserId)) {
      return Response.json({ error: 'Advertiser ID not found' }, { status: 404 })
    }

    // Get advertiser name from request body or use ID
    const body = await req.json().catch(() => ({}))
    const advertiserName = body.advertiserName || `Advertiser ${advertiserId}`

    await selectTikTokAdvertiser(tenantId, advertiserId, advertiserName)

    return Response.json({ success: true, advertiserId, advertiserName })
  } catch (error) {
    console.error('Failed to select TikTok advertiser:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to select advertiser' },
      { status: 500 }
    )
  }
}
