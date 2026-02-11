/**
 * Team Membership - Managing agents within teams
 */

import { getAgentById } from '../db/queries.js'
import {
  addTeamMember as dbAddTeamMember,
  getAgentTeamMemberships,
  getTeamById,
  getTeamLead as dbGetTeamLead,
  getTeamMember,
  listTeamMembers as dbListTeamMembers,
  removeTeamMember as dbRemoveTeamMember,
  updateTeamMember as dbUpdateTeamMember,
} from '../db/teams-queries.js'
import type {
  AddTeamMemberInput,
  TeamMember,
  TeamMemberWithAgent,
  TeamRole,
  UpdateTeamMemberInput,
} from '../types/teams.js'

/**
 * Add an agent to a team
 */
export async function addTeamMember(input: AddTeamMemberInput): Promise<TeamMember> {
  // Verify team exists
  const team = await getTeamById(input.teamId)
  if (!team) {
    throw new Error(`Team ${input.teamId} not found`)
  }

  // Verify agent exists
  const agent = await getAgentById(input.agentId)
  if (!agent) {
    throw new Error(`Agent ${input.agentId} not found`)
  }

  // Check if already a member
  const existing = await getTeamMember(input.teamId, input.agentId)
  if (existing) {
    throw new Error(`Agent ${agent.displayName} is already a member of team ${team.name}`)
  }

  return dbAddTeamMember(input)
}

/**
 * List all members of a team
 */
export async function listTeamMembers(teamId: string): Promise<TeamMemberWithAgent[]> {
  return dbListTeamMembers(teamId)
}

/**
 * Get all teams an agent belongs to
 */
export async function getAgentTeams(agentId: string): Promise<
  Array<{
    teamId: string
    teamName: string
    role: TeamRole
    specializations: string[]
  }>
> {
  return getAgentTeamMemberships(agentId)
}

/**
 * Update a team member's role or specializations
 */
export async function updateMember(
  teamId: string,
  agentId: string,
  input: UpdateTeamMemberInput
): Promise<TeamMember | null> {
  // Verify membership exists
  const existing = await getTeamMember(teamId, agentId)
  if (!existing) {
    throw new Error(`Agent is not a member of this team`)
  }

  return dbUpdateTeamMember(teamId, agentId, input)
}

/**
 * Remove an agent from a team
 */
export async function removeMember(teamId: string, agentId: string): Promise<boolean> {
  // Verify membership exists
  const existing = await getTeamMember(teamId, agentId)
  if (!existing) {
    throw new Error(`Agent is not a member of this team`)
  }

  return dbRemoveTeamMember(teamId, agentId)
}

/**
 * Set an agent as team lead (demotes existing lead)
 */
export async function setTeamLead(teamId: string, agentId: string): Promise<TeamMember | null> {
  // Verify membership exists
  const existing = await getTeamMember(teamId, agentId)
  if (!existing) {
    throw new Error(`Agent must be a team member before becoming lead`)
  }

  // Demote existing lead
  const currentLead = await dbGetTeamLead(teamId)
  if (currentLead && currentLead.agentId !== agentId) {
    await dbUpdateTeamMember(teamId, currentLead.agentId, { role: 'member' })
  }

  // Promote new lead
  return dbUpdateTeamMember(teamId, agentId, { role: 'lead' })
}

/**
 * Get the team lead for a team
 */
export async function getTeamLead(teamId: string): Promise<TeamMemberWithAgent | null> {
  return dbGetTeamLead(teamId)
}

/**
 * Add a specialization to a team member
 */
export async function addSpecialization(
  teamId: string,
  agentId: string,
  specialization: string
): Promise<TeamMember | null> {
  const member = await getTeamMember(teamId, agentId)
  if (!member) {
    throw new Error(`Agent is not a member of this team`)
  }

  const specializations = [...new Set([...member.specializations, specialization])]
  return dbUpdateTeamMember(teamId, agentId, { specializations })
}

/**
 * Remove a specialization from a team member
 */
export async function removeSpecialization(
  teamId: string,
  agentId: string,
  specialization: string
): Promise<TeamMember | null> {
  const member = await getTeamMember(teamId, agentId)
  if (!member) {
    throw new Error(`Agent is not a member of this team`)
  }

  const specializations = member.specializations.filter((s) => s !== specialization)
  return dbUpdateTeamMember(teamId, agentId, { specializations })
}

/**
 * Find team members with a specific specialization
 */
export async function findMembersBySpecialization(
  teamId: string,
  specialization: string
): Promise<TeamMemberWithAgent[]> {
  const members = await dbListTeamMembers(teamId)
  return members.filter((m) =>
    m.specializations.some((s) => s.toLowerCase().includes(specialization.toLowerCase()))
  )
}

/**
 * Check if an agent has a specific role in any team
 */
export async function hasTeamRole(agentId: string, role: TeamRole): Promise<boolean> {
  const teams = await getAgentTeamMemberships(agentId)
  return teams.some((t) => t.role === role)
}

/**
 * Get all agents in a team's domain (including from other teams)
 */
export async function getDomainAgents(
  domain: string
): Promise<Array<{ agentId: string; teamName: string; role: TeamRole }>> {
  // This would require querying all teams, but we'll keep it simple
  // In a production system, you might want a dedicated query
  const { listTeams } = await import('./registry.js')
  const teams = await listTeams()
  const domainTeams = teams.filter((t) => t.domain === domain)

  const agents: Array<{ agentId: string; teamName: string; role: TeamRole }> = []
  for (const team of domainTeams) {
    for (const member of team.members) {
      agents.push({
        agentId: member.agentId,
        teamName: team.name,
        role: member.role,
      })
    }
  }

  return agents
}
