/**
 * Log query functions for retrieving stored logs
 */

import type { LogLevelName } from '../levels.js'
import type {
  LogQueryFilters,
  LogQueryPagination,
  LogQueryResult,
  PlatformLogEntry,
  ServiceName,
} from './types.js'

/**
 * Query logs with filters and pagination
 */
export async function queryLogs(
  filters: LogQueryFilters,
  pagination: LogQueryPagination = {}
): Promise<LogQueryResult> {
  const { sql } = await import('@cgk-platform/db')

  const { limit = 50, offset = 0 } = pagination

  // For complex dynamic queries, we'll use conditional queries
  // This is less elegant but works with @vercel/postgres
  let result
  let countResult

  // Normalize level to string for single level queries
  const level = Array.isArray(filters.level)
    ? filters.level[0]
    : filters.level

  if (filters.tenantId && level && filters.search) {
    countResult = await sql`
      SELECT COUNT(*)::int as total FROM platform_logs
      WHERE tenant_id = ${filters.tenantId}
        AND level = ${level}
        AND message_tsv @@ plainto_tsquery('english', ${filters.search})
    `
    result = await sql`
      SELECT
        id, timestamp, level,
        tenant_id, tenant_slug,
        user_id, session_id, impersonator_id,
        request_id, trace_id, span_id,
        service, action, file, line, function_name,
        message, data,
        error_type, error_code, error_stack,
        environment, version, region
      FROM platform_logs
      WHERE tenant_id = ${filters.tenantId}
        AND level = ${level}
        AND message_tsv @@ plainto_tsquery('english', ${filters.search})
      ORDER BY timestamp DESC
      LIMIT ${limit + 1} OFFSET ${offset}
    `
  } else if (filters.tenantId && level) {
    countResult = await sql`
      SELECT COUNT(*)::int as total FROM platform_logs
      WHERE tenant_id = ${filters.tenantId}
        AND level = ${level}
    `
    result = await sql`
      SELECT
        id, timestamp, level,
        tenant_id, tenant_slug,
        user_id, session_id, impersonator_id,
        request_id, trace_id, span_id,
        service, action, file, line, function_name,
        message, data,
        error_type, error_code, error_stack,
        environment, version, region
      FROM platform_logs
      WHERE tenant_id = ${filters.tenantId}
        AND level = ${level}
      ORDER BY timestamp DESC
      LIMIT ${limit + 1} OFFSET ${offset}
    `
  } else if (filters.tenantId) {
    countResult = await sql`
      SELECT COUNT(*)::int as total FROM platform_logs
      WHERE tenant_id = ${filters.tenantId}
    `
    result = await sql`
      SELECT
        id, timestamp, level,
        tenant_id, tenant_slug,
        user_id, session_id, impersonator_id,
        request_id, trace_id, span_id,
        service, action, file, line, function_name,
        message, data,
        error_type, error_code, error_stack,
        environment, version, region
      FROM platform_logs
      WHERE tenant_id = ${filters.tenantId}
      ORDER BY timestamp DESC
      LIMIT ${limit + 1} OFFSET ${offset}
    `
  } else {
    countResult = await sql`SELECT COUNT(*)::int as total FROM platform_logs`
    result = await sql`
      SELECT
        id, timestamp, level,
        tenant_id, tenant_slug,
        user_id, session_id, impersonator_id,
        request_id, trace_id, span_id,
        service, action, file, line, function_name,
        message, data,
        error_type, error_code, error_stack,
        environment, version, region
      FROM platform_logs
      ORDER BY timestamp DESC
      LIMIT ${limit + 1} OFFSET ${offset}
    `
  }

  const total = countResult.rows[0]?.total ?? 0
  const hasMore = result.rows.length > limit
  const logs = result.rows.slice(0, limit).map(rowToLogEntry)

  return {
    logs,
    total,
    hasMore,
    cursor: hasMore && logs.length > 0 ? logs[logs.length - 1]?.id : undefined,
  }
}

/**
 * Get a single log entry by ID
 */
export async function getLogById(id: string): Promise<PlatformLogEntry | null> {
  const { sql } = await import('@cgk-platform/db')

  const result = await sql`
    SELECT
      id, timestamp, level,
      tenant_id, tenant_slug,
      user_id, session_id, impersonator_id,
      request_id, trace_id, span_id,
      service, action, file, line, function_name,
      message, data,
      error_type, error_code, error_stack,
      environment, version, region
    FROM platform_logs
    WHERE id = ${id}
  `

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return rowToLogEntry(row)
}

/**
 * Get recent logs for a request trace
 */
export async function getLogsByTraceId(
  traceId: string,
  limit: number = 100
): Promise<PlatformLogEntry[]> {
  const { sql } = await import('@cgk-platform/db')

  const result = await sql`
    SELECT
      id, timestamp, level,
      tenant_id, tenant_slug,
      user_id, session_id, impersonator_id,
      request_id, trace_id, span_id,
      service, action, file, line, function_name,
      message, data,
      error_type, error_code, error_stack,
      environment, version, region
    FROM platform_logs
    WHERE trace_id = ${traceId}
    ORDER BY timestamp ASC
    LIMIT ${limit}
  `

  return result.rows.map(rowToLogEntry)
}

/**
 * Convert database row to PlatformLogEntry
 */
function rowToLogEntry(row: Record<string, unknown>): PlatformLogEntry {
  return {
    id: row.id as string,
    timestamp: new Date(row.timestamp as string),
    level: row.level as LogLevelName,
    tenantId: row.tenant_id as string | null,
    tenantSlug: row.tenant_slug as string | null,
    userId: row.user_id as string | null,
    sessionId: row.session_id as string | null,
    impersonatorId: row.impersonator_id as string | null,
    requestId: row.request_id as string | null,
    traceId: row.trace_id as string | null,
    spanId: row.span_id as string | null,
    service: row.service as ServiceName,
    action: row.action as string,
    file: row.file as string | null,
    line: row.line as number | null,
    functionName: row.function_name as string | null,
    message: row.message as string,
    data: (row.data as Record<string, unknown>) ?? null,
    errorType: row.error_type as string | null,
    errorCode: row.error_code as string | null,
    errorStack: row.error_stack as string | null,
    environment: row.environment as string,
    version: row.version as string | null,
    region: row.region as string | null,
  }
}
