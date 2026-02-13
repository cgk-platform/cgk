/**
 * Database queries for Agent Relationships
 * All queries expect to be run within a tenant context via withTenant()
 */

import { sql } from '@cgk-platform/db'
import type {
  AgentRelationship,
  AgentRelationshipWithPerson,
  CommunicationPreferences,
  PersonType,
  UpdateRelationshipInput,
} from '../types/teams.js'

// Helper to convert snake_case DB rows to camelCase
function toCamelCase<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
    result[camelKey] = value
  }
  return result as T
}

// ============================================================================
// Relationship CRUD
// ============================================================================

/**
 * Get or create a relationship
 */
export async function getOrCreateRelationship(
  agentId: string,
  personType: PersonType,
  personId: string
): Promise<AgentRelationship> {
  // Try to get existing
  const existing = await sql`
    SELECT * FROM agent_relationships
    WHERE agent_id = ${agentId}
      AND person_type = ${personType}
      AND person_id = ${personId}
  `

  if (existing.rows[0]) {
    return toCamelCase(existing.rows[0]) as AgentRelationship
  }

  // Create new
  const result = await sql`
    INSERT INTO agent_relationships (
      agent_id, person_type, person_id
    )
    VALUES (${agentId}, ${personType}, ${personId})
    RETURNING *
  `

  return toCamelCase<AgentRelationship>(result.rows[0] as Record<string, unknown>)
}

/**
 * Get a specific relationship
 */
export async function getRelationship(
  agentId: string,
  personType: PersonType,
  personId: string
): Promise<AgentRelationship | null> {
  const result = await sql`
    SELECT * FROM agent_relationships
    WHERE agent_id = ${agentId}
      AND person_type = ${personType}
      AND person_id = ${personId}
  `
  return result.rows[0] ? toCamelCase<AgentRelationship>(result.rows[0] as Record<string, unknown>) : null
}

/**
 * List all relationships for an agent
 */
export async function listAgentRelationships(agentId: string): Promise<AgentRelationship[]> {
  const result = await sql`
    SELECT * FROM agent_relationships
    WHERE agent_id = ${agentId}
    ORDER BY familiarity_score DESC, last_interaction_at DESC NULLS LAST
  `
  return result.rows.map((row) => toCamelCase(row) as AgentRelationship)
}

/**
 * List relationships with person details (team_members and creators only)
 */
export async function listAgentRelationshipsWithDetails(
  agentId: string
): Promise<AgentRelationshipWithPerson[]> {
  // Get team member relationships
  const teamMemberResult = await sql`
    SELECT
      r.*,
      tm.user_id as person_id_check,
      tm.name as person_name,
      tm.email as person_email,
      tm.avatar_url as person_avatar_url
    FROM agent_relationships r
    LEFT JOIN team_members tm ON r.person_type = 'team_member' AND r.person_id = tm.user_id
    WHERE r.agent_id = ${agentId} AND r.person_type = 'team_member'
  `

  // Get creator relationships
  const creatorResult = await sql`
    SELECT
      r.*,
      c.id as person_id_check,
      c.name as person_name,
      c.email as person_email,
      c.avatar_url as person_avatar_url
    FROM agent_relationships r
    LEFT JOIN creators c ON r.person_type = 'creator' AND r.person_id = c.id::text
    WHERE r.agent_id = ${agentId} AND r.person_type = 'creator'
  `

  // Get contact relationships (no join, just basic info)
  const contactResult = await sql`
    SELECT
      r.*,
      NULL as person_name,
      NULL as person_email,
      NULL as person_avatar_url
    FROM agent_relationships r
    WHERE r.agent_id = ${agentId} AND r.person_type = 'contact'
  `

  const allRows = [...teamMemberResult.rows, ...creatorResult.rows, ...contactResult.rows]

  return allRows.map((row) => {
    const relationship = toCamelCase(row) as AgentRelationshipWithPerson & Record<string, unknown>
    relationship.person = {
      id: relationship.personId as string,
      name: (relationship.personName as string) || 'Unknown',
      email: relationship.personEmail as string | undefined,
      avatarUrl: relationship.personAvatarUrl as string | undefined,
    }
    delete relationship.personName
    delete relationship.personEmail
    delete relationship.personAvatarUrl
    delete relationship.personIdCheck
    return relationship as AgentRelationshipWithPerson
  }).sort((a, b) => b.familiarityScore - a.familiarityScore)
}

