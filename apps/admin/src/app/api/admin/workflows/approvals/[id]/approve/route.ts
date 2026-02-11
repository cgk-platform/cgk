/**
 * Approve Workflow Execution API
 * POST /api/admin/workflows/approvals/[id]/approve - Approve pending execution
 */

import { requireAuth } from '@cgk/auth'
import { WorkflowEngine } from '@cgk/admin-core'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req)
  const { id } = await params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  try {
    const engine = WorkflowEngine.getInstance(auth.tenantId)
    await engine.approveExecution(id, auth.userId)

    return Response.json({ success: true })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Approval failed' },
      { status: 400 }
    )
  }
}
