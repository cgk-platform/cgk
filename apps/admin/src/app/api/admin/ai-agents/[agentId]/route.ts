export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ agentId: string }> }

/**
 * GET /api/admin/ai-agents/[agentId]
 * Get a specific AI agent
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { agentId } = await params
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

  const permissionDenied = await checkPermissionOrRespond(
    request,
    auth.tenantId || '',
    auth.userId,
    'ai.agents.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { getAgent, getAgentPersonality, getAutonomySettings, getActionAutonomyList } =
      await import('@cgk/ai-agents')

    const result = await withTenant(tenantId, async () => {
      const agent = await getAgent(agentId)
      if (!agent) return null

      const [personality, autonomySettings, actionAutonomy] = await Promise.all([
        getAgentPersonality(agentId),
        getAutonomySettings(agentId),
        getActionAutonomyList(agentId),
      ])

      return { agent, personality, autonomySettings, actionAutonomy }
    })

    if (!result) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching AI agent:', error)
    return NextResponse.json({ error: 'Failed to fetch AI agent' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/ai-agents/[agentId]
 * Update an AI agent
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { agentId } = await params
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

  const permissionDenied = await checkPermissionOrRespond(
    request,
    auth.tenantId || '',
    auth.userId,
    'ai.agents.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { updateAgent, setAsPrimaryAgent } = await import('@cgk/ai-agents')

    const agent = await withTenant(tenantId, async () => {
      // Handle setting as primary agent separately
      if (body.isPrimary === true) {
        return setAsPrimaryAgent(agentId)
      }

      return updateAgent(agentId, {
        displayName: body.displayName,
        email: body.email,
        role: body.role,
        avatarUrl: body.avatarUrl,
        status: body.status,
        aiModel: body.aiModel,
        aiTemperature: body.aiTemperature,
        aiMaxTokens: body.aiMaxTokens,
        capabilities: body.capabilities,
        toolAccess: body.toolAccess,
        humanManagerId: body.humanManagerId,
        managerAgentId: body.managerAgentId,
        connectedAccounts: body.connectedAccounts,
      })
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Error updating AI agent:', error)
    return NextResponse.json({ error: 'Failed to update AI agent' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/ai-agents/[agentId]
 * Retire (soft delete) an AI agent
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { agentId } = await params
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

  const permissionDenied = await checkPermissionOrRespond(
    request,
    auth.tenantId || '',
    auth.userId,
    'ai.agents.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { retireAgent } = await import('@cgk/ai-agents')

    const retired = await withTenant(tenantId, async () => {
      return retireAgent(agentId)
    })

    if (!retired) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error retiring AI agent:', error)
    return NextResponse.json({ error: 'Failed to retire AI agent' }, { status: 500 })
  }
}
