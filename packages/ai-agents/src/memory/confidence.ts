/**
 * Confidence scoring and decay for agent memories
 *
 * Memories have a confidence score that:
 * - Starts based on source (trained=1.0, observed=0.7, etc.)
 * - Increases when reinforced (used successfully)
 * - Decreases when contradicted
 * - Decays over time when not used
 */

import { sql } from '@cgk-platform/db'
import type { AgentMemory, ConfidenceFactors, MemorySource } from './types.js'
import { SOURCE_WEIGHTS } from './types.js'

/**
 * Confidence decay rate per week unused
 */
const DECAY_PER_WEEK = 0.01

/**
 * Maximum decay from age
 */
const MAX_AGE_DECAY = 0.2

/**
 * Reinforcement bonus per reinforcement
 */
const REINFORCEMENT_BONUS = 0.05

/**
 * Maximum reinforcement bonus
 */
const MAX_REINFORCEMENT_BONUS = 0.2

/**
 * Contradiction penalty per contradiction
 */
const CONTRADICTION_PENALTY = 0.1

/**
 * Maximum contradiction penalty
 */
const MAX_CONTRADICTION_PENALTY = 0.3

/**
 * Calculate confidence score for a memory
 *
 * Takes into account:
 * - Source weight (trained > told > corrected > observed > imported > inferred)
 * - Reinforcement bonus (up to +0.2)
 * - Contradiction penalty (up to -0.3)
 * - Age decay (up to -0.2)
 *
 * @param memory - Memory to calculate confidence for
 * @returns Confidence factors breakdown and final score
 */
export function calculateConfidence(memory: AgentMemory): ConfidenceFactors {
  // Source weight
  const sourceWeight = SOURCE_WEIGHTS[memory.source as MemorySource] ?? 0.5

  // Reinforcement bonus (up to +0.2)
  const reinforcementBonus = Math.min(
    MAX_REINFORCEMENT_BONUS,
    memory.timesReinforced * REINFORCEMENT_BONUS
  )

  // Contradiction penalty (up to -0.3)
  const contradictionPenalty = Math.min(
    MAX_CONTRADICTION_PENALTY,
    memory.timesContradicted * CONTRADICTION_PENALTY
  )

  // Age decay (lose decay rate per week unused, max MAX_AGE_DECAY)
  let ageDecay = 0
  if (memory.lastUsedAt) {
    const lastUsedTime = new Date(memory.lastUsedAt).getTime()
    const weeksUnused = (Date.now() - lastUsedTime) / (1000 * 60 * 60 * 24 * 7)
    ageDecay = Math.min(MAX_AGE_DECAY, weeksUnused * DECAY_PER_WEEK)
  }

  // Calculate final confidence
  let finalConfidence = sourceWeight + reinforcementBonus - contradictionPenalty - ageDecay

  // Clamp between 0 and 1
  finalConfidence = Math.max(0, Math.min(1, finalConfidence))

  return {
    sourceWeight,
    reinforcementBonus,
    contradictionPenalty,
    ageDecay,
    finalConfidence,
  }
}

/**
 * Reinforce a memory (increase confidence)
 *
 * Called when a memory is used successfully or validated by user.
 *
 * @param memoryId - Memory to reinforce
 */
export async function reinforceMemory(memoryId: string): Promise<void> {
  await sql`
    UPDATE agent_memories
    SET
      times_reinforced = times_reinforced + 1,
      confidence = LEAST(1.0, confidence + ${REINFORCEMENT_BONUS}),
      updated_at = NOW()
    WHERE id = ${memoryId}
  `
}

/**
 * Contradict a memory (decrease confidence)
 *
 * Called when a memory is proven wrong or contradicted by new information.
 *
 * @param memoryId - Memory to contradict
 */
export async function contradictMemory(memoryId: string): Promise<void> {
  await sql`
    UPDATE agent_memories
    SET
      times_contradicted = times_contradicted + 1,
      confidence = GREATEST(0.1, confidence - ${CONTRADICTION_PENALTY}),
      updated_at = NOW()
    WHERE id = ${memoryId}
  `
}

/**
 * Apply age decay to all memories
 *
 * Should be run periodically (e.g., daily) to decay unused memories.
 *
 * @param agentId - Optional: limit to specific agent
 * @returns Number of memories updated
 */
export async function applyAgeDecay(agentId?: string): Promise<number> {
  // Calculate weeks since last used and apply decay
  // Use separate queries to avoid composing SQL fragments (which creates Promise embedding issues)
  const result = agentId
    ? await sql`
        UPDATE agent_memories
        SET
          confidence = GREATEST(
            0.1,
            confidence - (
              EXTRACT(EPOCH FROM (NOW() - COALESCE(last_used_at, created_at))) / (60 * 60 * 24 * 7) * ${DECAY_PER_WEEK}
            )
          ),
          updated_at = NOW()
        WHERE is_active = true
          AND confidence > 0.1
          AND agent_id = ${agentId}
      `
    : await sql`
        UPDATE agent_memories
        SET
          confidence = GREATEST(
            0.1,
            confidence - (
              EXTRACT(EPOCH FROM (NOW() - COALESCE(last_used_at, created_at))) / (60 * 60 * 24 * 7) * ${DECAY_PER_WEEK}
            )
          ),
          updated_at = NOW()
        WHERE is_active = true
          AND confidence > 0.1
      `

  return result.rowCount ?? 0
}

