/**
 * Memory ranking and scoring for RAG
 *
 * Provides utilities for ranking and filtering memories for context injection.
 */

import type { MemorySearchResult, MemoryType } from '../memory/types.js'

/**
 * Memory relevance weights by type
 *
 * Some memory types are more important than others depending on context.
 */
export const MEMORY_TYPE_WEIGHTS: Record<MemoryType, number> = {
  policy: 1.2,        // Policies are critical - must follow
  procedure: 1.1,     // Procedures guide actions
  preference: 1.0,    // User preferences are important
  team_member: 0.95,  // Team info is useful
  creator: 0.95,      // Creator info is useful
  project_pattern: 0.9, // Patterns help but aren't critical
  fact: 0.85,         // Facts are background info
}

/**
 * Calculate composite relevance score for a memory
 *
 * Combines:
 * - Semantic similarity
 * - Confidence score
 * - Importance score
 * - Memory type weight
 * - Recency bonus
 *
 * @param memory - Memory with similarity score
 * @param options - Scoring options
 * @returns Composite relevance score 0-1
 */
export function calculateRelevanceScore(
  memory: MemorySearchResult,
  options: {
    recencyBonus?: boolean
    typeWeights?: Partial<Record<MemoryType, number>>
  } = {}
): number {
  const typeWeight = options.typeWeights?.[memory.memoryType]
    ?? MEMORY_TYPE_WEIGHTS[memory.memoryType]
    ?? 1.0

  // Base score: similarity * confidence * importance * type weight
  let score = memory.similarity * memory.confidence * memory.importance * typeWeight

  // Recency bonus (memories used recently get a small boost)
  if (options.recencyBonus && memory.lastUsedAt) {
    const daysSinceUsed = (Date.now() - new Date(memory.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24)
    const recencyMultiplier = 1 + Math.max(0, (7 - daysSinceUsed) / 70) // Up to +10% for recent
    score *= recencyMultiplier
  }

  // Normalize to 0-1 range
  return Math.min(1, Math.max(0, score))
}

/**
 * Rank memories by composite relevance score
 *
 * @param memories - Memories to rank
 * @param options - Ranking options
 * @returns Sorted memories with relevance scores
 */
export function rankMemories(
  memories: MemorySearchResult[],
  options: {
    recencyBonus?: boolean
    typeWeights?: Partial<Record<MemoryType, number>>
    minScore?: number
  } = {}
): Array<MemorySearchResult & { relevanceScore: number }> {
  const minScore = options.minScore ?? 0

  return memories
    .map((memory) => ({
      ...memory,
      relevanceScore: calculateRelevanceScore(memory, options),
    }))
    .filter((m) => m.relevanceScore >= minScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
}

/**
 * Diversify memory selection
 *
 * Ensures variety in memory types and subjects to avoid context bias.
 *
 * @param memories - Ranked memories
 * @param options - Diversification options
 * @returns Diversified selection
 */
export function diversifyMemories(
  memories: MemorySearchResult[],
  options: {
    maxPerType?: number
    maxPerSubject?: number
    limit?: number
  } = {}
): MemorySearchResult[] {
  const maxPerType = options.maxPerType ?? 5
  const maxPerSubject = options.maxPerSubject ?? 3
  const limit = options.limit ?? 20

  const typeCounts = new Map<MemoryType, number>()
  const subjectCounts = new Map<string, number>()
  const selected: MemorySearchResult[] = []

  for (const memory of memories) {
    if (selected.length >= limit) break

    // Check type limit
    const typeCount = typeCounts.get(memory.memoryType) ?? 0
    if (typeCount >= maxPerType) continue

    // Check subject limit
    const subjectKey = `${memory.subjectType}:${memory.subjectId}`
    const subjectCount = subjectCounts.get(subjectKey) ?? 0
    if (memory.subjectType && subjectCount >= maxPerSubject) continue

    // Add memory
    selected.push(memory)
    typeCounts.set(memory.memoryType, typeCount + 1)
    if (memory.subjectType) {
      subjectCounts.set(subjectKey, subjectCount + 1)
    }
  }

  return selected
}

/**
 * Filter memories by relevance thresholds
 *
 * @param memories - Memories to filter
 * @param thresholds - Threshold options
 * @returns Filtered memories
 */
export function filterByThresholds(
  memories: MemorySearchResult[],
  thresholds: {
    minSimilarity?: number
    minConfidence?: number
    minImportance?: number
  }
): MemorySearchResult[] {
  return memories.filter((memory) => {
    if (thresholds.minSimilarity && memory.similarity < thresholds.minSimilarity) {
      return false
    }
    if (thresholds.minConfidence && memory.confidence < thresholds.minConfidence) {
      return false
    }
    if (thresholds.minImportance && memory.importance < thresholds.minImportance) {
      return false
    }
    return true
  })
}

/**
 * Group memories by type for organized context
 *
 * @param memories - Memories to group
 * @returns Memories grouped by type
 */
export function groupByType(
  memories: MemorySearchResult[]
): Map<MemoryType, MemorySearchResult[]> {
  const groups = new Map<MemoryType, MemorySearchResult[]>()

  for (const memory of memories) {
    const existing = groups.get(memory.memoryType) ?? []
    existing.push(memory)
    groups.set(memory.memoryType, existing)
  }

  return groups
}

/**
 * Get priority order for memory types in context
 *
 * Policies and procedures should come first as they guide behavior.
 */
export const MEMORY_TYPE_PRIORITY: MemoryType[] = [
  'policy',
  'procedure',
  'preference',
  'team_member',
  'creator',
  'project_pattern',
  'fact',
]

/**
 * Sort grouped memories by type priority
 *
 * @param grouped - Memories grouped by type
 * @returns Array of [type, memories] in priority order
 */
export function sortGroupsByPriority(
  grouped: Map<MemoryType, MemorySearchResult[]>
): Array<[MemoryType, MemorySearchResult[]]> {
  const sorted: Array<[MemoryType, MemorySearchResult[]]> = []

  for (const type of MEMORY_TYPE_PRIORITY) {
    const memories = grouped.get(type)
    if (memories && memories.length > 0) {
      sorted.push([type, memories])
    }
  }

  return sorted
}
