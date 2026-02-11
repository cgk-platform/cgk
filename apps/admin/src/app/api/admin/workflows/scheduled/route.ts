/**
 * Scheduled Actions API
 * GET /api/admin/workflows/scheduled - List scheduled actions
 */

import { getTenantContext } from '@cgk/auth'
import { getScheduledActions } from '@cgk/admin-core'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const status = url.searchParams.get('status')

  const { actions, total } = await getScheduledActions(tenantId, {
    status: status || undefined,
    limit,
    offset,
  })

  return Response.json({
    actions,
    total,
    limit,
    offset,
  })
}
