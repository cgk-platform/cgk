import { getGatewayClient } from '@/lib/gateway-pool'
import { validateProfileParam } from '@/lib/profile-param'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profile: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const result = validateProfileParam(await params)
  if ('error' in result) return result.error

  try {
    const client = await getGatewayClient(result.profile)
    const [sessionsData, usageData] = await Promise.all([
      client.sessionsList(),
      client.sessionsUsage(),
    ])

    // Normalize sessions for UI
    const sessions = sessionsData.sessions.map((s) => ({
      id: s.key,
      type: s.kind,
      displayName: s.displayName,
      channel: s.channel,
      groupChannel: s.groupChannel,
      agentId: s.agentId,
    }))

    // Aggregate usage across all sessions
    let totalTokens = 0
    let totalCost = 0
    const byModel: Record<string, { tokens: number; cost: number }> = {}

    for (const entry of usageData.sessions) {
      const usage = entry.usage as Record<string, unknown>
      const breakdown = usage.dailyBreakdown as Array<{ models?: Array<{ id: string; inputTokens?: number; outputTokens?: number; totalCost?: number }> }> | undefined
      if (breakdown) {
        for (const day of breakdown) {
          if (day.models) {
            for (const model of day.models) {
              const tokens = (model.inputTokens ?? 0) + (model.outputTokens ?? 0)
              const cost = model.totalCost ?? 0
              totalTokens += tokens
              totalCost += cost
              if (!byModel[model.id]) byModel[model.id] = { tokens: 0, cost: 0 }
              byModel[model.id]!.tokens += tokens
              byModel[model.id]!.cost += cost
            }
          }
        }
      }
    }

    return Response.json({
      sessions,
      sessionCount: sessionsData.count,
      defaults: sessionsData.defaults,
      usage: {
        totalSessions: usageData.sessions.length,
        activeSessions: sessionsData.count,
        totalTokens,
        totalCost,
        byModel,
        startDate: usageData.startDate,
        endDate: usageData.endDate,
      },
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch sessions' },
      { status: 502 }
    )
  }
}