/**
 * Recalculate confidence for all memories
 *
 * Useful after changing confidence algorithm or for periodic maintenance.
 *
 * @param agentId - Optional: limit to specific agent
 * @returns Number of memories updated
 */
export async function recalculateAllConfidence(agentId?: string): Promise<number> {
  // This is a complex calculation that considers source, reinforcements, contradictions, and age
  // Use separate queries to avoid composing SQL fragments (which creates Promise embedding issues)
  const result = agentId
    ? await sql`
        UPDATE agent_memories
        SET
          confidence = GREATEST(0, LEAST(1,
            -- Source weight
            CASE source
              WHEN 'trained' THEN 1.0
              WHEN 'told' THEN 0.9
              WHEN 'corrected' THEN 0.85
              WHEN 'observed' THEN 0.7
              WHEN 'imported' THEN 0.6
              WHEN 'inferred' THEN 0.5
              ELSE 0.5
            END
            -- Reinforcement bonus (max 0.2)
            + LEAST(${MAX_REINFORCEMENT_BONUS}, times_reinforced * ${REINFORCEMENT_BONUS})
            -- Contradiction penalty (max 0.3)
            - LEAST(${MAX_CONTRADICTION_PENALTY}, times_contradicted * ${CONTRADICTION_PENALTY})
            -- Age decay (max 0.2)
            - LEAST(
                ${MAX_AGE_DECAY},
                EXTRACT(EPOCH FROM (NOW() - COALESCE(last_used_at, created_at))) / (60 * 60 * 24 * 7) * ${DECAY_PER_WEEK}
              )
          )),
          updated_at = NOW()
        WHERE is_active = true
          AND agent_id = ${agentId}
      `
    : await sql`
        UPDATE agent_memories
        SET
          confidence = GREATEST(0, LEAST(1,
            -- Source weight
            CASE source
              WHEN 'trained' THEN 1.0
              WHEN 'told' THEN 0.9
              WHEN 'corrected' THEN 0.85
              WHEN 'observed' THEN 0.7
              WHEN 'imported' THEN 0.6
              WHEN 'inferred' THEN 0.5
              ELSE 0.5
            END
            -- Reinforcement bonus (max 0.2)
            + LEAST(${MAX_REINFORCEMENT_BONUS}, times_reinforced * ${REINFORCEMENT_BONUS})
            -- Contradiction penalty (max 0.3)
            - LEAST(${MAX_CONTRADICTION_PENALTY}, times_contradicted * ${CONTRADICTION_PENALTY})
            -- Age decay (max 0.2)
            - LEAST(
                ${MAX_AGE_DECAY},
                EXTRACT(EPOCH FROM (NOW() - COALESCE(last_used_at, created_at))) / (60 * 60 * 24 * 7) * ${DECAY_PER_WEEK}
              )
          )),
          updated_at = NOW()
        WHERE is_active = true
      `

  return result.rowCount ?? 0
}

/**
 * Get memories with low confidence that should be reviewed
 *
 * @param agentId - Agent ID
 * @param threshold - Confidence threshold (default 0.3)
 * @returns Memories below threshold
 */
export async function getLowConfidenceMemories(
  agentId: string,
  threshold = 0.3
): Promise<{ id: string; title: string; confidence: number }[]> {
  const result = await sql`
    SELECT id, title, confidence
    FROM agent_memories
    WHERE agent_id = ${agentId}
      AND is_active = true
      AND confidence < ${threshold}
    ORDER BY confidence ASC
    LIMIT 50
  `

  return result.rows as { id: string; title: string; confidence: number }[]
}

/**
 * Deactivate memories with very low confidence
 *
 * @param threshold - Confidence threshold (default 0.2)
 * @param agentId - Optional: limit to specific agent
 * @returns Number of memories deactivated
 */
export async function deactivateLowConfidenceMemories(
  threshold = 0.2,
  agentId?: string
): Promise<number> {
  // Use separate queries to avoid composing SQL fragments (which creates Promise embedding issues)
  const result = agentId
    ? await sql`
        UPDATE agent_memories
        SET is_active = false, updated_at = NOW()
        WHERE is_active = true
          AND confidence < ${threshold}
          AND agent_id = ${agentId}
      `
    : await sql`
        UPDATE agent_memories
        SET is_active = false, updated_at = NOW()
        WHERE is_active = true
          AND confidence < ${threshold}
      `

  return result.rowCount ?? 0
}

/**
 * Supersede a memory with a new one
 *
 * Marks old memory as superseded and links to new memory.
 *
 * @param oldMemoryId - Memory being superseded
 * @param newMemoryId - New memory that supersedes it
 */
export async function supersedeMemory(oldMemoryId: string, newMemoryId: string): Promise<void> {
  await sql`
    UPDATE agent_memories
    SET
      is_active = false,
      superseded_by = ${newMemoryId},
      updated_at = NOW()
    WHERE id = ${oldMemoryId}
  `
}
