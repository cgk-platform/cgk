/**
 * Pattern extraction and storage
 *
 * Captures successful interaction patterns for replication.
 */

import { sql } from '@cgk/db'
import type { AgentPattern, CreatePatternInput } from '../memory/types.js'

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
 * Create a new pattern from a successful interaction
 *
 * @param input - Pattern parameters
 * @returns Created pattern record
 *
 * @example
 * ```ts
 * const pattern = await createPattern({
 *   agentId: 'agent_123',
 *   queryPattern: 'Can you check on project status?',
 *   responsePattern: 'I checked the project dashboard. Here is the current status...',
 *   toolsUsed: ['get_project_status', 'format_report'],
 *   category: 'project_management'
 * })
 * ```
 */
export async function createPattern(input: CreatePatternInput): Promise<AgentPattern> {
  const result = await sql`
    INSERT INTO agent_patterns (
      agent_id, query_pattern, response_pattern,
      tools_used, feedback_id, category
    )
    VALUES (
      ${input.agentId},
      ${input.queryPattern},
      ${input.responsePattern},
      ${input.toolsUsed && input.toolsUsed.length > 0 ? `{${input.toolsUsed.join(',')}}` : '{}'}::text[],
      ${input.feedbackId || null},
      ${input.category || null}
    )
    RETURNING *
  `

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to create pattern')
  }
  return toCamelCase(row as Record<string, unknown>) as unknown as AgentPattern
}

/**
 * Get a pattern by ID
 */
export async function getPattern(patternId: string): Promise<AgentPattern | null> {
  const result = await sql`
    SELECT * FROM agent_patterns WHERE id = ${patternId}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0] as Record<string, unknown>) as unknown as AgentPattern) : null
}

/**
 * List patterns for an agent
 */
export async function listPatterns(
  agentId: string,
  options: {
    category?: string
    minSuccessRate?: number
    limit?: number
    offset?: number
  } = {}
): Promise<AgentPattern[]> {
  const conditions: string[] = ['agent_id = $1']
  const values: unknown[] = [agentId]
  let paramIndex = 2

  if (options.category) {
    conditions.push(`category = $${paramIndex++}`)
    values.push(options.category)
  }

  if (options.minSuccessRate !== undefined) {
    conditions.push(`success_rate >= $${paramIndex++}`)
    values.push(options.minSuccessRate)
  }

  const limit = options.limit ?? 50
  const offset = options.offset ?? 0

  const query = `
    SELECT * FROM agent_patterns
    WHERE ${conditions.join(' AND ')}
    ORDER BY times_used DESC, success_rate DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const result = await sql.query(query, values)
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as AgentPattern)
}

/**
 * Get top performing patterns
 */
export async function getTopPatterns(
  agentId: string,
  limit = 10
): Promise<AgentPattern[]> {
  const result = await sql`
    SELECT * FROM agent_patterns
    WHERE agent_id = ${agentId} AND success_rate >= 0.7
    ORDER BY times_used DESC, success_rate DESC
    LIMIT ${limit}
  `
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as AgentPattern)
}

/**
 * Record pattern usage and update metrics
 *
 * @param patternId - Pattern ID
 * @param success - Whether this usage was successful
 */
export async function recordPatternUsage(patternId: string, success: boolean): Promise<void> {
  // Update times_used and recalculate success_rate
  if (success) {
    await sql`
      UPDATE agent_patterns
      SET
        times_used = times_used + 1,
        success_rate = ((success_rate * (times_used - 1)) + 1.0) / times_used,
        updated_at = NOW()
      WHERE id = ${patternId}
    `
  } else {
    await sql`
      UPDATE agent_patterns
      SET
        times_used = times_used + 1,
        success_rate = (success_rate * (times_used - 1)) / times_used,
        updated_at = NOW()
      WHERE id = ${patternId}
    `
  }
}

/**
 * Update pattern feedback score
 *
 * @param patternId - Pattern ID
 * @param rating - New rating (1-5)
 */
export async function updatePatternFeedback(patternId: string, rating: number): Promise<void> {
  const pattern = await getPattern(patternId)
  if (!pattern) return

  // Calculate new average
  const currentAvg = pattern.avgFeedbackScore ?? 0
  const newAvg = currentAvg === 0 ? rating : (currentAvg + rating) / 2

  await sql`
    UPDATE agent_patterns
    SET avg_feedback_score = ${newAvg}, updated_at = NOW()
    WHERE id = ${patternId}
  `
}

