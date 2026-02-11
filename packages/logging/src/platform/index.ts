/**
 * Platform logging exports
 *
 * Provides the PlatformLogger with PostgreSQL and Redis storage,
 * error aggregation, and retention management.
 */

// Main logger
export {
  createPlatformLogger,
  createRequestLogger,
  generateSpanId,
  generateTraceId,
  PlatformLogger,
} from './platform-logger.js'

// Types
export type {
  BufferedLog,
  CallerLocation,
  ErrorAggregate,
  ErrorAggregateFilters,
  LOG_RETENTION_DAYS,
  LogQueryFilters,
  LogQueryPagination,
  LogQueryResult,
  PlatformLogContext,
  PlatformLogEntry,
  PlatformLoggerConfig,
  ServiceName,
} from './types.js'

// Re-export constants
export { LOG_RETENTION_DAYS as logRetentionDays } from './types.js'

// Config
export { getEnvironment, mergeConfig, shouldStoreLevel } from './config.js'

// Storage
export { readFromStream, subscribeToStream, writeToDatabase, writeToRedis } from './storage.js'

// Query
export { getLogById, getLogsByTraceId, queryLogs } from './query.js'

// Error aggregation
export {
  computeErrorSignature,
  generalizeMessage,
  getErrorAggregates,
  getErrorsBySignature,
} from './error-aggregation.js'

// Retention
export {
  cleanupLogsByRetention,
  dropOldPartitions,
  ensureCurrentPartition,
  ensureNextMonthPartition,
  getCleanupJobDefinition,
  type CleanupJobConfig,
  type CleanupResult,
} from './retention.js'
