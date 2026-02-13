/**
 * All Workflow Executions API
 * GET /api/admin/workflows/executions - List all executions
 */

import { getTenantContext } from '@cgk-platform/auth'
import { getWorkflowExecutions } from '@cgk-platform/admin-core'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const entityType = url.searchParams.get('entityType')
  const entityId = url.searchParams.get('entityId')
  const result = url.searchParams.get('result')

  const { executions, total } = await getWorkflowExecutions(tenantId, {
    entityType: entityType || undefined,
    entityId: entityId || undefined,
    result: result || undefined,
    limit,
    offset,
  })

  return Response.json({
    executions,
    total,
    limit,
    offset,
  })
}
