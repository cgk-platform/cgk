import { getTenantContext } from '@cgk-platform/auth'
import { getMetaConnection } from '@cgk-platform/integrations'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/integrations/meta/accounts
 * List available Meta ad accounts
 */
export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const connection = await getMetaConnection(tenantId)

    if (!connection) {
      return Response.json({ error: 'No Meta connection found' }, { status: 404 })
    }

    const adAccounts = connection.metadata.adAccounts || []

    return Response.json({
      adAccounts,
      selectedId: connection.selectedAdAccountId,
      selectedName: connection.selectedAdAccountName,
    })
  } catch (error) {
    console.error('Failed to get Meta ad accounts:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to get accounts' },
      { status: 500 }
    )
  }
}
