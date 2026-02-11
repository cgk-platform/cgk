export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ agentId: string }>
}

/**
 * GET /api/admin/ai-agents/[agentId]/handoffs
 * Get pending handoffs for an agent
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

  // Check permission
  const permissionDenied = await checkPermissionOrRespond(
    request,
    auth.tenantId || '',
    auth.userId,
    'ai.agents.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { getPendingHandoffs } = await import('@cgk/ai-agents')

    const handoffs = await withTenant(tenantId, async () => {
      return getPendingHandoffs(agentId)
    })

    return NextResponse.json({ handoffs })
  } catch (error) {
    console.error('Error fetching agent handoffs:', error)
    return NextResponse.json({ error: 'Failed to fetch handoffs' }, { status: 500 })
  }
}

/**
 * POST /api/admin/ai-agents/[agentId]/handoffs
 * Initiate a handoff from this agent
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

  // Check permission
  const permissionDenied = await checkPermissionOrRespond(
    request,
    auth.tenantId || '',
    auth.userId,
    'ai.agents.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { initiateHandoff, canHandoffTo } = await import('@cgk/ai-agents')

    // Validate required fields
    if (!body.toAgentId || !body.conversationId || !body.channel || !body.reason) {
      return NextResponse.json(
        { error: 'Missing required fields: toAgentId, conversationId, channel, reason' },
        { status: 400 }
      )
    }

    // Check if handoff is allowed
    const canHandoff = await withTenant(tenantId, async () => {
      return canHandoffTo(agentId, body.toAgentId)
    })

    if (!canHandoff.allowed) {
      return NextResponse.json({ error: canHandoff.reason }, { status: 400 })
    }

    const handoff = await withTenant(tenantId, async () => {
      return initiateHandoff({
        fromAgentId: agentId,
        toAgentId: body.toAgentId,
        conversationId: body.conversationId,
        channel: body.channel,
        channelId: body.channelId,
        reason: body.reason,
        contextSummary: body.contextSummary,
      })
    })

    return NextResponse.json({ handoff }, { status: 201 })
  } catch (error) {
    console.error('Error initiating handoff:', error)
    const message = error instanceof Error ? error.message : 'Failed to initiate handoff'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
