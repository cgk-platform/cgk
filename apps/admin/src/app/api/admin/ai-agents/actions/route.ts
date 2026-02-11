export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/ai-agents/actions
 * List all agent actions with optional filters
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

  const permissionDenied = await checkPermissionOrRespond(
    request,
    auth.tenantId || '',
    auth.userId,
    'ai.actions.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const url = new URL(request.url)
    const aiAgents = await import('@cgk/ai-agents')
    const listActions = aiAgents.listActions
    type ActionLogFilters = Parameters<typeof listActions>[0]

    const filters: Partial<ActionLogFilters> = {}

    // Parse query parameters
    const agentId = url.searchParams.get('agentId')
    if (agentId) filters.agentId = agentId

    const actionType = url.searchParams.get('actionType')
    if (actionType) filters.actionType = actionType

    const actionCategory = url.searchParams.get('actionCategory')
    if (actionCategory) filters.actionCategory = actionCategory as ActionLogFilters['actionCategory']

    const creatorId = url.searchParams.get('creatorId')
    if (creatorId) filters.creatorId = creatorId

    const projectId = url.searchParams.get('projectId')
    if (projectId) filters.projectId = projectId

    const approvalStatus = url.searchParams.get('approvalStatus')
    if (approvalStatus) filters.approvalStatus = approvalStatus as ActionLogFilters['approvalStatus']

    const success = url.searchParams.get('success')
    if (success !== null) filters.success = success === 'true'

    const startDate = url.searchParams.get('startDate')
    if (startDate) filters.startDate = new Date(startDate)

    const endDate = url.searchParams.get('endDate')
    if (endDate) filters.endDate = new Date(endDate)

    const limit = url.searchParams.get('limit')
    filters.limit = limit ? parseInt(limit, 10) : 50

    const offset = url.searchParams.get('offset')
    if (offset) filters.offset = parseInt(offset, 10)

    const actions = await withTenant(tenantId, async () => {
      return listActions(filters)
    })

    return NextResponse.json({ actions })
  } catch (error) {
    console.error('Error fetching actions:', error)
    return NextResponse.json({ error: 'Failed to fetch actions' }, { status: 500 })
  }
}
