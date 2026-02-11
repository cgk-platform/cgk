import { getTenantContext } from '@cgk/auth'
import { getIntegrationStatus } from '@cgk/integrations'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/integrations/klaviyo/status
 * Get Klaviyo connection status
 */
export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const status = await getIntegrationStatus(tenantId, 'klaviyo')
    return Response.json(status)
  } catch (error) {
    console.error('Failed to get Klaviyo status:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    )
  }
}
