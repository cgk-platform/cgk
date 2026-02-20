import { sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'

/**
 * Helper to get request context from headers (set by middleware)
 */
function getRequestContext(request: Request): {
  userId: string
  sessionId: string
  isSuperAdmin: boolean
} {
  return {
    userId: request.headers.get('x-user-id') || '',
    sessionId: request.headers.get('x-session-id') || '',
    isSuperAdmin: request.headers.get('x-is-super-admin') === 'true',
  }
}

/**
 * GET /api/platform/jobs/failed
 *
 * Get failed jobs queue with tenant information.
 * Requires: Super admin access
 *
 * Query params:
 * - tenantId: Filter by tenant
 * - since: ISO date string (default: 7 days ago)
 * - limit: Max results (default 50)
 * - offset: Pagination offset
 */
export async function GET(request: Request) {
  try {
    const { isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const tenantId = url.searchParams.get('tenantId')
    const since = url.searchParams.get('since') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '50', 10),
      100
    )
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    let result

    if (tenantId) {
      result = await sql`
        SELECT
          pj.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM public.platform_jobs pj
        LEFT JOIN public.organizations o ON o.id = pj.tenant_id
        WHERE pj.status = 'failed'
          AND pj.tenant_id = ${tenantId}
          AND pj.created_at >= ${since}
        ORDER BY pj.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      result = await sql`
        SELECT
          pj.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM public.platform_jobs pj
        LEFT JOIN public.organizations o ON o.id = pj.tenant_id
        WHERE pj.status = 'failed'
          AND pj.created_at >= ${since}
        ORDER BY pj.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    // Get failed job counts by type
    const byTypeResult = await sql`
      SELECT
        job_type,
        COUNT(*) as count
      FROM public.platform_jobs
      WHERE status = 'failed'
        AND created_at >= ${since}
      GROUP BY job_type
      ORDER BY count DESC
      LIMIT 10
    `

    // Get failed job counts by tenant
    const byTenantResult = await sql`
      SELECT
        pj.tenant_id,
        o.name as tenant_name,
        COUNT(*) as count
      FROM public.platform_jobs pj
      LEFT JOIN public.organizations o ON o.id = pj.tenant_id
      WHERE pj.status = 'failed'
        AND pj.created_at >= ${since}
      GROUP BY pj.tenant_id, o.name
      ORDER BY count DESC
      LIMIT 10
    `

    const jobs = result.rows.map((row) => {
      const r = row as Record<string, unknown>
      return {
        id: r.id,
        tenantId: r.tenant_id,
        tenantName: r.tenant_name,
        tenantSlug: r.tenant_slug,
        jobType: r.job_type,
        status: r.status,
        payload: r.payload,
        errorMessage: r.error_message,
        errorStack: r.error_stack,
        attempts: r.attempts,
        maxAttempts: r.max_attempts,
        scheduledAt: r.scheduled_at,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        createdAt: r.created_at,
        canRetry: (r.attempts as number) < (r.max_attempts as number),
      }
    })

    const byType = byTypeResult.rows.map((row) => ({
      jobType: (row as Record<string, unknown>).job_type,
      count: parseInt((row as Record<string, unknown>).count as string, 10),
    }))

    const byTenant = byTenantResult.rows.map((row) => ({
      tenantId: (row as Record<string, unknown>).tenant_id,
      tenantName: (row as Record<string, unknown>).tenant_name,
      count: parseInt((row as Record<string, unknown>).count as string, 10),
    }))

    return Response.json({
      jobs,
      limit,
      offset,
      since,
      summary: {
        byType,
        byTenant,
        total: jobs.length,
      },
    })
  } catch (error) {
    console.error('Get failed jobs error:', error)
    return Response.json({ error: 'Failed to get failed jobs' }, { status: 500 })
  }
}
