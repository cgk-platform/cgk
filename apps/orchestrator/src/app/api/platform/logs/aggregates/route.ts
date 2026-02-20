/**
 * Platform Logs Aggregates API - Error counts and log volume statistics
 *
 * GET /api/platform/logs/aggregates - Get error counts, log volume by level/tenant
 *
 * Requires: Super admin access
 */

import { sql } from '@cgk-platform/db'
import {
  getErrorAggregates,
  type ErrorAggregateFilters,
  type LogLevelName,
  type ServiceName,
} from '@cgk-platform/logging'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
 * Parse ISO date string or relative time (e.g., "1h", "24h", "7d")
 */
function parseTimeRange(value: string | null): Date | undefined {
  if (!value) return undefined

  // Check for relative time format
  const relativeMatch = value.match(/^(\d+)(m|h|d)$/)
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1] || '0', 10)
    const unit = relativeMatch[2]
    const now = new Date()

    switch (unit) {
      case 'm':
        return new Date(now.getTime() - amount * 60 * 1000)
      case 'h':
        return new Date(now.getTime() - amount * 60 * 60 * 1000)
      case 'd':
        return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000)
    }
  }

  // Try parsing as ISO date
  const date = new Date(value)
  return isNaN(date.getTime()) ? undefined : date
}

interface LogVolumeByLevel {
  level: LogLevelName
  count: number
  percentage: number
}

interface LogVolumeByTenant {
  tenantId: string | null
  tenantSlug: string | null
  count: number
  errorCount: number
  percentage: number
}

interface LogVolumeByService {
  service: ServiceName
  count: number
  errorCount: number
  percentage: number
}

interface TimeSeriesBucket {
  timestamp: string
  total: number
  errors: number
}

interface AggregateResponse {
  summary: {
    totalLogs: number
    totalErrors: number
    errorRate: number
    timeRange: {
      start: string
      end: string
    }
  }
  byLevel: LogVolumeByLevel[]
  byTenant: LogVolumeByTenant[]
  byService: LogVolumeByService[]
  timeSeries: TimeSeriesBucket[]
  topErrors: Awaited<ReturnType<typeof getErrorAggregates>>
}

/**
 * GET /api/platform/logs/aggregates
 *
 * Get aggregated log statistics including:
 * - Error counts by signature (grouped similar errors)
 * - Log volume by level
 * - Log volume by tenant
 * - Log volume by service
 * - Time series of log volume
 *
 * Query params:
 * - tenantId: Filter to specific tenant
 * - service: Filter to specific service
 * - startTime: Start of time range (ISO string or relative like "1h", "24h", "7d")
 * - endTime: End of time range (ISO string)
 * - interval: Time series bucket size (5m, 15m, 1h, 6h, 1d) - default "1h"
 */
export async function GET(request: Request) {
  try {
    const { isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)

    // Parse filters
    const tenantId = url.searchParams.get('tenantId') || undefined
    const service = url.searchParams.get('service') as ServiceName | undefined
    const startTime = parseTimeRange(url.searchParams.get('startTime')) || new Date(Date.now() - 24 * 60 * 60 * 1000) // Default: last 24 hours
    const endTime = parseTimeRange(url.searchParams.get('endTime')) || new Date()
    const interval = url.searchParams.get('interval') || '1h'

    // Get error aggregates using the logging package
    const errorFilters: ErrorAggregateFilters = {
      tenantId,
      service,
      startTime,
      endTime,
      minCount: 1,
    }
    const topErrors = await getErrorAggregates(errorFilters)

    // Get volume by level
    const byLevel = await getVolumeByLevel(tenantId, service, startTime, endTime)

    // Get volume by tenant
    const byTenant = await getVolumeByTenant(service, startTime, endTime)

    // Get volume by service
    const byService = await getVolumeByService(tenantId, startTime, endTime)

    // Get time series
    const timeSeries = await getTimeSeries(tenantId, service, startTime, endTime, interval)

    // Calculate summary
    const totalLogs = byLevel.reduce((sum, l) => sum + l.count, 0)
    const totalErrors = byLevel
      .filter((l) => l.level === 'error' || l.level === 'fatal')
      .reduce((sum, l) => sum + l.count, 0)

    const response: AggregateResponse = {
      summary: {
        totalLogs,
        totalErrors,
        errorRate: totalLogs > 0 ? (totalErrors / totalLogs) * 100 : 0,
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        },
      },
      byLevel,
      byTenant,
      byService,
      timeSeries,
      topErrors,
    }

    return Response.json(response)
  } catch (error) {
    console.error('Get log aggregates error:', error)
    return Response.json({ error: 'Failed to get log aggregates' }, { status: 500 })
  }
}

/**
 * Get log volume by level
 */
