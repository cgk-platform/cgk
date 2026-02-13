/**
 * Feedback processing for agent learning
 *
 * Handles user feedback and converts it to learnings.
 */

import { sql } from '@cgk-platform/db'
import { createFailureLearning } from './correction-detector.js'
import type { AgentFeedback, CreateFeedbackInput, FeedbackType } from '../memory/types.js'

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
 * Submit feedback for an agent response
 *
 * @param input - Feedback parameters
 * @returns Created feedback record
 *
 * @example
 * ```ts
 * await submitFeedback({
 *   agentId: 'agent_123',
 *   feedbackType: 'correction',
 *   userId: 'user_456',
 *   originalResponse: 'The deadline is Friday.',
 *   correction: 'The deadline is actually Thursday.',
 *   reason: 'Wrong day'
 * })
 * ```
 */
export async function submitFeedback(input: CreateFeedbackInput): Promise<AgentFeedback> {
  const result = await sql`
    INSERT INTO agent_feedback (
      agent_id, message_id, conversation_id, feedback_type, rating,
      original_response, reason, correction, user_id, user_name
    )
    VALUES (
      ${input.agentId},
      ${input.messageId || null},
      ${input.conversationId || null},
      ${input.feedbackType},
      ${input.rating || null},
      ${input.originalResponse || null},
      ${input.reason || null},
      ${input.correction || null},
      ${input.userId},
      ${input.userName || null}
    )
    RETURNING *
  `

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to create feedback')
  }
  return toCamelCase(row as Record<string, unknown>) as unknown as AgentFeedback
}

/**
 * Get a feedback record by ID
 */
export async function getFeedback(feedbackId: string): Promise<AgentFeedback | null> {
  const result = await sql`
    SELECT * FROM agent_feedback WHERE id = ${feedbackId}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0] as Record<string, unknown>) as unknown as AgentFeedback) : null
}

/**
 * List feedback for an agent
 */
export async function listFeedback(
  agentId: string,
  options: {
    feedbackType?: FeedbackType
    processed?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<AgentFeedback[]> {
  const conditions: string[] = ['agent_id = $1']
  const values: unknown[] = [agentId]
  let paramIndex = 2

  if (options.feedbackType) {
    conditions.push(`feedback_type = $${paramIndex++}`)
    values.push(options.feedbackType)
  }

  if (options.processed !== undefined) {
    conditions.push(`processed = $${paramIndex++}`)
    values.push(options.processed)
  }

  const limit = options.limit ?? 50
  const offset = options.offset ?? 0

  const query = `
    SELECT * FROM agent_feedback
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const result = await sql.query(query, values)
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as AgentFeedback)
}

/**
 * Get unprocessed feedback for an agent
 */
export async function getUnprocessedFeedback(agentId: string): Promise<AgentFeedback[]> {
  const result = await sql`
    SELECT * FROM agent_feedback
    WHERE agent_id = ${agentId} AND processed = false
    ORDER BY created_at ASC
  `
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as AgentFeedback)
}

/**
 * Process feedback and create learnings
 *
 * Converts negative or correction feedback into failure learnings.
 *
 * @param feedbackId - Feedback ID to process
 * @returns Processing result
 */
export async function processFeedback(
  feedbackId: string
): Promise<{ processed: boolean; learningId?: string }> {
  const feedback = await getFeedback(feedbackId)
  if (!feedback) {
    throw new Error('Feedback not found')
  }

  if (feedback.processed) {
    return { processed: true, learningId: feedback.learningCreated ?? undefined }
  }

  // Only create learning for negative or correction feedback
  if (feedback.feedbackType === 'positive') {
    await sql`
      UPDATE agent_feedback SET processed = true WHERE id = ${feedbackId}
    `
    return { processed: true }
  }

  // Create failure learning
  const learning = await createFailureLearning({
    agentId: feedback.agentId,
    failureType: feedback.feedbackType === 'correction' ? 'wrong_answer' : 'wrong_action',
    conversationId: feedback.conversationId ?? undefined,
    agentResponse: feedback.originalResponse ?? undefined,
    whatWentWrong: feedback.reason || 'User provided negative feedback',
    correctApproach: feedback.correction || 'See user feedback for guidance',
    source: 'negative_reaction',
    correctedBy: feedback.userId,
    confidence: feedback.rating ? (5 - feedback.rating) / 5 : 0.6, // Lower rating = higher confidence in error
  })

  // Mark feedback as processed
  await sql`
    UPDATE agent_feedback
    SET processed = true, learning_created = ${learning.id}
    WHERE id = ${feedbackId}
  `

  return { processed: true, learningId: learning.id }
}

/**
 * Process all unprocessed feedback for an agent
 *
 * @param agentId - Agent ID
 * @returns Number of feedback items processed
 */
export async function processAllFeedback(agentId: string): Promise<number> {
  const unprocessed = await getUnprocessedFeedback(agentId)
  let processed = 0

  for (const feedback of unprocessed) {
    try {
      await processFeedback(feedback.id)
      processed++
    } catch (error) {
      // Continue processing other feedback
      console.error(`Failed to process feedback ${feedback.id}:`, error)
    }
  }

  return processed
}

/**
 * Get feedback statistics for an agent
 */
export async function getFeedbackStats(agentId: string): Promise<{
  total: number
  byType: Record<FeedbackType, number>
  averageRating: number | null
  unprocessed: number
}> {
  const statsResult = await sql`
    SELECT
      COUNT(*)::INTEGER as total,
      COUNT(*) FILTER (WHERE feedback_type = 'positive')::INTEGER as positive,
      COUNT(*) FILTER (WHERE feedback_type = 'negative')::INTEGER as negative,
      COUNT(*) FILTER (WHERE feedback_type = 'correction')::INTEGER as correction,
      AVG(rating) as avg_rating,
      COUNT(*) FILTER (WHERE processed = false)::INTEGER as unprocessed
    FROM agent_feedback
    WHERE agent_id = ${agentId}
  `

  const stats = statsResult.rows[0]
  if (!stats) {
    return {
      total: 0,
      byType: { positive: 0, negative: 0, correction: 0 },
      averageRating: null,
      unprocessed: 0,
    }
  }

  return {
    total: stats.total as number,
    byType: {
      positive: stats.positive as number,
      negative: stats.negative as number,
      correction: stats.correction as number,
    },
    averageRating: stats.avg_rating ? Number(stats.avg_rating) : null,
    unprocessed: stats.unprocessed as number,
  }
}

/**
 * Delete feedback by ID
 */
export async function deleteFeedback(feedbackId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM agent_feedback WHERE id = ${feedbackId}
  `
  return (result.rowCount ?? 0) > 0
}

/**
 * Get feedback by conversation
 */
export async function getFeedbackByConversation(
  agentId: string,
  conversationId: string
): Promise<AgentFeedback[]> {
  const result = await sql`
    SELECT * FROM agent_feedback
    WHERE agent_id = ${agentId} AND conversation_id = ${conversationId}
    ORDER BY created_at ASC
  `
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as AgentFeedback)
}
