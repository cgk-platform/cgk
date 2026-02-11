/**
 * Relationship Tracker - Record and manage agent-person interactions
 */

import {
  getOrCreateRelationship,
  getRelationship,
  listAgentRelationships,
  listAgentRelationshipsWithDetails,
  recordInteraction as dbRecordInteraction,
  updateRelationship as dbUpdateRelationship,
  getRelationshipStats as dbGetRelationshipStats,
} from '../db/relationships-queries.js'
import type {
  AgentRelationship,
  AgentRelationshipWithPerson,
  PersonType,
  RecordInteractionInput,
  UpdateRelationshipInput,
} from '../types/teams.js'

/**
 * Record an interaction between an agent and a person
 */
export async function recordInteraction(
  input: RecordInteractionInput
): Promise<AgentRelationship> {
  return dbRecordInteraction({
    agentId: input.agentId,
    personType: input.personType,
    personId: input.personId,
    durationMinutes: input.durationMinutes,
    topics: input.topics,
  })
}

/**
 * Get or create a relationship
 */
export async function ensureRelationship(
  agentId: string,
  personType: PersonType,
  personId: string
): Promise<AgentRelationship> {
  return getOrCreateRelationship(agentId, personType, personId)
}

/**
 * Get a specific relationship
 */
export async function getAgentRelationship(
  agentId: string,
  personType: PersonType,
  personId: string
): Promise<AgentRelationship | null> {
  return getRelationship(agentId, personType, personId)
}

/**
 * List all relationships for an agent
 */
export async function listRelationships(agentId: string): Promise<AgentRelationship[]> {
  return listAgentRelationships(agentId)
}

/**
 * List relationships with person details
 */
export async function listRelationshipsWithDetails(
  agentId: string
): Promise<AgentRelationshipWithPerson[]> {
  return listAgentRelationshipsWithDetails(agentId)
}

/**
 * Update a relationship
 */
export async function updateRelationship(
  agentId: string,
  personType: PersonType,
  personId: string,
  input: UpdateRelationshipInput
): Promise<AgentRelationship | null> {
  return dbUpdateRelationship(agentId, personType, personId, input)
}

/**
 * Get relationship stats for an agent
 */
export async function getRelationshipStats(agentId: string): Promise<{
  totalRelationships: number
  avgFamiliarity: number
  avgTrustLevel: number
  totalInteractions: number
  totalConversationMinutes: number
}> {
  return dbGetRelationshipStats(agentId)
}

/**
 * Record a conversation start
 */
export async function startConversation(
  agentId: string,
  personType: PersonType,
  personId: string
): Promise<{
  relationship: AgentRelationship
  isFirstInteraction: boolean
}> {
  const existing = await getRelationship(agentId, personType, personId)
  const relationship = await ensureRelationship(agentId, personType, personId)

  return {
    relationship,
    isFirstInteraction: !existing,
  }
}

/**
 * Record a conversation end with duration
 */
export async function endConversation(
  agentId: string,
  personType: PersonType,
  personId: string,
  durationMinutes: number,
  topics?: string[]
): Promise<AgentRelationship> {
  return recordInteraction({
    agentId,
    personType,
    personId,
    durationMinutes,
    topics,
  })
}

/**
 * Get relationship context for prompt building
 */
export async function getRelationshipContext(
  agentId: string,
  personType: PersonType,
  personId: string
): Promise<{
  familiarity: 'new' | 'familiar' | 'well_known'
  interactionCount: number
  lastInteraction: Date | null
  topics: string[]
  summary: string | null
} | null> {
  const relationship = await getRelationship(agentId, personType, personId)
  if (!relationship) return null

  let familiarity: 'new' | 'familiar' | 'well_known'
  if (relationship.familiarityScore < 0.2) {
    familiarity = 'new'
  } else if (relationship.familiarityScore < 0.6) {
    familiarity = 'familiar'
  } else {
    familiarity = 'well_known'
  }

  return {
    familiarity,
    interactionCount: relationship.interactionCount,
    lastInteraction: relationship.lastInteractionAt,
    topics: relationship.communicationPreferences.topicsDiscussed || [],
    summary: relationship.relationshipSummary,
  }
}

/**
 * Update relationship summary
 */
export async function setRelationshipSummary(
  agentId: string,
  personType: PersonType,
  personId: string,
  summary: string
): Promise<AgentRelationship | null> {
  return dbUpdateRelationship(agentId, personType, personId, {
    relationshipSummary: summary,
  })
}

/**
 * Adjust trust level
 */
export async function adjustTrustLevel(
  agentId: string,
  personType: PersonType,
  personId: string,
  adjustment: number
): Promise<AgentRelationship | null> {
  const relationship = await getRelationship(agentId, personType, personId)
  if (!relationship) return null

  // Clamp trust level between 0 and 1
  const newTrustLevel = Math.max(0, Math.min(1, relationship.trustLevel + adjustment))

  return dbUpdateRelationship(agentId, personType, personId, {
    trustLevel: newTrustLevel,
  })
}
