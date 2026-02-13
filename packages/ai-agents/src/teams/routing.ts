/**
 * Task Routing - Route messages/tasks to appropriate agents
 */

import { sql } from '@cgk-platform/db'
import { listAgents } from '../agents/registry.js'
import { getAgentTeamMemberships } from '../db/teams-queries.js'
import type {
  AgentWithSpecializations,
  RouteTaskInput,
  RoutingResult,
  TeamRole,
} from '../types/teams.js'

/**
 * Route a task to the most appropriate agent
 */
export async function routeToAgent(input: RouteTaskInput): Promise<RoutingResult> {
  // Get all active agents with their specializations
  const agents = await listAgentsWithSpecializations()

  if (agents.length === 0) {
    throw new Error('No active agents available for routing')
  }

  // If only one agent, route to them
  const singleAgent = agents[0]
  if (agents.length === 1 && singleAgent) {
    return {
      agentId: singleAgent.id,
      reason: 'Only available agent',
      confidence: 1.0,
    }
  }

  // Check for explicit mentions
  const mentionedAgent = extractAgentMention(input.message, agents)
  if (mentionedAgent) {
    return {
      agentId: mentionedAgent.id,
      reason: 'Explicitly mentioned',
      confidence: 1.0,
    }
  }

  // Route based on channel configuration
  const channelAgent = await getAgentForChannel(input.channelId)
  if (channelAgent) {
    return {
      agentId: channelAgent.id,
      reason: 'Channel default agent',
      confidence: 0.9,
    }
  }

  // Route based on topic/specialization
  const topicMatch = await matchAgentByTopic(input.message, agents)
  if (topicMatch) {
    return {
      agentId: topicMatch.agentId,
      reason: `Specializes in: ${topicMatch.topic}`,
      confidence: topicMatch.score,
    }
  }

  // Fall back to primary agent
  const primary = agents.find((a) => a.isPrimary) || agents[0]
  if (!primary) {
    throw new Error('No agent available for fallback routing')
  }
  return {
    agentId: primary.id,
    reason: 'Primary agent fallback',
    confidence: 0.5,
  }
}

/**
 * Get all agents with their team memberships and specializations
 */
export async function listAgentsWithSpecializations(): Promise<AgentWithSpecializations[]> {
  const agents = await listAgents()
  const activeAgents = agents.filter((a) => a.status === 'active')

  const result: AgentWithSpecializations[] = []

  for (const agent of activeAgents) {
    const memberships = await getAgentTeamMemberships(agent.id)

    result.push({
      id: agent.id,
      name: agent.name,
      displayName: agent.displayName,
      isPrimary: agent.isPrimary,
      status: agent.status,
      teamMemberships: memberships.map((m) => ({
        teamId: m.teamId,
        teamName: m.teamName,
        role: m.role as TeamRole,
        specializations: m.specializations,
      })),
    })
  }

  return result
}

/**
 * Extract agent mention from message
 */
export function extractAgentMention(
  message: string,
  agents: AgentWithSpecializations[]
): AgentWithSpecializations | null {
  const lowerMessage = message.toLowerCase()

  for (const agent of agents) {
    // Check for @mention style
    if (
      lowerMessage.includes(`@${agent.name.toLowerCase()}`) ||
      lowerMessage.includes(`@${agent.displayName.toLowerCase()}`)
    ) {
      return agent
    }

    // Check for direct name reference
    if (
      lowerMessage.includes(`hey ${agent.displayName.toLowerCase()}`) ||
      lowerMessage.includes(`hi ${agent.displayName.toLowerCase()}`) ||
      lowerMessage.startsWith(agent.displayName.toLowerCase())
    ) {
      return agent
    }
  }

  return null
}

/**
 * Get the default agent for a channel
 */
