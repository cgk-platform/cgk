import { getTenantContext } from '@cgk-platform/auth'
import { getAllIntegrationStatuses } from '@cgk-platform/integrations'
import { logger } from '@cgk-platform/logging'

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
    logger.error('Failed to get integration statuses:', error instanceof Error ? error : new Error(String(error)))
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to get statuses' },
      { status: 500 }
    )
  }
}
