/**
 * Creator Projects API Route
 *
 * GET /api/creator/projects - List projects with filters
 */

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import { getProjects, getProjectStats, type ProjectListOptions, type ProjectStatus } from '@/lib/projects'

export const dynamic = 'force-dynamic'

/**
 * List projects for the authenticated creator
 */
export async function GET(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const brandId = url.searchParams.get('brandId') || undefined
    const status = url.searchParams.get('status') || undefined
    const search = url.searchParams.get('search') || undefined
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    const sortBy = (url.searchParams.get('sortBy') as ProjectListOptions['sortBy']) || 'created_at'
    const sortDir = (url.searchParams.get('sortDir') as ProjectListOptions['sortDir']) || 'desc'

    // Get active brand membership
    const activeMembership = context.memberships.find((m) => m.status === 'active')
    if (!activeMembership) {
      return Response.json({ error: 'No active brand membership' }, { status: 403 })
    }

    const tenantSlug = activeMembership.brandSlug

    // Build filters
    const options: ProjectListOptions = {
      brandId,
      search,
      limit,
      offset,
      sortBy,
      sortDir,
    }

    if (status) {
      const statusArray = status.split(',').filter(Boolean) as ProjectStatus[]
      options.status = statusArray.length === 1 ? statusArray[0] : statusArray
    }

    // Get projects
    const { projects, total } = await getProjects(tenantSlug, context.creatorId, options)

    // Get stats
    const stats = await getProjectStats(tenantSlug, context.creatorId)

    return Response.json({
      projects,
      total,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: offset + projects.length < total,
      },
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return Response.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}
