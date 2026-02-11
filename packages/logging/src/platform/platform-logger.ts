/**
 * PlatformLogger - Structured logging with PostgreSQL and Redis storage
 *
 * Features:
 * - Buffered writes (50 items / 5 seconds / immediate on error)
 * - PostgreSQL storage with partitioned tables
 * - Redis streaming for real-time log delivery
 * - Full context tracking (tenant, user, request)
 * - Caller location extraction
 * - Console output in development
 */

import { prettyFormatter } from '../formatters.js'
import { type LogLevel, nameToLevel, shouldLog, type LogLevelName } from '../levels.js'
import { getCallerLocation, makeRelativePath } from './caller.js'
import { getEnvironment, mergeConfig, shouldStoreLevel } from './config.js'
import { computeErrorSignature } from './error-aggregation.js'
import { writeToDatabase, writeToRedis } from './storage.js'
import type {
  BufferedLog,
  PlatformLogContext,
  PlatformLogEntry,
  PlatformLoggerConfig,
} from './types.js'

/**
 * Generate a unique log ID
 */
function generateLogId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `log_${timestamp}${random}`
}

/**
 * Generate a trace ID for request tracking
 */
export function generateTraceId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 14)
  return `trace_${timestamp}${random}`
}

/**
 * Generate a span ID for operation tracking
 */
export function generateSpanId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * PlatformLogger class with buffering and dual storage
 */
