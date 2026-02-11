/**
 * GET /api/admin/creator-pipeline
 * Get pipeline projects with filters
 */

import { headers } from 'next/headers'

import { getPipelineProjects, getPipelineStats } from '@/lib/pipeline/db'
import type { PipelineFilters, ProjectStatus, RiskLevel } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const { searchParams } = new URL(request.url)

    // Parse filter parameters
    const filters: PipelineFilters = {}

    const search = searchParams.get('search')
    if (search) filters.search = search

    const statuses = searchParams.getAll('status')
    if (statuses.length > 0) filters.statuses = statuses as ProjectStatus[]

    const creatorIds = searchParams.getAll('creatorId')
    if (creatorIds.length > 0) filters.creatorIds = creatorIds

    const dateFrom = searchParams.get('dateFrom')
    if (dateFrom) filters.dateFrom = dateFrom

    const dateTo = searchParams.get('dateTo')
    if (dateTo) filters.dateTo = dateTo

    const riskLevels = searchParams.getAll('riskLevel')
    if (riskLevels.length > 0) filters.riskLevels = riskLevels as RiskLevel[]

    const minValue = searchParams.get('minValue')
    if (minValue) filters.minValueCents = parseInt(minValue, 10)

    const maxValue = searchParams.get('maxValue')
    if (maxValue) filters.maxValueCents = parseInt(maxValue, 10)

    const hasFiles = searchParams.get('hasFiles')
    if (hasFiles === 'true') filters.hasFiles = true

    const hasUnread = searchParams.get('hasUnreadMessages')
    if (hasUnread === 'true') filters.hasUnreadMessages = true

    const tags = searchParams.getAll('tag')
    if (tags.length > 0) filters.tags = tags

    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)

    // Fetch projects and stats in parallel
    const [projectsResult, stats] = await Promise.all([
      getPipelineProjects(tenantSlug, filters, page, limit),
      getPipelineStats(tenantSlug),
    ])

    return Response.json({
      projects: projectsResult.projects,
      total: projectsResult.total,
      stats,
      page,
      limit,
    })
  } catch (error) {
    console.error('Pipeline projects error:', error)
    return Response.json(
      { error: 'Failed to fetch pipeline projects' },
      { status: 500 }
    )
  }
}
