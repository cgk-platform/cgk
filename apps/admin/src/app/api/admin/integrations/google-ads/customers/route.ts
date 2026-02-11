import { getTenantContext } from '@cgk/auth'
import { getGoogleAdsConnection } from '@cgk/integrations'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/integrations/google-ads/customers
 * List available Google Ads customer IDs
 */
export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const connection = await getGoogleAdsConnection(tenantId)

    if (!connection) {
      return Response.json({ error: 'No Google Ads connection found' }, { status: 404 })
    }

    return Response.json({
      customerIds: connection.customerIds,
      selectedId: connection.selectedCustomerId,
      selectedName: connection.selectedCustomerName,
    })
  } catch (error) {
    console.error('Failed to get Google Ads customers:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to get customers' },
      { status: 500 }
    )
  }
}
