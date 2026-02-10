/**
 * Logger implementation
 */

import type { ChildLoggerOptions } from './child'
import { jsonFormatter, type LogFormatter } from './formatters'
import { LogLevel, type LogLevelName, nameToLevel, shouldLog } from './levels'
import { consoleTransport, type LogTransport } from './transports'
import type { LogEntry, LogMeta } from './types'
import { serializeError } from './types'

export interface LoggerConfig {
  level?: LogLevelName
  formatter?: LogFormatter
  transport?: LogTransport
  meta?: LogMeta
}

export interface Logger {
  trace(message: string, context?: Record<string, unknown>): void
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, error?: Error, context?: Record<string, unknown>): void
  fatal(message: string, error?: Error, context?: Record<string, unknown>): void

  child(options: ChildLoggerOptions): Logger
  setLevel(level: LogLevelName): void
}

/**
 * Create a logger instance
 */
export function createLogger(config: LoggerConfig = {}): Logger {
  let minLevel = nameToLevel(config.level ?? 'info')
  const formatter = config.formatter ?? jsonFormatter
  const transport = config.transport ?? consoleTransport
  const baseMeta = config.meta ?? {}

  function log(
    level: LogLevel,
    levelName: LogLevelName,
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    if (!shouldLog(level, minLevel)) return

    const entry: LogEntry = {
      level: levelName,
      message,
      timestamp: new Date().toISOString(),
      context,
      error: error ? serializeError(error) : undefined,
      meta: baseMeta,
    }

    const formatted = formatter(entry)
    transport(level, formatted)
  }

  const logger: Logger = {
    trace(message, context) {
      log(LogLevel.TRACE, 'trace', message, undefined, context)
    },

    debug(message, context) {
      log(LogLevel.DEBUG, 'debug', message, undefined, context)
    },

    info(message, context) {
      log(LogLevel.INFO, 'info', message, undefined, context)
    },

    warn(message, context) {
      log(LogLevel.WARN, 'warn', message, undefined, context)
    },

    error(message, error, context) {
      log(LogLevel.ERROR, 'error', message, error, context)
    },

    fatal(message, error, context) {
      log(LogLevel.FATAL, 'fatal', message, error, context)
    },

    child(options) {
      return createLogger({
        level: config.level,
        formatter,
        transport,
        meta: { ...baseMeta, ...options.meta },
      })
    },

    setLevel(level) {
      minLevel = nameToLevel(level)
    },
  }

  return logger
}

// Default logger instance
export const logger = createLogger()
