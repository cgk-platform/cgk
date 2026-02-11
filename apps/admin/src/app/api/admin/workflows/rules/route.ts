/**
 * Workflow Rules API
 * GET /api/admin/workflows/rules - List all rules
 * POST /api/admin/workflows/rules - Create new rule
 */

import { getTenantContext, requireAuth } from '@cgk/auth'
import {
  createWorkflowRule,
  getWorkflowRules,
  type CreateWorkflowRuleInput,
} from '@cgk/admin-core'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const isActive = url.searchParams.get('isActive')
  const triggerType = url.searchParams.get('triggerType')
  const entityType = url.searchParams.get('entityType')

  const rules = await getWorkflowRules(tenantId, {
    isActive: isActive ? isActive === 'true' : undefined,
    triggerType: triggerType || undefined,
    entityType: entityType || undefined,
  })

  return Response.json({
    rules,
    total: rules.length,
  })
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const body = (await req.json()) as CreateWorkflowRuleInput

  // Validate required fields
  if (!body.name || !body.triggerType || !body.actions) {
    return Response.json(
      { error: 'name, triggerType, and actions are required' },
      { status: 400 }
    )
  }

  const rule = await createWorkflowRule(auth.tenantId, body, auth.userId)

  return Response.json({ rule }, { status: 201 })
}
