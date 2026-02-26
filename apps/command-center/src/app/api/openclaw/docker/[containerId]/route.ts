import { execSync } from 'child_process'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ containerId: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { containerId } = await params

  // Security: only allow openclaw sandbox containers
  if (!containerId.startsWith('openclaw-sbx')) {
    // Also check by ID — verify the container name
    try {
      const name = execSync(
        `docker inspect --format "{{.Name}}" ${containerId}`,
        { timeout: 5000, encoding: 'utf8' }
      ).trim().replace(/^\//, '')
      if (!name.startsWith('openclaw-sbx')) {
        return Response.json({ error: 'Forbidden: not a sandbox container' }, { status: 403 })
      }
    } catch {
      return Response.json({ error: 'Container not found' }, { status: 404 })
    }
  }

  const url = new URL(request.url)
  const lines = Math.min(parseInt(url.searchParams.get('lines') || '100'), 500)

  try {
    const logs = execSync(
      `docker logs --tail ${lines} ${containerId} 2>&1`,
      { timeout: 10_000, encoding: 'utf8' }
    )
    return Response.json({ logs })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to get logs' },
      { status: 502 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ containerId: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { containerId } = await params
  const body = await request.json() as { action?: string }

  // Security: validate container name
  try {
    const name = execSync(
      `docker inspect --format "{{.Name}}" ${containerId}`,
      { timeout: 5000, encoding: 'utf8' }
    ).trim().replace(/^\//, '')
    if (!name.startsWith('openclaw-sbx')) {
      return Response.json({ error: 'Forbidden: not a sandbox container' }, { status: 403 })
    }
  } catch {
    return Response.json({ error: 'Container not found' }, { status: 404 })
  }

  if (body.action === 'stop') {
    try {
      execSync(`docker stop ${containerId}`, { timeout: 30_000, encoding: 'utf8' })
      return Response.json({ ok: true })
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : 'Failed to stop container' },
        { status: 502 }
      )
    }
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}
