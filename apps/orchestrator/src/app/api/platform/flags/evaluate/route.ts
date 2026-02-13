/**
 * Flag Evaluation API
 *
 * POST /api/platform/flags/evaluate - Evaluate flags for a context
 */

import { getTenantContext } from '@cgk-platform/auth'
import type { EvaluationContext } from '@cgk-platform/feature-flags'
import { evaluateAllFlags, evaluateFlags } from '@cgk-platform/feature-flags/server'
import { createLogger } from '@cgk-platform/logging'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const logger = createLogger({
  meta: { service: 'orchestrator', component: 'flags-evaluate-api' },
})

interface EvaluateRequest {
  flagKeys?: string[]
  context?: EvaluationContext
}

/**
 * POST /api/platform/flags/evaluate
 *
 * Evaluate flags for a given context.
 * If no flagKeys provided, evaluates all flags.
 * If no context provided, uses context from request.
 */
export async function POST(req: Request) {
  try {
    const { tenantId, userId } = await getTenantContext(req)
    const body = (await req.json()) as EvaluateRequest

    // Build evaluation context
    const context: EvaluationContext = {
      tenantId: body.context?.tenantId || tenantId || undefined,
      userId: body.context?.userId || userId || undefined,
      environment:
        body.context?.environment ||
        ((process.env.VERCEL_ENV || process.env.NODE_ENV) as EvaluationContext['environment']),
      attributes: body.context?.attributes,
    }

    // Evaluate flags
    const result = body.flagKeys?.length
      ? await evaluateFlags(body.flagKeys, context)
      : await evaluateAllFlags(context)

    logger.debug('Flags evaluated', {
      tenantId: context.tenantId,
      userId: context.userId,
      flagCount: Object.keys(result.results).length,
      evaluationTimeMs: result.evaluationTimeMs,
    })

    return Response.json(result)
  } catch (error) {
    logger.error('Failed to evaluate flags', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
