/**
 * AI Team Registry - CRUD operations for teams
 */

import {
  createTeam as dbCreateTeam,
  deleteTeam as dbDeleteTeam,
  getTeamById,
  getTeamByName,
  listTeams as dbListTeams,
  updateTeam as dbUpdateTeam,
} from '../db/teams-queries.js'
import type {
  AITeam,
  AITeamWithMembers,
  CreateTeamInput,
  UpdateTeamInput,
} from '../types/teams.js'

/**
 * Create a new AI team
 */
export async function createTeam(input: CreateTeamInput): Promise<AITeam> {
  // Validate name is unique
  const existing = await getTeamByName(input.name)
  if (existing) {
    throw new Error(`Team with name "${input.name}" already exists`)
  }

  return dbCreateTeam(input)
}

/**
 * Get a team by ID
 */
export async function getTeam(teamId: string): Promise<AITeam | null> {
  return getTeamById(teamId)
}

/**
 * Get a team by name
 */
export async function getTeamName(name: string): Promise<AITeam | null> {
  return getTeamByName(name)
}

/**
 * List all active teams with members
 */
export async function listTeams(): Promise<AITeamWithMembers[]> {
  return dbListTeams()
}

/**
 * Update a team
 */
export async function updateTeam(
  teamId: string,
  input: UpdateTeamInput
): Promise<AITeam | null> {
  // If updating name, check uniqueness
  if (input.name) {
    const existing = await getTeamByName(input.name)
    if (existing && existing.id !== teamId) {
      throw new Error(`Team with name "${input.name}" already exists`)
    }
  }

  return dbUpdateTeam(teamId, input)
}

/**
 * Delete (deactivate) a team
 */
export async function deleteTeam(teamId: string): Promise<boolean> {
  return dbDeleteTeam(teamId)
}

/**
 * Get team for a Slack channel
 */
export async function getTeamForChannel(slackChannelId: string): Promise<AITeam | null> {
  const teams = await dbListTeams()
  return teams.find((t) => t.slackChannelId === slackChannelId) || null
}

/**
 * Get teams supervised by a specific person
 */
export async function getTeamsBySupervisor(
  supervisorType: 'ai' | 'human',
  supervisorId: string
): Promise<AITeamWithMembers[]> {
  const teams = await dbListTeams()
  return teams.filter(
    (t) => t.supervisorType === supervisorType && t.supervisorId === supervisorId
  )
}

/**
 * Get teams by domain
 */
export async function getTeamsByDomain(domain: string): Promise<AITeamWithMembers[]> {
  const teams = await dbListTeams()
  return teams.filter((t) => t.domain === domain)
}
