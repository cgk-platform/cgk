/**
 * Creator Projects API Route
 *
 * GET /api/creator/projects - List projects with filters
 *
 * Supports brand context filtering via cookie:
 * - If brand is selected: returns projects for that brand only
 * - If no brand selected ("All Brands"): returns projects across all brands
 */

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import { getBrandFilter, getAccessibleBrandSlugs } from '@/lib/brand-filter'
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

    // Get brand filter - prioritize URL param, then cookie
    const brandIdParam = url.searchParams.get('brandId') || undefined
    const { brandId: cookieBrandId, brandSlug: cookieBrandSlug } = getBrandFilter(req, context)

    // Use URL param if provided, otherwise use cookie
    const effectiveBrandId = brandIdParam || cookieBrandId || undefined

    const status = url.searchParams.get('status') || undefined
    const search = url.searchParams.get('search') || undefined
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    const sortBy = (url.searchParams.get('sortBy') as ProjectListOptions['sortBy']) || 'created_at'
    const sortDir = (url.searchParams.get('sortDir') as ProjectListOptions['sortDir']) || 'desc'

    // Determine which brand slugs to query
    // Projects use tenant schema, so we need a brand slug for the withTenant call
    let tenantSlug: string

    if (effectiveBrandId) {
      // Find the brand slug for the selected brand
      const membership = context.memberships.find(
        (m) => m.brandId === effectiveBrandId && m.status === 'active'
      )
      if (!membership) {
        return Response.json({ error: 'Brand not found or not active' }, { status: 403 })
      }
      tenantSlug = membership.brandSlug
    } else {
      // "All Brands" mode - need to query from first available brand
      // In this mode, we query from each brand and combine results
      const accessibleSlugs = getAccessibleBrandSlugs(context)
      if (accessibleSlugs.length === 0) {
        return Response.json({ error: 'No active brand membership' }, { status: 403 })
      }
      const firstSlug = accessibleSlugs[0]
      if (!firstSlug) {
        return Response.json({ error: 'No active brand membership' }, { status: 403 })
      }
      tenantSlug = firstSlug
    }

    // Build filters
    const options: ProjectListOptions = {
      brandId: effectiveBrandId,
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

    // If "All Brands" mode and multiple brands, aggregate results from all brands
    let projects: Awaited<ReturnType<typeof getProjects>>['projects'] = []
    let total = 0
    let stats: Awaited<ReturnType<typeof getProjectStats>> | null = null

    if (!effectiveBrandId) {
      // Query from each brand and aggregate
      const accessibleSlugs = getAccessibleBrandSlugs(context)

      const results = await Promise.all(
        accessibleSlugs.map(async (slug) => {
          try {
            return await getProjects(slug, context.creatorId, options)
          } catch {
            // If a brand's schema doesn't have the table, skip it
            return { projects: [], total: 0 }
          }
        })
      )

      // Combine results
      for (const result of results) {
        projects = [...projects, ...result.projects]
        total += result.total
      }

      // Sort combined results by created_at desc
      projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Apply pagination to combined results
      projects = projects.slice(offset, offset + limit)

      // Get aggregated stats from all brands
      const statsResults = await Promise.all(
        accessibleSlugs.map(async (slug) => {
          try {
            return await getProjectStats(slug, context.creatorId)
          } catch {
            return {
              total: 0,
              draft: 0,
              submitted: 0,
              inReview: 0,
              revisionRequested: 0,
              approved: 0,
              completed: 0,
              totalEarningsCents: 0,
            }
          }
        })
      )

      // Aggregate stats
      stats = statsResults.reduce(
        (acc, s) => ({
          total: acc.total + s.total,
          draft: acc.draft + s.draft,
          submitted: acc.submitted + s.submitted,
          inReview: acc.inReview + s.inReview,
          revisionRequested: acc.revisionRequested + s.revisionRequested,
          approved: acc.approved + s.approved,
          completed: acc.completed + s.completed,
          totalEarningsCents: acc.totalEarningsCents + s.totalEarningsCents,
        }),
        {
          total: 0,
          draft: 0,
          submitted: 0,
          inReview: 0,
          revisionRequested: 0,
          approved: 0,
          completed: 0,
          totalEarningsCents: 0,
        }
      )
    } else {
      // Single brand mode
      const result = await getProjects(tenantSlug, context.creatorId, options)
      projects = result.projects
      total = result.total
      stats = await getProjectStats(tenantSlug, context.creatorId)
    }

    return Response.json({
      projects,
      total,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: offset + projects.length < total,
      },
      filter: {
        brandId: effectiveBrandId || null,
        brandSlug: cookieBrandSlug || null,
        isFiltered: !!effectiveBrandId,
      },
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return Response.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}
