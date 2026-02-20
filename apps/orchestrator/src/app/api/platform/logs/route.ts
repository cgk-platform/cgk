/**
 * Platform Logs API - List and Query
 *
 * GET /api/platform/logs - Query logs with filters
 *
 * Requires: Super admin access
 */

import { sql } from '@cgk-platform/db'
import {
  queryLogs,
  type LogQueryFilters,
  type LogQueryPagination,
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

/**
 * GET /api/platform/logs
 *
 * Query platform logs with filtering and pagination.
 * Requires: Super admin access
 *
 * Query params:
 * - tenantId: Filter by tenant ID
 * - level: Filter by log level (trace, debug, info, warn, error, fatal)
 * - service: Filter by service name
 * - userId: Filter by user ID
 * - traceId: Filter by trace ID (for request tracing)
 * - search: Full-text search in message
 * - startTime: Start of time range (ISO string or relative like "1h", "24h", "7d")
 * - endTime: End of time range (ISO string)
 * - hasError: Filter to only error logs (true/false)
 * - limit: Max results (default 50, max 100)
 * - offset: Pagination offset
 */
export async function GET(request: Request) {
  try {
    const { isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)

    // Parse filters
    const filters: LogQueryFilters = {}

    const tenantId = url.searchParams.get('tenantId')
    if (tenantId) filters.tenantId = tenantId

    const level = url.searchParams.get('level')
    if (level) {
      const validLevels: LogLevelName[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
      if (validLevels.includes(level as LogLevelName)) {
        filters.level = level as LogLevelName
      }
    }

    const service = url.searchParams.get('service')
    if (service) {
      const validServices: ServiceName[] = [
        'orchestrator',
        'admin',
        'storefront',
        'creator-portal',
        'mcp-server',
        'inngest',
        'webhook-handler',
      ]
      if (validServices.includes(service as ServiceName)) {
        filters.service = service as ServiceName
      }
    }

    const userId = url.searchParams.get('userId')
    if (userId) filters.userId = userId

    const traceId = url.searchParams.get('traceId')
    if (traceId) filters.traceId = traceId

    const search = url.searchParams.get('search')
    if (search) filters.search = search

    const startTime = parseTimeRange(url.searchParams.get('startTime'))
    if (startTime) filters.startTime = startTime

    const endTime = parseTimeRange(url.searchParams.get('endTime'))
    if (endTime) filters.endTime = endTime

    const hasError = url.searchParams.get('hasError')
    if (hasError === 'true') filters.hasError = true
    else if (hasError === 'false') filters.hasError = false

    // Parse pagination
    const pagination: LogQueryPagination = {
      limit: Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100),
      offset: parseInt(url.searchParams.get('offset') || '0', 10),
    }

    const cursor = url.searchParams.get('cursor')
    if (cursor) pagination.cursor = cursor

    // Query logs using the logging package
    const result = await queryLogs(filters, pagination)

    // Get level distribution for the current filter set
    const levelStats = await getLevelStats(filters)

    return Response.json({
      ...result,
      filters,
      pagination,
      levelStats,
    })
  } catch (error) {
    console.error('Get platform logs error:', error)
    return Response.json({ error: 'Failed to get logs' }, { status: 500 })
  }
}

/**
 * Get log count distribution by level
 */
async function getLevelStats(
  filters: LogQueryFilters
): Promise<Record<LogLevelName, number>> {
  // Build query based on filters - simplified version
  let result

  if (filters.tenantId && filters.startTime && filters.endTime) {
    result = await sql`
      SELECT level, COUNT(*)::int as count
      FROM public.platform_logs
      WHERE tenant_id = ${filters.tenantId}
        AND timestamp >= ${filters.startTime.toISOString()}
        AND timestamp <= ${filters.endTime.toISOString()}
      GROUP BY level
    `
  } else if (filters.tenantId) {
    result = await sql`
      SELECT level, COUNT(*)::int as count
      FROM public.platform_logs
      WHERE tenant_id = ${filters.tenantId}
      GROUP BY level
    `
  } else if (filters.startTime && filters.endTime) {
    result = await sql`
      SELECT level, COUNT(*)::int as count
      FROM public.platform_logs
      WHERE timestamp >= ${filters.startTime.toISOString()}
        AND timestamp <= ${filters.endTime.toISOString()}
      GROUP BY level
    `
  } else {
    result = await sql`
      SELECT level, COUNT(*)::int as count
      FROM public.platform_logs
      GROUP BY level
    `
  }

  const stats: Record<LogLevelName, number> = {
    trace: 0,
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
    fatal: 0,
  }

  for (const row of result.rows) {
    const r = row as Record<string, unknown>
    const lvl = r.level as LogLevelName
    if (lvl in stats) {
      stats[lvl] = r.count as number
    }
  }

  return stats
}
