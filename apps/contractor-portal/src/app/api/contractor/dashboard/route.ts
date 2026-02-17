/**
 * Contractor Dashboard API
 *
 * GET /api/contractor/dashboard - Get dashboard stats for the authenticated contractor
 */

import { getContractorDashboardStats } from '@/lib/projects'
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
    const stats = await getContractorDashboardStats(auth.contractorId, auth.tenantSlug)

    return Response.json({
      contractor: {
        id: auth.contractorId,
        name: auth.name,
        email: auth.email,
      },
      stats,
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return Response.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
