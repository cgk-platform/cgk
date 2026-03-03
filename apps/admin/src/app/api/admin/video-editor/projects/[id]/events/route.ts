export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * GET /api/admin/video-editor/projects/[id]/events
 *
 * Server-Sent Events stream of video_editor_activity rows for a project.
 * Polls every 2 seconds; sends last 20 events on first connect, then
 * incremental events by created_at timestamp thereafter.
 *
 * Auth: session auth (requireAuth) or query param ?token=xxx for EventSource
 * clients that cannot send headers.
 */

import { withTenant, sql } from '@cgk-platform/db'
import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'

import { validateTenantApiKey } from '@/lib/api-key-auth'

interface ActivityRow {
  id: string
  source: string
  action: string
  data: unknown
  created_at: string
}

interface RouteParams {
  params: Promise<{ id: string }>
}

async function resolveAuth(request: Request): Promise<{ tenantSlug: string } | null> {
  // Try session auth first (admin UI users)
  try {
    const auth: AuthContext = await requireAuth(request)
    if (auth.tenantSlug) {
      return { tenantSlug: auth.tenantSlug }
    }
    if (auth.tenantId) {
      return { tenantSlug: auth.tenantId }
    }
  } catch {
    // Not session-authenticated, try alternatives
  }

  // Try API key header (agent calls)
  const apiKeyResult = await validateTenantApiKey(request)
  if (apiKeyResult) {
    return { tenantSlug: apiKeyResult.tenantSlug }
  }

  // Try query param token (EventSource can't send headers)
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (token) {
    const tokenRequest = new Request(request.url, {
      headers: new Headers({ 'x-api-key': token }),
    })
    const tokenResult = await validateTenantApiKey(tokenRequest)
    if (tokenResult) {
      return { tenantSlug: tokenResult.tenantSlug }
    }
  }

  return null
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id: projectId } = await params

  const auth = await resolveAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { tenantSlug } = auth

  const exists = await withTenant(tenantSlug, async () => {
    const result = await sql<{ id: string }>`
      SELECT id FROM video_editor_projects
      WHERE id = ${projectId} AND tenant_id = ${tenantSlug}
    `
    return result.rows.length > 0
  })

  if (!exists) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const encoder = new TextEncoder()
  let lastEventTime = ''

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(': heartbeat\n\n'))

      const poll = async () => {
        try {
          const activities = await withTenant(tenantSlug, async () => {
            if (lastEventTime) {
              return sql<ActivityRow>`
                SELECT id, source, action, data, created_at
                FROM video_editor_activity
                WHERE project_id = ${projectId}
                  AND tenant_id = ${tenantSlug}
                  AND created_at > ${lastEventTime}::timestamptz
                ORDER BY created_at ASC
                LIMIT 50
              `
            }

            return sql<ActivityRow>`
              SELECT id, source, action, data, created_at
              FROM video_editor_activity
              WHERE project_id = ${projectId}
                AND tenant_id = ${tenantSlug}
              ORDER BY created_at DESC
              LIMIT 20
            `
          })

          const rows = lastEventTime ? activities.rows : [...activities.rows].reverse()

          for (const row of rows) {
            const event = {
              id: row.id,
              source: row.source,
              action: row.action,
              data: row.data,
              created_at: row.created_at,
            }
            controller.enqueue(encoder.encode(`id: ${row.id}\ndata: ${JSON.stringify(event)}\n\n`))
            lastEventTime = row.created_at
          }
        } catch {
          // Connection may be closed -- poll errors are non-fatal
        }
      }

      await poll()

      const interval = setInterval(poll, 2000)

      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
