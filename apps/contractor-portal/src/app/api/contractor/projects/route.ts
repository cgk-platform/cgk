/**
 * Contractor Projects List API
 *
 * GET /api/contractor/projects - Get all projects for the contractor
 */

import { getContractorProjects, getProjectsByKanbanColumn, getContractorDashboardStats } from '@/lib/projects'
import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  try {
    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'list'
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    if (view === 'kanban') {
      // Return projects grouped by Kanban column
      const grouped = await getProjectsByKanbanColumn(auth.contractorId, auth.tenantSlug)
      const stats = await getContractorDashboardStats(auth.contractorId, auth.tenantSlug)

      return Response.json({
        columns: grouped,
        stats,
      })
    }

    // Return flat list of projects
    let projects = await getContractorProjects(auth.contractorId, auth.tenantSlug)

    // Filter by status if provided
    if (status) {
      projects = projects.filter((p) => p.status === status)
    }

    // Filter by search term if provided
    if (search) {
      const searchLower = search.toLowerCase()
      projects = projects.filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          (p.description && p.description.toLowerCase().includes(searchLower))
      )
    }

    const stats = await getContractorDashboardStats(auth.contractorId, auth.tenantSlug)

    return Response.json({
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        dueDate: p.dueDate?.toISOString() || null,
        rateCents: p.rateCents,
        rateType: p.rateType,
        deliverables: p.deliverables,
        submittedAt: p.submittedAt?.toISOString() || null,
        approvedAt: p.approvedAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      stats,
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return Response.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
