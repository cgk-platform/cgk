import { getTenantContext } from '@cgk/auth'
import { getKlaviyoConnection, refreshKlaviyoLists, updateKlaviyoLists } from '@cgk/integrations'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/integrations/klaviyo/lists
 * List available Klaviyo lists
 */
export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const connection = await getKlaviyoConnection(tenantId)

    if (!connection || !connection.isActive) {
      return Response.json({ error: 'No active Klaviyo connection found' }, { status: 404 })
    }

    return Response.json({
      lists: connection.lists,
      emailListId: connection.emailListId,
      smsListId: connection.smsListId,
    })
  } catch (error) {
    console.error('Failed to get Klaviyo lists:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to get lists' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/integrations/klaviyo/lists
 * Refresh lists from Klaviyo API
 */
export async function POST(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const lists = await refreshKlaviyoLists(tenantId)
    return Response.json({ lists })
  } catch (error) {
    console.error('Failed to refresh Klaviyo lists:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to refresh lists' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/integrations/klaviyo/lists
 * Update list selection
 */
export async function PUT(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body = await req.json()

    await updateKlaviyoLists(
      tenantId,
      body.emailListId || null,
      body.smsListId || null
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error('Failed to update Klaviyo lists:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to update lists' },
      { status: 500 }
    )
  }
}
