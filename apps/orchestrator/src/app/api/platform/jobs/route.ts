import { sql } from '@cgk/db'

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
 * GET /api/platform/jobs
 *
 * Get cross-tenant job status.
 * Requires: Super admin access
 *
 * Query params:
 * - tenantId: Filter by tenant
 * - status: Filter by status (pending, running, completed, failed, cancelled)
 * - jobType: Filter by job type
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
    const status = url.searchParams.get('status')
    const jobType = url.searchParams.get('jobType')
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '50', 10),
      100
    )
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    // Build query based on filters
    let result

    if (tenantId && status) {
      result = await sql`
        SELECT
          pj.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM platform_jobs pj
        LEFT JOIN organizations o ON o.id = pj.tenant_id
        WHERE pj.tenant_id = ${tenantId}
          AND pj.status = ${status}
        ORDER BY pj.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (tenantId) {
      result = await sql`
        SELECT
          pj.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM platform_jobs pj
        LEFT JOIN organizations o ON o.id = pj.tenant_id
        WHERE pj.tenant_id = ${tenantId}
        ORDER BY pj.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (status) {
      result = await sql`
        SELECT
          pj.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM platform_jobs pj
        LEFT JOIN organizations o ON o.id = pj.tenant_id
        WHERE pj.status = ${status}
        ORDER BY pj.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (jobType) {
      result = await sql`
        SELECT
          pj.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM platform_jobs pj
        LEFT JOIN organizations o ON o.id = pj.tenant_id
        WHERE pj.job_type = ${jobType}
        ORDER BY pj.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      result = await sql`
        SELECT
          pj.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM platform_jobs pj
        LEFT JOIN organizations o ON o.id = pj.tenant_id
        ORDER BY pj.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    // Get summary stats
    const statsResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'running') as running_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) FILTER (WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours') as failed_24h
      FROM platform_jobs
    `

    const stats = statsResult.rows[0] as Record<string, unknown>

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
        result: r.result,
        errorMessage: r.error_message,
        attempts: r.attempts,
        maxAttempts: r.max_attempts,
        scheduledAt: r.scheduled_at,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }
    })

    return Response.json({
      jobs,
      limit,
      offset,
      stats: {
        pendingCount: parseInt(stats.pending_count as string, 10) || 0,
        runningCount: parseInt(stats.running_count as string, 10) || 0,
        completedCount: parseInt(stats.completed_count as string, 10) || 0,
        failedCount: parseInt(stats.failed_count as string, 10) || 0,
        cancelledCount: parseInt(stats.cancelled_count as string, 10) || 0,
        failed24h: parseInt(stats.failed_24h as string, 10) || 0,
      },
    })
  } catch (error) {
    console.error('Get platform jobs error:', error)
    return Response.json({ error: 'Failed to get jobs' }, { status: 500 })
  }
}

/**
 * POST /api/platform/jobs
 *
 * Create a new platform job (typically called by job system).
 * Requires: Super admin access or API key
 */
export async function POST(request: Request) {
  try {
    const { isSuperAdmin } = getRequestContext(request)

    // Allow super admin or system API key
    const apiKey = request.headers.get('x-api-key')
    if (!isSuperAdmin && apiKey !== process.env.PLATFORM_API_KEY) {
      return Response.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const {
      id,
      tenantId,
      jobType,
      status = 'pending',
      payload = {},
      maxAttempts = 3,
      scheduledAt,
    } = body

    if (!id || !jobType) {
      return Response.json(
        { error: 'id and jobType are required' },
        { status: 400 }
      )
    }

    await sql`
      INSERT INTO platform_jobs (
        id, tenant_id, job_type, status, payload, max_attempts, scheduled_at
      )
      VALUES (
        ${id},
        ${tenantId || null},
        ${jobType},
        ${status},
        ${JSON.stringify(payload)}::jsonb,
        ${maxAttempts},
        ${scheduledAt || null}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        payload = EXCLUDED.payload,
        updated_at = NOW()
    `

    return Response.json({ success: true })
  } catch (error) {
    console.error('Create platform job error:', error)
    return Response.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
