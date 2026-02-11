import { getTenantContext } from '@cgk/auth'
import { startMetaOAuth } from '@cgk/integrations'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/integrations/meta/oauth
 * Start Meta Ads OAuth flow
 */
export async function POST(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const returnUrl = body.returnUrl || '/admin/settings/integrations'

    const { authUrl, state } = await startMetaOAuth({
      tenantId,
      returnUrl,
    })

    return Response.json({ authUrl, state })
  } catch (error) {
    console.error('Failed to start Meta OAuth:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'OAuth initiation failed' },
      { status: 500 }
    )
  }
}
