import { PROFILE_SLUGS } from '@cgk-platform/openclaw'

import { tryGetGatewayClient } from '@/lib/gateway-pool'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const results = await Promise.allSettled(
    PROFILE_SLUGS.map(async (slug) => {
      const client = await tryGetGatewayClient(slug)
      if (!client) return { slug, usage: null }
      const usage = await client.sessionsUsage()
      return { slug, usage }
    })
  )

  const costs: Record<string, unknown> = {}
  let totalCost = 0
  let totalTokens = 0

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { slug, usage } = result.value
      costs[slug] = usage
      if (usage) {
        // Aggregate costs from daily breakdowns
        for (const session of usage.sessions) {
          const u = session.usage as Record<string, unknown>
          const breakdown = u.dailyBreakdown as Array<{ models?: Array<{ totalCost?: number; inputTokens?: number; outputTokens?: number }> }> | undefined
          if (breakdown) {
            for (const day of breakdown) {
              if (day.models) {
                for (const model of day.models) {
                  totalCost += model.totalCost ?? 0
                  totalTokens += (model.inputTokens ?? 0) + (model.outputTokens ?? 0)
                }
              }
            }
          }
        }
      }
    }
  }

  return Response.json({
    profiles: costs,
    totals: { cost: totalCost, tokens: totalTokens },
  })
}
