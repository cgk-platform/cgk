/**
 * RAG Context Builder
 *
 * Builds context sections from agent memories for injection into prompts.
 */

import { sql } from '@cgk-platform/db'
import { recordMemoryAccess as _recordMemoryAccess } from '../memory/storage.js'
import { estimateTokens } from '../memory/embeddings.js'
import { searchMemories } from './search.js'
import { rankMemories, diversifyMemories, groupByType, sortGroupsByPriority } from './ranking.js'
import type {
  MemorySearchResult,
  MemoryType,
  RAGContextOptions,
  RAGContextResult,
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
 * Human-readable names for memory types
 */
const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  policy: 'Policies & Rules',
  procedure: 'Procedures',
  preference: 'Preferences',
  team_member: 'Team Information',
  creator: 'Creator Information',
  project_pattern: 'Patterns & Examples',
  fact: 'General Knowledge',
}

/**
 * Build memory context for prompt injection
 *
 * Retrieves relevant memories and formats them for inclusion in prompts.
 *
 * @param options - Context building options
 * @returns Formatted context and metadata
 *
 * @example
 * ```ts
 * const { context, memoriesUsed } = await buildMemoryContext({
 *   agentId: 'agent_123',
 *   query: 'How should I respond to Sarah about the deadline extension?',
 *   maxTokens: 2000
 * })
 *
 * const prompt = `${context}\n\n${userMessage}`
 * ```
 */
export async function buildMemoryContext(options: RAGContextOptions): Promise<RAGContextResult> {
  const maxTokens = options.maxTokens ?? 2000
  const minConfidence = options.minConfidence ?? 0.4

  // Search for relevant memories
  const memories = await searchMemories({
    agentId: options.agentId,
    query: options.query,
    limit: 30, // Get more than needed for ranking/filtering
    memoryTypes: options.memoryTypes,
    minConfidence,
  })

  if (memories.length === 0) {
    return { context: '', memoriesUsed: [], tokenEstimate: 0 }
  }

  // Rank and diversify
  const ranked = rankMemories(memories, { recencyBonus: true })
  const diversified = diversifyMemories(ranked, {
    maxPerType: 4,
    maxPerSubject: 2,
    limit: 20,
  })

  // Get failure learnings if requested
  let failureLearnings: Array<{
    failureType: string
    whatWentWrong: string
    correctApproach: string
  }> = []
  if (options.includeFailures) {
    const failureResult = await sql`
      SELECT failure_type, what_went_wrong, correct_approach
      FROM agent_failure_learnings
      WHERE agent_id = ${options.agentId}
        AND acknowledged = true
        AND applied_to_behavior = true
      ORDER BY created_at DESC
      LIMIT 5
    `
    failureLearnings = failureResult.rows.map(
      (row) =>
        toCamelCase(row) as {
          failureType: string
          whatWentWrong: string
          correctApproach: string
        }
    )
  }

  // Get successful patterns if requested
  let patterns: Array<{
    queryPattern: string
    responsePattern: string
    successRate: number
  }> = []
  if (options.includePatterns) {
    const patternResult = await sql`
      SELECT query_pattern, response_pattern, success_rate
      FROM agent_patterns
      WHERE agent_id = ${options.agentId}
        AND success_rate >= 0.8
      ORDER BY times_used DESC, success_rate DESC
      LIMIT 3
    `
    patterns = patternResult.rows.map(
      (row) =>
        toCamelCase(row) as {
          queryPattern: string
          responsePattern: string
          successRate: number
        }
    )
  }

  // Build context string with token budget
  const sections: string[] = []
  const memoriesUsed: string[] = []
  let tokenCount = 0

  // Add conversation context if provided
  if (options.conversationContext) {
    const contextSection = `## Conversation Context\n${options.conversationContext}\n`
    const contextTokens = estimateTokens(contextSection)
    if (tokenCount + contextTokens <= maxTokens * 0.3) {
      // Max 30% for conversation context
      sections.push(contextSection)
      tokenCount += contextTokens
    }
  }

  // Group memories by type for organized output
  const grouped = groupByType(diversified)
  const sortedGroups = sortGroupsByPriority(grouped)

  for (const [type, typeMemories] of sortedGroups) {
    const typeLabel = MEMORY_TYPE_LABELS[type]
    const typeSection: string[] = [`### ${typeLabel}`]

    for (const memory of typeMemories) {
      const memoryText = formatMemoryForContext(memory)
      const memoryTokens = estimateTokens(memoryText)

      if (tokenCount + memoryTokens > maxTokens) {
        break
      }

      typeSection.push(memoryText)
      memoriesUsed.push(memory.id)
      tokenCount += memoryTokens
    }

    if (typeSection.length > 1) {
      sections.push(typeSection.join('\n'))
    }

    if (tokenCount >= maxTokens) break
  }

  // Add failure learnings section
  if (failureLearnings.length > 0) {
    const failureSection = formatFailureLearnings(failureLearnings)
    const failureTokens = estimateTokens(failureSection)
    if (tokenCount + failureTokens <= maxTokens) {
      sections.push(failureSection)
      tokenCount += failureTokens
    }
  }

  // Add patterns section
  if (patterns.length > 0) {
    const patternSection = formatPatterns(patterns)
    const patternTokens = estimateTokens(patternSection)
    if (tokenCount + patternTokens <= maxTokens) {
      sections.push(patternSection)
      tokenCount += patternTokens
    }
  }

  // Record memory access for all used memories (async, don't wait)
  recordMemoryAccessBatch(memoriesUsed).catch(() => {
    // Ignore errors in background recording
  })

  // Combine sections
  const context =
    sections.length > 0 ? `## Relevant Context (from memory)\n\n${sections.join('\n\n')}` : ''

  return {
    context,
    memoriesUsed,
    tokenEstimate: tokenCount,
  }
}

