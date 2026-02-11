/**
 * Training session handling for agent learning
 *
 * Provides explicit knowledge import through training sessions.
 */

import { sql } from '@cgk/db'
import { createMemory } from '../memory/storage.js'
import { TRAINING_TO_MEMORY_TYPE } from '../memory/types.js'
import type {
  CreateTrainingSessionInput,
  MemoryType,
  TrainingSession,
  TrainingType,
} from '../memory/types.js'

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
 * Start a training session
 *
 * Creates a training record and generates memories from the instruction.
 *
 * @param input - Training session parameters
 * @returns Created training session with generated memories
 *
 * @example
 * ```ts
 * const session = await startTrainingSession({
 *   agentId: 'agent_123',
 *   trainingType: 'policy',
 *   title: 'Payment confirmation threshold',
 *   instruction: 'Always ask for human confirmation before processing any payment over $500.',
 *   examples: [
 *     { input: 'Process $750 payout to @mike', output: 'I need approval for this $750 payout.' }
 *   ],
 *   trainerUserId: 'user_456',
 *   trainerName: 'Holden'
 * })
 * ```
 */
export async function startTrainingSession(
  input: CreateTrainingSessionInput
): Promise<TrainingSession> {
  // Create training session record
  const sessionResult = await sql`
    INSERT INTO agent_training_sessions (
      agent_id, training_type, title, instruction,
      context, examples, trainer_user_id, trainer_name
    )
    VALUES (
      ${input.agentId},
      ${input.trainingType},
      ${input.title},
      ${input.instruction},
      ${input.context || null},
      ${JSON.stringify(input.examples || [])},
      ${input.trainerUserId || null},
      ${input.trainerName || null}
    )
    RETURNING *
  `

  const sessionRow = sessionResult.rows[0]
  if (!sessionRow) {
    throw new Error('Failed to create training session')
  }
  const session = toCamelCase(sessionRow as Record<string, unknown>) as unknown as TrainingSession

  // Create memory from training
  const memoryType = TRAINING_TO_MEMORY_TYPE[input.trainingType]
  const memoryContent = buildTrainingContent(input)

  const memory = await createMemory({
    agentId: input.agentId,
    memoryType,
    title: input.title,
    content: memoryContent,
    source: 'trained',
    sourceContext: `Training session by ${input.trainerName || 'unknown'}`,
  })

  // Update session with created memory
  await sql`
    UPDATE agent_training_sessions
    SET memories_created = ARRAY[${memory.id}]::TEXT[]
    WHERE id = ${session.id}
  `

  return {
    ...session,
    memoriesCreated: [memory.id],
  }
}

/**
 * Build memory content from training input
 */
function buildTrainingContent(input: CreateTrainingSessionInput): string {
  let content = input.instruction

  if (input.context) {
    content += `\n\nContext: ${input.context}`
  }

  if (input.examples && input.examples.length > 0) {
    content += '\n\nExamples:'
    for (const example of input.examples) {
      content += `\n- Input: "${example.input}"\n  Output: "${example.output}"`
    }
  }

  return content
}

/**
 * Get a training session by ID
 */
export async function getTrainingSession(sessionId: string): Promise<TrainingSession | null> {
  const result = await sql`
    SELECT * FROM agent_training_sessions WHERE id = ${sessionId}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0] as Record<string, unknown>) as unknown as TrainingSession) : null
}

/**
 * List training sessions for an agent
 *
 * @param agentId - Agent ID
 * @param options - Filter options
 * @returns Array of training sessions
 */
export async function listTrainingSessions(
  agentId: string,
  options: {
    trainingType?: TrainingType
    limit?: number
    offset?: number
  } = {}
): Promise<TrainingSession[]> {
  const limit = options.limit ?? 50
  const offset = options.offset ?? 0

  if (options.trainingType) {
    const result = await sql`
      SELECT * FROM agent_training_sessions
      WHERE agent_id = ${agentId} AND training_type = ${options.trainingType}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as TrainingSession)
  }

  const result = await sql`
    SELECT * FROM agent_training_sessions
    WHERE agent_id = ${agentId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as TrainingSession)
}

/**
 * Acknowledge a training session
 *
 * Marks the session as acknowledged by the agent.
 *
 * @param sessionId - Training session ID
 * @param response - Agent's acknowledgment response
 */
export async function acknowledgeTraining(
  sessionId: string,
  response: string
): Promise<TrainingSession | null> {
  const result = await sql`
    UPDATE agent_training_sessions
    SET acknowledged = true, agent_response = ${response}
    WHERE id = ${sessionId}
    RETURNING *
  `
  return result.rows[0] ? (toCamelCase(result.rows[0] as Record<string, unknown>) as unknown as TrainingSession) : null
}

/**
 * Get unacknowledged training sessions
 *
 * @param agentId - Agent ID
 * @returns Array of unacknowledged sessions
 */
export async function getUnacknowledgedTraining(agentId: string): Promise<TrainingSession[]> {
  const result = await sql`
    SELECT * FROM agent_training_sessions
    WHERE agent_id = ${agentId} AND acknowledged = false
    ORDER BY created_at ASC
  `
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as TrainingSession)
}

/**
 * Count training sessions by type
 *
 * @param agentId - Agent ID
 * @returns Counts by training type
 */
export async function countTrainingByType(
  agentId: string
): Promise<Record<TrainingType, number>> {
  const result = await sql`
    SELECT training_type, COUNT(*)::INTEGER as count
    FROM agent_training_sessions
    WHERE agent_id = ${agentId}
    GROUP BY training_type
  `

  const counts: Record<string, number> = {}
  for (const row of result.rows) {
    counts[row.training_type as string] = row.count as number
  }

  return counts as Record<TrainingType, number>
}

/**
 * Add additional memory to an existing training session
 *
 * @param sessionId - Training session ID
 * @param memoryParams - Parameters for new memory
 */
export async function addTrainingMemory(
  sessionId: string,
  memoryParams: {
    title: string
    content: string
    memoryType?: MemoryType
  }
): Promise<string> {
  const session = await getTrainingSession(sessionId)
  if (!session) {
    throw new Error('Training session not found')
  }

  const memoryType = memoryParams.memoryType ?? TRAINING_TO_MEMORY_TYPE[session.trainingType]

  const memory = await createMemory({
    agentId: session.agentId,
    memoryType,
    title: memoryParams.title,
    content: memoryParams.content,
    source: 'trained',
    sourceContext: `Additional memory from training session ${sessionId}`,
  })

  // Add to session's memories
  await sql`
    UPDATE agent_training_sessions
    SET memories_created = array_append(memories_created, ${memory.id})
    WHERE id = ${sessionId}
  `

  return memory.id
}

/**
 * Delete a training session
 *
 * Note: Associated memories are NOT deleted automatically.
 *
 * @param sessionId - Training session ID
 * @returns Whether deletion was successful
 */
export async function deleteTrainingSession(sessionId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM agent_training_sessions WHERE id = ${sessionId}
  `
  return (result.rowCount ?? 0) > 0
}