/**
 * Find similar patterns to a query
 *
 * Uses simple text matching to find patterns that might apply.
 *
 * @param agentId - Agent ID
 * @param query - User query to match
 * @returns Matching patterns
 */
export async function findSimilarPatterns(
  agentId: string,
  query: string
): Promise<AgentPattern[]> {
  // Extract key words for matching
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  if (words.length === 0) return []

  // Build pattern for matching
  const patterns = words.map((w) => `%${w}%`)

  const result = await sql`
    SELECT * FROM agent_patterns
    WHERE agent_id = ${agentId}
      AND success_rate >= 0.6
      AND (
        query_pattern ILIKE ANY(${patterns.length > 0 ? `{${patterns.join(',')}}` : '{}'}::text[])
        OR response_pattern ILIKE ANY(${patterns.length > 0 ? `{${patterns.join(',')}}` : '{}'}::text[])
      )
    ORDER BY success_rate DESC, times_used DESC
    LIMIT 5
  `

  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as AgentPattern)
}

/**
 * Get patterns by category
 */
export async function getPatternsByCategory(
  agentId: string,
  category: string
): Promise<AgentPattern[]> {
  const result = await sql`
    SELECT * FROM agent_patterns
    WHERE agent_id = ${agentId} AND category = ${category}
    ORDER BY success_rate DESC, times_used DESC
  `
  return result.rows.map((row) => toCamelCase(row as Record<string, unknown>) as unknown as AgentPattern)
}

/**
 * Get pattern categories for an agent
 */
export async function getPatternCategories(agentId: string): Promise<string[]> {
  const result = await sql`
    SELECT DISTINCT category FROM agent_patterns
    WHERE agent_id = ${agentId} AND category IS NOT NULL
    ORDER BY category
  `
  return result.rows.map((row) => row.category as string)
}

/**
 * Update pattern category
 */
export async function updatePatternCategory(
  patternId: string,
  category: string | null
): Promise<AgentPattern | null> {
  const result = await sql`
    UPDATE agent_patterns
    SET category = ${category}, updated_at = NOW()
    WHERE id = ${patternId}
    RETURNING *
  `
  return result.rows[0] ? (toCamelCase(result.rows[0] as Record<string, unknown>) as unknown as AgentPattern) : null
}

/**
 * Delete a pattern
 */
export async function deletePattern(patternId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM agent_patterns WHERE id = ${patternId}
  `
  return (result.rowCount ?? 0) > 0
}

/**
 * Cleanup low-performing patterns
 *
 * @param agentId - Agent ID
 * @param maxSuccessRate - Delete patterns below this success rate
 * @param minUsage - Only delete if used at least this many times
 * @returns Number of patterns deleted
 */
export async function cleanupLowPerformingPatterns(
  agentId: string,
  maxSuccessRate = 0.3,
  minUsage = 5
): Promise<number> {
  const result = await sql`
    DELETE FROM agent_patterns
    WHERE agent_id = ${agentId}
      AND success_rate < ${maxSuccessRate}
      AND times_used >= ${minUsage}
  `
  return result.rowCount ?? 0
}

/**
 * Get pattern statistics for an agent
 */
export async function getPatternStats(agentId: string): Promise<{
  total: number
  averageSuccessRate: number | null
  totalUsage: number
  categoryCounts: Record<string, number>
}> {
  const statsResult = await sql`
    SELECT
      COUNT(*)::INTEGER as total,
      AVG(success_rate) as avg_success_rate,
      SUM(times_used)::INTEGER as total_usage
    FROM agent_patterns
    WHERE agent_id = ${agentId}
  `

  const categoryResult = await sql`
    SELECT category, COUNT(*)::INTEGER as count
    FROM agent_patterns
    WHERE agent_id = ${agentId} AND category IS NOT NULL
    GROUP BY category
  `

  const stats = statsResult.rows[0]
  const categoryCounts: Record<string, number> = {}
  for (const row of categoryResult.rows) {
    categoryCounts[row.category as string] = row.count as number
  }

  if (!stats) {
    return {
      total: 0,
      averageSuccessRate: null,
      totalUsage: 0,
      categoryCounts,
    }
  }

  return {
    total: stats.total as number,
    averageSuccessRate: stats.avg_success_rate ? Number(stats.avg_success_rate) : null,
    totalUsage: (stats.total_usage as number) ?? 0,
    categoryCounts,
  }
}