async function getVolumeByLevel(
  tenantId: string | undefined,
  service: ServiceName | undefined,
  startTime: Date,
  endTime: Date
): Promise<LogVolumeByLevel[]> {
  let result

  if (tenantId && service) {
    result = await sql`
      SELECT level, COUNT(*)::int as count
      FROM public.platform_logs
      WHERE tenant_id = ${tenantId}
        AND service = ${service}
        AND timestamp >= ${startTime.toISOString()}
        AND timestamp <= ${endTime.toISOString()}
      GROUP BY level
      ORDER BY count DESC
    `
  } else if (tenantId) {
    result = await sql`
      SELECT level, COUNT(*)::int as count
      FROM public.platform_logs
      WHERE tenant_id = ${tenantId}
        AND timestamp >= ${startTime.toISOString()}
        AND timestamp <= ${endTime.toISOString()}
      GROUP BY level
      ORDER BY count DESC
    `
  } else if (service) {
    result = await sql`
      SELECT level, COUNT(*)::int as count
      FROM public.platform_logs
      WHERE service = ${service}
        AND timestamp >= ${startTime.toISOString()}
        AND timestamp <= ${endTime.toISOString()}
      GROUP BY level
      ORDER BY count DESC
    `
  } else {
    result = await sql`
      SELECT level, COUNT(*)::int as count
      FROM public.platform_logs
      WHERE timestamp >= ${startTime.toISOString()}
        AND timestamp <= ${endTime.toISOString()}
      GROUP BY level
      ORDER BY count DESC
    `
  }

  const total = result.rows.reduce((sum, row) => sum + ((row as Record<string, unknown>).count as number), 0)

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      level: r.level as LogLevelName,
      count: r.count as number,
      percentage: total > 0 ? ((r.count as number) / total) * 100 : 0,
    }
  })
}

/**
 * Get log volume by tenant
 */
async function getVolumeByTenant(
  service: ServiceName | undefined,
  startTime: Date,
  endTime: Date
): Promise<LogVolumeByTenant[]> {
  let result

  if (service) {
    result = await sql`
      SELECT
        tenant_id,
        tenant_slug,
        COUNT(*)::int as count,
        COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as error_count
      FROM public.platform_logs
      WHERE service = ${service}
        AND timestamp >= ${startTime.toISOString()}
        AND timestamp <= ${endTime.toISOString()}
      GROUP BY tenant_id, tenant_slug
      ORDER BY count DESC
      LIMIT 20
    `
  } else {
    result = await sql`
      SELECT
        tenant_id,
        tenant_slug,
        COUNT(*)::int as count,
        COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as error_count
      FROM public.platform_logs
      WHERE timestamp >= ${startTime.toISOString()}
        AND timestamp <= ${endTime.toISOString()}
      GROUP BY tenant_id, tenant_slug
      ORDER BY count DESC
      LIMIT 20
    `
  }

  const total = result.rows.reduce((sum, row) => sum + ((row as Record<string, unknown>).count as number), 0)

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      tenantId: r.tenant_id as string | null,
      tenantSlug: r.tenant_slug as string | null,
      count: r.count as number,
      errorCount: r.error_count as number,
      percentage: total > 0 ? ((r.count as number) / total) * 100 : 0,
    }
  })
}

/**
 * Get log volume by service
 */
async function getVolumeByService(
  tenantId: string | undefined,
  startTime: Date,
  endTime: Date
): Promise<LogVolumeByService[]> {
  let result

  if (tenantId) {
    result = await sql`
      SELECT
        service,
        COUNT(*)::int as count,
        COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as error_count
      FROM public.platform_logs
      WHERE tenant_id = ${tenantId}
        AND timestamp >= ${startTime.toISOString()}
        AND timestamp <= ${endTime.toISOString()}
      GROUP BY service
      ORDER BY count DESC
    `
  } else {
    result = await sql`
      SELECT
        service,
        COUNT(*)::int as count,
        COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as error_count
      FROM public.platform_logs
      WHERE timestamp >= ${startTime.toISOString()}
        AND timestamp <= ${endTime.toISOString()}
      GROUP BY service
      ORDER BY count DESC
    `
  }

  const total = result.rows.reduce((sum, row) => sum + ((row as Record<string, unknown>).count as number), 0)

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      service: r.service as ServiceName,
      count: r.count as number,
      errorCount: r.error_count as number,
      percentage: total > 0 ? ((r.count as number) / total) * 100 : 0,
    }
  })
}

/**
 * Get time series of log volume
 */
