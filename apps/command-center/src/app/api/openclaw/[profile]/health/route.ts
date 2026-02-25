import { getGatewayClient, normalizeHealth } from '@/lib/gateway-pool'
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
    const raw = await client.health()
    return Response.json({ connected: true, health: normalizeHealth(raw) })
  } catch (err) {
    return Response.json({
      connected: false,
      health: null,
      error: err instanceof Error ? err.message : 'Connection failed',
    })
  }
}
