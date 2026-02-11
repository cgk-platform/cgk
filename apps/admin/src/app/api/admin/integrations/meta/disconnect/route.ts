import { getTenantContext } from '@cgk/auth'
import { disconnectMeta } from '@cgk/integrations'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/admin/integrations/meta/disconnect
 * Disconnect Meta Ads
 */
export async function DELETE(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    await disconnectMeta(tenantId)
    return Response.json({ success: true })
  } catch (error) {
    console.error('Failed to disconnect Meta:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
