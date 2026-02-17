/**
 * MCP Session Management
 *
 * Handles session creation, tracking, and cleanup for MCP connections.
 * Sessions are stored in-memory with TTL for Edge runtime compatibility.
 *
 * AI Discretion Decision: Using in-memory session storage with TTL
 * instead of Redis for Edge runtime compatibility. Sessions are ephemeral
 * and recreated on each request in Streamable HTTP transport.
 */

import {
  SUPPORTED_PROTOCOL_VERSIONS,
  type CreateSessionOptions,
  type MCPProtocolVersion,
  type MCPSession,
  type TokenUsageEntry,
  type MCPMethod,
} from './types'

// =============================================================================
// Session Storage (In-Memory with TTL)
// =============================================================================

/**
 * Session TTL in milliseconds (30 minutes)
 */
const SESSION_TTL_MS = 30 * 60 * 1000

/**
 * Cleanup interval in milliseconds (5 minutes)
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

/**
 * In-memory session store
 */
const sessions = new Map<string, MCPSession>()

/**
 * Token usage log (in-memory, limited to last 1000 entries per tenant)
 */
const tokenUsageLog = new Map<string, TokenUsageEntry[]>()

/**
 * Maximum token usage entries per tenant
 */
const MAX_USAGE_ENTRIES_PER_TENANT = 1000

// =============================================================================
// Session ID Generation (Edge-compatible)
// =============================================================================

/**
 * Generate a unique session ID using Web Crypto API
 * Edge runtime compatible - no Node.js crypto module
 */
function generateSessionId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// =============================================================================
// Session Management Functions
// =============================================================================

/**
 * Create a new MCP session
 *
 * @param options - Session creation options
 * @returns The created MCP session
 */
export function createMCPSession(options: CreateSessionOptions): MCPSession {
  const now = new Date()
  const session: MCPSession = {
    id: generateSessionId(),
    tenantId: options.tenantId,
    userId: options.userId,
    protocolVersion: options.protocolVersion,
    clientInfo: options.clientInfo,
    createdAt: now,
    lastActivityAt: now,
    tokenUsage: {
      toolCalls: 0,
      resourceReads: 0,
      promptGets: 0,
    },
  }

  sessions.set(session.id, session)
  return session
}

/**
 * Get a session by ID
 *
 * @param sessionId - The session ID to look up
 * @returns The session if found and not expired, null otherwise
 */
export function getSession(sessionId: string): MCPSession | null {
  const session = sessions.get(sessionId)
  if (!session) {
    return null
  }

  // Check if session has expired
  const now = Date.now()
  const lastActivity = session.lastActivityAt.getTime()
  if (now - lastActivity > SESSION_TTL_MS) {
    sessions.delete(sessionId)
    return null
  }

  return session
}

/**
 * Update session activity timestamp
 *
 * @param sessionId - The session ID to update
 * @returns The updated session or null if not found
 */
export function touchSession(sessionId: string): MCPSession | null {
  const session = sessions.get(sessionId)
  if (!session) {
    return null
  }

  session.lastActivityAt = new Date()
  return session
}

/**
 * Increment session token usage counter
 *
 * @param sessionId - The session ID
 * @param type - The type of operation (toolCalls, resourceReads, promptGets)
 */
export function incrementUsage(
  sessionId: string,
  type: 'toolCalls' | 'resourceReads' | 'promptGets'
): void {
  const session = sessions.get(sessionId)
  if (session) {
    session.tokenUsage[type]++
    session.lastActivityAt = new Date()
  }
}

/**
 * Delete a session
 *
 * @param sessionId - The session ID to delete
 * @returns True if session was deleted, false if not found
 */
export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId)
}

/**
 * Get all active sessions for a tenant
 *
 * @param tenantId - The tenant ID
 * @returns Array of active sessions for the tenant
 */
export function getTenantSessions(tenantId: string): MCPSession[] {
  const tenantSessions: MCPSession[] = []
  const now = Date.now()

  for (const session of sessions.values()) {
    if (session.tenantId !== tenantId) continue

    const lastActivity = session.lastActivityAt.getTime()
    if (now - lastActivity <= SESSION_TTL_MS) {
      tenantSessions.push(session)
    }
  }

  return tenantSessions
}

/**
 * Get session count for a tenant
 *
 * @param tenantId - The tenant ID
 * @returns Number of active sessions
 */
export function getTenantSessionCount(tenantId: string): number {
  return getTenantSessions(tenantId).length
}

/**
 * Cleanup expired sessions
 *
 * @returns Number of sessions cleaned up
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now()
  let cleaned = 0

  for (const [id, session] of sessions.entries()) {
    const lastActivity = session.lastActivityAt.getTime()
    if (now - lastActivity > SESSION_TTL_MS) {
      sessions.delete(id)
      cleaned++
    }
  }

  return cleaned
}

// =============================================================================
// Token Usage Logging
// =============================================================================

/**
 * Log token usage for analytics
 *
 * @param entry - The token usage entry to log
 */
export function logTokenUsage(entry: TokenUsageEntry): void {
  const tenantLog = tokenUsageLog.get(entry.tenantId) || []

  // Add new entry
  tenantLog.push(entry)

  // Trim to max entries (FIFO)
  while (tenantLog.length > MAX_USAGE_ENTRIES_PER_TENANT) {
    tenantLog.shift()
  }

  tokenUsageLog.set(entry.tenantId, tenantLog)
}

