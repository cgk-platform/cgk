/**
 * Database queries for AI Teams system
 * All queries expect to be run within a tenant context via withTenant()
 */

import { sql } from '@cgk/db'
import type {
  AddTeamMemberInput,
  AITeam,
  AITeamWithMembers,
  CreateTeamInput,
  TeamMember,
  TeamMemberSummary,
  TeamMemberWithAgent,
  TeamRole,
  UpdateTeamInput,
  UpdateTeamMemberInput,
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
// Team CRUD
// ============================================================================

/**
 * Create a new AI team
 */
export async function createTeam(input: CreateTeamInput): Promise<AITeam> {
  const result = await sql`
    INSERT INTO ai_teams (
      name, description, domain,
      slack_channel_id, slack_channel_name,
      supervisor_type, supervisor_id, supervisor_slack_id
    )
    VALUES (
      ${input.name},
      ${input.description || null},
      ${input.domain || null},
      ${input.slackChannelId || null},
      ${input.slackChannelName || null},
      ${input.supervisorType || null},
      ${input.supervisorId || null},
      ${input.supervisorSlackId || null}
    )
    RETURNING *
  `

  return toCamelCase<AITeam>(result.rows[0] as Record<string, unknown>)
}

/**
 * Get a team by ID
 */
export async function getTeamById(teamId: string): Promise<AITeam | null> {
  const result = await sql`
    SELECT * FROM ai_teams WHERE id = ${teamId}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0]) as AITeam) : null
}

/**
 * Get a team by name
 */
export async function getTeamByName(name: string): Promise<AITeam | null> {
  const result = await sql`
    SELECT * FROM ai_teams WHERE name = ${name}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0]) as AITeam) : null
}

/**
 * List all teams with member counts
 */
export async function listTeams(): Promise<AITeamWithMembers[]> {
  const result = await sql`
    SELECT
      t.*,
      COALESCE(
        (
          SELECT COUNT(*)::INTEGER
          FROM ai_team_members m
          WHERE m.team_id = t.id
        ),
        0
      ) as member_count
    FROM ai_teams t
    WHERE t.is_active = true
    ORDER BY t.name ASC
  `

  const teams = result.rows.map((row) => ({
    ...toCamelCase(row),
    members: [] as TeamMemberSummary[],
  })) as AITeamWithMembers[]

  // Load members for each team
  for (const team of teams) {
    const members = await sql`
      SELECT
        m.agent_id,
        m.role,
        a.name as agent_name,
        a.display_name as agent_display_name,
        a.avatar_url
      FROM ai_team_members m
      JOIN ai_agents a ON a.id = m.agent_id
      WHERE m.team_id = ${team.id}
      ORDER BY
        CASE m.role
          WHEN 'lead' THEN 0
          WHEN 'specialist' THEN 1
          ELSE 2
        END,
        a.display_name ASC
    `

    team.members = members.rows.map((row) => ({
      agentId: row.agent_id as string,
      agentName: row.agent_name as string,
      agentDisplayName: row.agent_display_name as string,
      avatarUrl: row.avatar_url as string | null,
      role: row.role as TeamRole,
    }))
  }

  return teams
}

/**
 * Update a team
 */
export async function updateTeam(
  teamId: string,
  input: UpdateTeamInput
): Promise<AITeam | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (input.name !== undefined) {
    sets.push(`name = $${paramIndex++}`)
    values.push(input.name)
  }
  if (input.description !== undefined) {
    sets.push(`description = $${paramIndex++}`)
    values.push(input.description)
  }
  if (input.domain !== undefined) {
    sets.push(`domain = $${paramIndex++}`)
    values.push(input.domain)
  }
  if (input.slackChannelId !== undefined) {
    sets.push(`slack_channel_id = $${paramIndex++}`)
    values.push(input.slackChannelId)
  }
  if (input.slackChannelName !== undefined) {
    sets.push(`slack_channel_name = $${paramIndex++}`)
    values.push(input.slackChannelName)
  }
  if (input.supervisorType !== undefined) {
    sets.push(`supervisor_type = $${paramIndex++}`)
    values.push(input.supervisorType)
  }
  if (input.supervisorId !== undefined) {
    sets.push(`supervisor_id = $${paramIndex++}`)
    values.push(input.supervisorId)
  }
  if (input.supervisorSlackId !== undefined) {
    sets.push(`supervisor_slack_id = $${paramIndex++}`)
    values.push(input.supervisorSlackId)
  }
  if (input.isActive !== undefined) {
    sets.push(`is_active = $${paramIndex++}`)
    values.push(input.isActive)
  }

  if (sets.length === 0) {
    return getTeamById(teamId)
  }

  sets.push(`updated_at = NOW()`)
  values.push(teamId)

  const query = `UPDATE ai_teams SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`
  const result = await sql.query(query, values)

  return result.rows[0] ? (toCamelCase(result.rows[0]) as AITeam) : null
}

/**
 * Delete (deactivate) a team
 */
export async function deleteTeam(teamId: string): Promise<boolean> {
  const result = await sql`
    UPDATE ai_teams SET is_active = false, updated_at = NOW()
    WHERE id = ${teamId}
  `
  return (result.rowCount ?? 0) > 0
}

// ============================================================================
// Team Membership
// ============================================================================

