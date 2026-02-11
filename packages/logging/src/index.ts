/**
 * @cgk/logging - Structured logging
 *
 * @ai-pattern structured-logging
 * @ai-note JSON-formatted logs with context
 */

// Logger factory
export { createLogger, type Logger, type LoggerConfig } from './logger.js'

// Log levels
export { LogLevel, type LogLevelName } from './levels.js'

// Context
export { getLogContext, withLogContext, type LogContext } from './context.js'

// Formatters
export { jsonFormatter, prettyFormatter, type LogFormatter } from './formatters.js'

// Transports
export { consoleTransport, type LogTransport } from './transports.js'

// Child logger
export { type ChildLoggerOptions } from './child.js'

// Types
export type { LogEntry, LogMeta } from './types.js'

// Platform logger (PostgreSQL + Redis storage)
export {
  // Main logger
  createPlatformLogger,
  createRequestLogger,
  generateSpanId,
  generateTraceId,
  PlatformLogger,
  // Query
  getLogById,
  getLogsByTraceId,
  queryLogs,
  // Error aggregation
  computeErrorSignature,
  generalizeMessage,
  getErrorAggregates,
  getErrorsBySignature,
  // Retention
  cleanupLogsByRetention,
  getCleanupJobDefinition,
  // Storage
  readFromStream,
  subscribeToStream,
  // Types
  type CleanupJobConfig,
  type CleanupResult,
  type ErrorAggregate,
  type ErrorAggregateFilters,
  type LogQueryFilters,
  type LogQueryPagination,
  type LogQueryResult,
  type PlatformLogContext,
  type PlatformLogEntry,
  type PlatformLoggerConfig,
  type ServiceName,
} from './platform/index.js'
