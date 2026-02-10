/**
 * Logging context
 */

import { AsyncLocalStorage } from 'async_hooks'

export interface LogContext {
  requestId?: string
  tenantId?: string
  userId?: string
  [key: string]: unknown
}

const contextStorage = new AsyncLocalStorage<LogContext>()

/**
 * Get the current log context
 */
export function getLogContext(): LogContext {
  return contextStorage.getStore() ?? {}
}

/**
 * Run a function with log context
 */
export function withLogContext<T>(context: LogContext, fn: () => T): T {
  const currentContext = getLogContext()
  return contextStorage.run({ ...currentContext, ...context }, fn)
}

/**
 * Set context values for the current async context
 */
export function setLogContext(context: Partial<LogContext>): void {
  const currentContext = getLogContext()
  Object.assign(currentContext, context)
}

/**
 * Create a middleware that sets log context from request
 */
export function createLogContextMiddleware(
  extractContext: (req: unknown) => LogContext
): (req: unknown, res: unknown, next: () => void) => void {
  return (req, _res, next) => {
    const context = extractContext(req)
    withLogContext(context, next)
  }
}
