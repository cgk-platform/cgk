export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type { PersonType } from '@cgk/ai-agents'

interface RouteParams {
  params: Promise<{ agentId: string; personType: string; personId: string }>
}

/**
 * GET /api/admin/ai-agents/[agentId]/relationships/[personType]/[personId]
 * Get a specific relationship
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { agentId, personType, personId } = await params
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

  // Validate personType
  if (!['team_member', 'creator', 'contact'].includes(personType)) {
    return NextResponse.json(
      { error: 'Invalid personType. Must be team_member, creator, or contact' },
      { status: 400 }
    )
  }

  try {
    const { getAgentRelationship, getPreferences, getRelationshipContext } =
      await import('@cgk/ai-agents')

    const [relationship, preferences, context] = await withTenant(tenantId, async () => {
      const r = await getAgentRelationship(agentId, personType as PersonType, personId)
      if (!r) return [null, null, null]
      const p = await getPreferences(agentId, personType as PersonType, personId)
      const c = await getRelationshipContext(agentId, personType as PersonType, personId)
      return [r, p, c]
    })

    if (!relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
    }

    return NextResponse.json({ relationship, preferences, context })
  } catch (error) {
    console.error('Error fetching relationship:', error)
    return NextResponse.json({ error: 'Failed to fetch relationship' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/ai-agents/[agentId]/relationships/[personType]/[personId]
 * Update a relationship
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { agentId, personType, personId } = await params
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

  // Validate personType
  if (!['team_member', 'creator', 'contact'].includes(personType)) {
    return NextResponse.json(
      { error: 'Invalid personType. Must be team_member, creator, or contact' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const { updateRelationship } = await import('@cgk/ai-agents')

    const relationship = await withTenant(tenantId, async () => {
      return updateRelationship(agentId, personType as PersonType, personId, {
        trustLevel: body.trustLevel,
        communicationPreferences: body.communicationPreferences,
        relationshipSummary: body.relationshipSummary,
      })
    })

    if (!relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
    }

    return NextResponse.json({ relationship })
  } catch (error) {
    console.error('Error updating relationship:', error)
    return NextResponse.json({ error: 'Failed to update relationship' }, { status: 500 })
  }
}
