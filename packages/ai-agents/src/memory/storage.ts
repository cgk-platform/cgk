/**
 * Memory storage operations
 *
 * CRUD operations for agent memories with automatic embedding generation.
 * All operations expect to be run within a tenant context via withTenant().
 */

import { sql } from '@cgk-platform/db'
import { generateMemoryEmbedding } from './embeddings.js'
import { SOURCE_WEIGHTS } from './types.js'
import type {
  AgentMemory,
  CreateMemoryInput,
  MemoryListFilters,
  MemoryType,
  UpdateMemoryInput,
} from './types.js'

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
 * Create a new memory with automatic embedding generation
 *
 * @param input - Memory creation parameters
 * @returns Created memory record
 *
 * @example
 * ```ts
 * const memory = await createMemory({
 *   agentId: 'agent_123',
 *   memoryType: 'team_member',
 *   title: 'Sarah prefers Slack',
 *   content: 'Sarah has indicated she prefers Slack messages over email for quick questions.',
 *   source: 'observed',
 *   subjectType: 'team_member',
 *   subjectId: 'user_456'
 * })
 * ```
 */
export async function createMemory(input: CreateMemoryInput): Promise<AgentMemory> {
  // Generate embedding for semantic search
  const embedding = await generateMemoryEmbedding(input.title, input.content)

  // Calculate initial confidence based on source
  const baseConfidence = input.confidence ?? SOURCE_WEIGHTS[input.source] ?? 0.5

  const result = await sql`
    INSERT INTO agent_memories (
      agent_id, memory_type, subject_type, subject_id,
      title, content, embedding, confidence, importance,
      source, source_context, source_conversation_id, expires_at
    )
    VALUES (
      ${input.agentId},
      ${input.memoryType},
      ${input.subjectType || null},
      ${input.subjectId || null},
      ${input.title},
      ${input.content},
      ${`[${embedding.join(',')}]`}::vector,
      ${baseConfidence},
      ${input.importance ?? 0.5},
      ${input.source},
      ${input.sourceContext || null},
      ${input.sourceConversationId || null},
      ${input.expiresAt?.toISOString() || null}
    )
    RETURNING *
  `

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to create memory - no row returned')
  }
  return toCamelCase(row as Record<string, unknown>) as unknown as AgentMemory
}

/**
 * Get a memory by ID
 */
export async function getMemory(memoryId: string): Promise<AgentMemory | null> {
  const result = await sql`
    SELECT * FROM agent_memories WHERE id = ${memoryId}
  `
  const row = result.rows[0]
  return row ? (toCamelCase(row as Record<string, unknown>) as unknown as AgentMemory) : null
}

/**
 * List memories with filters
 *
 * @param filters - Filter options
 * @returns Array of memories matching filters
 */
export async function listMemories(filters: MemoryListFilters = {}): Promise<AgentMemory[]> {
  const conditions: string[] = ['1=1']
  const values: unknown[] = []
  let paramIndex = 1

  if (filters.agentId) {
    conditions.push(`agent_id = $${paramIndex++}`)
    values.push(filters.agentId)
  }

  if (filters.memoryType) {
    conditions.push(`memory_type = $${paramIndex++}`)
    values.push(filters.memoryType)
  }

  if (filters.subjectType) {
    conditions.push(`subject_type = $${paramIndex++}`)
    values.push(filters.subjectType)
  }

  if (filters.subjectId) {
    conditions.push(`subject_id = $${paramIndex++}`)
    values.push(filters.subjectId)
  }

  if (filters.minConfidence !== undefined) {
    conditions.push(`confidence >= $${paramIndex++}`)
    values.push(filters.minConfidence)
  }

  if (filters.isActive !== undefined) {
    conditions.push(`is_active = $${paramIndex++}`)
    values.push(filters.isActive)
  }

  if (filters.search) {
    conditions.push(`(title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`)
    values.push(`%${filters.search}%`)
    paramIndex++
  }

  const limit = filters.limit || 50
  const offset = filters.offset || 0

  const query = `
    SELECT * FROM agent_memories
    WHERE ${conditions.join(' AND ')}
    ORDER BY
      confidence DESC,
      importance DESC,
      created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const result = await sql.query(query, values)
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as AgentMemory)
}

/**
 * Update a memory
 *
 * Note: If content is updated, the embedding will be regenerated.
 */
export async function updateMemory(
  memoryId: string,
  input: UpdateMemoryInput
): Promise<AgentMemory | null> {
  // If content or title changed, we need to regenerate embedding
  let newEmbedding: number[] | null = null
  if (input.content !== undefined || input.title !== undefined) {
    const existing = await getMemory(memoryId)
    if (existing) {
      const newTitle = input.title ?? existing.title
      const newContent = input.content ?? existing.content
      newEmbedding = await generateMemoryEmbedding(newTitle, newContent)
    }
  }

  const sets: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (input.title !== undefined) {
    sets.push(`title = $${paramIndex++}`)
    values.push(input.title)
  }
  if (input.content !== undefined) {
    sets.push(`content = $${paramIndex++}`)
    values.push(input.content)
  }
  if (newEmbedding) {
    sets.push(`embedding = $${paramIndex++}::vector`)
    values.push(`[${newEmbedding.join(',')}]`)
  }
  if (input.confidence !== undefined) {
    sets.push(`confidence = $${paramIndex++}`)
    values.push(input.confidence)
  }
  if (input.importance !== undefined) {
    sets.push(`importance = $${paramIndex++}`)
    values.push(input.importance)
  }
  if (input.isActive !== undefined) {
    sets.push(`is_active = $${paramIndex++}`)
    values.push(input.isActive)
  }
  if (input.supersededBy !== undefined) {
    sets.push(`superseded_by = $${paramIndex++}`)
    values.push(input.supersededBy)
  }
  if (input.expiresAt !== undefined) {
    sets.push(`expires_at = $${paramIndex++}`)
    values.push(input.expiresAt?.toISOString() || null)
  }

  if (sets.length === 0) {
    return getMemory(memoryId)
  }

  values.push(memoryId)
  const result = await sql.query(
    `UPDATE agent_memories SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  )

  const row = result.rows[0]
  return row ? (toCamelCase(row as Record<string, unknown>) as unknown as AgentMemory) : null
}

