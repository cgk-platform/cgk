/**
 * Correction detection for automatic learning
 *
 * Detects when users correct the agent and creates failure learnings.
 */

import { sql } from '@cgk-platform/db'
import { createMemory } from '../memory/storage.js'
import type { CreateFailureLearningInput, FailureLearning, FailureType } from '../memory/types.js'

// Helper to convert snake_case DB rows to camelCase
function toCamelCase<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
    result[camelKey] = value
  }
  return result
}

/**
 * Patterns that indicate a correction
 */
const CORRECTION_PATTERNS = [
  /no,?\s+(?:that's|thats|it's|its|you're|youre)\s+(?:wrong|incorrect|not right)/i,
  /actually,?\s+(?:it's|its|the|that|you)/i,
  /that's not (?:what|how|right|correct)/i,
  /you (?:misunderstood|got it wrong|made a mistake)/i,
  /let me correct/i,
  /the correct (?:answer|response|way)/i,
  /wrong[,.]?\s+(?:it's|the)/i,
  /not quite[,.]?\s+/i,
  /close but/i,
  /almost[,.]?\s+but/i,
  /i meant/i,
  /what i (?:meant|was asking)/i,
  /that's not what i/i,
]

/**
 * Patterns that indicate a strong negative reaction
 */
const NEGATIVE_REACTION_PATTERNS = [
  /no[!]+/i,
  /stop[!]*/i,
  /don't do that/i,
  /why (?:did you|would you)/i,
  /that's (?:terrible|awful|bad|wrong)/i,
  /undo (?:that|this)/i,
  /cancel (?:that|this)/i,
  /never do that/i,
]

/**
 * Detect if a message is a correction
 *
 * @param message - User message to analyze
 * @returns Whether the message appears to be a correction
 */
export function isCorrection(message: string): boolean {
  return CORRECTION_PATTERNS.some((pattern) => pattern.test(message))
}

/**
 * Detect if a message is a negative reaction
 *
 * @param message - User message to analyze
 * @returns Whether the message appears to be a negative reaction
 */
export function isNegativeReaction(message: string): boolean {
  return NEGATIVE_REACTION_PATTERNS.some((pattern) => pattern.test(message))
}

/**
 * Detect correction and create failure learning
 *
 * Analyzes a follow-up message to see if it's correcting the agent,
 * and creates a failure learning if so.
 *
 * @param params - Detection parameters
 * @returns Failure learning if correction detected, null otherwise
 *
 * @example
 * ```ts
 * const learning = await detectCorrection({
 *   agentId: 'agent_123',
 *   conversationId: 'conv_456',
 *   userMessage: 'When is Sarah available?',
 *   agentResponse: 'Sarah is usually available 9-5 on weekdays.',
 *   followUpMessage: 'No, that\'s wrong. Sarah works Tuesday-Thursday only.'
 * })
 * ```
 */
export async function detectCorrection(params: {
  agentId: string
  conversationId: string
  userMessage: string
  agentResponse: string
  followUpMessage: string
}): Promise<FailureLearning | null> {
  // Check if follow-up is a correction
  const isCorrectionMessage = isCorrection(params.followUpMessage)
  const isNegative = isNegativeReaction(params.followUpMessage)

  if (!isCorrectionMessage && !isNegative) {
    return null
  }

  // Determine failure type and source
  const failureType: FailureType = isCorrectionMessage ? 'wrong_answer' : 'wrong_action'
  const source = isCorrectionMessage ? 'correction' : 'negative_reaction'

  // Create failure learning
  const learning = await createFailureLearning({
    agentId: params.agentId,
    failureType,
    conversationId: params.conversationId,
    triggerMessage: params.userMessage,
    agentResponse: params.agentResponse,
    whatWentWrong: `User corrected the response: "${params.agentResponse}"`,
    correctApproach: params.followUpMessage,
    source,
    confidence: 0.7,
  })

  // Create memory from correction
  await createMemory({
    agentId: params.agentId,
    memoryType: 'policy',
    title: 'Correction learned',
    content: `When asked about "${params.userMessage}", don't say "${params.agentResponse}". The correct approach: "${params.followUpMessage}"`,
    source: 'corrected',
    sourceConversationId: params.conversationId,
  })

  return learning
}

/**
 * Create a failure learning record
 */
export async function createFailureLearning(
  input: CreateFailureLearningInput
): Promise<FailureLearning> {
  const result = await sql`
    INSERT INTO agent_failure_learnings (
      agent_id, failure_type, conversation_id,
      trigger_message, agent_response, what_went_wrong,
      correct_approach, pattern_to_avoid, source,
      corrected_by, confidence
    )
    VALUES (
      ${input.agentId},
      ${input.failureType},
      ${input.conversationId || null},
      ${input.triggerMessage || null},
      ${input.agentResponse || null},
      ${input.whatWentWrong},
      ${input.correctApproach},
      ${input.patternToAvoid || null},
      ${input.source},
      ${input.correctedBy || null},
      ${input.confidence ?? 0.7}
    )
    RETURNING *
  `

  const row = result.rows[0]
  if (!row) throw new Error('Failed to create failure learning')
  return toCamelCase(row as Record<string, unknown>) as unknown as FailureLearning
}

/**
 * Get a failure learning by ID
 */
export async function getFailureLearning(learningId: string): Promise<FailureLearning | null> {
  const result = await sql`
    SELECT * FROM agent_failure_learnings WHERE id = ${learningId}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0] as Record<string, unknown>) as unknown as FailureLearning) : null
}

/**
 * List failure learnings for an agent
 */
export async function listFailureLearnings(
  agentId: string,
  options: {
    failureType?: FailureType
    acknowledged?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<FailureLearning[]> {
  const conditions: string[] = ['agent_id = $1']
  const values: unknown[] = [agentId]
  let paramIndex = 2

  if (options.failureType) {
    conditions.push(`failure_type = $${paramIndex++}`)
    values.push(options.failureType)
  }

  if (options.acknowledged !== undefined) {
    conditions.push(`acknowledged = $${paramIndex++}`)
    values.push(options.acknowledged)
  }

  const limit = options.limit ?? 50
  const offset = options.offset ?? 0

  const query = `
    SELECT * FROM agent_failure_learnings
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const result = await sql.query(query, values)
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as FailureLearning)
}

/**
 * Acknowledge a failure learning
 *
 * Marks the learning as reviewed and ready to apply.
 */
export async function acknowledgeFailureLearning(learningId: string): Promise<FailureLearning | null> {
  const result = await sql`
    UPDATE agent_failure_learnings
    SET acknowledged = true
    WHERE id = ${learningId}
    RETURNING *
  `
  return result.rows[0] ? (toCamelCase(result.rows[0] as Record<string, unknown>) as unknown as FailureLearning) : null
}

/**
 * Mark a failure learning as applied to behavior
 */
export async function applyFailureLearning(learningId: string): Promise<FailureLearning | null> {
  const result = await sql`
    UPDATE agent_failure_learnings
    SET applied_to_behavior = true, acknowledged = true
    WHERE id = ${learningId}
    RETURNING *
  `
  return result.rows[0] ? (toCamelCase(result.rows[0] as Record<string, unknown>) as unknown as FailureLearning) : null
}

/**
 * Get unacknowledged failure learnings
 */
export async function getUnacknowledgedFailures(agentId: string): Promise<FailureLearning[]> {
  const result = await sql`
    SELECT * FROM agent_failure_learnings
    WHERE agent_id = ${agentId} AND acknowledged = false
    ORDER BY created_at ASC
  `
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as FailureLearning)
}

/**
 * Count failures by type
 */
export async function countFailuresByType(
  agentId: string
): Promise<Record<FailureType, number>> {
  const result = await sql`
    SELECT failure_type, COUNT(*)::INTEGER as count
    FROM agent_failure_learnings
    WHERE agent_id = ${agentId}
    GROUP BY failure_type
  `

  const counts: Record<string, number> = {}
  for (const row of result.rows) {
    counts[row.failure_type as string] = row.count as number
  }

  return counts as Record<FailureType, number>
}

/**
 * Delete a failure learning
 */
export async function deleteFailureLearning(learningId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM agent_failure_learnings WHERE id = ${learningId}
  `
  return (result.rowCount ?? 0) > 0
}
