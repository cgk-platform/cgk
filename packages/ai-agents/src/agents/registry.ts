/**
 * AI Agent Registry - CRUD operations for agents
 */

import {
  createAgent as dbCreateAgent,
  createDefaultAutonomySettings,
  createDefaultPersonality,
  getAgentById,
  getAgentByName,
  getPrimaryAgent as dbGetPrimaryAgent,
  listAgents as dbListAgents,
  retireAgent as dbRetireAgent,
  updateAgent as dbUpdateAgent,
} from '../db/queries.js'
import { DEFAULT_ACTION_AUTONOMY } from '../types.js'
import type {
  AIAgent,
  AIAgentWithDetails,
  CreateAgentInput,
  UpdateAgentInput,
} from '../types.js'
import { setActionAutonomy } from '../db/queries.js'

/**
 * Create a new AI agent with default personality and autonomy settings
 */
export async function createAgent(input: CreateAgentInput): Promise<AIAgent> {
  // Create the agent
  const agent = await dbCreateAgent(input)

  // Create default personality
  await createDefaultPersonality(agent.id)

  // Create default autonomy settings
  await createDefaultAutonomySettings(agent.id)

  // Create default action autonomy levels
  for (const [actionType, level] of Object.entries(DEFAULT_ACTION_AUTONOMY)) {
    await setActionAutonomy(agent.id, actionType, {
      autonomyLevel: level,
      enabled: true,
      requiresApproval: level !== 'autonomous',
    })
  }

  return agent
}

/**
 * Get an agent by ID
 */
export async function getAgent(agentId: string): Promise<AIAgent | null> {
  return getAgentById(agentId)
}

/**
 * Get an agent by name
 */
export async function getAgentName(name: string): Promise<AIAgent | null> {
  return getAgentByName(name)
}

/**
 * Get the primary agent for the tenant
 */
export async function getPrimaryAgent(): Promise<AIAgent | null> {
  return dbGetPrimaryAgent()
}

/**
 * List all agents with details (personality, stats)
 */
export async function listAgents(): Promise<AIAgentWithDetails[]> {
  return dbListAgents()
}

/**
 * Update an agent
 */
export async function updateAgent(
  agentId: string,
  input: UpdateAgentInput
): Promise<AIAgent | null> {
  return dbUpdateAgent(agentId, input)
}

/**
 * Retire (soft delete) an agent
 */
export async function retireAgent(agentId: string): Promise<boolean> {
  return dbRetireAgent(agentId)
}

/**
 * Set an agent as primary (unsets other primary agents)
 */
export async function setAsPrimaryAgent(agentId: string): Promise<AIAgent | null> {
  // First, unset any existing primary
  const agents = await dbListAgents()
  for (const agent of agents) {
    if (agent.isPrimary && agent.id !== agentId) {
      await dbUpdateAgent(agent.id, { isPrimary: false })
    }
  }

  // Set this agent as primary
  return dbUpdateAgent(agentId, { isPrimary: true })
}
