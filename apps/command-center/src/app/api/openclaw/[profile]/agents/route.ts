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
    const agentsData = await client.agentsList()
    return Response.json({
      defaultId: agentsData.defaultId,
      scope: agentsData.scope,
      agents: agentsData.agents,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch agents' },
      { status: 502 }
    )
  }
}
