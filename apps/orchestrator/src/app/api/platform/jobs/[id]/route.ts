import { sql } from '@cgk/db'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

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
 * GET /api/platform/jobs/[id]
 *
 * Get job details including full logs.
 * Requires: Super admin access
 */
export async function GET(request: Request, { params }: RouteParams) {
  const resolvedParams = await params
  const jobId = resolvedParams.id

  try {
    const { isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const result = await sql`
      SELECT
        pj.*,
        o.name as tenant_name,
        o.slug as tenant_slug
      FROM platform_jobs pj
      LEFT JOIN organizations o ON o.id = pj.tenant_id
      WHERE pj.id = ${jobId}
    `

    if (result.rows.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }

    const r = result.rows[0] as Record<string, unknown>

    const job = {
      id: r.id,
      tenantId: r.tenant_id,
      tenantName: r.tenant_name,
      tenantSlug: r.tenant_slug,
      jobType: r.job_type,
      status: r.status,
      payload: r.payload,
      result: r.result,
      errorMessage: r.error_message,
      errorStack: r.error_stack,
      attempts: r.attempts,
      maxAttempts: r.max_attempts,
      scheduledAt: r.scheduled_at,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      canRetry: r.status === 'failed' && (r.attempts as number) < (r.max_attempts as number),
    }

    return Response.json({ job })
  } catch (error) {
    console.error('Get job detail error:', error)
    return Response.json({ error: 'Failed to get job details' }, { status: 500 })
  }
}

/**
 * PATCH /api/platform/jobs/[id]
 *
 * Update job status (typically called by job system).
 * Requires: Super admin access or API key
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const resolvedParams = await params
  const jobId = resolvedParams.id

  try {
    const { isSuperAdmin } = getRequestContext(request)

    // Allow super admin or system API key
    const apiKey = request.headers.get('x-api-key')
    if (!isSuperAdmin && apiKey !== process.env.PLATFORM_API_KEY) {
      return Response.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { status, result, errorMessage, errorStack, startedAt, completedAt } = body

    if (status && !['pending', 'running', 'completed', 'failed', 'cancelled'].includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Build update based on provided fields
    if (status === 'running') {
      await sql`
        UPDATE platform_jobs
        SET status = 'running',
            started_at = ${startedAt || new Date().toISOString()},
            attempts = attempts + 1,
            updated_at = NOW()
        WHERE id = ${jobId}
      `
    } else if (status === 'completed') {
      await sql`
        UPDATE platform_jobs
        SET status = 'completed',
            result = ${result ? JSON.stringify(result) : null}::jsonb,
            completed_at = ${completedAt || new Date().toISOString()},
            updated_at = NOW()
        WHERE id = ${jobId}
      `
    } else if (status === 'failed') {
      await sql`
        UPDATE platform_jobs
        SET status = 'failed',
            error_message = ${errorMessage || null},
            error_stack = ${errorStack || null},
            completed_at = ${completedAt || new Date().toISOString()},
            updated_at = NOW()
        WHERE id = ${jobId}
      `
    } else if (status === 'cancelled') {
      await sql`
        UPDATE platform_jobs
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE id = ${jobId}
      `
    } else if (status === 'pending') {
      await sql`
        UPDATE platform_jobs
        SET status = 'pending',
            updated_at = NOW()
        WHERE id = ${jobId}
      `
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Update job error:', error)
    return Response.json({ error: 'Failed to update job' }, { status: 500 })
  }
}
