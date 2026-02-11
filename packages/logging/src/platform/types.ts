/**
 * PlatformLogger types for structured logging with full context
 */

import type { LogLevelName } from '../levels.js'

/** Log levels mapped to retention periods */
export const LOG_RETENTION_DAYS: Record<LogLevelName, number> = {
  trace: 1, // Conditional - only in non-prod
  debug: 1, // Conditional - only in non-prod
  info: 7,
  warn: 14,
  error: 30,
  fatal: 30,
}

/** Services that can emit logs */
export type ServiceName =
  | 'orchestrator'
  | 'admin'
  | 'storefront'
  | 'creator-portal'
  | 'mcp-server'
  | 'inngest'
  | 'webhook-handler'

/** Full platform log entry stored in database */
export interface PlatformLogEntry {
  // Identification
  id: string
  timestamp: Date
  level: LogLevelName

  // Tenant context
  tenantId: string | null
  tenantSlug: string | null

  // User context
  userId: string | null
  sessionId: string | null
  impersonatorId: string | null

  // Request context
  requestId: string | null
  traceId: string | null
  spanId: string | null

  // Source
  service: ServiceName
  action: string
  file: string | null
  line: number | null
  functionName: string | null

  // Content
  message: string
  data: Record<string, unknown> | null

  // Error (if applicable)
  errorType: string | null
  errorCode: string | null
  errorStack: string | null

  // Environment
  environment: string
  version: string | null
  region: string | null
}

/** Log context passed to PlatformLogger */
export interface PlatformLogContext {
  // Tenant (required for tenant-scoped logs)
  tenantId?: string
  tenantSlug?: string

  // User
  userId?: string
  sessionId?: string
  impersonatorId?: string

  // Request tracing
  requestId?: string
  traceId?: string
  spanId?: string

  // Action being performed
  action?: string

  // Additional data
  data?: Record<string, unknown>
}

/** Configuration for PlatformLogger */
export interface PlatformLoggerConfig {
  service: ServiceName
  level?: LogLevelName
  environment?: string
  version?: string | null
  region?: string | null
  enableConsole?: boolean // Default: true in dev, false in prod
  bufferSize?: number // Default: 50
  flushIntervalMs?: number // Default: 5000
}

/** Buffered log for batch insert */
export interface BufferedLog {
  entry: PlatformLogEntry
  addedAt: number
}

/** Log query filters */
export interface LogQueryFilters {
  tenantId?: string
  tenantSlug?: string
  level?: LogLevelName | LogLevelName[]
  service?: ServiceName | ServiceName[]
  userId?: string
  requestId?: string
  traceId?: string
  action?: string
  search?: string // Full-text search
  startTime?: Date
  endTime?: Date
  hasError?: boolean
}

/** Pagination options for log queries */
export interface LogQueryPagination {
  limit?: number // Default: 50
  offset?: number
  cursor?: string // For keyset pagination
}

/** Result of a log query */
export interface LogQueryResult {
  logs: PlatformLogEntry[]
  total: number
  hasMore: boolean
  cursor?: string
}

/** Error aggregate for grouped errors */
export interface ErrorAggregate {
  signature: string
  errorType: string
  message: string // Generalized message
  count: number
  firstSeen: Date
  lastSeen: Date
  sampleIds: string[]
  tenantIds: string[]
  services: ServiceName[]
  affectedUsers: number
}

/** Config for error aggregation query */
export interface ErrorAggregateFilters {
  tenantId?: string
  service?: ServiceName | ServiceName[]
  startTime?: Date
  endTime?: Date
  minCount?: number
}

/** Caller location from stack trace */
export interface CallerLocation {
  file: string
  line: number
  functionName: string | null
}
