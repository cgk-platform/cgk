/**
 * Workflow Execution by ID API
 * GET /api/admin/workflows/executions/[id] - Get single execution
 */

import { getTenantContext } from '@cgk/auth'
import { getWorkflowExecution } from '@cgk/admin-core'

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

  const execution = await getWorkflowExecution(tenantId, id)

  if (!execution) {
    return Response.json({ error: 'Execution not found' }, { status: 404 })
  }

  return Response.json({ execution })
}
