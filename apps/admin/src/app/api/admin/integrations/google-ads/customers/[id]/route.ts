import { getTenantContext } from '@cgk/auth'
import { getGoogleAdsConnection, selectGoogleAdsCustomer } from '@cgk/integrations'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/integrations/google-ads/customers/[id]
 * Select a Google Ads customer ID
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { id: customerId } = await params

  try {
    const connection = await getGoogleAdsConnection(tenantId)

    if (!connection) {
      return Response.json({ error: 'No Google Ads connection found' }, { status: 404 })
    }

    // Verify customer ID exists
    if (!connection.customerIds.includes(customerId)) {
      return Response.json({ error: 'Customer ID not found' }, { status: 404 })
    }

    // Get customer name from request body or use ID
    const body = await req.json().catch(() => ({}))
    const customerName = body.customerName || `Account ${customerId}`

    await selectGoogleAdsCustomer(tenantId, customerId, customerName)

    return Response.json({ success: true, customerId, customerName })
  } catch (error) {
    console.error('Failed to select Google Ads customer:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to select customer' },
      { status: 500 }
    )
  }
}
