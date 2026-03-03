/**
 * Contractor Dashboard API
 *
 * GET /api/contractor/dashboard - Get dashboard stats for the authenticated contractor
 */

import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'
import { getContractorDashboardStats } from '@/lib/projects'
import { logger } from '@cgk-platform/logging'

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
    logger.error('Error fetching dashboard:', error instanceof Error ? error : new Error(String(error)))
    return Response.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
