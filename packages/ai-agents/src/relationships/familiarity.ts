/**
 * Familiarity - Calculate and manage familiarity scores
 */

import {
  decayAllFamiliarity as dbDecayAllFamiliarity,
  getHighFamiliarityRelationships as dbGetHighFamiliarity,
  updateFamiliarity as dbUpdateFamiliarity,
  listAgentRelationships,
} from '../db/relationships-queries.js'
import type { AgentRelationship, PersonType } from '../types/teams.js'

/**
 * Recalculate familiarity for a specific relationship
 */
export async function recalculateFamiliarity(
  agentId: string,
  personType: PersonType,
  personId: string
): Promise<void> {
  await dbUpdateFamiliarity(agentId, personType, personId)
}

/**
 * Apply time decay to all familiarity scores
 * Should be called daily by a background job
 */
export async function applyFamiliarityDecay(): Promise<number> {
  return dbDecayAllFamiliarity()
}

/**
 * Get high-familiarity relationships for an agent
 */
export async function getHighFamiliarityRelationships(
  agentId: string,
  minScore = 0.5,
  limit = 10
): Promise<AgentRelationship[]> {
  return dbGetHighFamiliarity(agentId, minScore, limit)
}

/**
 * Get familiarity level as a descriptive string
 */
export function getFamiliarityLevel(score: number): 'stranger' | 'acquaintance' | 'familiar' | 'close' {
  if (score < 0.15) return 'stranger'
  if (score < 0.35) return 'acquaintance'
  if (score < 0.65) return 'familiar'
  return 'close'
}

/**
 * Get familiarity description for prompts
 */
export function getFamiliarityDescription(score: number): string {
  const level = getFamiliarityLevel(score)

  switch (level) {
    case 'stranger':
      return 'This is someone new you have not interacted with before. Be welcoming and introduce yourself.'
    case 'acquaintance':
      return 'You have had a few interactions with this person. You know some basics about them.'
    case 'familiar':
      return 'You know this person fairly well from multiple interactions. You can reference past conversations.'
    case 'close':
      return 'You have a strong working relationship with this person. You can be more casual and reference shared history.'
  }
}

/**
 * Calculate expected familiarity based on interaction data
 */
export function calculateExpectedFamiliarity(params: {
  interactionCount: number
  totalMinutes: number
  daysSinceLastInteraction: number
}): number {
  // Base from interaction count (max 0.4, log scale)
  const interactionBase = Math.min(0.4, Math.log(params.interactionCount + 1) / 4)

  // Bonus from conversation time (max 0.3, log scale)
  const timeBonus = Math.min(0.3, Math.log(params.totalMinutes + 1) / 5)

  // Recency bonus (max 0.3, decays over 30 days)
  const recencyBonus = Math.max(0, 0.3 * (1 - params.daysSinceLastInteraction / 30))

  return Math.min(1.0, interactionBase + timeBonus + recencyBonus)
}

/**
 * Get familiarity insights for an agent
 */
export async function getFamiliarityInsights(agentId: string): Promise<{
  totalRelationships: number
  familiarityDistribution: {
    stranger: number
    acquaintance: number
    familiar: number
    close: number
  }
  avgFamiliarity: number
  mostFamiliar: AgentRelationship[]
  leastRecent: AgentRelationship[]
}> {
  const relationships = await listAgentRelationships(agentId)

  const distribution = {
    stranger: 0,
    acquaintance: 0,
    familiar: 0,
    close: 0,
  }

  for (const rel of relationships) {
    const level = getFamiliarityLevel(rel.familiarityScore)
    distribution[level]++
  }

  const avgFamiliarity =
    relationships.length > 0
      ? relationships.reduce((sum, r) => sum + r.familiarityScore, 0) / relationships.length
      : 0

  // Sort by familiarity descending
  const sortedByFamiliarity = [...relationships].sort(
    (a, b) => b.familiarityScore - a.familiarityScore
  )

  // Sort by last interaction ascending (oldest first)
  const sortedByRecency = [...relationships]
    .filter((r) => r.lastInteractionAt)
    .sort(
      (a, b) =>
        new Date(a.lastInteractionAt!).getTime() - new Date(b.lastInteractionAt!).getTime()
    )

  return {
    totalRelationships: relationships.length,
    familiarityDistribution: distribution,
    avgFamiliarity,
    mostFamiliar: sortedByFamiliarity.slice(0, 5),
    leastRecent: sortedByRecency.slice(0, 5),
  }
}

/**
 * Check if agent should re-introduce themselves
 */
export function shouldReintroduce(params: {
  familiarityScore: number
  daysSinceLastInteraction: number | null
}): boolean {
  // Reintroduce if:
  // 1. Very low familiarity (basically a stranger)
  // 2. Haven't interacted in over 90 days
  if (params.familiarityScore < 0.1) return true
  if (params.daysSinceLastInteraction && params.daysSinceLastInteraction > 90) return true
  return false
}

/**
 * Get greeting style based on familiarity
 */
export function getGreetingStyle(familiarityScore: number): 'formal' | 'friendly' | 'casual' {
  if (familiarityScore < 0.25) return 'formal'
  if (familiarityScore < 0.6) return 'friendly'
  return 'casual'
}
