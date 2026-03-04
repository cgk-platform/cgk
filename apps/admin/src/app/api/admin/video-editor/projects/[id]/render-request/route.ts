export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/video-editor/projects/[id]/render-request
 *
 * Accepts a render command from the Creative Studio web UI and forwards it
 * to the openCLAW gateway associated with the project's originating profile.
 * Requires session auth (x-tenant-slug + x-user-id from middleware).
 */

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getGatewayConfig } from '@/lib/openclaw-gateway'

interface RouteParams {
  params: Promise<{ id: string }>
}

function buildRenderCommand(
  command: string,
  sessionId: string,
  options: Record<string, unknown>
): string {
  const parts = [command, '--session', sessionId]

  if (typeof options.captionStyle === 'string') {
    parts.push('--caption-style', options.captionStyle)
  }
  if (typeof options.musicVolume === 'number') {
    parts.push('--music-volume', String(options.musicVolume))
  }
  if (typeof options.suffix === 'string') {
    parts.push('--suffix', options.suffix)
  }

  return parts.join(' ')
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id: projectId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { command = 'render', options = {} } = body as {
    command?: string
    options?: Record<string, unknown>
  }

  const ALLOWED_COMMANDS = ['render', 'deliver'] as const
  if (!ALLOWED_COMMANDS.includes(command as (typeof ALLOWED_COMMANDS)[number])) {
    return NextResponse.json(
      { error: `Invalid command. Allowed: ${ALLOWED_COMMANDS.join(', ')}` },
      { status: 400 }
    )
  }

  return withTenant(tenantSlug, async () => {
    const result = await sql<{ openclaw_session_id: string; openclaw_profile: string }>`
      SELECT openclaw_session_id, openclaw_profile
      FROM video_editor_projects
      WHERE id = ${projectId} AND tenant_id = ${tenantSlug}
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { openclaw_session_id: sessionId, openclaw_profile: profile } = result.rows[0]

    if (!sessionId) {
      return NextResponse.json({ error: 'Project has no linked openCLAW session' }, { status: 400 })
    }

    const gatewayConfig = getGatewayConfig(profile)
    if (!gatewayConfig) {
      return NextResponse.json({ error: `Unknown openCLAW profile: ${profile}` }, { status: 400 })
    }

    let gatewayResponse: Response
    try {
      gatewayResponse = await fetch(`${gatewayConfig.url}/api/sessions/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gatewayConfig.token}`,
        },
        body: JSON.stringify({
          agentId: 'video-editor',
          message: buildRenderCommand(command, sessionId, options ?? {}),
        }),
      })
    } catch (err) {
      return NextResponse.json(
        {
          error: `Failed to reach openCLAW gateway: ${err instanceof Error ? err.message : 'unknown'}`,
        },
        { status: 502 }
      )
    }

    if (!gatewayResponse.ok) {
      const errText = await gatewayResponse.text()
      return NextResponse.json({ error: `Gateway error: ${errText}` }, { status: 502 })
    }

    await sql`
      INSERT INTO video_editor_activity (tenant_id, project_id, source, action, data)
      VALUES (
        ${tenantSlug},
        ${projectId},
        'user',
        'render_requested',
        ${JSON.stringify({ command, options: options ?? {}, userId })}::jsonb
      )
    `

    return NextResponse.json({ message: 'Render request sent to agent', sessionId })
  })
}
