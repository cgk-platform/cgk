import { getTenantContext } from '@cgk-platform/auth'
import { getMetaConnection, selectMetaAdAccount } from '@cgk-platform/integrations'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/integrations/meta/accounts/[id]
 * Select a Meta ad account
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { id: accountId } = await params

  try {
    const connection = await getMetaConnection(tenantId)

    if (!connection) {
      return Response.json({ error: 'No Meta connection found' }, { status: 404 })
    }

    // Find the account name
    const account = connection.metadata.adAccounts?.find(
      (a) => a.id === accountId
    )

    if (!account) {
      return Response.json({ error: 'Ad account not found' }, { status: 404 })
    }

    await selectMetaAdAccount(tenantId, accountId, account.name)

    return Response.json({ success: true, accountId, accountName: account.name })
  } catch (error) {
    console.error('Failed to select Meta ad account:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to select account' },
      { status: 500 }
    )
  }
}
