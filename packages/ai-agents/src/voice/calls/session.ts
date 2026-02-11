/**
 * Voice Call Session Management
 *
 * Handles real-time voice call sessions, conversation state,
 * and message processing during active calls.
 */

import type {
  ConversationTurn,
  VoiceCallSession,
} from '../types.js'
import { getVoiceConfig } from '../db/voice-queries.js'

// In-memory session store (in production, use Redis)
const activeSessions = new Map<string, VoiceCallSession>()

/**
 * Create a new voice call session
 */
export async function createSession(params: {
  callId: string
  callSid: string
  agentId: string
  tenantId: string
}): Promise<VoiceCallSession> {
  const voiceConfig = await getVoiceConfig(params.agentId)
  if (!voiceConfig) {
    throw new Error(`Voice configuration not found for agent ${params.agentId}`)
  }

  const session: VoiceCallSession = {
    callId: params.callId,
    agentId: params.agentId,
    tenantId: params.tenantId,
    callSid: params.callSid,
    voiceConfig,
    conversationHistory: [],
    isActive: true,
    startedAt: new Date(),
  }

  activeSessions.set(params.callId, session)
  return session
}

/**
 * Get an active session by call ID
 */
export function getSession(callId: string): VoiceCallSession | undefined {
  return activeSessions.get(callId)
}

/**
 * Get session by call SID (provider's call ID)
 */
export function getSessionBySid(callSid: string): VoiceCallSession | undefined {
  for (const session of activeSessions.values()) {
    if (session.callSid === callSid) {
      return session
    }
  }
  return undefined
}

/**
 * Add a conversation turn to the session
 */
export function addConversationTurn(
  callId: string,
  role: 'user' | 'agent',
  content: string
): void {
  const session = activeSessions.get(callId)
  if (!session) {
    throw new Error(`Session not found for call ${callId}`)
  }

  session.conversationHistory.push({
    role,
    content,
    timestamp: new Date(),
  })
}

/**
 * Get conversation history for a session
 */
export function getConversationHistory(callId: string): ConversationTurn[] {
  const session = activeSessions.get(callId)
  return session?.conversationHistory || []
}

/**
 * End a voice call session
 */
export function endSession(callId: string): VoiceCallSession | undefined {
  const session = activeSessions.get(callId)
  if (session) {
    session.isActive = false
    activeSessions.delete(callId)
  }
  return session
}

/**
 * List all active sessions for a tenant
 */
export function listActiveSessions(tenantId: string): VoiceCallSession[] {
  const sessions: VoiceCallSession[] = []
  for (const session of activeSessions.values()) {
    if (session.tenantId === tenantId && session.isActive) {
      sessions.push(session)
    }
  }
  return sessions
}

/**
 * List all active sessions for an agent
 */
export function listAgentSessions(agentId: string): VoiceCallSession[] {
  const sessions: VoiceCallSession[] = []
  for (const session of activeSessions.values()) {
    if (session.agentId === agentId && session.isActive) {
      sessions.push(session)
    }
  }
  return sessions
}

/**
 * Get the count of active sessions
 */
export function getActiveSessionCount(): number {
  return activeSessions.size
}

/**
 * Clean up stale sessions (sessions older than maxAge)
 */
export function cleanupStaleSessions(maxAgeMs: number = 3600000): number {
  const now = Date.now()
  let cleaned = 0

  for (const [callId, session] of activeSessions.entries()) {
    const sessionAge = now - session.startedAt.getTime()
    if (sessionAge > maxAgeMs) {
      activeSessions.delete(callId)
      cleaned++
    }
  }

  return cleaned
}

/**
 * Format conversation history for LLM context
 */
export function formatConversationForLLM(callId: string): string {
  const history = getConversationHistory(callId)

  return history
    .map((turn) => {
      const role = turn.role === 'user' ? 'Customer' : 'Agent'
      return `${role}: ${turn.content}`
    })
    .join('\n')
}

/**
 * Get session statistics
 */
export function getSessionStats(): {
  totalActive: number
  byTenant: Record<string, number>
  byAgent: Record<string, number>
  avgDurationMs: number
} {
  const stats = {
    totalActive: activeSessions.size,
    byTenant: {} as Record<string, number>,
    byAgent: {} as Record<string, number>,
    avgDurationMs: 0,
  }

  let totalDuration = 0

  for (const session of activeSessions.values()) {
    // Count by tenant
    stats.byTenant[session.tenantId] = (stats.byTenant[session.tenantId] || 0) + 1

    // Count by agent
    stats.byAgent[session.agentId] = (stats.byAgent[session.agentId] || 0) + 1

    // Sum duration
    totalDuration += Date.now() - session.startedAt.getTime()
  }

  if (activeSessions.size > 0) {
    stats.avgDurationMs = Math.round(totalDuration / activeSessions.size)
  }

  return stats
}
