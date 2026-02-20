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
 * GET /api/platform/errors/aggregate
 *
 * Get aggregated error patterns for analysis.
 * Requires: Super admin access
 *
 * Query params:
 * - tenantId: Filter by tenant
 * - severity: Filter by severity
 * - since: ISO date string for time range (default: 24h ago)
 * - limit: Max patterns (default 20)
 */
export async function GET(request: Request) {
  try {
    const { isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const tenantId = url.searchParams.get('tenantId')
    const severity = url.searchParams.get('severity')
    const since = url.searchParams.get('since') || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '20', 10),
      100
    )

    // Get aggregated error patterns
    let result

    if (tenantId && severity) {
      result = await sql`
        SELECT
          pattern_hash,
          error_type,
          message,
          severity,
          COUNT(*) as occurrence_count,
          COUNT(DISTINCT tenant_id) as affected_tenants,
          MIN(occurred_at) as first_occurrence,
          MAX(occurred_at) as last_occurrence,
          COUNT(*) FILTER (WHERE status = 'open') as open_count,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count
        FROM public.platform_errors
        WHERE occurred_at >= ${since}
          AND tenant_id = ${tenantId}
          AND severity = ${severity}
        GROUP BY pattern_hash, error_type, message, severity
        ORDER BY occurrence_count DESC
        LIMIT ${limit}
      `
    } else if (tenantId) {
      result = await sql`
        SELECT
          pattern_hash,
          error_type,
          message,
          severity,
          COUNT(*) as occurrence_count,
          COUNT(DISTINCT tenant_id) as affected_tenants,
          MIN(occurred_at) as first_occurrence,
          MAX(occurred_at) as last_occurrence,
          COUNT(*) FILTER (WHERE status = 'open') as open_count,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count
        FROM public.platform_errors
        WHERE occurred_at >= ${since}
          AND tenant_id = ${tenantId}
        GROUP BY pattern_hash, error_type, message, severity
        ORDER BY occurrence_count DESC
        LIMIT ${limit}
      `
    } else if (severity) {
      result = await sql`
        SELECT
          pattern_hash,
          error_type,
          message,
          severity,
          COUNT(*) as occurrence_count,
          COUNT(DISTINCT tenant_id) as affected_tenants,
          MIN(occurred_at) as first_occurrence,
          MAX(occurred_at) as last_occurrence,
          COUNT(*) FILTER (WHERE status = 'open') as open_count,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count
        FROM public.platform_errors
        WHERE occurred_at >= ${since}
          AND severity = ${severity}
        GROUP BY pattern_hash, error_type, message, severity
        ORDER BY occurrence_count DESC
        LIMIT ${limit}
      `
    } else {
      result = await sql`
        SELECT
          pattern_hash,
          error_type,
          message,
          severity,
          COUNT(*) as occurrence_count,
          COUNT(DISTINCT tenant_id) as affected_tenants,
          MIN(occurred_at) as first_occurrence,
          MAX(occurred_at) as last_occurrence,
          COUNT(*) FILTER (WHERE status = 'open') as open_count,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count
        FROM public.platform_errors
        WHERE occurred_at >= ${since}
        GROUP BY pattern_hash, error_type, message, severity
        ORDER BY occurrence_count DESC
        LIMIT ${limit}
      `
    }

    const patterns = result.rows.map((row) => {
      const r = row as Record<string, unknown>
      return {
        patternHash: r.pattern_hash,
        errorType: r.error_type,
        message: r.message,
        severity: r.severity,
        occurrenceCount: parseInt(r.occurrence_count as string, 10),
        affectedTenants: parseInt(r.affected_tenants as string, 10),
        firstOccurrence: r.first_occurrence,
        lastOccurrence: r.last_occurrence,
        openCount: parseInt(r.open_count as string, 10),
        resolvedCount: parseInt(r.resolved_count as string, 10),
      }
    })

    // Get overall stats for the time period
    const statsResult = await sql`
      SELECT
        COUNT(*) as total_errors,
        COUNT(DISTINCT pattern_hash) as unique_patterns,
        COUNT(DISTINCT tenant_id) as affected_tenants,
        COUNT(*) FILTER (WHERE severity = 'p1') as p1_count,
        COUNT(*) FILTER (WHERE severity = 'p2') as p2_count,
        COUNT(*) FILTER (WHERE severity = 'p3') as p3_count
      FROM public.platform_errors
      WHERE occurred_at >= ${since}
    `

    const stats = statsResult.rows[0] as Record<string, unknown>

    return Response.json({
      patterns,
      stats: {
        totalErrors: parseInt(stats.total_errors as string, 10) || 0,
        uniquePatterns: parseInt(stats.unique_patterns as string, 10) || 0,
        affectedTenants: parseInt(stats.affected_tenants as string, 10) || 0,
        p1Count: parseInt(stats.p1_count as string, 10) || 0,
        p2Count: parseInt(stats.p2_count as string, 10) || 0,
        p3Count: parseInt(stats.p3_count as string, 10) || 0,
      },
      since,
    })
  } catch (error) {
    console.error('Get error aggregates error:', error)
    return Response.json({ error: 'Failed to get error aggregates' }, { status: 500 })
  }
}
