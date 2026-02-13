export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk-platform/auth'
import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ agentId: string }> }

/**
 * GET /api/admin/ai-agents/[agentId]/voice
 * Get voice configuration for an agent
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
    auth.userId,
    auth.tenantId || '',
    'ai.voice.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { getAgentVoiceConfig } = await import('@cgk-platform/ai-agents')

    const config = await withTenant(tenantId, async () => {
      return getAgentVoiceConfig(agentId)
    })

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Error fetching voice config:', error)
    return NextResponse.json({ error: 'Failed to fetch voice configuration' }, { status: 500 })
  }
}

/**
 * POST /api/admin/ai-agents/[agentId]/voice
 * Create voice configuration for an agent
 */
export async function POST(request: Request, { params }: RouteParams) {
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
    auth.userId,
    auth.tenantId || '',
    'ai.voice.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { createAgentVoiceConfig, validateVoiceConfig } = await import('@cgk-platform/ai-agents')

    // Validate configuration
    const errors = validateVoiceConfig(body)
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 })
    }

    const config = await withTenant(tenantId, async () => {
      return createAgentVoiceConfig(tenantId, {
        agentId,
        ...body,
      })
    })

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Error creating voice config:', error)
    return NextResponse.json({ error: 'Failed to create voice configuration' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/ai-agents/[agentId]/voice
 * Update voice configuration for an agent
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
    auth.userId,
    auth.tenantId || '',
    'ai.voice.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { updateAgentVoiceConfig, validateVoiceConfig } = await import('@cgk-platform/ai-agents')

    // Validate configuration
    const errors = validateVoiceConfig(body)
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 })
    }

    const config = await withTenant(tenantId, async () => {
      return updateAgentVoiceConfig(agentId, body)
    })

    if (!config) {
      return NextResponse.json({ error: 'Voice configuration not found' }, { status: 404 })
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Error updating voice config:', error)
    return NextResponse.json({ error: 'Failed to update voice configuration' }, { status: 500 })
  }
}