/**
 * Deactivate a memory (soft delete)
 */
export async function deactivateMemory(memoryId: string): Promise<boolean> {
  const result = await sql`
    UPDATE agent_memories SET is_active = false WHERE id = ${memoryId}
  `
  return (result.rowCount ?? 0) > 0
}

/**
 * Permanently delete a memory
 */
export async function deleteMemory(memoryId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM agent_memories WHERE id = ${memoryId}
  `
  return (result.rowCount ?? 0) > 0
}

/**
 * Record memory access (updates times_used and last_used_at)
 */
export async function recordMemoryAccess(memoryId: string): Promise<void> {
  await sql`
    UPDATE agent_memories
    SET times_used = times_used + 1, last_used_at = NOW()
    WHERE id = ${memoryId}
  `
}

/**
 * Get memories by subject (e.g., all memories about a specific creator)
 */
export async function getMemoriesBySubject(
  agentId: string,
  subjectType: string,
  subjectId: string
): Promise<AgentMemory[]> {
  const result = await sql`
    SELECT * FROM agent_memories
    WHERE agent_id = ${agentId}
      AND subject_type = ${subjectType}
      AND subject_id = ${subjectId}
      AND is_active = true
    ORDER BY confidence DESC, importance DESC
  `
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as AgentMemory)
}

/**
 * Get memories by type
 */
export async function getMemoriesByType(
  agentId: string,
  memoryType: MemoryType
): Promise<AgentMemory[]> {
  const result = await sql`
    SELECT * FROM agent_memories
    WHERE agent_id = ${agentId}
      AND memory_type = ${memoryType}
      AND is_active = true
    ORDER BY confidence DESC, importance DESC
    LIMIT 100
  `
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as AgentMemory)
}

/**
 * Get memories that need embedding generation (for backfill job)
 */
export async function getMemoriesWithoutEmbeddings(limit = 100): Promise<AgentMemory[]> {
  const result = await sql`
    SELECT * FROM agent_memories
    WHERE embedding IS NULL
    ORDER BY created_at ASC
    LIMIT ${limit}
  `
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as AgentMemory)
}

/**
 * Update embedding for a memory
 */
export async function updateMemoryEmbedding(
  memoryId: string,
  embedding: number[]
): Promise<void> {
  await sql`
    UPDATE agent_memories
    SET embedding = ${`[${embedding.join(',')}]`}::vector
    WHERE id = ${memoryId}
  `
}

/**
 * Count memories for an agent
 */
export async function countMemories(
  agentId: string,
  options: { isActive?: boolean } = {}
): Promise<number> {
  const activeFilter = options.isActive !== undefined ? options.isActive : true

  const result = await sql`
    SELECT COUNT(*)::INTEGER as count FROM agent_memories
    WHERE agent_id = ${agentId} AND is_active = ${activeFilter}
  `
  return result.rows[0]?.count ?? 0
}

/**
 * Get average confidence for an agent's memories
 */
export async function getAverageConfidence(agentId: string): Promise<number | null> {
  const result = await sql`
    SELECT AVG(confidence)::NUMERIC(3,2) as avg_confidence
    FROM agent_memories
    WHERE agent_id = ${agentId} AND is_active = true
  `
  return result.rows[0]?.avg_confidence ?? null
}
