/**
 * Test Workflow Rule API (Dry Run)
 * POST /api/admin/workflows/rules/[id]/test - Test rule execution
 */

import { requireAuth } from '@cgk/auth'
import {
  computeFields,
  evaluateConditions,
  getWorkflowRule,
} from '@cgk/admin-core'

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

  const rule = await getWorkflowRule(auth.tenantId, id)

  if (!rule) {
    return Response.json({ error: 'Rule not found' }, { status: 404 })
  }

  const body = (await req.json()) as {
    entityType: string
    entity: Record<string, unknown>
    previousEntity?: Record<string, unknown>
  }

  if (!body.entityType || !body.entity) {
    return Response.json(
      { error: 'entityType and entity are required' },
      { status: 400 }
    )
  }

  // Compute fields
  const computed = computeFields(body.entity)

  // Build evaluation context
  const context = {
    entity: body.entity,
    previousEntity: body.previousEntity,
    computed,
  }

  // Evaluate conditions
  const { passed, results } = evaluateConditions(rule.conditions, context)

  // Check trigger match (simplified)
  let triggerMatches = true
  let triggerReason = 'Trigger conditions met'

  if (rule.triggerType === 'status_change') {
    const config = rule.triggerConfig as { from?: string[]; to?: string[] }
    if (config.to && config.to.length > 0) {
      const entityStatus = body.entity.status as string
      triggerMatches = config.to.includes(entityStatus)
      if (!triggerMatches) {
        triggerReason = `Status "${entityStatus}" not in trigger list: ${config.to.join(', ')}`
      }
    }
  }

  return Response.json({
    rule: {
      id: rule.id,
      name: rule.name,
      triggerType: rule.triggerType,
    },
    testResult: {
      triggerMatches,
      triggerReason,
      conditionsPassed: passed,
      conditionResults: results,
      wouldExecute: triggerMatches && passed,
      actionsToExecute: triggerMatches && passed ? rule.actions : [],
    },
    context: {
      computed,
      entityFields: Object.keys(body.entity),
    },
  })
}
