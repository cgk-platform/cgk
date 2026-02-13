/**
 * Support Agent Management
 * Phase 2SP-TICKETS
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  AgentFilters,
  AgentRole,
  CreateAgentInput,
  PaginatedAgents,
  SupportAgent,
  UpdateAgentInput,
} from './types'

/**
 * Create a new support agent
 */
export async function createAgent(
  tenantId: string,
  input: CreateAgentInput
): Promise<SupportAgent> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO support_agents (
        user_id,
        name,
        email,
        role,
        max_tickets,
        skills
      ) VALUES (
        ${input.userId},
        ${input.name},
        ${input.email},
        ${input.role || 'agent'},
        ${input.maxTickets || 20},
        ${JSON.stringify(input.skills || [])}::TEXT[]
      )
      RETURNING
        id,
        user_id as "userId",
        name,
        email,
        role,
        is_active as "isActive",
        is_online as "isOnline",
        max_tickets as "maxTickets",
        current_ticket_count as "currentTicketCount",
        skills,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `

    const row = result.rows[0]
    if (!row) throw new Error('Failed to create agent')
    return mapAgent(row as Record<string, unknown>)
  })
}

/**
 * Get agent by ID
 */
export async function getAgent(
  tenantId: string,
  agentId: string
): Promise<SupportAgent | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        user_id as "userId",
        name,
        email,
        role,
        is_active as "isActive",
        is_online as "isOnline",
        max_tickets as "maxTickets",
        current_ticket_count as "currentTicketCount",
        skills,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM support_agents
      WHERE id = ${agentId}
    `

    if (result.rows.length === 0) return null
    return mapAgent(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Get agent by user ID
 */
export async function getAgentByUserId(
  tenantId: string,
  userId: string
): Promise<SupportAgent | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        user_id as "userId",
        name,
        email,
        role,
        is_active as "isActive",
        is_online as "isOnline",
        max_tickets as "maxTickets",
        current_ticket_count as "currentTicketCount",
        skills,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM support_agents
      WHERE user_id = ${userId}
    `

    if (result.rows.length === 0) return null
    return mapAgent(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Get all agents with optional filters
 */
export async function getAgents(
  tenantId: string,
  filters: AgentFilters = {}
): Promise<PaginatedAgents> {
  const { role, isActive, isOnline, search, page = 1, limit = 20 } = filters
  const offset = (page - 1) * limit

  return withTenant(tenantId, async () => {
    // Build WHERE conditions
    const conditions: string[] = []

    if (role !== undefined) {
      conditions.push(`role = '${role}'`)
    }
    if (isActive !== undefined) {
      conditions.push(`is_active = ${isActive}`)
    }
    if (isOnline !== undefined) {
      conditions.push(`is_online = ${isOnline}`)
    }
    if (search) {
      conditions.push(`(name ILIKE '%${search}%' OR email ILIKE '%${search}%')`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count
    const countResult = await sql.query(`
      SELECT COUNT(*) as count FROM support_agents ${whereClause}
    `)
    const total = parseInt(countResult.rows[0].count as string, 10)

    // Get paginated results
    const result = await sql.query(`
      SELECT
        id,
        user_id as "userId",
        name,
        email,
        role,
        is_active as "isActive",
        is_online as "isOnline",
        max_tickets as "maxTickets",
        current_ticket_count as "currentTicketCount",
        skills,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM support_agents
      ${whereClause}
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
    `)

    return {
      items: result.rows.map((row) => mapAgent(row as Record<string, unknown>)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  })
}

/**
 * Get available agents (active, online, under capacity)
 */
export async function getAvailableAgents(tenantId: string): Promise<SupportAgent[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        user_id as "userId",
        name,
        email,
        role,
        is_active as "isActive",
        is_online as "isOnline",
        max_tickets as "maxTickets",
        current_ticket_count as "currentTicketCount",
        skills,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM support_agents
      WHERE is_active = TRUE
        AND is_online = TRUE
        AND current_ticket_count < max_tickets
      ORDER BY current_ticket_count ASC
    `

    return result.rows.map((row) => mapAgent(row as Record<string, unknown>))
  })
}

/**
 * Update an agent
 */
export async function updateAgent(
  tenantId: string,
  agentId: string,
  input: UpdateAgentInput
): Promise<SupportAgent | null> {
  return withTenant(tenantId, async () => {
    const updates: string[] = []

    if (input.name !== undefined) {
      updates.push(`name = '${input.name}'`)
    }
    if (input.role !== undefined) {
      updates.push(`role = '${input.role}'`)
    }
    if (input.maxTickets !== undefined) {
      updates.push(`max_tickets = ${input.maxTickets}`)
    }
    if (input.skills !== undefined) {
      updates.push(`skills = ARRAY[${input.skills.map((s) => `'${s}'`).join(',')}]::TEXT[]`)
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = ${input.isActive}`)
    }

    if (updates.length === 0) {
      return getAgent(tenantId, agentId)
    }

    const result = await sql.query(`
      UPDATE support_agents
      SET ${updates.join(', ')}
      WHERE id = '${agentId}'
      RETURNING
        id,
        user_id as "userId",
        name,
        email,
        role,
        is_active as "isActive",
        is_online as "isOnline",
        max_tickets as "maxTickets",
        current_ticket_count as "currentTicketCount",
        skills,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `)

    if (result.rows.length === 0) return null
    return mapAgent(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Update agent online status
 */
export async function updateAgentStatus(
  tenantId: string,
  agentId: string,
  isOnline: boolean
): Promise<void> {
  return withTenant(tenantId, async () => {
    await sql`
      UPDATE support_agents
      SET is_online = ${isOnline}
      WHERE id = ${agentId}
    `
  })
}

/**
 * Increment agent ticket count
 */
export async function incrementAgentTicketCount(
  tenantId: string,
  agentId: string
): Promise<void> {
  return withTenant(tenantId, async () => {
    await sql`
      UPDATE support_agents
      SET current_ticket_count = current_ticket_count + 1
      WHERE id = ${agentId}
    `
  })
}

/**
 * Decrement agent ticket count
 */
export async function decrementAgentTicketCount(
  tenantId: string,
  agentId: string
): Promise<void> {
  return withTenant(tenantId, async () => {
    await sql`
      UPDATE support_agents
      SET current_ticket_count = GREATEST(0, current_ticket_count - 1)
      WHERE id = ${agentId}
    `
  })
}

/**
 * Delete an agent
 */
export async function deleteAgent(tenantId: string, agentId: string): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM support_agents
      WHERE id = ${agentId}
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Map database row to SupportAgent
 */
function mapAgent(row: Record<string, unknown>): SupportAgent {
  return {
    id: row.id as string,
    userId: row.userId as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as AgentRole,
    isActive: row.isActive as boolean,
    isOnline: row.isOnline as boolean,
    maxTickets: row.maxTickets as number,
    currentTicketCount: row.currentTicketCount as number,
    skills: (row.skills as string[]) || [],
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  }
}
