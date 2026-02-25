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
    const data = await client.channelsStatus()

    // Normalize to an array of channel objects for the UI
    const channels = data.channelOrder.map((id) => {
      const ch = data.channels[id]
      return {
        id,
        label: data.channelLabels[id] || id,
        detailLabel: data.channelDetailLabels?.[id],
        configured: ch?.configured ?? false,
        running: ch?.running ?? false,
        // Use probe.ok as primary connectivity indicator
        connected: ch?.running === true || ch?.probe?.ok === true,
        botTokenSource: ch?.botTokenSource,
        appTokenSource: ch?.appTokenSource,
        probe: ch?.probe
          ? {
              ok: ch.probe.ok,
              status: ch.probe.status,
              elapsedMs: ch.probe.elapsedMs,
              botName: ch.probe.bot?.name,
              teamName: ch.probe.team?.name,
            }
          : null,
        lastError: ch?.lastError,
      }
    })

    return Response.json({ channels })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch channels' },
      { status: 502 }
    )
  }
}
