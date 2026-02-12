/**
 * Project Submission API Route
 *
 * POST /api/creator/projects/[id]/submit - Submit project for review
 */

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import { submitProject, type SubmitProjectInput } from '@/lib/projects'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Submit project for review
 */
export async function POST(req: Request, { params }: RouteParams): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const { id: projectId } = await params

    // Parse body (optional notes)
    let input: SubmitProjectInput = {}
    try {
      const body = await req.json()
      input = body as SubmitProjectInput
    } catch {
      // No body is OK
    }

    // Get active brand membership
    const activeMembership = context.memberships.find((m) => m.status === 'active')
    if (!activeMembership) {
      return Response.json({ error: 'No active brand membership' }, { status: 403 })
    }

    const tenantSlug = activeMembership.brandSlug

    const project = await submitProject(tenantSlug, projectId, context.creatorId, input)

    return Response.json({
      project,
      message: 'Project submitted successfully',
    })
  } catch (error) {
    console.error('Error submitting project:', error)
    const message = error instanceof Error ? error.message : 'Failed to submit project'
    return Response.json({ error: message }, { status: 400 })
  }
}
