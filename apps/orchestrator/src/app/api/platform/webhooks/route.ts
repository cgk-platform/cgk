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
 * GET /api/platform/webhooks
 *
 * Get webhook delivery status across tenants.
 * Requires: Super admin access
 *
 * Query params:
 * - tenantId: Filter by tenant
 * - status: Filter by status (pending, delivered, failed, retrying)
 * - eventType: Filter by event type
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
    const eventType = url.searchParams.get('eventType')
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
          pw.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM platform_webhooks pw
        LEFT JOIN organizations o ON o.id = pw.tenant_id
        WHERE pw.tenant_id = ${tenantId}
          AND pw.status = ${status}
        ORDER BY pw.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (tenantId) {
      result = await sql`
        SELECT
          pw.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM platform_webhooks pw
        LEFT JOIN organizations o ON o.id = pw.tenant_id
        WHERE pw.tenant_id = ${tenantId}
        ORDER BY pw.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (status) {
      result = await sql`
        SELECT
          pw.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM platform_webhooks pw
        LEFT JOIN organizations o ON o.id = pw.tenant_id
        WHERE pw.status = ${status}
        ORDER BY pw.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (eventType) {
      result = await sql`
        SELECT
          pw.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM platform_webhooks pw
        LEFT JOIN organizations o ON o.id = pw.tenant_id
        WHERE pw.event_type = ${eventType}
        ORDER BY pw.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      result = await sql`
        SELECT
          pw.*,
          o.name as tenant_name,
          o.slug as tenant_slug
        FROM platform_webhooks pw
        LEFT JOIN organizations o ON o.id = pw.tenant_id
        ORDER BY pw.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    // Get summary stats
    const statsResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status = 'retrying') as retrying_count,
        COUNT(*) FILTER (WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours') as failed_24h
      FROM platform_webhooks
    `

    const stats = statsResult.rows[0] as Record<string, unknown>

    const webhooks = result.rows.map((row) => {
      const r = row as Record<string, unknown>
      return {
        id: r.id,
        tenantId: r.tenant_id,
        tenantName: r.tenant_name,
        tenantSlug: r.tenant_slug,
        eventType: r.event_type,
        targetUrl: r.target_url,
        status: r.status,
        attempts: r.attempts,
        maxAttempts: r.max_attempts,
        lastAttemptAt: r.last_attempt_at,
        lastError: r.last_error,
        responseStatus: r.response_status,
        deliveredAt: r.delivered_at,
        createdAt: r.created_at,
        canRedeliver: r.status === 'failed',
      }
    })

    return Response.json({
      webhooks,
      limit,
      offset,
      stats: {
        pendingCount: parseInt(stats.pending_count as string, 10) || 0,
        deliveredCount: parseInt(stats.delivered_count as string, 10) || 0,
        failedCount: parseInt(stats.failed_count as string, 10) || 0,
        retryingCount: parseInt(stats.retrying_count as string, 10) || 0,
        failed24h: parseInt(stats.failed_24h as string, 10) || 0,
      },
    })
  } catch (error) {
    console.error('Get webhooks error:', error)
    return Response.json({ error: 'Failed to get webhooks' }, { status: 500 })
  }
}
