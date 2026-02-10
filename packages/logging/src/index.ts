/**
 * @cgk/logging - Structured logging
 *
 * @ai-pattern structured-logging
 * @ai-note JSON-formatted logs with context
 */

// Logger factory
export { createLogger, type Logger, type LoggerConfig } from './logger'

// Log levels
export { LogLevel, type LogLevelName } from './levels'

// Context
export { withLogContext, getLogContext, type LogContext } from './context'

// Formatters
export { jsonFormatter, prettyFormatter, type LogFormatter } from './formatters'

// Transports
export { consoleTransport, type LogTransport } from './transports'

// Child logger
export { type ChildLoggerOptions } from './child'

// Types
export type { LogEntry, LogMeta } from './types'
