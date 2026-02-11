/**
 * Report Run API
 *
 * POST /api/admin/analytics/reports/[id]/run - Execute a report
 */

import { requireAuth } from '@cgk/auth'

import { completeReportRun, createReportRun, getAnalyticsReportById } from '@/lib/analytics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = await requireAuth(req)
  const { id } = await params

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  // Verify report exists
  const report = await getAnalyticsReportById(tenantId, id)
  if (!report) {
    return Response.json({ error: 'Report not found' }, { status: 404 })
  }

  // Create a run record
  const run = await createReportRun(tenantId, id)

  try {
    // Execute the report based on its configuration
    // This is a simplified implementation - in production you would
    // use the report.config to generate actual queries
    const resultData = await executeReport(report.config)

    await completeReportRun(tenantId, run.id, { data: resultData })

    return Response.json({
      run: {
        ...run,
        status: 'completed',
        resultData,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await completeReportRun(tenantId, run.id, { error: errorMessage })

    return Response.json(
      {
        run: {
          ...run,
          status: 'failed',
          errorMessage,
        },
      },
      { status: 500 }
    )
  }
}

async function executeReport(config: unknown): Promise<unknown> {
  // Simplified report execution - returns sample data
  // In production, this would use the config to generate SQL queries
  // and aggregate the results
  return {
    generatedAt: new Date().toISOString(),
    rowCount: 100,
    data: [
      { date: '2024-01-01', revenue: 12500, orders: 42 },
      { date: '2024-01-02', revenue: 15800, orders: 51 },
      { date: '2024-01-03', revenue: 9200, orders: 35 },
    ],
    summary: {
      totalRevenue: 37500,
      totalOrders: 128,
      avgOrderValue: 293.0,
    },
  }
}
