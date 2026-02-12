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

    // Get active brand membership
    const activeMembership = context.memberships.find((m) => m.status === 'active')
    if (!activeMembership) {
      return Response.json({ error: 'No active brand membership' }, { status: 403 })
    }

    const tenantSlug = activeMembership.brandSlug

    const project = await getProject(tenantSlug, projectId, context.creatorId)

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

    // Get active brand membership
    const activeMembership = context.memberships.find((m) => m.status === 'active')
    if (!activeMembership) {
      return Response.json({ error: 'No active brand membership' }, { status: 403 })
    }

    const tenantSlug = activeMembership.brandSlug

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
