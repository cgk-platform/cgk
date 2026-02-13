import { getTenantContext } from '@cgk-platform/auth'
import { getIntegrationStatus } from '@cgk-platform/integrations'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/integrations/meta/status
 * Get Meta Ads connection status
 */
export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const status = await getIntegrationStatus(tenantId, 'meta')
    return Response.json(status)
  } catch (error) {
    console.error('Failed to get Meta status:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    )
  }
}
