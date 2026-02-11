import { getTenantContext } from '@cgk/auth'
import { getAllIntegrationStatuses } from '@cgk/integrations'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/integrations
 * Get status of all integrations
 */
export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const statuses = await getAllIntegrationStatuses(tenantId)
    return Response.json({ integrations: statuses })
  } catch (error) {
    console.error('Failed to get integration statuses:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to get statuses' },
      { status: 500 }
    )
  }
}
