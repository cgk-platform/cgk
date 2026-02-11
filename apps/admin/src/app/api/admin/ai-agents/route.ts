export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/ai-agents
 * List all AI agents for the current tenant
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
    'ai.agents.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { listAgents } = await import('@cgk/ai-agents')

    const agents = await withTenant(tenantId, async () => {
      return listAgents()
    })

    return NextResponse.json({ agents })
  } catch (error) {
    console.error('Error fetching AI agents:', error)
    return NextResponse.json({ error: 'Failed to fetch AI agents' }, { status: 500 })
  }
}

/**
 * POST /api/admin/ai-agents
 * Create a new AI agent
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
    'ai.agents.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { createAgent } = await import('@cgk/ai-agents')

    // Validate required fields
    if (!body.name || !body.displayName || !body.role) {
      return NextResponse.json(
        { error: 'Missing required fields: name, displayName, role' },
        { status: 400 }
      )
    }

    const agent = await withTenant(tenantId, async () => {
      return createAgent({
        name: body.name,
        displayName: body.displayName,
        email: body.email,
        role: body.role,
        avatarUrl: body.avatarUrl,
        aiModel: body.aiModel,
        aiTemperature: body.aiTemperature,
        aiMaxTokens: body.aiMaxTokens,
        capabilities: body.capabilities,
        toolAccess: body.toolAccess,
        isPrimary: body.isPrimary,
        humanManagerId: body.humanManagerId,
      })
    })

    return NextResponse.json({ agent }, { status: 201 })
  } catch (error) {
    console.error('Error creating AI agent:', error)
    const message = error instanceof Error ? error.message : 'Failed to create AI agent'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