async function getTimeSeries(
  tenantId: string | undefined,
  service: ServiceName | undefined,
  startTime: Date,
  endTime: Date,
  interval: string
): Promise<TimeSeriesBucket[]> {
  // Use explicit query branches for each interval to avoid sql.raw()
  // which doesn't exist in @vercel/postgres

  let result

  // Helper to determine which query to run based on interval
  const runQuery = async (
    tid: string | undefined,
    svc: ServiceName | undefined,
    start: string,
    end: string,
    intv: string
  ) => {
    // No filters
    if (!tid && !svc) {
      switch (intv) {
        case '5m':
          return sql`
            SELECT
              date_trunc('hour', timestamp) +
                INTERVAL '5 minutes' * FLOOR(EXTRACT(MINUTE FROM timestamp) / 5) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
        case '15m':
          return sql`
            SELECT
              date_trunc('hour', timestamp) +
                INTERVAL '15 minutes' * FLOOR(EXTRACT(MINUTE FROM timestamp) / 15) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
        case '6h':
          return sql`
            SELECT
              date_trunc('day', timestamp) +
                INTERVAL '6 hours' * FLOOR(EXTRACT(HOUR FROM timestamp) / 6) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
        case '1d':
          return sql`
            SELECT
              date_trunc('day', timestamp) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
        default: // 1h
          return sql`
            SELECT
              date_trunc('hour', timestamp) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
      }
    }

    // Tenant filter only
    if (tid && !svc) {
      switch (intv) {
        case '5m':
          return sql`
            SELECT
              date_trunc('hour', timestamp) +
                INTERVAL '5 minutes' * FLOOR(EXTRACT(MINUTE FROM timestamp) / 5) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE tenant_id = ${tid} AND timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
        case '15m':
          return sql`
            SELECT
              date_trunc('hour', timestamp) +
                INTERVAL '15 minutes' * FLOOR(EXTRACT(MINUTE FROM timestamp) / 15) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE tenant_id = ${tid} AND timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
        case '6h':
          return sql`
            SELECT
              date_trunc('day', timestamp) +
                INTERVAL '6 hours' * FLOOR(EXTRACT(HOUR FROM timestamp) / 6) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE tenant_id = ${tid} AND timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
        case '1d':
          return sql`
            SELECT
              date_trunc('day', timestamp) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE tenant_id = ${tid} AND timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
        default: // 1h
          return sql`
            SELECT
              date_trunc('hour', timestamp) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE tenant_id = ${tid} AND timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
      }
    }

    // Service filter only
    if (!tid && svc) {
      switch (intv) {
        case '5m':
          return sql`
            SELECT
              date_trunc('hour', timestamp) +
                INTERVAL '5 minutes' * FLOOR(EXTRACT(MINUTE FROM timestamp) / 5) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE service = ${svc} AND timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
        case '15m':
          return sql`
            SELECT
              date_trunc('hour', timestamp) +
                INTERVAL '15 minutes' * FLOOR(EXTRACT(MINUTE FROM timestamp) / 15) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE service = ${svc} AND timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
        case '6h':
          return sql`
            SELECT
              date_trunc('day', timestamp) +
                INTERVAL '6 hours' * FLOOR(EXTRACT(HOUR FROM timestamp) / 6) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE service = ${svc} AND timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
        case '1d':
          return sql`
            SELECT
              date_trunc('day', timestamp) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE service = ${svc} AND timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
        default: // 1h
          return sql`
            SELECT
              date_trunc('hour', timestamp) as bucket,
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
            FROM public.platform_logs
            WHERE service = ${svc} AND timestamp >= ${start} AND timestamp <= ${end}
            GROUP BY bucket ORDER BY bucket ASC
          `
      }
    }

    // Both filters
    switch (intv) {
      case '5m':
        return sql`
          SELECT
            date_trunc('hour', timestamp) +
              INTERVAL '5 minutes' * FLOOR(EXTRACT(MINUTE FROM timestamp) / 5) as bucket,
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
          FROM public.platform_logs
          WHERE tenant_id = ${tid} AND service = ${svc} AND timestamp >= ${start} AND timestamp <= ${end}
          GROUP BY bucket ORDER BY bucket ASC
        `
      case '15m':
        return sql`
          SELECT
            date_trunc('hour', timestamp) +
              INTERVAL '15 minutes' * FLOOR(EXTRACT(MINUTE FROM timestamp) / 15) as bucket,
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
          FROM public.platform_logs
          WHERE tenant_id = ${tid} AND service = ${svc} AND timestamp >= ${start} AND timestamp <= ${end}
          GROUP BY bucket ORDER BY bucket ASC
        `
      case '6h':
        return sql`
          SELECT
            date_trunc('day', timestamp) +
              INTERVAL '6 hours' * FLOOR(EXTRACT(HOUR FROM timestamp) / 6) as bucket,
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
          FROM public.platform_logs
          WHERE tenant_id = ${tid} AND service = ${svc} AND timestamp >= ${start} AND timestamp <= ${end}
          GROUP BY bucket ORDER BY bucket ASC
        `
      case '1d':
        return sql`
          SELECT
            date_trunc('day', timestamp) as bucket,
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
          FROM public.platform_logs
          WHERE tenant_id = ${tid} AND service = ${svc} AND timestamp >= ${start} AND timestamp <= ${end}
          GROUP BY bucket ORDER BY bucket ASC
        `
      default: // 1h
        return sql`
          SELECT
            date_trunc('hour', timestamp) as bucket,
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE level IN ('error', 'fatal'))::int as errors
          FROM public.platform_logs
          WHERE tenant_id = ${tid} AND service = ${svc} AND timestamp >= ${start} AND timestamp <= ${end}
          GROUP BY bucket ORDER BY bucket ASC
        `
    }
  }

  result = await runQuery(
    tenantId,
    service,
    startTime.toISOString(),
    endTime.toISOString(),
    interval
  )

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      timestamp: new Date(r.bucket as string).toISOString(),
      total: r.total as number,
      errors: r.errors as number,
    }
  })
}
