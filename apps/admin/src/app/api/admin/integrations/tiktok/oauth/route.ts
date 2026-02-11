import { getTenantContext } from '@cgk/auth'
import { startTikTokOAuth } from '@cgk/integrations'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/integrations/tiktok/oauth
 * Start TikTok Ads OAuth flow
 */
export async function POST(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const returnUrl = body.returnUrl || '/admin/settings/integrations'

    const { authUrl, state } = await startTikTokOAuth({
      tenantId,
      returnUrl,
    })

    return Response.json({ authUrl, state })
  } catch (error) {
    console.error('Failed to start TikTok OAuth:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'OAuth initiation failed' },
      { status: 500 }
    )
  }
}
