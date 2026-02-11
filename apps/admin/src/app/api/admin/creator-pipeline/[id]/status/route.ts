/**
 * PATCH /api/admin/creator-pipeline/[id]/status
 * Update project status (stage transition)
 */

import { headers } from 'next/headers'

import { updateProjectStatus } from '@/lib/pipeline/db'
import { isValidTransition, VALID_TRANSITIONS, type ProjectStatus } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { id: projectId } = await params

  try {
    const body = await request.json()
    const { newStatus, notes } = body as { newStatus: ProjectStatus; notes?: string }

    if (!newStatus) {
      return Response.json({ error: 'newStatus is required' }, { status: 400 })
    }

    // Validate status is a known status
    const validStatuses = Object.keys(VALID_TRANSITIONS)
    if (!validStatuses.includes(newStatus)) {
      return Response.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const project = await updateProjectStatus(
      tenantSlug,
      projectId,
      newStatus,
      notes,
      userId || undefined
    )

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    return Response.json({ success: true, project })
  } catch (error) {
    console.error('Status update error:', error)
    return Response.json(
      { error: 'Failed to update project status' },
      { status: 500 }
    )
  }
}
