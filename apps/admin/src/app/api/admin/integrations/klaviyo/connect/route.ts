import { getTenantContext } from '@cgk/auth'
import { connectKlaviyo } from '@cgk/integrations'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/integrations/klaviyo/connect
 * Connect Klaviyo with API key
 */
export async function POST(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body = await req.json()

    if (!body.privateApiKey) {
      return Response.json({ error: 'Private API key is required' }, { status: 400 })
    }

    const result = await connectKlaviyo({
      tenantId,
      privateApiKey: body.privateApiKey,
      publicApiKey: body.publicApiKey,
    })

    return Response.json(result)
  } catch (error) {
    console.error('Failed to connect Klaviyo:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to connect' },
      { status: 500 }
    )
  }
}
