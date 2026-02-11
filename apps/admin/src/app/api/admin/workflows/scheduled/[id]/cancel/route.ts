/**
 * Cancel Scheduled Action API
 * POST /api/admin/workflows/scheduled/[id]/cancel - Cancel a scheduled action
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

  const body = (await req.json()) as { reason?: string }

  try {
    const engine = WorkflowEngine.getInstance(auth.tenantId)
    await engine.cancelScheduledAction(id, body.reason || 'Cancelled by user')

    return Response.json({ success: true })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Cancellation failed' },
      { status: 400 }
    )
  }
}
