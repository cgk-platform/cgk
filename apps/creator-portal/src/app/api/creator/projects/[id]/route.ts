/**
 * Creator Project Detail API Route
 *
 * GET /api/creator/projects/[id] - Get project details
 * PATCH /api/creator/projects/[id] - Update project
 */

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import { getProject, updateProject, canEditProject, type UpdateProjectInput } from '@/lib/projects'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Get project details with files and revisions
 */
export async function GET(req: Request, { params }: RouteParams): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const { id: projectId } = await params

    // Search all active brand memberships to find the project's actual brand.
    // A creator may belong to multiple brands; the project lives in exactly one
    // tenant schema, so we iterate until we find it.
    const activeMemberships = context.memberships.filter((m) => m.status === 'active')
    if (activeMemberships.length === 0) {
      return Response.json({ error: 'No active brand membership' }, { status: 403 })
    }

    let project = null
    for (const membership of activeMemberships) {
      project = await getProject(membership.brandSlug, projectId, context.creatorId)
      if (project) break
    }

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    return Response.json({
      project,
      canEdit: canEditProject(project),
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return Response.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

/**
 * Update project details
 */
export async function PATCH(req: Request, { params }: RouteParams): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const { id: projectId } = await params
    const body = (await req.json()) as UpdateProjectInput

    // Search all active brand memberships to find the project's brand.
    const activeMemberships = context.memberships.filter((m) => m.status === 'active')
    if (activeMemberships.length === 0) {
      return Response.json({ error: 'No active brand membership' }, { status: 403 })
    }

    // Find which brand this project belongs to
    let tenantSlug: string | null = null
    for (const membership of activeMemberships) {
      const existing = await getProject(membership.brandSlug, projectId, context.creatorId)
      if (existing) {
        tenantSlug = membership.brandSlug
        break
      }
    }

    if (!tenantSlug) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    // Parse due date if provided
    const input: UpdateProjectInput = { ...body }
    if (body.dueDate && typeof body.dueDate === 'string') {
      input.dueDate = new Date(body.dueDate)
    }

    const project = await updateProject(tenantSlug, projectId, context.creatorId, input)

    return Response.json({ project })
  } catch (error) {
    console.error('Error updating project:', error)
    const message = error instanceof Error ? error.message : 'Failed to update project'
    return Response.json({ error: message }, { status: 400 })
  }
}
