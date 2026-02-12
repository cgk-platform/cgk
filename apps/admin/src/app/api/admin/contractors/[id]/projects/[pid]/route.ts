import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import {
  deleteProject,
  getContractorById,
  getProjectById,
  updateProject,
} from '@/lib/contractors/db'
import { canAdminTransitionTo, type ProjectStatus, type UpdateProjectRequest } from '@/lib/contractors/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: Promise<{ id: string; pid: string }>
}

/**
 * GET /api/admin/contractors/[id]/projects/[pid]
 * Get project details
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id, pid } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  // Verify contractor exists
  const contractor = await getContractorById(tenantSlug, id)
  if (!contractor) {
    return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
  }

  const project = await getProjectById(tenantSlug, pid)
  if (!project || project.contractorId !== id) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}

/**
 * PATCH /api/admin/contractors/[id]/projects/[pid]
 * Update project (status, details, revision notes)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id, pid } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  // Verify contractor exists
  const contractor = await getContractorById(tenantSlug, id)
  if (!contractor) {
    return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
  }

  // Get current project
  const currentProject = await getProjectById(tenantSlug, pid)
  if (!currentProject || currentProject.contractorId !== id) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const body = (await req.json()) as UpdateProjectRequest

  // Validate status transition if status is being changed
  if (body.status && body.status !== currentProject.status) {
    if (!canAdminTransitionTo(currentProject.status, body.status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${currentProject.status} to ${body.status}`,
          allowedTransitions: getAdminAllowedTransitions(currentProject.status),
        },
        { status: 400 },
      )
    }
  }

  // Validate due date if provided
  if (body.dueDate) {
    const dueDate = new Date(body.dueDate)
    if (dueDate < new Date()) {
      return NextResponse.json(
        { error: 'Due date must be in the future' },
        { status: 400 },
      )
    }
  }

  const project = await updateProject(tenantSlug, pid, body)
  if (!project) {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }

  return NextResponse.json(project)
}

/**
 * DELETE /api/admin/contractors/[id]/projects/[pid]
 * Delete project
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id, pid } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  // Verify contractor exists
  const contractor = await getContractorById(tenantSlug, id)
  if (!contractor) {
    return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
  }

  // Get current project
  const currentProject = await getProjectById(tenantSlug, pid)
  if (!currentProject || currentProject.contractorId !== id) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Don't allow deleting projects that have been paid out
  if (currentProject.status === 'payout_approved') {
    return NextResponse.json(
      { error: 'Cannot delete a project that has been paid out' },
      { status: 400 },
    )
  }

  const deleted = await deleteProject(tenantSlug, pid)
  if (!deleted) {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

function getAdminAllowedTransitions(status: ProjectStatus): ProjectStatus[] {
  const transitions: Record<ProjectStatus, ProjectStatus[]> = {
    pending_contractor: [],
    draft: [],
    in_progress: [],
    submitted: ['approved', 'revision_requested'],
    revision_requested: [],
    approved: ['payout_ready'],
    payout_ready: [],
    withdrawal_requested: ['payout_approved'],
    payout_approved: [],
  }
  return transitions[status]
}
