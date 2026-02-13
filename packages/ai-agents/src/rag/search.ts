/**
 * Semantic search for agent memories
 *
 * Uses pgvector to perform fast similarity search over embeddings.
 */

import { sql } from '@cgk-platform/db'
import { generateEmbedding } from '../memory/embeddings.js'
import { recordMemoryAccess as _recordMemoryAccess } from '../memory/storage.js'
import type { MemorySearchFilters, MemorySearchResult, MemoryType } from '../memory/types.js'

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
 * Search memories using semantic similarity
 *
 * Generates an embedding for the query and finds similar memories
 * using cosine distance in pgvector.
 *
 * @param params - Search parameters
 * @returns Array of memories sorted by relevance
 *
 * @example
 * ```ts
 * const results = await searchMemories({
 *   agentId: 'agent_123',
 *   query: 'How does Sarah prefer to communicate?',
 *   limit: 10,
 *   memoryTypes: ['team_member', 'preference']
 * })
 * ```
 */
export async function searchMemories(
  params: MemorySearchFilters
): Promise<MemorySearchResult[]> {
  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(params.query)
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  // Build filter conditions
  const conditions: string[] = [
    `agent_id = $1`,
    `is_active = true`,
    `embedding IS NOT NULL`,
  ]
  const values: unknown[] = [params.agentId]
  let paramIndex = 2

  // Confidence filter
  const minConfidence = params.minConfidence ?? 0.3
  conditions.push(`confidence >= $${paramIndex++}`)
  values.push(minConfidence)

  // Memory type filter
  if (params.memoryTypes && params.memoryTypes.length > 0) {
    conditions.push(`memory_type = ANY($${paramIndex++})`)
    values.push(params.memoryTypes)
  }

  // Subject filters
  if (params.subjectType) {
    conditions.push(`subject_type = $${paramIndex++}`)
    values.push(params.subjectType)
  }
  if (params.subjectId) {
    conditions.push(`subject_id = $${paramIndex++}`)
    values.push(params.subjectId)
  }

  // Include inactive if requested
  if (params.includeInactive) {
    // Remove the is_active condition
    const idx = conditions.indexOf('is_active = true')
    if (idx !== -1) conditions.splice(idx, 1)
  }

  const limit = params.limit ?? 10
  const minSimilarity = params.minSimilarity ?? 0.3

  // Query with vector similarity
  // 1 - (distance) = similarity for cosine distance
  const query = `
    SELECT
      id, agent_id, memory_type, subject_type, subject_id,
      title, content, confidence, importance,
      times_used, times_reinforced, times_contradicted,
      last_used_at, source, source_context, source_conversation_id,
      is_active, superseded_by, expires_at, created_at, updated_at,
      1 - (embedding <=> '${embeddingStr}'::vector) as similarity
    FROM agent_memories
    WHERE ${conditions.join(' AND ')}
    ORDER BY
      -- Rank by combined score: similarity * confidence * importance
      (1 - (embedding <=> '${embeddingStr}'::vector)) * confidence * importance DESC
    LIMIT ${limit}
  `

  const result = await sql.query(query, values)

  // Filter by minimum similarity and map to result type
  return result.rows
    .filter((row: Record<string, unknown>) => (row.similarity as number) >= minSimilarity)
    .map((row: Record<string, unknown>) => toCamelCase(row as Record<string, unknown>) as unknown as MemorySearchResult)
}

/**
 * Search memories by text (keyword search, not semantic)
 *
 * Uses ILIKE for simple text matching in title and content.
 *
 * @param agentId - Agent ID
 * @param searchText - Text to search for
 * @param limit - Max results
 * @returns Matching memories
 */
