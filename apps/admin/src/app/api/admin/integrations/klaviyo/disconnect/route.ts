import { getTenantContext } from '@cgk-platform/auth'
import { disconnectKlaviyo } from '@cgk-platform/integrations'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/admin/integrations/klaviyo/disconnect
 * Disconnect Klaviyo
 */
export async function DELETE(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    await disconnectKlaviyo(tenantId)
    return Response.json({ success: true })
  } catch (error) {
    console.error('Failed to disconnect Klaviyo:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
