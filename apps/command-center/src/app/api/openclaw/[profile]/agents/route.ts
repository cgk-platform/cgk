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
    const [agents, identity] = await Promise.allSettled([
      client.agentsList(),
      client.agentIdentity(),
    ])
    return Response.json({
      agents: agents.status === 'fulfilled' ? agents.value : [],
      identity: identity.status === 'fulfilled' ? identity.value : null,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch agents' },
      { status: 502 }
    )
  }
}