export async function searchMemoriesByText(
  agentId: string,
  searchText: string,
  limit = 20
): Promise<MemorySearchResult[]> {
  const searchPattern = `%${searchText}%`

  const result = await sql`
    SELECT *,
      1.0 as similarity
    FROM agent_memories
    WHERE agent_id = ${agentId}
      AND is_active = true
      AND (title ILIKE ${searchPattern} OR content ILIKE ${searchPattern})
    ORDER BY confidence DESC, importance DESC
    LIMIT ${limit}
  `

  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as MemorySearchResult)
}

/**
 * Get most relevant memories for a subject
 *
 * Combines subject-specific memories with semantically similar ones.
 *
 * @param agentId - Agent ID
 * @param subjectType - Subject type (e.g., 'creator', 'team_member')
 * @param subjectId - Subject ID
 * @param contextQuery - Optional query for semantic search
 * @param limit - Max results
 * @returns Combined memories about the subject
 */
export async function getSubjectMemories(
  agentId: string,
  subjectType: string,
  subjectId: string,
  contextQuery?: string,
  limit = 20
): Promise<MemorySearchResult[]> {
  // Get direct memories about this subject
  const directResult = await sql`
    SELECT *,
      1.0 as similarity
    FROM agent_memories
    WHERE agent_id = ${agentId}
      AND subject_type = ${subjectType}
      AND subject_id = ${subjectId}
      AND is_active = true
    ORDER BY confidence DESC, importance DESC
    LIMIT ${Math.ceil(limit / 2)}
  `

  const directMemories = directResult.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as MemorySearchResult)

  // If context query provided, also do semantic search
  if (contextQuery) {
    const semanticMemories = await searchMemories({
      agentId,
      query: contextQuery,
      limit: Math.ceil(limit / 2),
      minConfidence: 0.3,
    })

    // Combine and dedupe
    const seen = new Set(directMemories.map((m) => m.id))
    const combined = [...directMemories]

    for (const mem of semanticMemories) {
      if (!seen.has(mem.id)) {
        combined.push(mem)
        seen.add(mem.id)
      }
    }

    return combined.slice(0, limit)
  }

  return directMemories
}

/**
 * Find memories related to a conversation
 *
 * @param agentId - Agent ID
 * @param conversationId - Conversation ID
 * @returns Memories from this conversation
 */
export async function getConversationMemories(
  agentId: string,
  conversationId: string
): Promise<MemorySearchResult[]> {
  const result = await sql`
    SELECT *,
      1.0 as similarity
    FROM agent_memories
    WHERE agent_id = ${agentId}
      AND source_conversation_id = ${conversationId}
    ORDER BY created_at ASC
  `

  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as MemorySearchResult)
}

/**
 * Get recent memories (most recently created)
 *
 * @param agentId - Agent ID
 * @param limit - Max results
 * @param memoryTypes - Optional filter by types
 * @returns Recent memories
 */
export async function getRecentMemories(
  agentId: string,
  limit = 20,
  memoryTypes?: MemoryType[]
): Promise<MemorySearchResult[]> {
  if (memoryTypes && memoryTypes.length > 0) {
    const result = await sql`
      SELECT *,
        1.0 as similarity
      FROM agent_memories
      WHERE agent_id = ${agentId}
        AND is_active = true
        AND memory_type = ANY(${`{${memoryTypes.join(',')}}`}::text[])
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as MemorySearchResult)
  }

  const result = await sql`
    SELECT *,
      1.0 as similarity
    FROM agent_memories
    WHERE agent_id = ${agentId}
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as MemorySearchResult)
}

/**
 * Get most used memories (frequently accessed)
 *
 * @param agentId - Agent ID
 * @param limit - Max results
 * @returns Most used memories
 */
export async function getMostUsedMemories(
  agentId: string,
  limit = 20
): Promise<MemorySearchResult[]> {
  const result = await sql`
    SELECT *,
      1.0 as similarity
    FROM agent_memories
    WHERE agent_id = ${agentId}
      AND is_active = true
      AND times_used > 0
    ORDER BY times_used DESC, confidence DESC
    LIMIT ${limit}
  `

  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as MemorySearchResult)
}
