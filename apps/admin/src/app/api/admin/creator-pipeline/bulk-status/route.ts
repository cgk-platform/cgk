/**
 * POST /api/admin/creator-pipeline/bulk-status
 * Bulk update project statuses
 */

import { headers } from 'next/headers'

import { bulkUpdateStatus } from '@/lib/pipeline/db'
import { VALID_TRANSITIONS, type ProjectStatus } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { projectIds, newStatus } = body as {
      projectIds: string[]
      newStatus: ProjectStatus
    }

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return Response.json({ error: 'projectIds array is required' }, { status: 400 })
    }

    if (!newStatus) {
      return Response.json({ error: 'newStatus is required' }, { status: 400 })
    }

    // Validate status is a known status
    const validStatuses = Object.keys(VALID_TRANSITIONS)
    if (!validStatuses.includes(newStatus)) {
      return Response.json({ error: 'Invalid status value' }, { status: 400 })
    }

    // Limit bulk operations
    if (projectIds.length > 50) {
      return Response.json(
        { error: 'Maximum 50 projects per bulk operation' },
        { status: 400 }
      )
    }

    const result = await bulkUpdateStatus(
      tenantSlug,
      projectIds,
      newStatus,
      userId || undefined
    )

    return Response.json({
      success: true,
      updated: result.updated,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (error) {
    console.error('Bulk status update error:', error)
    return Response.json(
      { error: 'Failed to update project statuses' },
      { status: 500 }
    )
  }
}