export async function getAgentForChannel(
  channelId?: string
): Promise<{ id: string; name: string } | null> {
  if (!channelId) return null

  // Check ai_teams for channel assignment
  const result = await sql`
    SELECT
      m.agent_id,
      a.name
    FROM ai_teams t
    JOIN ai_team_members m ON m.team_id = t.id
    JOIN ai_agents a ON a.id = m.agent_id
    WHERE t.slack_channel_id = ${channelId}
      AND t.is_active = true
      AND m.role = 'lead'
      AND a.status = 'active'
    LIMIT 1
  `

  if (result.rows[0]) {
    return {
      id: result.rows[0].agent_id as string,
      name: result.rows[0].name as string,
    }
  }

  // Fallback: check for any team member in this channel
  const fallbackResult = await sql`
    SELECT
      m.agent_id,
      a.name
    FROM ai_teams t
    JOIN ai_team_members m ON m.team_id = t.id
    JOIN ai_agents a ON a.id = m.agent_id
    WHERE t.slack_channel_id = ${channelId}
      AND t.is_active = true
      AND a.status = 'active'
    ORDER BY
      CASE m.role WHEN 'lead' THEN 0 WHEN 'specialist' THEN 1 ELSE 2 END
    LIMIT 1
  `

  if (fallbackResult.rows[0]) {
    return {
      id: fallbackResult.rows[0].agent_id as string,
      name: fallbackResult.rows[0].name as string,
    }
  }

  return null
}

/**
 * Match agent by topic/specialization using keyword matching
 */
export async function matchAgentByTopic(
  message: string,
  agents: AgentWithSpecializations[]
): Promise<{ agentId: string; topic: string; score: number } | null> {
  const lowerMessage = message.toLowerCase()
  const words = lowerMessage.split(/\s+/)

  let bestMatch: { agentId: string; topic: string; score: number } | null = null

  for (const agent of agents) {
    for (const membership of agent.teamMemberships) {
      for (const specialization of membership.specializations) {
        const specLower = specialization.toLowerCase()
        const specWords = specLower.split(/[\s_-]+/)

        // Calculate match score
        let matchCount = 0
        for (const specWord of specWords) {
          if (words.some((w) => w.includes(specWord) || specWord.includes(w))) {
            matchCount++
          }
        }

        if (matchCount > 0) {
          const score = matchCount / specWords.length

          if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = {
              agentId: agent.id,
              topic: specialization,
              score,
            }
          }
        }
      }
    }
  }

  return bestMatch
}

/**
 * Get routing suggestions for a message
 */
export async function getRoutingSuggestions(
  message: string,
  maxSuggestions = 3
): Promise<Array<RoutingResult>> {
  const agents = await listAgentsWithSpecializations()
  const suggestions: Array<RoutingResult & { priority: number }> = []

  // Check for explicit mentions
  const mentionedAgent = extractAgentMention(message, agents)
  if (mentionedAgent) {
    suggestions.push({
      agentId: mentionedAgent.id,
      reason: 'Explicitly mentioned',
      confidence: 1.0,
      priority: 0,
    })
  }

  // Get topic matches
  for (const agent of agents) {
    if (mentionedAgent && agent.id === mentionedAgent.id) continue

    for (const membership of agent.teamMemberships) {
      for (const specialization of membership.specializations) {
        const match = await matchAgentByTopic(message, [agent])
        if (match && match.score > 0.3) {
          suggestions.push({
            agentId: agent.id,
            reason: `Specializes in: ${specialization}`,
            confidence: match.score,
            priority: 1,
          })
        }
      }
    }
  }

  // Add primary agent as fallback
  const primary = agents.find((a) => a.isPrimary)
  if (primary && !suggestions.some((s) => s.agentId === primary.id)) {
    suggestions.push({
      agentId: primary.id,
      reason: 'Primary agent',
      confidence: 0.5,
      priority: 2,
    })
  }

  // Sort by priority then confidence, dedupe, and limit
  const seen = new Set<string>()
  return suggestions
    .sort((a, b) => a.priority - b.priority || b.confidence - a.confidence)
    .filter((s) => {
      if (seen.has(s.agentId)) return false
      seen.add(s.agentId)
      return true
    })
    .slice(0, maxSuggestions)
    .map(({ agentId, reason, confidence }) => ({ agentId, reason, confidence }))
}

/**
 * Check if an agent can handle a specific topic
 */
export async function canAgentHandle(agentId: string, topic: string): Promise<boolean> {
  const memberships = await getAgentTeamMemberships(agentId)
  const topicLower = topic.toLowerCase()

  for (const membership of memberships) {
    for (const spec of membership.specializations) {
      if (spec.toLowerCase().includes(topicLower) || topicLower.includes(spec.toLowerCase())) {
        return true
      }
    }
  }

  return false
}
