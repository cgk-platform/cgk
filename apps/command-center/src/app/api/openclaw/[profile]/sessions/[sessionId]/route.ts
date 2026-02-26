import { readFile } from 'fs/promises'
import { join } from 'path'

import { getGatewayClient } from '@/lib/gateway-pool'
import { validateProfileParam } from '@/lib/profile-param'
import { STATE_DIRS } from '@/lib/state-dirs'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profile: string; sessionId: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { sessionId, ...rest } = await params
  const result = validateProfileParam(rest)
  if ('error' in result) return result.error

  if (!sessionId) {
    return Response.json({ error: 'sessionId required' }, { status: 400 })
  }

  let session: Record<string, unknown> | null = null
  let source: 'rpc' | 'file' | 'usage-only' = 'usage-only'

  // Try 1: RPC sessions.get
  try {
    const client = await getGatewayClient(result.profile)
    const rpcResult = await (client as unknown as { rpc: (method: string, params: Record<string, unknown>) => Promise<unknown> }).rpc('sessions.get', { key: sessionId })
    if (rpcResult) {
      session = rpcResult as Record<string, unknown>
      source = 'rpc'
    }
  } catch {
    // RPC not available, try file
  }

  // Try 2: Read session file from disk
  if (!session) {
    try {
      const sessionPath = join(STATE_DIRS[result.profile], 'sessions', `${sessionId}.json`)
      const content = await readFile(sessionPath, 'utf8')
      session = JSON.parse(content) as Record<string, unknown>
      source = 'file'
    } catch {
      // file doesn't exist
    }
  }

  // Try 3: Get usage data filtered by session
  let usage: Record<string, unknown> | null = null
  try {
    const client = await getGatewayClient(result.profile)
    const usageData = await client.sessionsUsage()
    const sessionUsage = usageData.sessions.find(
      (s) => s.key === sessionId
    )
    if (sessionUsage) {
      usage = sessionUsage as unknown as Record<string, unknown>
      if (!session) {
        session = { key: sessionId }
        source = 'usage-only'
      }
    }
  } catch {
    // usage fetch failed
  }

  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 })
  }

  return Response.json({ session, usage, source })
}