/**
 * Add an agent to a team
 */
export async function addTeamMember(input: AddTeamMemberInput): Promise<TeamMember> {
  const result = await sql.query(
    `INSERT INTO ai_team_members (
      team_id, agent_id, role, slack_user_id, specializations
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      input.teamId,
      input.agentId,
      input.role || 'member',
      input.slackUserId || null,
      input.specializations || [],
    ]
  )

  return toCamelCase<TeamMember>(result.rows[0] as Record<string, unknown>)
}

/**
 * Get team member by agent and team
 */
export async function getTeamMember(
  teamId: string,
  agentId: string
): Promise<TeamMember | null> {
  const result = await sql`
    SELECT * FROM ai_team_members
    WHERE team_id = ${teamId} AND agent_id = ${agentId}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0]) as TeamMember) : null
}

/**
 * List all members of a team with agent details
 */
export async function listTeamMembers(teamId: string): Promise<TeamMemberWithAgent[]> {
  const result = await sql`
    SELECT
      m.*,
      a.name as agent_name,
      a.display_name as agent_display_name,
      a.avatar_url as agent_avatar_url,
      a.role as agent_role,
      a.status as agent_status
    FROM ai_team_members m
    JOIN ai_agents a ON a.id = m.agent_id
    WHERE m.team_id = ${teamId}
    ORDER BY
      CASE m.role
        WHEN 'lead' THEN 0
        WHEN 'specialist' THEN 1
        ELSE 2
      END,
      a.display_name ASC
  `

  return result.rows.map((row) => {
    const member = toCamelCase(row) as TeamMemberWithAgent & Record<string, unknown>
    member.agent = {
      id: member.agentId as string,
      name: member.agentName as string,
      displayName: member.agentDisplayName as string,
      avatarUrl: member.agentAvatarUrl as string | null,
      role: member.agentRole as string,
      status: member.agentStatus as string,
    }
    delete member.agentName
    delete member.agentDisplayName
    delete member.agentAvatarUrl
    delete member.agentRole
    delete member.agentStatus
    return member as TeamMemberWithAgent
  })
}

/**
 * Get all team memberships for an agent
 */
export async function getAgentTeamMemberships(agentId: string): Promise<
  Array<{
    teamId: string
    teamName: string
    role: TeamRole
    specializations: string[]
  }>
> {
  const result = await sql`
    SELECT
      m.team_id,
      t.name as team_name,
      m.role,
      m.specializations
    FROM ai_team_members m
    JOIN ai_teams t ON t.id = m.team_id
    WHERE m.agent_id = ${agentId} AND t.is_active = true
  `

  return result.rows.map((row) => ({
    teamId: row.team_id as string,
    teamName: row.team_name as string,
    role: row.role as TeamRole,
    specializations: row.specializations as string[],
  }))
}

/**
 * Update a team member
 */
export async function updateTeamMember(
  teamId: string,
  agentId: string,
  input: UpdateTeamMemberInput
): Promise<TeamMember | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (input.role !== undefined) {
    sets.push(`role = $${paramIndex++}`)
    values.push(input.role)
  }
  if (input.slackUserId !== undefined) {
    sets.push(`slack_user_id = $${paramIndex++}`)
    values.push(input.slackUserId)
  }
  if (input.specializations !== undefined) {
    sets.push(`specializations = $${paramIndex++}`)
    values.push(input.specializations)
  }

  if (sets.length === 0) {
    return getTeamMember(teamId, agentId)
  }

  values.push(teamId, agentId)

  const query = `
    UPDATE ai_team_members SET ${sets.join(', ')}
    WHERE team_id = $${paramIndex++} AND agent_id = $${paramIndex}
    RETURNING *
  `
  const result = await sql.query(query, values)

  return result.rows[0] ? (toCamelCase(result.rows[0]) as TeamMember) : null
}

/**
 * Remove an agent from a team
 */
export async function removeTeamMember(teamId: string, agentId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM ai_team_members
    WHERE team_id = ${teamId} AND agent_id = ${agentId}
  `
  return (result.rowCount ?? 0) > 0
}

/**
 * Get team lead for a team
 */
export async function getTeamLead(teamId: string): Promise<TeamMemberWithAgent | null> {
  const result = await sql`
    SELECT
      m.*,
      a.name as agent_name,
      a.display_name as agent_display_name,
      a.avatar_url as agent_avatar_url,
      a.role as agent_role,
      a.status as agent_status
    FROM ai_team_members m
    JOIN ai_agents a ON a.id = m.agent_id
    WHERE m.team_id = ${teamId} AND m.role = 'lead'
    LIMIT 1
  `

  if (!result.rows[0]) return null

  const row = result.rows[0]
  const member = toCamelCase(row) as TeamMemberWithAgent & Record<string, unknown>
  member.agent = {
    id: member.agentId as string,
    name: member.agentName as string,
    displayName: member.agentDisplayName as string,
    avatarUrl: member.agentAvatarUrl as string | null,
    role: member.agentRole as string,
    status: member.agentStatus as string,
  }
  delete member.agentName
  delete member.agentDisplayName
  delete member.agentAvatarUrl
  delete member.agentRole
  delete member.agentStatus
  return member as TeamMemberWithAgent
}
