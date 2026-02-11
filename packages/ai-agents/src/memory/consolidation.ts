/**
 * Memory consolidation and cleanup
 *
 * Merges similar memories and cleans up low-confidence or expired ones.
 */

import { sql } from '@cgk/db'
import { cosineSimilarity } from './embeddings.js'
import { createMemory, getMemory } from './storage.js'
import type { AgentMemory, ConsolidationResult, MemoryType } from './types.js'

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
 * Similarity threshold for considering memories as duplicates
 */
const SIMILARITY_THRESHOLD = 0.92

/**
 * Find similar memories to a given memory using vector similarity
 *
 * @param memoryId - Memory to find similar ones for
 * @param limit - Max number of similar memories to return
 * @returns Array of similar memories with similarity scores
 */
export async function findSimilarMemories(
  memoryId: string,
  limit = 10
): Promise<Array<AgentMemory & { similarity: number }>> {
  const memory = await getMemory(memoryId)
  if (!memory || !memory.embedding) {
    return []
  }

  const embeddingStr = `[${(memory.embedding as number[]).join(',')}]`

  const result = await sql`
    SELECT *,
      1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM agent_memories
    WHERE id != ${memoryId}
      AND agent_id = ${memory.agentId}
      AND is_active = true
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `

  return result.rows.map((row) => {
    const camelRow = toCamelCase(row as Record<string, unknown>) as unknown as AgentMemory & { similarity: number }
    return camelRow
  })
}

/**
 * Find potential duplicate memories for an agent
 *
 * Returns pairs of memories that are very similar and may be duplicates.
 *
 * @param agentId - Agent to find duplicates for
 * @returns Array of duplicate pairs with similarity scores
 */
export async function findDuplicateMemories(
  agentId: string
): Promise<Array<{ memory1: AgentMemory; memory2: AgentMemory; similarity: number }>> {
  const duplicates: Array<{ memory1: AgentMemory; memory2: AgentMemory; similarity: number }> = []

  // Get all active memories with embeddings
  const result = await sql`
    SELECT * FROM agent_memories
    WHERE agent_id = ${agentId}
      AND is_active = true
      AND embedding IS NOT NULL
    ORDER BY created_at ASC
  `

  const memories = result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as AgentMemory)

  // Compare each pair (O(n^2) but limited by memory count)
  for (let i = 0; i < memories.length; i++) {
    for (let j = i + 1; j < memories.length; j++) {
      const mem1 = memories[i]
      const mem2 = memories[j]

      if (mem1 && mem2 && mem1.embedding && mem2.embedding) {
        const similarity = cosineSimilarity(
          mem1.embedding as number[],
          mem2.embedding as number[]
        )

        if (similarity >= SIMILARITY_THRESHOLD) {
          duplicates.push({
            memory1: mem1,
            memory2: mem2,
            similarity,
          })
        }
      }
    }
  }

  return duplicates.sort((a, b) => b.similarity - a.similarity)
}

/**
 * Merge two similar memories into one
 *
 * Creates a new memory combining both, deactivates the originals.
 *
 * @param memory1Id - First memory ID
 * @param memory2Id - Second memory ID
 * @returns New consolidated memory
 */
export async function mergeMemories(memory1Id: string, memory2Id: string): Promise<AgentMemory> {
  const mem1 = await getMemory(memory1Id)
  const mem2 = await getMemory(memory2Id)

  if (!mem1 || !mem2) {
    throw new Error('Both memories must exist to merge')
  }

  if (mem1.agentId !== mem2.agentId) {
    throw new Error('Cannot merge memories from different agents')
  }

  // Combine titles and content
  const combinedTitle = mem1.title === mem2.title ? mem1.title : `${mem1.title} / ${mem2.title}`

  const combinedContent = `${mem1.content}\n\n---\n\n${mem2.content}`

  // Use higher confidence and combine usage stats
  const combinedConfidence = Math.max(mem1.confidence, mem2.confidence)
  const combinedImportance = Math.max(mem1.importance, mem2.importance)

  // Create new consolidated memory
  const newMemory = await createMemory({
    agentId: mem1.agentId,
    memoryType: mem1.memoryType as MemoryType,
    title: combinedTitle,
    content: combinedContent,
    subjectType: mem1.subjectType ?? mem2.subjectType ?? undefined,
    subjectId: mem1.subjectId ?? mem2.subjectId ?? undefined,
    source: 'inferred',
    sourceContext: `Consolidated from memories ${memory1Id} and ${memory2Id}`,
    confidence: combinedConfidence,
    importance: combinedImportance,
  })

  // Deactivate original memories and link to new one
  await sql`
    UPDATE agent_memories
    SET is_active = false, superseded_by = ${newMemory.id}
    WHERE id IN (${memory1Id}, ${memory2Id})
  `

  return newMemory
}

