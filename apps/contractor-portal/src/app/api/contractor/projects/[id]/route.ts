/**
 * Contractor Project Detail API
 *
 * GET /api/contractor/projects/[id] - Get project details
 * PATCH /api/contractor/projects/[id] - Update project status
 */

import { getProjectById, updateProjectStatus } from '@/lib/projects'
import type { ProjectStatus } from '@/lib/types'
import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: RouteParams) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  try {
    const { id } = await params
    const project = await getProjectById(id, auth.contractorId, auth.tenantSlug)

    if (!project) {
      return Response.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return Response.json({
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        status: project.status,
        dueDate: project.dueDate?.toISOString() || null,
        rateCents: project.rateCents,
        rateType: project.rateType,
        deliverables: project.deliverables,
        submittedWork: project.submittedWork
          ? {
              files: project.submittedWork.files,
              links: project.submittedWork.links,
              notes: project.submittedWork.notes,
              submittedAt: project.submittedWork.submittedAt.toISOString(),
            }
          : null,
        revisionNotes: project.revisionNotes,
        submittedAt: project.submittedAt?.toISOString() || null,
        approvedAt: project.approvedAt?.toISOString() || null,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return Response.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { status } = body as { status?: ProjectStatus }

    if (!status) {
      return Response.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    const project = await updateProjectStatus(
      id,
      auth.contractorId,
      status,
      auth.tenantSlug
    )

    return Response.json({
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        updatedAt: project.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error updating project:', error)
    const message = error instanceof Error ? error.message : 'Failed to update project'
    return Response.json(
      { error: message },
      { status: 400 }
    )
  }
}
