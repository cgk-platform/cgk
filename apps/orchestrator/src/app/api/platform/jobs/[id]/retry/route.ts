import { logAuditAction } from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'

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
 * POST /api/platform/jobs/[id]/retry
 *
 * Retry a failed job.
 * Requires: Super admin access
 */
export async function POST(request: Request, { params }: RouteParams) {
  const resolvedParams = await params
  const jobId = resolvedParams.id

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    const { userId, isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    // Get current job state
    const currentResult = await sql`
      SELECT * FROM platform_jobs WHERE id = ${jobId}
    `

    if (currentResult.rows.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }

    const job = currentResult.rows[0] as Record<string, unknown>

    if (job.status !== 'failed') {
      return Response.json(
        { error: 'Only failed jobs can be retried' },
        { status: 400 }
      )
    }

    if ((job.attempts as number) >= (job.max_attempts as number)) {
      // Increase max attempts to allow retry
      await sql`
        UPDATE platform_jobs
        SET max_attempts = max_attempts + 1
        WHERE id = ${jobId}
      `
    }

    // Reset job to pending for retry
    await sql`
      UPDATE platform_jobs
      SET status = 'pending',
          error_message = NULL,
          error_stack = NULL,
          scheduled_at = NOW(),
          started_at = NULL,
          completed_at = NULL,
          updated_at = NOW()
      WHERE id = ${jobId}
    `

    // Log the retry action
    await logAuditAction({
      userId,
      action: 'api_request',
      resourceType: 'api',
      resourceId: jobId,
      tenantId: job.tenant_id as string | null,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      metadata: {
        action: 'retry_job',
        jobType: job.job_type,
        previousAttempts: job.attempts,
      },
    })

    return Response.json({ success: true, message: 'Job queued for retry' })
  } catch (error) {
    console.error('Retry job error:', error)
    return Response.json({ error: 'Failed to retry job' }, { status: 500 })
  }
}
