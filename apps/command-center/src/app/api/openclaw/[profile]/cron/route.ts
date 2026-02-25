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
    const [cronList, cronStatus] = await Promise.all([
      client.cronList(),
      client.cronStatus(),
    ])
    return Response.json({
      jobs: cronList.jobs,
      total: cronList.total,
      status: cronStatus,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch cron' },
      { status: 502 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ profile: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const result = validateProfileParam(await params)
  if ('error' in result) return result.error

  try {
    const body = await request.json()
    const { jobId } = body as { jobId: string }
    if (!jobId) {
      return Response.json({ error: 'jobId required' }, { status: 400 })
    }

    const client = await getGatewayClient(result.profile)
    const runResult = await client.cronRun(jobId)
    return Response.json(runResult)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to trigger job' },
      { status: 502 }
    )
  }
}