/**
 * Update a relationship
 */
export async function updateRelationship(
  agentId: string,
  personType: PersonType,
  personId: string,
  input: UpdateRelationshipInput
): Promise<AgentRelationship | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (input.trustLevel !== undefined) {
    sets.push(`trust_level = $${paramIndex++}`)
    values.push(input.trustLevel)
  }
  if (input.communicationPreferences !== undefined) {
    // Merge with existing preferences
    sets.push(`communication_preferences = communication_preferences || $${paramIndex++}::jsonb`)
    values.push(JSON.stringify(input.communicationPreferences))
  }
  if (input.relationshipSummary !== undefined) {
    sets.push(`relationship_summary = $${paramIndex++}`)
    values.push(input.relationshipSummary)
  }

  if (sets.length === 0) {
    return getRelationship(agentId, personType, personId)
  }

  sets.push(`updated_at = NOW()`)
  values.push(agentId, personType, personId)

  const query = `
    UPDATE agent_relationships SET ${sets.join(', ')}
    WHERE agent_id = $${paramIndex++}
      AND person_type = $${paramIndex++}
      AND person_id = $${paramIndex}
    RETURNING *
  `
  const result = await sql.query(query, values)

  return result.rows[0] ? (toCamelCase(result.rows[0]) as AgentRelationship) : null
}

/**
 * Record an interaction and update familiarity
 */
export async function recordInteraction(params: {
  agentId: string
  personType: PersonType
  personId: string
  durationMinutes?: number
  topics?: string[]
}): Promise<AgentRelationship> {
  // Upsert relationship with interaction
  await sql`
    INSERT INTO agent_relationships (
      agent_id, person_type, person_id,
      interaction_count, total_conversation_minutes, last_interaction_at
    )
    VALUES (
      ${params.agentId},
      ${params.personType},
      ${params.personId},
      1,
      ${params.durationMinutes || 0},
      NOW()
    )
    ON CONFLICT (agent_id, person_type, person_id)
    DO UPDATE SET
      interaction_count = agent_relationships.interaction_count + 1,
      total_conversation_minutes = agent_relationships.total_conversation_minutes + ${params.durationMinutes || 0},
      last_interaction_at = NOW(),
      updated_at = NOW()
    RETURNING *
  `

  // Update topics if provided - use raw query for array parameter
  if (params.topics && params.topics.length > 0) {
    const topicsJson = JSON.stringify(params.topics)
    await sql.query(
      `UPDATE agent_relationships
      SET communication_preferences = jsonb_set(
        COALESCE(communication_preferences, '{}'::jsonb),
        '{topicsDiscussed}',
        (
          SELECT COALESCE(jsonb_agg(DISTINCT topic), '[]'::jsonb)
          FROM (
            SELECT jsonb_array_elements_text(
              COALESCE(communication_preferences->'topicsDiscussed', '[]'::jsonb)
            ) as topic
            UNION ALL
            SELECT jsonb_array_elements_text($1::jsonb)
          ) topics
        )
      )
      WHERE agent_id = $2
        AND person_type = $3
        AND person_id = $4`,
      [topicsJson, params.agentId, params.personType, params.personId]
    )
  }

  // Recalculate familiarity
  await updateFamiliarity(params.agentId, params.personType, params.personId)

  // Return updated relationship
  return (await getRelationship(params.agentId, params.personType, params.personId))!
}

/**
 * Update familiarity score based on interaction data
 */