/**
 * Format a single memory for context inclusion
 */
function formatMemoryForContext(memory: MemorySearchResult): string {
  const confidencePercent = Math.round(memory.confidence * 100)
  const subjectInfo = memory.subjectType
    ? ` [${memory.subjectType}: ${memory.subjectId}]`
    : ''

  return `- **${memory.title}** (confidence: ${confidencePercent}%)${subjectInfo}\n  ${memory.content}`
}

/**
 * Format failure learnings for context
 */
function formatFailureLearnings(
  learnings: Array<{
    failureType: string
    whatWentWrong: string
    correctApproach: string
  }>
): string {
  const items = learnings.map(
    (l) =>
      `- **Avoid**: ${l.whatWentWrong}\n  **Instead**: ${l.correctApproach}`
  )

  return `### Lessons Learned\n${items.join('\n')}`
}

/**
 * Format patterns for context
 */
function formatPatterns(
  patterns: Array<{
    queryPattern: string
    responsePattern: string
    successRate: number
  }>
): string {
  const items = patterns.map(
    (p) =>
      `- When: "${p.queryPattern}"\n  Response: "${p.responsePattern}" (${Math.round(p.successRate * 100)}% success)`
  )

  return `### Successful Patterns\n${items.join('\n')}`
}

/**
 * Record access for multiple memories
 */
async function recordMemoryAccessBatch(memoryIds: string[]): Promise<void> {
  if (memoryIds.length === 0) return

  // Use a single UPDATE for efficiency
  await sql`
    UPDATE agent_memories
    SET times_used = times_used + 1, last_used_at = NOW()
    WHERE id = ANY(${`{${memoryIds.join(',')}}`}::text[])
  `
}

/**
 * Build minimal context for quick lookups
 *
 * Returns a smaller context suitable for simple queries.
 *
 * @param agentId - Agent ID
 * @param query - Query text
 * @param limit - Max memories
 * @returns Simple context string
 */
export async function buildQuickContext(
  agentId: string,
  query: string,
  limit = 5
): Promise<string> {
  const memories = await searchMemories({
    agentId,
    query,
    limit,
    minConfidence: 0.5,
  })

  if (memories.length === 0) {
    return ''
  }

  const items = memories.map((m) => `- ${m.title}: ${m.content}`)

  return `Relevant context:\n${items.join('\n')}`
}

/**
 * Build subject-specific context
 *
 * Gets all relevant information about a specific subject.
 *
 * @param agentId - Agent ID
 * @param subjectType - Subject type (e.g., 'creator')
 * @param subjectId - Subject ID
 * @returns Context about the subject
 */
export async function buildSubjectContext(
  agentId: string,
  subjectType: string,
  subjectId: string
): Promise<string> {
  const result = await sql`
    SELECT title, content, confidence
    FROM agent_memories
    WHERE agent_id = ${agentId}
      AND subject_type = ${subjectType}
      AND subject_id = ${subjectId}
      AND is_active = true
    ORDER BY confidence DESC, importance DESC
    LIMIT 10
  `

  if (result.rows.length === 0) {
    return ''
  }

  const items = result.rows.map(
    (row) => `- ${row.title} (${Math.round(Number(row.confidence) * 100)}%): ${row.content}`
  )

  return `What I know about this ${subjectType}:\n${items.join('\n')}`
}
