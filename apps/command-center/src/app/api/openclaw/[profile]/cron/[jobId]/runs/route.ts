import { getGatewayClient } from '@/lib/gateway-pool'
import { validateProfileParam } from '@/lib/profile-param'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profile: string; jobId: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { profile, jobId } = await params
  const result = validateProfileParam({ profile })
  if ('error' in result) return result.error

  try {
    const client = await getGatewayClient(result.profile)
    const runs = await client.cronRuns(jobId)
    return Response.json({ runs })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch runs' },
      { status: 502 }
    )
  }
}