export async function updateFamiliarity(
  agentId: string,
  personType: PersonType,
  personId: string
): Promise<void> {
  // Familiarity formula:
  // - Base from interaction count (max 0.4, log scale)
  // - Bonus from conversation time (max 0.3, log scale)
  // - Recency bonus (max 0.3, decays over 30 days)
  await sql`
    UPDATE agent_relationships
    SET familiarity_score = LEAST(1.0,
      -- Base from interaction count (max 0.4)
      LEAST(0.4, LOG(interaction_count + 1) / 4) +
      -- Bonus from conversation time (max 0.3)
      LEAST(0.3, LOG(total_conversation_minutes + 1) / 5) +
      -- Recency bonus (max 0.3, decays over 30 days)
      GREATEST(0, 0.3 * (1 - EXTRACT(EPOCH FROM (NOW() - COALESCE(last_interaction_at, NOW() - INTERVAL '60 days'))) / (30 * 24 * 60 * 60)))
    )
    WHERE agent_id = ${agentId}
      AND person_type = ${personType}
      AND person_id = ${personId}
  `
}

/**
 * Apply time decay to all familiarity scores
 * Called by background job
 */
export async function decayAllFamiliarity(): Promise<number> {
  // Only decay if last_interaction_at is older than 7 days
  // Decay rate: 0.01 per day
  const result = await sql`
    UPDATE agent_relationships
    SET familiarity_score = GREATEST(0,
      familiarity_score - 0.01 * EXTRACT(EPOCH FROM (NOW() - updated_at)) / (24 * 60 * 60)
    ),
    updated_at = NOW()
    WHERE last_interaction_at < NOW() - INTERVAL '7 days'
      AND familiarity_score > 0
  `
  return result.rowCount ?? 0
}

/**
 * Get high-familiarity relationships for an agent
 */
export async function getHighFamiliarityRelationships(
  agentId: string,
  minScore = 0.5,
  limit = 10
): Promise<AgentRelationship[]> {
  const result = await sql`
    SELECT * FROM agent_relationships
    WHERE agent_id = ${agentId}
      AND familiarity_score >= ${minScore}
    ORDER BY familiarity_score DESC
    LIMIT ${limit}
  `
  return result.rows.map((row) => toCamelCase(row) as AgentRelationship)
}

/**
 * Get relationship stats for an agent
 */
export async function getRelationshipStats(agentId: string): Promise<{
  totalRelationships: number
  avgFamiliarity: number
  avgTrustLevel: number
  totalInteractions: number
  totalConversationMinutes: number
}> {
  const result = await sql`
    SELECT
      COUNT(*)::INTEGER as total_relationships,
      COALESCE(AVG(familiarity_score), 0)::NUMERIC(3,2) as avg_familiarity,
      COALESCE(AVG(trust_level), 0.5)::NUMERIC(3,2) as avg_trust_level,
      COALESCE(SUM(interaction_count), 0)::INTEGER as total_interactions,
      COALESCE(SUM(total_conversation_minutes), 0)::INTEGER as total_conversation_minutes
    FROM agent_relationships
    WHERE agent_id = ${agentId}
  `

  const row = result.rows[0] as Record<string, unknown> | undefined
  if (!row) {
    return {
      totalRelationships: 0,
      avgFamiliarity: 0,
      avgTrustLevel: 0.5,
      totalInteractions: 0,
      totalConversationMinutes: 0,
    }
  }
  return {
    totalRelationships: row.total_relationships as number,
    avgFamiliarity: Number(row.avg_familiarity),
    avgTrustLevel: Number(row.avg_trust_level),
    totalInteractions: row.total_interactions as number,
    totalConversationMinutes: row.total_conversation_minutes as number,
  }
}

/**
 * Get communication preferences for a relationship
 */
export async function getCommunicationPreferences(
  agentId: string,
  personType: PersonType,
  personId: string
): Promise<CommunicationPreferences> {
  const result = await sql`
    SELECT communication_preferences
    FROM agent_relationships
    WHERE agent_id = ${agentId}
      AND person_type = ${personType}
      AND person_id = ${personId}
  `

  if (!result.rows[0]) {
    return {}
  }

  return (result.rows[0].communication_preferences || {}) as CommunicationPreferences
}
