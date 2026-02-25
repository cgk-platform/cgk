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

  const url = new URL(request.url)
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0)
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10) || 10))

  try {
    const client = await getGatewayClient(result.profile)
    const data = await client.cronRuns(jobId)
    const entries = data.entries || []
    const paged = entries.slice(offset, offset + limit)
    return Response.json({
      runs: paged,
      total: data.total,
      hasMore: offset + limit < entries.length,
      nextOffset: offset + limit,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch runs' },
      { status: 502 }
    )
  }
}
