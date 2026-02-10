/**
 * MCP Context helpers
 */

import type { TenantContext } from '@cgk/core'

export interface MCPContext {
  tenant?: TenantContext
  userId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
}

let currentContext: MCPContext = {}

/**
 * Create and set MCP context
 */
export function createContext(context: MCPContext): MCPContext {
  currentContext = { ...context }
  return currentContext
}

/**
 * Get current MCP context
 */
export function getContext(): MCPContext {
  return currentContext
}

/**
 * Update MCP context
 */
export function updateContext(updates: Partial<MCPContext>): MCPContext {
  currentContext = { ...currentContext, ...updates }
  return currentContext
}

/**
 * Clear MCP context
 */
export function clearContext(): void {
  currentContext = {}
}

/**
 * Run a function with temporary context
 */
export async function withContext<T>(
  context: MCPContext,
  fn: () => Promise<T>
): Promise<T> {
  const previousContext = currentContext
  try {
    currentContext = { ...context }
    return await fn()
  } finally {
    currentContext = previousContext
  }
}
