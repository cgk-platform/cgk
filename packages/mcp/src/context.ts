/**
 * MCP Context helpers
 *
 * Provides context management for MCP handlers.
 * Note: For Edge runtime, context is per-request, not global.
 */

import type { MCPSession } from './types'

/**
 * MCP request context
 */
export interface MCPContext {
  /** Tenant ID from authentication */
  tenantId: string
  /** User ID from authentication */
  userId: string
  /** Active MCP session (if initialized) */
  session?: MCPSession
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Async local storage for request context
 * Note: In Edge runtime, we use a simpler approach since each request is isolated
 */
let currentContext: MCPContext | null = null

/**
 * Create and set MCP context for the current request
 *
 * @param context - Context to set
 * @returns The created context
 */
export function createContext(context: MCPContext): MCPContext {
  currentContext = { ...context }
  return currentContext
}

/**
 * Get current MCP context
 *
 * @returns Current context or null if not set
 */
export function getContext(): MCPContext | null {
  return currentContext
}

/**
 * Get current context or throw if not set
 *
 * @returns Current context
 * @throws Error if context not set
 */
export function requireContext(): MCPContext {
  if (!currentContext) {
    throw new Error('MCP context not initialized. Call createContext() first.')
  }
  return currentContext
}

/**
 * Update MCP context
 *
 * @param updates - Partial context updates
 * @returns Updated context
 */
export function updateContext(updates: Partial<MCPContext>): MCPContext {
  if (!currentContext) {
    throw new Error('Cannot update context before initialization')
  }
  currentContext = { ...currentContext, ...updates }
  return currentContext
}

/**
 * Clear MCP context
 */
export function clearContext(): void {
  currentContext = null
}

/**
 * Run a function with temporary context
 *
 * @param context - Context to use during execution
 * @param fn - Function to execute
 * @returns Result of the function
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

/**
 * Run a synchronous function with temporary context
 *
 * @param context - Context to use during execution
 * @param fn - Function to execute
 * @returns Result of the function
 */
export function withContextSync<T>(context: MCPContext, fn: () => T): T {
  const previousContext = currentContext
  try {
    currentContext = { ...context }
    return fn()
  } finally {
    currentContext = previousContext
  }
}