export class PlatformLogger {
  private config: Required<PlatformLoggerConfig>
  private buffer: BufferedLog[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private context: PlatformLogContext = {}
  private minLevel: LogLevel

  constructor(config: PlatformLoggerConfig) {
    const environment = getEnvironment()
    this.config = mergeConfig(config, environment)
    this.minLevel = nameToLevel(this.config.level)
  }

  /**
   * Set the current log context
   */
  setContext(context: PlatformLogContext): void {
    this.context = { ...this.context, ...context }
  }

  /**
   * Clear the current context
   */
  clearContext(): void {
    this.context = {}
  }

  /**
   * Create a child logger with additional context
   */
  child(context: PlatformLogContext): PlatformLogger {
    const childLogger = new PlatformLogger(this.config)
    childLogger.context = { ...this.context, ...context }
    childLogger.buffer = this.buffer // Share buffer with parent
    return childLogger
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevelName): void {
    this.config.level = level
    this.minLevel = nameToLevel(level)
  }

  /**
   * Log at TRACE level
   */
  trace(message: string, context?: Partial<PlatformLogContext>): void {
    this.log('trace', message, context)
  }

  /**
   * Log at DEBUG level
   */
  debug(message: string, context?: Partial<PlatformLogContext>): void {
    this.log('debug', message, context)
  }

  /**
   * Log at INFO level
   */
  info(message: string, context?: Partial<PlatformLogContext>): void {
    this.log('info', message, context)
  }

  /**
   * Log at WARN level
   */
  warn(message: string, context?: Partial<PlatformLogContext>): void {
    this.log('warn', message, context)
  }

  /**
   * Log at ERROR level
   */
  error(message: string, error?: Error, context?: Partial<PlatformLogContext>): void {
    this.log('error', message, context, error)
  }

  /**
   * Log at FATAL level
   */
  fatal(message: string, error?: Error, context?: Partial<PlatformLogContext>): void {
    this.log('fatal', message, context, error)
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevelName,
    message: string,
    additionalContext?: Partial<PlatformLogContext>,
    error?: Error
  ): void {
    const numericLevel = nameToLevel(level)

    // Check if we should log at this level
    if (!shouldLog(numericLevel, this.minLevel)) {
      return
    }

    // Merge context
    const ctx = { ...this.context, ...additionalContext }

    // Get caller location
    const caller = getCallerLocation()

    // Build log entry
    const entry: PlatformLogEntry = {
      id: generateLogId(),
      timestamp: new Date(),
      level,
      tenantId: ctx.tenantId ?? null,
      tenantSlug: ctx.tenantSlug ?? null,
      userId: ctx.userId ?? null,
      sessionId: ctx.sessionId ?? null,
      impersonatorId: ctx.impersonatorId ?? null,
      requestId: ctx.requestId ?? null,
      traceId: ctx.traceId ?? null,
      spanId: ctx.spanId ?? null,
      service: this.config.service,
      action: ctx.action ?? '',
      file: caller ? makeRelativePath(caller.file) : null,
      line: caller?.line ?? null,
      functionName: caller?.functionName ?? null,
      message,
      data: ctx.data ?? null,
      errorType: error?.name ?? null,
      errorCode: (error as Error & { code?: string })?.code ?? null,
      errorStack: error?.stack ?? null,
      environment: this.config.environment,
      version: this.config.version,
      region: this.config.region,
    }

    // Console output in development
    if (this.config.enableConsole) {
      this.outputToConsole(entry, error)
    }

    // Check if we should store this level
    if (!shouldStoreLevel(level, this.config.environment)) {
      return
    }

    // Add to buffer
    this.buffer.push({ entry, addedAt: Date.now() })

    // Immediate flush on error/fatal
    if (level === 'error' || level === 'fatal') {
      this.flush()
      return
    }

    // Schedule flush if not already scheduled
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush()
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.config.flushIntervalMs)
    }
  }

  /**
   * Output to console for development
   */
  private outputToConsole(entry: PlatformLogEntry, error?: Error): void {
    const formatted = prettyFormatter({
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp.toISOString(),
      context: entry.data ?? undefined,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
      meta: {
        tenantId: entry.tenantId ?? undefined,
        requestId: entry.requestId ?? undefined,
        userId: entry.userId ?? undefined,
        service: entry.service,
      },
    })

    // Add file:line prefix
    const location = entry.file && entry.line ? `[${entry.file}:${entry.line}] ` : ''

    if (entry.level === 'error' || entry.level === 'fatal') {
      console.error(location + formatted)
    } else {
      console.log(location + formatted)
    }
  }

  /**
   * Flush buffered logs to storage
   */
  async flush(): Promise<void> {
    // Clear timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    // Get entries to flush
    if (this.buffer.length === 0) {
      return
    }

    const entriesToFlush = this.buffer.splice(0, this.buffer.length)
    const entries = entriesToFlush.map((b) => b.entry)

    // Add error signatures for error-level entries
    for (const entry of entries) {
      if (entry.errorType && entry.message) {
        const signature = computeErrorSignature(
          entry.errorType,
          entry.message,
          entry.errorStack
        )
        // Store signature in data for aggregation
        entry.data = {
          ...entry.data,
          _errorSignature: signature,
        }
      }
    }

    // Write to both storage systems in parallel
    try {
      await Promise.all([writeToDatabase(entries), writeToRedis(entries)])
    } catch (err) {
      // Log error but don't re-add to buffer (would cause infinite loop)
      console.error('[PlatformLogger] Failed to flush logs:', err)
    }
  }

  /**
   * Close the logger and flush remaining logs
   */
  async close(): Promise<void> {
    await this.flush()
  }
}

/**
 * Create a PlatformLogger instance
 */
export function createPlatformLogger(config: PlatformLoggerConfig): PlatformLogger {
  return new PlatformLogger(config)
}

/**
 * Create a logger for a specific request
 */
export function createRequestLogger(
  baseLogger: PlatformLogger,
  request: Request,
  context?: Partial<PlatformLogContext>
): PlatformLogger {
  const headers = request.headers

  return baseLogger.child({
    tenantId: headers.get('x-tenant-id') ?? undefined,
    tenantSlug: headers.get('x-tenant-slug') ?? undefined,
    userId: headers.get('x-user-id') ?? undefined,
    sessionId: headers.get('x-session-id') ?? undefined,
    impersonatorId: headers.get('x-impersonator-id') ?? undefined,
    requestId: headers.get('x-request-id') ?? generateTraceId(),
    traceId: headers.get('x-trace-id') ?? generateTraceId(),
    spanId: generateSpanId(),
    ...context,
  })
}
