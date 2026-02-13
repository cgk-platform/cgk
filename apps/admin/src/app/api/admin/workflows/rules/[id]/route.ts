/**
 * Workflow Rule by ID API
 * GET /api/admin/workflows/rules/[id] - Get single rule
 * PATCH /api/admin/workflows/rules/[id] - Update rule
 * DELETE /api/admin/workflows/rules/[id] - Delete rule
 */

import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import {
  deleteWorkflowRule,
  getWorkflowRule,
  updateWorkflowRule,
  type UpdateWorkflowRuleInput,
} from '@cgk-platform/admin-core'

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

  const rule = await getWorkflowRule(tenantId, id)

  if (!rule) {
    return Response.json({ error: 'Rule not found' }, { status: 404 })
  }

  return Response.json({ rule })
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req)
  const { id } = await params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const body = (await req.json()) as UpdateWorkflowRuleInput

  const rule = await updateWorkflowRule(auth.tenantId, id, body, auth.userId)

  if (!rule) {
    return Response.json({ error: 'Rule not found' }, { status: 404 })
  }

  return Response.json({ rule })
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req)
  const { id } = await params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const deleted = await deleteWorkflowRule(auth.tenantId, id)

  if (!deleted) {
    return Response.json({ error: 'Rule not found' }, { status: 404 })
  }

  return Response.json({ success: true })
}
