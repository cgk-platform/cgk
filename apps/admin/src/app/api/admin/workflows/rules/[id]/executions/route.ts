/**
 * Workflow Rule Executions API
 * GET /api/admin/workflows/rules/[id]/executions - Get executions for a rule
 */

import { getTenantContext } from '@cgk/auth'
import { getWorkflowExecutions } from '@cgk/admin-core'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: RouteParams) {
  const { tenantId } = await getTenantContext(req)
  const { id } = await params

  if (!tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  const { executions, total } = await getWorkflowExecutions(tenantId, {
    ruleId: id,
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