/**
 * Create a token usage entry helper
 *
 * @param session - The MCP session
 * @param method - The MCP method called
 * @param details - Additional details (tool name, resource URI, etc.)
 * @returns A function to complete the entry after execution
 */
export function startUsageTracking(
  session: MCPSession,
  method: MCPMethod,
  details?: {
    toolName?: string
    resourceUri?: string
    promptName?: string
  }
): (success: boolean, errorMessage?: string) => void {
  const startedAt = new Date()

  return (success: boolean, errorMessage?: string) => {
    const completedAt = new Date()
    const durationMs = completedAt.getTime() - startedAt.getTime()

    logTokenUsage({
      sessionId: session.id,
      tenantId: session.tenantId,
      userId: session.userId,
      method,
      toolName: details?.toolName,
      resourceUri: details?.resourceUri,
      promptName: details?.promptName,
      startedAt,
      completedAt,
      durationMs,
      success,
      errorMessage,
    })
  }
}

/**
 * Get token usage logs for a tenant
 *
 * @param tenantId - The tenant ID
 * @param options - Query options
 * @returns Array of token usage entries
 */
export function getTokenUsageLogs(
  tenantId: string,
  options?: {
    limit?: number
    since?: Date
    method?: MCPMethod
  }
): TokenUsageEntry[] {
  const tenantLog = tokenUsageLog.get(tenantId) || []

  let filtered = tenantLog

  // Filter by date if provided
  if (options?.since) {
    const sinceTime = options.since.getTime()
    filtered = filtered.filter((e) => e.startedAt.getTime() >= sinceTime)
  }

  // Filter by method if provided
  if (options?.method) {
    filtered = filtered.filter((e) => e.method === options.method)
  }

  // Apply limit (from end, most recent first)
  if (options?.limit && options.limit < filtered.length) {
    filtered = filtered.slice(-options.limit)
  }

  // Return in reverse chronological order
  return filtered.reverse()
}

/**
 * Get usage statistics for a tenant
 *
 * @param tenantId - The tenant ID
 * @param since - Only count entries since this date
 * @returns Usage statistics
 */
export function getUsageStats(
  tenantId: string,
  since?: Date
): {
  totalCalls: number
  toolCalls: number
  resourceReads: number
  promptGets: number
  errorCount: number
  avgDurationMs: number
} {
  const logs = getTokenUsageLogs(tenantId, { since })

  const stats = {
    totalCalls: logs.length,
    toolCalls: 0,
    resourceReads: 0,
    promptGets: 0,
    errorCount: 0,
    avgDurationMs: 0,
  }

  if (logs.length === 0) {
    return stats
  }

  let totalDuration = 0

  for (const log of logs) {
    if (log.method === 'tools/call') stats.toolCalls++
    if (log.method === 'resources/read') stats.resourceReads++
    if (log.method === 'prompts/get') stats.promptGets++
    if (!log.success) stats.errorCount++
    totalDuration += log.durationMs
  }

  stats.avgDurationMs = Math.round(totalDuration / logs.length)

  return stats
}

/**
 * Clear all usage logs for a tenant
 *
 * @param tenantId - The tenant ID
 */
export function clearTokenUsageLogs(tenantId: string): void {
  tokenUsageLog.delete(tenantId)
}

// =============================================================================
// Session Validation Helpers
// =============================================================================

/**
 * Validate protocol version
 *
 * @param version - The version string to validate
 * @returns True if version is supported
 */
export function isValidProtocolVersion(version: string): version is MCPProtocolVersion {
  return SUPPORTED_PROTOCOL_VERSIONS.includes(version as MCPProtocolVersion)
}

/**
 * Get the best matching protocol version
 *
 * MCP version negotiation: if the client requests a version we support,
 * use it exactly. If the client requests a newer version, fall back to
 * our latest supported version. Only reject if the client requests an
 * older version we don't support.
 *
 * @param requestedVersion - The client's requested version
 * @returns The best matching version, or null if none supported
 */
export function negotiateProtocolVersion(
  requestedVersion: string
): MCPProtocolVersion | null {
  // If exact match, use it
  if (isValidProtocolVersion(requestedVersion)) {
    return requestedVersion
  }

  // If the client requests a newer version than we support,
  // negotiate down to our latest supported version
  const latest = SUPPORTED_PROTOCOL_VERSIONS[SUPPORTED_PROTOCOL_VERSIONS.length - 1]
  if (latest && requestedVersion > latest) {
    return latest
  }

  // Client requested an older unsupported version — reject
  return null
}

// =============================================================================
// Automatic Cleanup (only in Node.js environments)
// =============================================================================

// Set up cleanup interval if in long-running environment
// Edge functions don't need this as they're ephemeral
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null

/**
 * Start automatic session cleanup
 * Only call in long-running environments (not Edge)
 */
export function startSessionCleanup(): void {
  if (cleanupIntervalId) return

  cleanupIntervalId = setInterval(() => {
    cleanupExpiredSessions()
  }, CLEANUP_INTERVAL_MS)
}

/**
 * Stop automatic session cleanup
 */
export function stopSessionCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId)
    cleanupIntervalId = null
  }
}

/**
 * Get current session store size (for monitoring)
 *
 * @returns Number of sessions in store
 */
export function getSessionStoreSize(): number {
  return sessions.size
}
