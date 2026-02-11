export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/ai-teams
 * List all AI teams for the current tenant
 */
export async function GET(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permission
  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId || '',
    'ai.teams.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { listTeams } = await import('@cgk/ai-agents')

    const teams = await withTenant(tenantId, async () => {
      return listTeams()
    })

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Error fetching AI teams:', error)
    return NextResponse.json({ error: 'Failed to fetch AI teams' }, { status: 500 })
  }
}

/**
 * POST /api/admin/ai-teams
 * Create a new AI team
 */
export async function POST(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permission
  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId || '',
    'ai.teams.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { createTeam } = await import('@cgk/ai-agents')

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
    }

    const team = await withTenant(tenantId, async () => {
      return createTeam({
        name: body.name,
        description: body.description,
        domain: body.domain,
        slackChannelId: body.slackChannelId,
        slackChannelName: body.slackChannelName,
        supervisorType: body.supervisorType,
        supervisorId: body.supervisorId,
        supervisorSlackId: body.supervisorSlackId,
      })
    })

    return NextResponse.json({ team }, { status: 201 })
  } catch (error) {
    console.error('Error creating AI team:', error)
    const message = error instanceof Error ? error.message : 'Failed to create AI team'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