/**
 * Run full consolidation for an agent
 *
 * 1. Finds duplicate memories
 * 2. Merges them automatically
 * 3. Cleans up low-confidence memories
 *
 * @param agentId - Agent to consolidate memories for
 * @param options - Consolidation options
 * @returns Consolidation statistics
 */
export async function consolidateMemories(
  agentId: string,
  options: {
    autoMerge?: boolean
    minConfidenceToKeep?: number
    dryRun?: boolean
  } = {}
): Promise<ConsolidationResult> {
  const autoMerge = options.autoMerge ?? true
  const minConfidenceToKeep = options.minConfidenceToKeep ?? 0.2
  const dryRun = options.dryRun ?? false

  let merged = 0
  let deactivated = 0

  // Find and merge duplicates
  if (autoMerge) {
    const duplicates = await findDuplicateMemories(agentId)

    // Track which memories have been processed
    const processed = new Set<string>()

    for (const dup of duplicates) {
      if (processed.has(dup.memory1.id) || processed.has(dup.memory2.id)) {
        continue
      }

      if (!dryRun) {
        await mergeMemories(dup.memory1.id, dup.memory2.id)
      }

      processed.add(dup.memory1.id)
      processed.add(dup.memory2.id)
      merged++
    }
  }

  // Deactivate low-confidence memories
  if (!dryRun) {
    const result = await sql`
      UPDATE agent_memories
      SET is_active = false, updated_at = NOW()
      WHERE agent_id = ${agentId}
        AND is_active = true
        AND confidence < ${minConfidenceToKeep}
    `
    deactivated = result.rowCount ?? 0
  } else {
    const countResult = await sql`
      SELECT COUNT(*)::INTEGER as count FROM agent_memories
      WHERE agent_id = ${agentId}
        AND is_active = true
        AND confidence < ${minConfidenceToKeep}
    `
    deactivated = countResult.rows[0]?.count ?? 0
  }

  // Count remaining
  const keptResult = await sql`
    SELECT COUNT(*)::INTEGER as count FROM agent_memories
    WHERE agent_id = ${agentId} AND is_active = true
  `
  const kept = keptResult.rows[0]?.count ?? 0

  return { merged, deactivated, kept }
}

/**
 * Clean up expired memories
 *
 * @param agentId - Optional: limit to specific agent
 * @returns Number of memories deactivated
 */
export async function cleanupExpiredMemories(agentId?: string): Promise<number> {
  let result
  if (agentId) {
    result = await sql`
      UPDATE agent_memories
      SET is_active = false, updated_at = NOW()
      WHERE is_active = true
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
        AND agent_id = ${agentId}
    `
  } else {
    result = await sql`
      UPDATE agent_memories
      SET is_active = false, updated_at = NOW()
      WHERE is_active = true
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
    `
  }

  return result.rowCount ?? 0
}

/**
 * Get consolidation candidates
 *
 * Returns memories that could potentially be merged.
 *
 * @param agentId - Agent ID
 * @returns Array of potential merge candidates grouped by similarity
 */
export async function getConsolidationCandidates(
  agentId: string
): Promise<
  Array<{
    memory1: Pick<AgentMemory, 'id' | 'title' | 'confidence'>
    memory2: Pick<AgentMemory, 'id' | 'title' | 'confidence'>
    similarity: number
  }>
> {
  const duplicates = await findDuplicateMemories(agentId)

  return duplicates.map((dup) => ({
    memory1: {
      id: dup.memory1.id,
      title: dup.memory1.title,
      confidence: dup.memory1.confidence,
    },
    memory2: {
      id: dup.memory2.id,
      title: dup.memory2.title,
      confidence: dup.memory2.confidence,
    },
    similarity: dup.similarity,
  }))
}
