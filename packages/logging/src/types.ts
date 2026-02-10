/**
 * Logging types
 */

import type { LogLevelName } from './levels'

export interface LogEntry {
  level: LogLevelName
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: ErrorInfo
  meta?: LogMeta
}

export interface LogMeta {
  tenantId?: string
  requestId?: string
  userId?: string
  service?: string
  version?: string
  [key: string]: unknown
}

export interface ErrorInfo {
  name: string
  message: string
  stack?: string
  code?: string
  cause?: ErrorInfo
}

export function serializeError(error: Error): ErrorInfo {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: (error as Error & { code?: string }).code,
    cause: error.cause instanceof Error ? serializeError(error.cause) : undefined,
  }
}
