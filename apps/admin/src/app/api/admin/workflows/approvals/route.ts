/**
 * Workflow Approval Queue API
 * GET /api/admin/workflows/approvals - List pending approvals
 */

import { getTenantContext } from '@cgk-platform/auth'
import { WorkflowEngine } from '@cgk-platform/admin-core'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const engine = WorkflowEngine.getInstance(tenantId)
  const pendingApprovals = await engine.getPendingApprovals()

  return Response.json({
    approvals: pendingApprovals,
    total: pendingApprovals.length,
  })
}
