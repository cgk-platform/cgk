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
        totalCost += usage.totalCost
        totalTokens += usage.totalTokens
      }
    }
  }

  return Response.json({
    profiles: costs,
    totals: { cost: totalCost, tokens: totalTokens },
  })
}
